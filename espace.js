/* Espace participant : ouvert par le QR « Mon espace » du badge. Programme, repas, questionnaires Qualiopi. */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$;
  var id = JEF.parametre('id'), k = JEF.parametre('k');
  var espace = null, enCours = null;
  var REPAS_LIB = { JM: 'Jeudi midi', GALA: 'Soirée de gala', VM: 'Vendredi midi' };
  var EMOJI = { 'Très satisfait': '😀', 'Satisfait': '🙂', 'Peu satisfait': '😐', 'Pas satisfait': '🙁' };

  function erreur(m) { $('#chargement').hidden = true; var e = $('#erreur'); e.hidden = false; e.textContent = m; }
  if (!id || !k) { erreur('Lien incomplet. Scannez le QR code « Mon espace participant » de votre badge.'); return; }

  function vue(n) {
    ['accueil', 'questionnaire', 'merci'].forEach(function (v) { $('#' + v).hidden = v !== n; });
    window.scrollTo(0, 0);
  }

  function charger() {
    return JEF.post('espace_lire', { data: { id: id, k: k } }).then(function (r) {
      espace = r;
      $('#chargement').hidden = true;
      afficherAccueil();
      var m = location.hash.match(/q=([A-Z]+)/);
      if (m) ouvrir(m[1]);
    }).catch(function (e) { erreur(e.message); });
  }

  function afficherAccueil() {
    var p = espace.participant, ed = espace.edition;
    var repas = Object.keys(p.repas || {}).filter(function (c) { return p.repas[c]; }).map(function (c) { return REPAS_LIB[c] || c; });
    var aFaire = espace.questionnaires.filter(function (q) { return q.ouvert && !q.repondu; });
    JEF.rendre('#accueil', h`
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
        ${aFaire.length ? h`<p class="petit">${aFaire.length === 1 ? 'Un questionnaire vous attend.' : aFaire.length + ' questionnaires vous attendent.'} Vos réponses servent à mesurer l'apport de la formation et à améliorer les prochaines journées.</p>` : ''}
        <div class="liste-q">${espace.questionnaires.map(function (q) {
          var etat = q.repondu ? ['fait', '✓ Répondu, merci'] : q.ouvert ? ['ouvert', 'À remplir'] : ['ferme', q.raison || 'Pas encore ouvert'];
          return h`<button type="button" class="q-ligne ${etat[0]}" data-q="${q.code}" ${JEF.brut(!q.ouvert || q.repondu ? 'disabled' : '')}>
            <span class="q-titre">${q.titre}</span><span class="q-etat">${etat[1]}</span></button>`;
        })}</div></section>` : ''}
      ${espace.programme.length ? h`<section class="carte"><h2>Programme</h2>${programme(espace.programme)}</section>` : ''}
      <p class="petit" style="text-align:center;">Une question ? <a href="mailto:${ed.email}">${ed.email}</a></p>`);
    $$('[data-q]').forEach(function (b) { b.addEventListener('click', function () { ouvrir(b.getAttribute('data-q')); }); });
    vue('accueil');
  }

  function programme(lignes) {
    var jours = [], parJour = {};
    lignes.forEach(function (l) { if (!parJour[l.jour]) { parJour[l.jour] = []; jours.push(l.jour); } parJour[l.jour].push(l); });
    return jours.map(function (j) {
      var d = /^\d{4}-\d{2}-\d{2}$/.test(j) ? new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : j;
      return h`<h3 class="prog-jour">${d}</h3><ol class="prog">${parJour[j].map(function (l) {
        return h`<li class="prog-${(l.type || '').toLowerCase().replace(/[^a-z]/g, '')}"><span class="prog-h">${l.heure}</span><div><b>${l.theme}</b>${l.intervenants ? h`<div class="petit">${l.intervenants}</div>` : ''}${l.description ? h`<div class="petit">${l.description}</div>` : ''}</div></li>`;
      })}</ol>`;
    });
  }

  // ----- Questionnaire --------------------------------------------------------
  function ouvrir(code) {
    var f = $('#questionnaire');
    JEF.rendre(f, h`<div class="chargement"><span class="rotation"></span>Chargement du questionnaire...</div>`);
    vue('questionnaire');
    JEF.post('q_lire', { data: { id: id, k: k, q: code } }).then(function (q) {
      enCours = q;
      try { history.replaceState(null, '', '#q=' + code); } catch (e) { /* rien */ }
      JEF.rendre(f, h`<button type="button" class="btn btn-fantome btn-s" data-retour>← Mon espace</button>
        <h1 style="margin:8px 0 4px;">${q.titre}</h1><p class="petit">${q.intro}</p>
        <div class="q-progression"><i id="q-barre"></i></div>
        ${q.questions.map(question)}
        <div class="actions-etape"><span></span><button type="submit" class="btn btn-orange btn-l" id="q-envoyer">Envoyer mes réponses</button></div>`);
      $('[data-retour]', f).addEventListener('click', retour);
      f.addEventListener('change', progression);
      f.addEventListener('input', progression);
      progression();
    }).catch(function (e) {
      JEF.rendre(f, h`<button type="button" class="btn btn-fantome btn-s" data-retour>← Mon espace</button><div class="alerte a-info" style="margin-top:12px;"><div>${e.message}</div></div>`);
      $('[data-retour]', f).addEventListener('click', retour);
    });
  }

  function retour() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* rien */ } vue('accueil'); }

  function question(q) {
    var nom = 'q' + q.n, ob = q.obligatoire ? h`<span class="obligatoire"></span>` : '';
    var corps;
    if (q.type === 'note10') {
      corps = h`<div class="note10">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return h`<label><input type="radio" name="${nom}" value="${n}"><span>${n}</span></label>`; })}</div>`;
    } else if (q.type === 'acquis') {
      corps = h`<div class="acquis">${['debut', 'fin'].map(function (m) {
        return h`<div class="acquis-ligne"><span class="acquis-lib">${m === 'debut' ? 'Au début' : 'À la fin'}</span><div class="choix c3">${q.choix.map(function (c) {
          return h`<label class="option puce"><input type="radio" name="${nom}_${m}" value="${c}"><span class="titre">${c}</span></label>`; })}</div></div>`;
      })}</div>`;
    } else if (q.type === 'texte') {
      corps = h`<textarea name="${nom}" maxlength="1500" rows="3"></textarea>`;
    } else {
      var multiple = q.type === 'multiple';
      corps = h`<div class="choix ${q.type === 'echelle' ? 'c4 echelle' : q.type === 'ouinon' ? 'c2' : 'c1'}">${q.choix.map(function (c) {
        return h`<label class="option puce"><input type="${multiple ? 'checkbox' : 'radio'}" name="${nom}" value="${c}"><span class="titre">${q.type === 'echelle' ? EMOJI[c] + ' ' : ''}${c}</span></label>`;
      })}</div>${multiple ? h`<span class="aide">Plusieurs réponses possibles.</span>` : ''}`;
    }
    return h`<fieldset class="champ q-bloc" data-n="${q.n}" data-type="${q.type}" data-ob="${q.obligatoire ? '1' : ''}">
      <legend class="legende"><span class="q-num">${q.n}</span> ${q.question} ${ob}</legend>
      ${q.objectif && q.type !== 'acquis' ? h`<div class="petit">${q.objectif}</div>` : ''}${corps}<div class="erreur-champ" role="alert"></div></fieldset>`;
  }

  function lireReponses() {
    var f = $('#questionnaire'), rep = {}, manque = null;
    $$('.q-bloc', f).forEach(function (b) {
      var n = b.getAttribute('data-n'), t = b.getAttribute('data-type'), v;
      if (t === 'multiple') v = $$('input:checked', b).map(function (i) { return i.value; });
      else if (t === 'acquis') { var d = $('input[name=q' + n + '_debut]:checked', b), fi = $('input[name=q' + n + '_fin]:checked', b); v = { debut: d ? d.value : '', fin: fi ? fi.value : '' }; }
      else if (t === 'texte') v = $('textarea', b).value.trim();
      else { var c = $('input:checked', b); v = c ? (t === 'note10' ? Number(c.value) : c.value) : ''; }
      var vide = v === '' || (Array.isArray(v) && !v.length) || (t === 'acquis' && (!v.debut || !v.fin));
      $('.erreur-champ', b).textContent = '';
      b.classList.remove('q-manque');
      if (b.getAttribute('data-ob') && vide) { if (!manque) manque = b; b.classList.add('q-manque'); $('.erreur-champ', b).textContent = 'Réponse attendue.'; }
      rep[n] = v;
    });
    return { reponses: rep, manque: manque };
  }

  function progression() {
    var blocs = $$('.q-bloc', $('#questionnaire'));
    if (!blocs.length) return;
    var faits = blocs.filter(function (b) {
      var t = b.getAttribute('data-type');
      if (t === 'texte') return !!$('textarea', b).value.trim();
      if (t === 'acquis') return $$('input:checked', b).length >= 2;
      return !!$('input:checked', b);
    }).length;
    $('#q-barre').style.width = Math.round(faits / blocs.length * 100) + '%';
  }

  $('#questionnaire').addEventListener('submit', function (e) {
    e.preventDefault();
    if (!enCours) return;
    var r = lireReponses();
    if (r.manque) { r.manque.scrollIntoView({ behavior: 'smooth', block: 'center' }); JEF.toast('Il manque une réponse obligatoire.', 'erreur'); return; }
    var retablir = JEF.attente($('#q-envoyer'), 'Envoi...');
    JEF.post('q_repondre', { data: { id: id, k: k, q: enCours.code, reponses: r.reponses } }).then(function () {
      var code = enCours.code; enCours = null;
      espace.questionnaires.forEach(function (q) { if (q.code === code) q.repondu = true; });
      try { history.replaceState(null, '', location.pathname + location.search); } catch (x) { /* rien */ }
      JEF.rendre('#merci', h`<div class="coche">✓</div><h1>Merci !</h1><p>Vos réponses sont enregistrées.</p>
        <button class="btn btn-primaire btn-l" type="button" id="vers-espace">Retour à mon espace</button>`);
      vue('merci');
      $('#vers-espace').addEventListener('click', afficherAccueil);
    }).catch(function (x) { retablir(); JEF.toast(x.message, 'erreur'); });
  });

  JEF.config().then(JEF.habiller).catch(function () { /* rien */ });
  charger();
})();
