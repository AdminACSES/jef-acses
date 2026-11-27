/* Espace participant : ouvert par le QR « Mon espace » du badge.
   Programme, repas, questionnaires Qualiopi (une question par écran) et animation en direct.
   Les réponses sont gardées sur le téléphone tant que le serveur ne les a pas confirmées. */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$;
  var id = JEF.parametre('id'), k = JEF.parametre('k');
  var espace = null, q = null, pos = 0, rep = {}, minuteurImp = null, impCourante = null;
  var REPAS_LIB = { JM: 'Jeudi midi', GALA: 'Soirée de gala', VM: 'Vendredi midi' };
  var VISAGES = { 'Pas satisfait': '😞', 'Peu satisfait': '😕', 'Satisfait': '🙂', 'Très satisfait': '😀' };
  var CLE_ATTENTE = 'jef_reponses_en_attente';

  function erreur(m) { $('#chargement').hidden = true; var e = $('#erreur'); e.hidden = false; e.textContent = m; }
  if (!id || !k) { erreur('Lien incomplet. Scannez le QR code « Mon espace participant » de votre badge.'); return; }

  function vue(n) { ['accueil', 'questionnaire', 'merci'].forEach(function (v) { $('#' + v).hidden = v !== n; }); window.scrollTo(0, 0); }

  // ----- Réponses en attente (coupure réseau ou serveur saturé) ------------------
  function lireAttente() { try { return JSON.parse(localStorage.getItem(CLE_ATTENTE) || '[]'); } catch (e) { return []; } }
  function ecrireAttente(l) { try { localStorage.setItem(CLE_ATTENTE, JSON.stringify(l)); } catch (e) { /* rien */ } }
  function envoyer(item, tentative) {
    tentative = tentative || 0;
    return JEF.post('q_repondre', { data: { id: item.id, k: item.k, q: item.q, reponses: item.reponses } }, { essais: 2 }).then(function (r) {
      ecrireAttente(lireAttente().filter(function (x) { return !(x.id === item.id && x.q === item.q); }));
      return r;
    }).catch(function (e) {
      if (e.code === 'deja') { ecrireAttente(lireAttente().filter(function (x) { return !(x.id === item.id && x.q === item.q); })); return { succes: true }; }
      if ((e.reseau || e.surcharge || /trop de temps|sollicité/.test(e.message)) && tentative < 4) {
        return new Promise(function (ok) { setTimeout(ok, 4000 * Math.pow(2, tentative) + Math.random() * 3000); }).then(function () { return envoyer(item, tentative + 1); });
      }
      throw e;
    });
  }
  function viderAttente() {
    lireAttente().filter(function (x) { return x.id === id; }).forEach(function (x) { envoyer(x).then(function () { if (espace) { espace.questionnaires.forEach(function (qq) { if (qq.code === x.q) qq.repondu = true; }); if (!$('#accueil').hidden) afficherAccueil(); } }).catch(function () { /* nouvel essai au prochain passage */ }); });
  }

  function charger() {
    return JEF.post('espace_lire', { data: { id: id, k: k } }).then(function (r) {
      espace = r;
      $('#chargement').hidden = true;
      var attente = lireAttente().filter(function (x) { return x.id === id; }).map(function (x) { return x.q; });
      espace.questionnaires.forEach(function (qq) { if (attente.indexOf(qq.code) !== -1) qq.enAttente = true; });
      afficherAccueil();
      var m = location.hash.match(/q=([A-Z0-9_]+)/);
      if (m) ouvrir(m[1]);
      viderAttente();
      suivreImpulsion(r.impulsion);
    }).catch(function (e) { erreur(e.message); });
  }

  // ----- Accueil de l'espace -------------------------------------------------------
  function afficherAccueil() {
    var p = espace.participant, ed = espace.edition;
    var repas = Object.keys(p.repas || {}).filter(function (c) { return p.repas[c]; }).map(function (c) { return REPAS_LIB[c] || c; });
    var aFaire = espace.questionnaires.filter(function (x) { return x.ouvert && !x.repondu && !x.enAttente; });
    JEF.rendre('#accueil', h`
      <div id="zone-direct"></div>
      <section class="carte espace-entete" style="border-top:6px solid ${p.couleur};">
        <div class="petit">Bonjour</div>
        <h1>${p.prenom} ${p.nom}</h1>
        <div class="espace-profil" style="background:${p.couleur};">${p.profil}</div>
        ${p.organisme ? h`<div class="petit" style="margin-top:6px;">${p.organisme}</div>` : ''}
        <dl class="infos" style="margin-top:12px;">
          <dt>Dates</dt><dd>${ed.dates}</dd><dt>Lieu</dt><dd>${ed.lieu}</dd>
          <dt>Repas</dt><dd>${repas.length ? repas.join(', ') : 'Aucun'}</dd>
          ${ed.telephone ? h`<dt>Permanence</dt><dd><a href="tel:${ed.telephone.replace(/\s/g, '')}">${ed.telephone}</a></dd>` : ''}
        </dl>
      </section>
      ${espace.questionnaires.length ? h`<section class="carte">
        <h2>Mes questionnaires</h2>
        ${aFaire.length ? h`<p class="petit">${aFaire.length === 1 ? 'Un questionnaire vous attend.' : aFaire.length + ' questionnaires vous attendent.'} Comptez 2 à 3 minutes.</p>` : ''}
        <div class="liste-q">${espace.questionnaires.map(function (x) {
          var etat = x.repondu ? ['fait', '✓ Répondu, merci'] : x.enAttente ? ['fait', '⏳ Envoi en cours'] : x.ouvert ? ['ouvert', 'À remplir'] : ['ferme', x.raison || 'Pas encore ouvert'];
          return h`<button type="button" class="q-ligne ${etat[0]}" data-q="${x.code}" ${JEF.brut(!x.ouvert || x.repondu || x.enAttente ? 'disabled' : '')}>
            <span class="q-titre">${x.titre}</span><span class="q-etat">${etat[1]}</span></button>`;
        })}</div></section>` : ''}
      ${espace.programme.length ? h`<section class="carte"><h2>Programme</h2>${programme(espace.programme)}</section>` : ''}
      <p class="petit" style="text-align:center;">Une question ? <a href="mailto:${ed.email}">${ed.email}</a></p>`);
    $$('[data-q]').forEach(function (b) { b.addEventListener('click', function () { ouvrir(b.getAttribute('data-q')); }); });
    afficherImpulsion();
    vue('accueil');
  }

  function programme(lignes) {
    var jours = [], parJour = {};
    lignes.forEach(function (l) { if (!parJour[l.jour]) { parJour[l.jour] = []; jours.push(l.jour); } parJour[l.jour].push(l); });
    return jours.map(function (j) {
      var d = /^\d{4}-\d{2}-\d{2}$/.test(j) ? new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : j;
      return h`<h3 class="prog-jour">${d}</h3><ol class="prog">${parJour[j].map(function (l) {
        return h`<li class="prog-${(l.type || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}"><span class="prog-h">${l.heure}</span><div><b>${l.theme}</b>${l.intervenants ? h`<div class="petit">${l.intervenants}</div>` : ''}${l.description ? h`<div class="petit">${l.description}</div>` : ''}</div></li>`;
      })}</ol>`;
    });
  }

  // ----- Questionnaire : une question par écran ------------------------------------
  function ouvrir(code) {
    clearTimeout(minuteurImp);
    var f = $('#questionnaire');
    JEF.rendre(f, h`<div class="chargement"><span class="rotation"></span>Chargement du questionnaire...</div>`);
    vue('questionnaire');
    JEF.post('q_lire', { data: { id: id, k: k, q: code } }).then(function (x) {
      q = x; pos = -1; rep = {};
      try { var b = JSON.parse(sessionStorage.getItem('jef_q_' + id + '_' + code) || 'null'); if (b) rep = b; } catch (e) { /* rien */ }
      try { history.replaceState(null, '', '#q=' + code); } catch (e) { /* rien */ }
      etape();
    }).catch(function (e) {
      JEF.rendre(f, h`<button type="button" class="btn btn-fantome btn-s" data-retour>← Mon espace</button><div class="alerte a-info" style="margin-top:12px;"><div>${e.message}</div></div>`);
      $('[data-retour]', f).addEventListener('click', retour);
    });
  }
  function retour() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* rien */ } afficherAccueil(); suivreImpulsion(); }
  function memoriser() { try { sessionStorage.setItem('jef_q_' + id + '_' + q.code, JSON.stringify(rep)); } catch (e) { /* rien */ } }

  function rempli(x) {
    var v = rep[x.n];
    if (x.type === 'acquis') return v && v.debut && v.fin;
    if (x.type === 'multiple') return v && v.length;
    return v !== undefined && v !== '' && v !== null;
  }

  function etape() {
    var f = $('#questionnaire'), total = q.questions.length;
    if (pos === -1) {
      JEF.rendre(f, h`<button type="button" class="btn btn-fantome btn-s" data-retour>← Mon espace</button>
        <div class="q-intro"><div class="q-intro-ico">📝</div><h1>${q.titre}</h1><p>${q.intro}</p><p class="petit">${total} question${total > 1 ? 's' : ''}. Vous pouvez revenir en arrière avant d'envoyer.</p>
        <button type="button" class="btn btn-orange btn-l" data-suivant>Commencer</button></div>`);
      $('[data-retour]', f).addEventListener('click', retour);
      $('[data-suivant]', f).addEventListener('click', function () { pos = 0; etape(); });
      return;
    }
    if (pos >= total) return recap();
    var x = q.questions[pos];
    var debutBloc = x.bloc === 'Satisfaction' && (pos === 0 || q.questions[pos - 1].bloc !== 'Satisfaction');
    JEF.rendre(f, h`<div class="q-haut"><button type="button" class="btn btn-fantome btn-s" data-prec>←</button><div class="q-progression"><i style="width:${Math.round(pos / total * 100)}%"></i></div><span class="petit">${pos + 1} / ${total}</span></div>
      ${debutBloc ? h`<div class="q-bloc-titre">Pour finir, votre avis sur les journées</div>` : ''}
      <div class="q-ecran" data-type="${x.type}">
        ${x.objectif && x.type !== 'acquis' ? h`<div class="q-objectif">${x.objectif}</div>` : ''}
        ${x.type === 'acquis' && x.objectif ? h`<div class="q-objectif">${x.objectif}</div>` : ''}
        <h2 class="q-texte">${x.question}${x.obligatoire ? '' : h` <span class="q-facultatif">facultatif</span>`}</h2>
        ${x.type === 'multiple' ? h`<p class="petit">Plusieurs réponses possibles.</p>` : ''}
        <div class="q-reponses">${champ(x)}</div>
      </div>
      <div class="q-bas"><button type="button" class="btn btn-l ${rempli(x) || !x.obligatoire ? 'btn-orange' : ''}" data-suivant ${JEF.brut(x.obligatoire && !rempli(x) ? 'disabled' : '')}>${pos === total - 1 ? 'Vérifier et envoyer' : (rempli(x) || x.obligatoire ? 'Suivant' : 'Passer')}</button></div>`);
    brancherChamp(x);
    $('[data-prec]', f).addEventListener('click', function () { pos = pos - 1; etape(); });
    $('[data-suivant]', f).addEventListener('click', function () { pos++; etape(); });
    window.scrollTo(0, 0);
  }

  function champ(x) {
    var v = rep[x.n];
    if (x.type === 'note10') return h`<div class="note-echelle">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) {
      return h`<button type="button" class="note n${n} ${v === n ? 'choisi' : ''}" data-v="${n}">${n}</button>`; })}</div><div class="echelle-bornes"><span>Pas du tout satisfait</span><span>Très satisfait</span></div>`;
    if (x.type === 'echelle' || x.type === 'echelle3') return h`<div class="visages v${x.choix.length}">${x.choix.map(function (c, i) {
      return h`<button type="button" class="visage niveau${i + (x.choix.length === 3 ? 1 : 0)} ${v === c ? 'choisi' : ''}" data-v="${c}"><span class="emoji">${VISAGES[c] || '•'}</span><span>${c}</span></button>`; })}</div>`;
    if (x.type === 'acquis') return h`${['debut', 'fin'].map(function (m) {
      return h`<div class="acquis-ligne2"><div class="acquis-lib2">${m === 'debut' ? 'Au début de la formation' : 'À la fin de la formation'}</div><div class="niveaux">${x.choix.map(function (c, i) {
        return h`<button type="button" class="niveau-btn n${i} ${v && v[m] === c ? 'choisi' : ''}" data-m="${m}" data-v="${c}">${c}</button>`; })}</div></div>`; })}`;
    if (x.type === 'texte') return h`<textarea class="q-texte-libre" maxlength="1500" rows="5" placeholder="Votre réponse">${v || ''}</textarea>`;
    if (x.type === 'ouinon') return h`<div class="oui-non">${x.choix.map(function (c) { return h`<button type="button" class="on-btn ${c === 'Oui' ? 'oui' : 'non'} ${v === c ? 'choisi' : ''}" data-v="${c}">${c === 'Oui' ? '👍 Oui' : '👎 Non'}</button>`; })}</div>`;
    var multi = x.type === 'multiple';
    return h`<div class="choix-liste">${x.choix.map(function (c) { var on = multi ? (v || []).indexOf(c) !== -1 : v === c;
      return h`<button type="button" class="choix-btn ${on ? 'choisi' : ''}" data-v="${c}" aria-pressed="${on ? 'true' : 'false'}"><span class="coche">${multi ? (on ? '☑' : '☐') : (on ? '◉' : '○')}</span>${c}</button>`; })}</div>`;
  }

  function brancherChamp(x) {
    var f = $('#questionnaire');
    var avancer = function () { memoriser(); setTimeout(function () { if (q.questions[pos] === x) { pos++; etape(); } }, 280); };
    if (x.type === 'texte') {
      var t = $('textarea', f);
      t.addEventListener('input', function () { rep[x.n] = t.value; memoriser(); var b = $('[data-suivant]', f); b.textContent = pos === q.questions.length - 1 ? 'Vérifier et envoyer' : (t.value.trim() ? 'Suivant' : 'Passer'); b.disabled = x.obligatoire && !t.value.trim(); b.classList.toggle('btn-orange', !!t.value.trim() || !x.obligatoire); });
      return;
    }
    $$('[data-v]', f).forEach(function (b) { b.addEventListener('click', function () {
      var v = b.getAttribute('data-v');
      if (x.type === 'note10') { rep[x.n] = Number(v); etape(); avancer(); }
      else if (x.type === 'multiple') { var l = (rep[x.n] || []).slice(); var i = l.indexOf(v); if (i === -1) l.push(v); else l.splice(i, 1); rep[x.n] = l; memoriser(); etape(); }
      else if (x.type === 'acquis') { var o = Object.assign({}, rep[x.n] || {}); o[b.getAttribute('data-m')] = v; rep[x.n] = o; memoriser(); etape(); if (o.debut && o.fin) avancer(); }
      else { rep[x.n] = v; etape(); avancer(); }
    }); });
  }

  function recap() {
    var f = $('#questionnaire');
    var manquantes = q.questions.filter(function (x) { return x.obligatoire && !rempli(x); });
    var resume = function (x) {
      var v = rep[x.n];
      if (!rempli(x)) return x.obligatoire ? '⚠ À répondre' : '-';
      if (x.type === 'acquis') return v.debut + ' → ' + v.fin;
      if (x.type === 'multiple') return v.join(', ');
      if (x.type === 'note10') return v + ' / 10';
      return String(v).length > 70 ? String(v).slice(0, 70) + '…' : String(v);
    };
    JEF.rendre(f, h`<div class="q-haut"><button type="button" class="btn btn-fantome btn-s" data-prec>←</button><div class="q-progression"><i style="width:100%"></i></div><span class="petit">Fin</span></div>
      <h1 style="margin:6px 0;">Vérifiez vos réponses</h1><p class="petit">Touchez une ligne pour la modifier.</p>
      <ol class="recap">${q.questions.map(function (x, i) { return h`<li><button type="button" data-aller-q="${i}" class="${x.obligatoire && !rempli(x) ? 'manque' : ''}"><span>${x.question}</span><b>${resume(x)}</b></button></li>`; })}</ol>
      <div class="q-bas"><button type="button" class="btn btn-orange btn-l" id="q-envoyer" ${JEF.brut(manquantes.length ? 'disabled' : '')}>${manquantes.length ? manquantes.length + ' réponse(s) manquante(s)' : 'Envoyer mes réponses'}</button></div>`);
    $('[data-prec]', f).addEventListener('click', function () { pos = q.questions.length - 1; etape(); });
    $$('[data-aller-q]', f).forEach(function (b) { b.addEventListener('click', function () { pos = Number(b.getAttribute('data-aller-q')); etape(); }); });
    $('#q-envoyer').addEventListener('click', envoyerQuestionnaire);
  }

  function envoyerQuestionnaire() {
    var item = { id: id, k: k, q: q.code, reponses: rep, t: Date.now() };
    ecrireAttente(lireAttente().filter(function (x) { return !(x.id === id && x.q === q.code); }).concat([item]));
    var b = $('#q-envoyer'), retablir = JEF.attente(b, 'Envoi de vos réponses');
    var code = q.code;
    envoyer(item).then(function () {
      try { sessionStorage.removeItem('jef_q_' + id + '_' + code); } catch (e) { /* rien */ }
      espace.questionnaires.forEach(function (x) { if (x.code === code) { x.repondu = true; x.enAttente = false; } });
      merci(true);
    }).catch(function (e) {
      retablir();
      if (e.reseau || e.surcharge || /trop de temps|sollicité/.test(e.message)) {
        espace.questionnaires.forEach(function (x) { if (x.code === code) x.enAttente = true; });
        merci(false);
      } else JEF.toast(e.message, 'erreur');
    });
  }

  function merci(confirme) {
    q = null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* rien */ }
    JEF.rendre('#merci', h`<div class="coche">${confirme ? '✓' : '⏳'}</div><h1>Merci !</h1>
      <p>${confirme ? 'Vos réponses sont enregistrées.' : 'Le réseau est saturé : vos réponses sont gardées sur ce téléphone et partiront toutes seules dès que possible. Vous pouvez fermer la page, elles partiront à la prochaine ouverture.'}</p>
      <button class="btn btn-primaire btn-l" type="button" id="vers-espace">Retour à mon espace</button>`);
    vue('merci');
    $('#vers-espace').addEventListener('click', function () { afficherAccueil(); suivreImpulsion(); });
  }

  // ----- Animation en direct ----------------------------------------------------
  function suivreImpulsion(initiale) {
    clearTimeout(minuteurImp);
    if (initiale !== undefined) { impCourante = initiale; afficherImpulsion(); }
    var prochain = function () { minuteurImp = setTimeout(tic, (impCourante ? 9000 : 18000) + Math.random() * 5000); };
    function tic() {
      if (document.hidden || $('#accueil').hidden) { prochain(); return; }
      JEF.post('imp_lire', { data: { id: id, k: k } }, { essais: 0, delai: 15000 }).then(function (r) {
        var avant = impCourante ? impCourante.id + (impCourante.dejaRepondu ? '1' : '0') : '';
        impCourante = r.impulsion;
        var apres = impCourante ? impCourante.id + (impCourante.dejaRepondu ? '1' : '0') : '';
        if (avant !== apres || (impCourante && impCourante.type === 'questions')) afficherImpulsion();
      }).catch(function () { /* nouvel essai plus tard */ }).finally(prochain);
    }
    prochain();
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && espace && !$('#accueil').hidden) { clearTimeout(minuteurImp); minuteurImp = setTimeout(function () { suivreImpulsion(); }, 300); } });

  function afficherImpulsion() {
    var z = $('#zone-direct');
    if (!z) return;
    var i = impCourante;
    if (!i) { JEF.rendre(z, ''); return; }
    var corps;
    if (i.type === 'questionnaire') {
      var x = espace.questionnaires.filter(function (qq) { return qq.code === i.code; })[0];
      corps = x ? (x.repondu ? h`<p>✓ Vous avez déjà répondu. Merci !</p>` : h`<button class="btn btn-orange btn-l" data-q-direct="${i.code}" style="width:100%;justify-content:center;">Répondre maintenant</button>`) : h`<p class="petit">Ce questionnaire ne concerne pas votre profil.</p>`;
    } else if (i.dejaRepondu) corps = h`<p class="direct-merci">✓ Réponse envoyée, regardez l'écran !</p>`;
    else if (i.type === 'nuage') corps = h`<div class="direct-mots"><input type="text" maxlength="40" placeholder="Un mot" data-mot><input type="text" maxlength="40" placeholder="Un autre (facultatif)" data-mot><input type="text" maxlength="40" placeholder="Un troisième (facultatif)" data-mot></div><button class="btn btn-orange btn-l" data-env-imp style="width:100%;justify-content:center;">Envoyer</button>`;
    else if (i.type === 'sondage') corps = h`<div class="choix-liste">${i.choix.map(function (c) { return h`<button type="button" class="choix-btn" data-env-imp data-v="${c}">${c}</button>`; })}</div>`;
    else if (i.type === 'note') corps = h`<div class="note-echelle">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return h`<button type="button" class="note n${n}" data-env-imp data-v="${n}">${n}</button>`; })}</div>`;
    else if (i.type === 'questions') corps = h`<div class="direct-q"><textarea maxlength="300" rows="2" placeholder="Votre question" data-question></textarea><button class="btn btn-orange" data-env-imp>Envoyer</button></div>
      <div class="direct-liste">${(i.questions || []).map(function (qq) { return h`<button type="button" class="direct-vote ${qq.moi ? 'vote' : ''} ${qq.repondue ? 'repondue' : ''}" data-vote="${qq.id}" ${JEF.brut(qq.moi ? 'disabled' : '')}><b>👍 ${qq.votes}</b><span>${qq.texte}</span></button>`; })}</div>`;
    JEF.rendre(z, h`<section class="carte direct"><div class="direct-badge"><span class="point"></span> En direct</div><h2>${i.type === 'questionnaire' ? i.titreQuestionnaire : i.question}</h2>${corps}</section>`);
    var qd = $('[data-q-direct]', z); if (qd) qd.addEventListener('click', function () { ouvrir(qd.getAttribute('data-q-direct')); });
    $$('[data-env-imp]', z).forEach(function (b) { b.addEventListener('click', function () {
      var valeur;
      if (i.type === 'nuage') { valeur = $$('[data-mot]', z).map(function (m) { return m.value.trim(); }).filter(String); if (!valeur.length) { JEF.toast('Écrivez au moins un mot.', 'erreur'); return; } }
      else if (i.type === 'questions') { valeur = $('[data-question]', z).value.trim(); if (valeur.length < 3) { JEF.toast('Écrivez votre question.', 'erreur'); return; } }
      else valeur = i.type === 'note' ? Number(b.getAttribute('data-v')) : b.getAttribute('data-v');
      var retablir = JEF.attente(b, 'Envoi');
      JEF.post('imp_repondre', { data: { id: id, k: k, imp: i.id, valeur: valeur } }, { essais: 4 }).then(function () {
        retablir();
        if (i.type === 'questions') { $('[data-question]', z).value = ''; JEF.toast('Question envoyée', 'ok'); suivreImpulsion(); }
        else { i.dejaRepondu = true; afficherImpulsion(); }
        if (navigator.vibrate) navigator.vibrate(40);
      }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
    }); });
    $$('[data-vote]', z).forEach(function (b) { b.addEventListener('click', function () {
      b.disabled = true; b.classList.add('vote');
      JEF.post('imp_repondre', { data: { id: id, k: k, imp: i.id, vote: b.getAttribute('data-vote') } }, { essais: 3 }).then(function () { suivreImpulsion(); }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
    }); });
  }

  window.addEventListener('online', viderAttente);
  JEF.config().then(JEF.habiller).catch(function () { /* rien */ });
  charger();
})();
