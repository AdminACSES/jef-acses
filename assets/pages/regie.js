/* ==========================================================================
   Régie du jour J
   - Déroulé : séquence en cours et suivante, chrono, conducteur relié au planning.
   - Pilote de l'écran : animation, questions, accueil ou écran noir.
   - Animations : celles de la séquence d'abord, résultats en direct, quiz à dévoiler,
     souffleur pour l'animateur (la salle ne voit aucune consigne).
   - Questions de la salle : une série par présentation, modération avant l'écran.
   Sur le même ordinateur, l'écran reçoit tout par un canal local du navigateur.
   ========================================================================== */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$, brut = JEF.brut;
  var R = null, ecart = 0, jour = '', choisie = null, epingle = false, ecranData = null, QA = null;
  var minuteurEcran = null, minuteurQa = null, fenetreEcran = null, cleEcranLocal = '';
  var canal = null;
  try { canal = new BroadcastChannel('jef-ecran'); } catch (e) { canal = null; }
  var TYPES = { nuage: ['☁️', 'Nuage de mots'], sondage: ['📊', 'Sondage'], etoiles: ['⭐', 'Étoiles'], quiz: ['🎯', 'Quiz'], note: ['🔟', 'Note sur 10'], questions: ['🙋', 'Questions'], questionnaire: ['📝', 'Questionnaire'] };
  var SOUFFLEUR = {
    nuage: 'Sortez votre téléphone, scannez le QR « Mon espace » au dos de votre badge. Un mot, ou un émoji : tout s\'affiche en direct.',
    sondage: 'Votre badge, le QR « Mon espace », et un seul toucher pour voter. Les résultats tombent en direct.',
    etoiles: 'Depuis votre espace participant, donnez de 1 à 5 étoiles. Le score s\'affiche en direct.',
    quiz: 'Petit quiz ! Répondez depuis votre espace participant. On dévoile la bonne réponse dans quelques secondes.',
    note: 'Depuis votre espace participant, une note de 0 à 10.',
    questionnaire: 'Sortez votre badge, scannez le QR « Mon espace participant » avec l\'appareil photo, puis touchez « Répondre maintenant ». Deux minutes suffisent.',
    qa: 'Vos questions pour l\'intervenant : depuis votre espace, rubrique « Questions ouvertes ». Votez pour celles des autres, les plus demandées passent en premier.'
  };
  var MODES = { auto: 'l\'animation en cours', questions: 'les questions', accueil: 'l\'accueil', noir: 'un écran noir' };

  function lireLocal(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function ecrireLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } }
  function maintenant() { return Date.now() + ecart; }
  function deux(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(t) { var d = new Date(t); return deux(d.getHours()) + ':' + deux(d.getMinutes()); }
  function duree(ms) {
    var neg = ms < 0, s = Math.floor(Math.abs(ms) / 1000), hrs = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (hrs >= 24) return (neg ? '+' : '') + Math.floor(hrs / 24) + ' j ' + (hrs % 24) + ' h';
    return (neg ? '+' : '') + (hrs ? hrs + ':' + deux(m) : deux(m)) + ':' + deux(sec);
  }
  function libelleJour(j) { return /^\d{4}-\d{2}-\d{2}$/.test(j) ? new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : (j || 'Sans date'); }
  function etat(enLigne) { var e = $('#rg-etat'); e.className = 'rg-etat' + (enLigne ? '' : ' hors'); e.lastChild.textContent = enLigne ? 'En ligne' : 'Réseau lent'; }
  function module(op, data, opts) { return JEF.post('module', { data: Object.assign({ op: op }, data || {}) }, opts); }

  // ----- Chargement ---------------------------------------------------------------
  function charger() {
    return module('regie_lire', {}, { delai: 30000 }).then(function (r) {
      R = r; ecart = r.maintenant - Date.now(); etat(true);
      cleEcranLocal = (String(r.ecran).match(/[?&]k=([^&]+)/) || [])[1] || '';
      $('#rg-edition').textContent = r.edition + ' - ' + r.dates;
      var jours = r.lignes.map(function (l) { return l.jour; }).filter(function (j, i, a) { return a.indexOf(j) === i; });
      var auj = new Date(maintenant()), iso = auj.getFullYear() + '-' + deux(auj.getMonth() + 1) + '-' + deux(auj.getDate());
      var demande = (location.hash.match(/seq=([A-Z0-9-]+)/) || [])[1];
      if (demande && !choisie) { var x = r.lignes.filter(function (l) { return l.id === demande; })[0]; if (x) { jour = x.jour; choisie = x.id; epingle = true; } }
      if (!jour || jours.indexOf(jour) === -1) jour = jours.indexOf(iso) !== -1 ? iso : (jours[0] || '');
      JEF.rendre('#rg-jour', jours.map(function (j) { return h`<option value="${j}" ${brut(j === jour ? 'selected' : '')}>${libelleJour(j)}${j === iso ? ' (aujourd\'hui)' : ''}</option>`; }));
      appliquerQa(r.qa);
      rendreConducteur(); rendreAnimations(); rendreModes(r.modeEcran);
    }).catch(function (e) { etat(false); JEF.toast(e.message, 'erreur'); });
  }

  // ----- Déroulé ------------------------------------------------------------------
  function lignesDuJour() {
    var l = R ? R.lignes.filter(function (x) { return x.jour === jour; }) : [];
    l.forEach(function (x, i) { if (x.debut && !x.fin) { var s = l.slice(i + 1).filter(function (y) { return y.debut; })[0]; x.finCalc = s ? s.debut : null; } else x.finCalc = x.fin; });
    return l;
  }
  function situation() {
    var l = lignesDuJour(), t = maintenant(), enCours = null;
    l.forEach(function (x) { if (x.debut && x.debut <= t && (!x.finCalc || t < x.finCalc)) enCours = x; });
    return { l: l, enCours: enCours, suivante: l.filter(function (x) { return x.debut && x.debut > t; })[0] || null, t: t };
  }
  function sequenceChoisie() {
    var s = situation();
    if (!epingle) return s.enCours || s.suivante || null;
    return R.lignes.filter(function (x) { return x.id === choisie; })[0] || null;
  }
  function rendreMaintenant() {
    if (!R) return;
    var s = situation(), c = s.enCours, n = s.suivante;
    $('#rg-horloge').textContent = hhmm(s.t);
    var bloc;
    if (c) {
      var reste = c.finCalc ? c.finCalc - s.t : null, total = c.finCalc ? c.finCalc - c.debut : null, pct = total ? Math.min(100, Math.round((s.t - c.debut) / total * 100)) : 0;
      bloc = h`<div class="rg-etiquette">En cours${c.type ? ' - ' + c.type : ''}${c.salle ? ' - ' + c.salle : ''}</div>
        <h2>${c.theme}</h2>${c.intervenants ? h`<p class="rg-qui">🎤 ${c.intervenants}</p>` : ''}
        <div class="rg-temps"><span>${c.heure}${c.finCalc ? ' - ' + hhmm(c.finCalc) : ''}</span>${reste !== null ? h`<b class="${reste < 0 ? 'depasse' : reste < 300000 ? 'bientot' : ''}">${duree(reste)}</b>` : ''}</div>
        ${total ? h`<div class="rg-jauge"><i style="width:${pct}%;"></i></div>` : ''}
        <div class="rg-actions-seq">${c.support ? h`<a class="rg-btn" href="${c.support}" target="_blank" rel="noopener">📎 Ouvrir le support</a>` : ''}${c.diaporama ? h`<span class="rg-tag">Diaporama ${c.diaporama}</span>` : ''}</div>
        ${c.notes ? h`<p class="rg-notes">📝 ${c.notes}</p>` : ''}`;
    } else {
      var fini = s.l.length && s.l.every(function (x) { return !x.debut || (x.finCalc || x.debut) <= s.t; });
      bloc = h`<div class="rg-etiquette">${s.l.length ? (fini ? 'Journée terminée' : 'Entre deux séquences') : 'Planning vide'}</div><h2>${s.l.length ? (fini ? 'Fin du programme du jour' : 'En attente') : 'Construisez le planning dans le cockpit'}</h2>`;
    }
    var suiv = n ? h`<div class="rg-suivante"><div class="rg-etiquette">Ensuite, dans ${duree(n.debut - s.t)}</div><b>${n.heure} - ${n.theme}</b>${n.intervenants ? h`<small>${n.intervenants}</small>` : ''}</div>` : '';
    JEF.rendre('#rg-maintenant', h`${bloc}${suiv}`);
    var ch = sequenceChoisie();
    $$('#rg-conducteur li[data-id]').forEach(function (li) {
      var x = s.l.filter(function (y) { return y.id === li.getAttribute('data-id'); })[0];
      li.classList.toggle('passe', !!(x && x.debut && (x.finCalc || x.debut) <= s.t && x !== c));
      li.classList.toggle('actif', x === c);
      li.classList.toggle('choisie', !!(ch && x && ch.id === x.id));
    });
  }
  function rendreConducteur() {
    var l = lignesDuJour();
    JEF.rendre('#rg-conducteur', l.length ? l.map(function (x) {
      var nbA = (R.impulsions || []).filter(function (a) { return a.sequence && a.sequence === x.id; }).length;
      return h`<li data-id="${x.id}" tabindex="0"><span class="rg-h">${x.heure || '-'}</span><span><b>${x.theme}</b>${x.intervenants ? h`<small>${x.intervenants}</small>` : ''}</span>
        <span class="rg-d">${nbA ? '✨' + nbA + ' ' : ''}${x.duree ? x.duree + ' min' : ''}</span>${x.duree ? h`<button class="rg-btn rg-mini" data-chrono="${x.duree}" title="Régler le chrono">⏱</button>` : h`<span></span>`}</li>`;
    }) : h`<li class="rg-vide">Aucune séquence ce jour-là.</li>`);
    $$('#rg-conducteur li[data-id]').forEach(function (li) { li.addEventListener('click', function (e) {
      if (e.target.closest('[data-chrono]')) return;
      var id = li.getAttribute('data-id');
      if (epingle && choisie === id) { epingle = false; choisie = null; } else { epingle = true; choisie = id; }
      rendreMaintenant(); rendreAnimations(); rendreQa();
      if (window.matchMedia('(max-width: 1100px)').matches) afficherCol('anims');
    }); });
    $$('[data-chrono]').forEach(function (b) { b.addEventListener('click', function () { $('#rg-chrono-duree').value = b.getAttribute('data-chrono'); razChrono(); JEF.toast('Chrono réglé sur ' + b.getAttribute('data-chrono') + ' min', 'ok'); }); });
    rendreMaintenant();
  }

  // ----- Chrono ---------------------------------------------------------------------
  var chrono = lireLocal('jef_regie_chrono', { debut: 0, cumul: 0, marche: false });
  function ecoule() { return chrono.cumul + (chrono.marche ? Date.now() - chrono.debut : 0); }
  function rendreChrono() {
    var prevu = Math.max(1, Number($('#rg-chrono-duree').value) || 30) * 60000, e = ecoule(), reste = prevu - e, z = $('#rg-chrono');
    z.textContent = duree(reste);
    z.className = 'rg-chrono-temps' + (reste < 0 ? ' depasse' : reste < 300000 ? ' bientot' : '');
    $('#rg-chrono-jauge').style.width = Math.min(100, Math.round(e / prevu * 100)) + '%';
    $('#rg-chrono-go').textContent = chrono.marche ? '⏸ Pause' : (chrono.cumul ? '▶ Reprendre' : '▶ Démarrer');
  }
  function basculerChrono() { if (chrono.marche) { chrono.cumul = ecoule(); chrono.marche = false; } else { chrono.debut = Date.now(); chrono.marche = true; } ecrireLocal('jef_regie_chrono', chrono); rendreChrono(); }
  function razChrono() { chrono = { debut: 0, cumul: 0, marche: false }; ecrireLocal('jef_regie_chrono', chrono); rendreChrono(); }
  $('#rg-chrono-go').addEventListener('click', basculerChrono);
  $('#rg-chrono-raz').addEventListener('click', razChrono);
  $('#rg-chrono-duree').addEventListener('input', rendreChrono);

  // ----- Animations -----------------------------------------------------------------
  function rendreAnimations() {
    if (!R) return;
    var A = R.impulsions || [], seq = sequenceChoisie(), actif = A.filter(function (a) { return a.id === R.active; })[0];
    $('#rg-direct').className = 'rg-direct' + (R.active ? ' on' : '');
    JEF.rendre('#rg-direct', R.active ? h`<i></i>En direct` : 'Rien en direct');
    var deSeq = seq ? A.filter(function (a) { return a.sequence === seq.id; }) : [];
    var autres = A.filter(function (a) { return deSeq.indexOf(a) === -1; });
    var groupes = {}, ordre = [];
    autres.forEach(function (a) { var m = a.moment || 'Libre'; if (!groupes[m]) { groupes[m] = []; ordre.push(m); } groupes[m].push(a); });
    var ligne = function (a) {
      var t = TYPES[a.type] || ['', a.type], enCours = a.id === R.active;
      return h`<div class="rg-anim ${enCours ? 'actif' : ''} ${a.etat === 'Terminée' ? 'faite' : ''}"><span class="rg-ico">${t[0]}</span><span><b>${a.question || t[1]}</b><small>${t[1]} - ${a.reponses} réponse(s)${a.etat === 'Terminée' ? ' - déjà lancée' : ''}</small></span>
        ${enCours ? h`<span class="rg-encours">En cours</span>` : h`<button class="rg-btn rg-btn-fort" data-lancer="${a.id}">▶ Lancer</button>`}</div>`;
    };
    JEF.rendre('#rg-anims', A.length ? h`${deSeq.length ? h`<div class="rg-groupe rg-groupe-seq">Pour « ${seq.theme} »</div>${deSeq.map(ligne)}` : ''}
      ${ordre.map(function (m) { return h`<div class="rg-groupe">${m}</div>${groupes[m].map(ligne)}`; })}` : h`<p class="rg-vide">Aucune animation. Dans le cockpit, page Animations, la bibliothèque en propose 18 prêtes à l'emploi.</p>`);
    $$('[data-lancer]').forEach(function (b) { b.addEventListener('click', function () { lancer(b.getAttribute('data-lancer'), b); }); });
    rendreLive(actif);
  }
  function rendreLive(actif) {
    var z = $('#rg-live');
    if (!actif) { JEF.rendre(z, ''); return; }
    var i = ecranData && ecranData.impulsion && ecranData.impulsion.id === actif.id ? ecranData.impulsion : null;
    var corps = '';
    if (i) {
      if (i.type === 'nuage') corps = h`<div class="rg-mots">${(i.mots || []).slice(0, 30).map(function (m) { return h`<span style="font-size:${Math.min(26, 12 + m[1] * 3)}px;">${m[0]}</span>`; })}</div>`;
      else if (i.type === 'sondage' || i.type === 'quiz') { var tot = i.n || 1; corps = h`${(i.comptes || []).map(function (c) { var bonne = i.revele && c[0] === i.bonne; return h`<div class="rg-sond ${bonne ? 'bonne' : ''}"><span>${bonne ? '✓ ' : ''}${c[0]}${!i.revele && actif.bonne === c[0] ? ' (bonne)' : ''}</span><i style="width:${Math.round(c[1] / tot * 100)}%;"></i><b>${c[1]}</b></div>`; })}`; }
      else if (i.type === 'etoiles' || i.type === 'note') corps = h`<div class="rg-moyenne">${i.moyenne === null ? '-' : String(i.moyenne).replace('.', ',')}<small>/ ${i.type === 'etoiles' ? 5 : 10}</small></div>`;
      else if (i.type === 'questionnaire') corps = h`<div class="rg-moyenne">${i.n}<small>/ ${i.attendus || '?'} réponses</small></div>`;
    }
    JEF.rendre(z, h`<div class="rg-live"><div class="rg-live-tete"><b>${actif.question}</b><span>${i ? i.n : 0} participation(s)</span></div>${corps}
      <div class="rg-souffleur"><b>À dire au micro</b>${SOUFFLEUR[actif.type] || ''}</div>
      <div class="rg-live-actions">${actif.type === 'quiz' && !(i && i.revele) ? h`<button class="rg-btn rg-btn-fort" id="rg-reveler">🎯 Dévoiler la réponse (R)</button>` : ''}
        <button class="rg-btn rg-btn-danger" id="rg-stop">■ Arrêter (S)</button></div></div>`);
    var rv = $('#rg-reveler'); if (rv) rv.addEventListener('click', reveler);
    $('#rg-stop').addEventListener('click', function () { lancer('', this); });
  }
  function lancer(id, bouton) {
    var retablir = JEF.attente(bouton, id ? 'Lancement' : 'Arrêt');
    module('imp_lancer', { id: id }).then(function (r) {
      retablir(); R.impulsions = r.impulsions; R.active = r.active;
      rendreAnimations(); tourEcran();
      if (id) JEF.toast('En direct. Basculez sur l\'écran (Alt + Tab).', 'ok');
    }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
  }
  function reveler() {
    module('imp_reveler').then(function (r) { recevoirEcran(r); JEF.toast('Bonne réponse dévoilée', 'ok'); }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
  }

  // ----- Écran : pilote, aperçu, relais local -------------------------------------------
  function rendreModes(m) {
    var mode = (m && m.mode) || 'auto';
    $$('#rg-modes [data-mode]').forEach(function (b) { b.classList.toggle('actif', b.getAttribute('data-mode') === mode); });
  }
  function changerMode(mode) {
    rendreModes({ mode: mode });
    if (ecranData) { ecranData.mode = mode; diffuser(); }
    module('ecran_mode', { mode: mode }).then(function () { tourEcran(); }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
  }
  $$('#rg-modes [data-mode]').forEach(function (b) { b.addEventListener('click', function () { changerMode(b.getAttribute('data-mode')); }); });
  function diffuser() { if (canal && ecranData && cleEcranLocal) try { canal.postMessage({ k: cleEcranLocal, r: ecranData }); } catch (e) { /* rien */ } }
  function recevoirEcran(r) {
    ecranData = r; etat(true); diffuser(); rendreModes({ mode: r.mode });
    var i = r.impulsion, q = r.questions, txt;
    if (r.mode === 'noir') txt = '⬛ Écran noir';
    else if (r.mode === 'questions') txt = q && q.une ? '🙋 « ' + q.une.texte.slice(0, 60) + ' »' : '🙋 Questions (' + (q ? q.liste.length : 0) + ')';
    else if (r.mode === 'accueil' || !i) txt = '🏠 Accueil de l\'édition';
    else txt = (TYPES[i.type] || [''])[0] + ' ' + (i.question || i.titreQuestionnaire || '') + ' - ' + i.n + ' rép.';
    $('#rg-mini').textContent = txt;
    var actif = (R && R.impulsions || []).filter(function (a) { return a.id === R.active; })[0];
    if (actif) rendreLive(actif);
  }
  function tourEcran() {
    if (document.hidden && !fenetreEcran) return;
    module('imp_ecran', {}, { delai: 15000, essais: 0 }).then(recevoirEcran).catch(function () { etat(false); });
  }
  function suivreEcran() { clearInterval(minuteurEcran); tourEcran(); minuteurEcran = setInterval(tourEcran, 3000); }

  // ----- Questions de la salle --------------------------------------------------------------
  function appliquerQa(q) {
    if (!q) return;
    QA = q; rendreQa();
    var att = QA.questions.filter(function (x) { return x.etat === 'En attente'; }).length, b = $('#rg-qa-badge');
    b.hidden = !att; b.textContent = att;
    clearTimeout(minuteurQa);
    if (QA.serie) minuteurQa = setTimeout(function () { module('qa_lire', {}, { essais: 0, delai: 15000 }).then(appliquerQa).catch(function () { minuteurQa = setTimeout(function () { appliquerQa(QA); }, 4000); }); }, 4000);
  }
  function rendreQa() {
    if (!QA) return;
    var z = $('#rg-qa'), s = QA.serie, seq = sequenceChoisie();
    if (!s) {
      JEF.rendre(z, h`<div class="rg-carte-tete"><b>Questions de la salle</b><span class="rg-direct">Fermées</span></div>
        <p class="rg-vide">Ouvrez une série au début de la présentation. Tous les profils pourront poser leurs questions depuis leur espace.</p>
        <div class="rg-qa-ouvrir"><label for="rg-qa-titre">Présentation</label><input id="rg-qa-titre" type="text" value="${seq ? seq.theme + (seq.intervenants ? ' - ' + seq.intervenants : '') : ''}" placeholder="Titre de la présentation">
          <label class="rg-case"><input type="checkbox" id="rg-qa-mod" checked> Valider chaque question avant l'écran</label>
          <button class="rg-btn rg-btn-fort" id="rg-qa-go">🙋 Ouvrir les questions</button></div>
        ${QA.series.length ? h`<div class="rg-groupe">Séries précédentes</div>${QA.series.slice().reverse().slice(0, 6).map(function (x) { return h`<div class="rg-serie"><span>${x.titre}<small>${x.etat} - ${x.questions} question(s)</small></span>${x.etat !== 'Fermée' ? h`<button class="rg-btn rg-mini" data-rouvrir="${x.id}">Rouvrir</button>` : ''}</div>`; })}` : ''}`);
      $('#rg-qa-go').addEventListener('click', function () {
        var titre = $('#rg-qa-titre').value.trim();
        if (!titre) { JEF.toast('Donnez le titre de la présentation.', 'erreur'); return; }
        var retablir = JEF.attente(this, 'Ouverture');
        module('qa_ouvrir', { sequence: seq ? seq.id : 'LIBRE-' + Date.now().toString(36).toUpperCase(), titre: titre, moderation: $('#rg-qa-mod').checked }).then(function (r) { retablir(); appliquerQa(r); JEF.toast('Questions ouvertes', 'ok'); }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
      });
      $$('[data-rouvrir]').forEach(function (b) { b.addEventListener('click', function () { module('qa_ouvrir', { id: b.getAttribute('data-rouvrir') }).then(appliquerQa).catch(function (e) { JEF.toast(e.message, 'erreur'); }); }); });
      return;
    }
    var par = function (e) { return QA.questions.filter(function (x) { return x.etat === e; }); };
    var carte = function (q, boutons) {
      return h`<div class="rg-qq ${q.etat === 'À l\'écran' ? 'une' : ''}"><b class="rg-votes">${q.votes}</b><span>${q.texte}<small>${q.nom}${q.organismeReel ? ', ' + q.organismeReel : ''}${q.anonyme ? ' (anonyme à l\'écran)' : ''}</small></span><span class="rg-qq-btns">${boutons}</span></div>`;
    };
    var b = function (id, action, txt, cls, titre) { return h`<button class="rg-btn rg-mini ${cls || ''}" data-qa="${id}" data-action="${action}" title="${titre}">${txt}</button>`; };
    var attente = par('En attente'), une = par('À l\'écran'), validees = par('Validée'), repondues = par('Répondue'), rejetees = par('Rejetée');
    JEF.rendre(z, h`<div class="rg-carte-tete"><b>Questions : ${s.titre}</b><span class="rg-direct on"><i></i>Ouvertes</span></div>
      <div class="rg-souffleur"><b>À dire au micro</b>${SOUFFLEUR.qa}</div>
      <div class="rg-qa-outils"><button class="rg-btn" id="rg-qa-ecran">📺 Afficher les questions</button><button class="rg-btn rg-btn-danger" id="rg-qa-fermer">Fermer la série</button></div>
      ${s.moderation ? h`<div class="rg-groupe">À valider (${attente.length})</div>${attente.length ? attente.map(function (q) { return carte(q, h`${b(q.id, 'valider', '✓ Valider', 'rg-ok', 'Visible par la salle')}${b(q.id, 'ecran', '★', '', 'Valider et mettre à la une')}${b(q.id, 'rejeter', '✕', '', 'Ne pas retenir')}`); }) : h`<p class="rg-vide">Rien à valider.</p>`}` : ''}
      ${une.length ? h`<div class="rg-groupe">À la une</div>${une.map(function (q) { return carte(q, h`${b(q.id, 'repondue', '✓ Répondue', 'rg-ok', 'Marquer répondue')}${b(q.id, 'valider', '↓', '', 'Retirer de la une')}`); })}` : ''}
      <div class="rg-groupe">Validées, par votes (${validees.length})</div>${validees.length ? validees.map(function (q) { return carte(q, h`${b(q.id, 'ecran', '★ À la une', 'rg-btn-fort', 'Mettre à la une')}${b(q.id, 'repondue', '✓', '', 'Marquer répondue')}${b(q.id, 'rejeter', '✕', '', 'Retirer')}`); }) : h`<p class="rg-vide">Aucune pour l'instant.</p>`}
      ${repondues.length || rejetees.length ? h`<details class="rg-plie"><summary>Répondues (${repondues.length}) et non retenues (${rejetees.length})</summary>${repondues.concat(rejetees).map(function (q) { return carte(q, b(q.id, q.etat === 'Rejetée' ? 'valider' : 'valider', '↺', '', 'Remettre dans la liste')); })}</details>` : ''}`);
    $$('[data-qa]', z).forEach(function (bt) { bt.addEventListener('click', function () {
      bt.disabled = true;
      module('qa_moderer', { question: bt.getAttribute('data-qa'), action: bt.getAttribute('data-action') }).then(function (r) { appliquerQa(r); if (bt.getAttribute('data-action') === 'ecran') { rendreModes({ mode: 'questions' }); tourEcran(); } }).catch(function (e) { bt.disabled = false; JEF.toast(e.message, 'erreur'); });
    }); });
    $('#rg-qa-ecran').addEventListener('click', function () { changerMode('questions'); });
    $('#rg-qa-fermer').addEventListener('click', function () {
      if (!window.confirm('Fermer les questions de « ' + s.titre + ' » ? Elles restent archivées.')) return;
      module('qa_fermer', {}).then(function (r) { appliquerQa(r); tourEcran(); JEF.toast('Série fermée et archivée', 'ok'); }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
    });
  }

  // ----- Écran de projection dans une seconde fenêtre -------------------------------------
  $('#rg-ecran').addEventListener('click', function () {
    if (!R) return;
    if (fenetreEcran && !fenetreEcran.closed) { fenetreEcran.focus(); return; }
    fenetreEcran = window.open(R.ecran, 'jef-ecran', 'popup,width=1280,height=720');
    if (!fenetreEcran) JEF.toast('Fenêtre bloquée : autorisez les fenêtres pour ce site, ou copiez le lien de l\'écran.', 'erreur');
    else { JEF.toast('Glissez la fenêtre sur le vidéoprojecteur, puis F11.', 'ok'); setTimeout(diffuser, 1500); }
  });
  $('#rg-copier').addEventListener('click', function () {
    if (!R) return;
    (navigator.clipboard ? navigator.clipboard.writeText(R.ecran) : Promise.reject()).then(function () { JEF.toast('Lien de l\'écran copié', 'ok'); }).catch(function () { window.prompt('Lien de l\'écran de projection', R.ecran); });
  });
  $('#rg-jour').addEventListener('change', function () { jour = this.value; epingle = false; choisie = null; rendreConducteur(); rendreAnimations(); rendreQa(); });

  // ----- Colonnes sur tablette et téléphone ------------------------------------------------
  function afficherCol(c) {
    $$('#rg-onglets [data-col]').forEach(function (b) { b.classList.toggle('actif', b.getAttribute('data-col') === c); });
    document.body.setAttribute('data-col', c);
  }
  $$('#rg-onglets [data-col]').forEach(function (b) { b.addEventListener('click', function () { afficherCol(b.getAttribute('data-col')); }); });
  afficherCol('deroule');

  // ----- Raccourcis clavier ----------------------------------------------------------------
  var RACCOURCIS = [['Espace', 'Chrono : démarrer ou pause'], ['A', 'Écran : animation en cours'], ['Q', 'Écran : questions'], ['H', 'Écran : accueil'], ['N', 'Écran : noir'], ['R', 'Dévoiler la réponse du quiz'], ['S', 'Arrêter l\'animation']];
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || /input|textarea|select/i.test((e.target || {}).tagName || '')) return;
    var k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); basculerChrono(); }
    else if (k === 'a') changerMode('auto'); else if (k === 'q') changerMode('questions'); else if (k === 'h') changerMode('accueil'); else if (k === 'n') changerMode('noir');
    else if (k === 'r' && $('#rg-reveler')) reveler();
    else if (k === 's' && R && R.active) lancer('', $('#rg-stop'));
  });
  $('#rg-aide-clavier').addEventListener('click', function () { JEF.toast(RACCOURCIS.map(function (r) { return r[0] + ' : ' + r[1]; }).join(' · ')); });

  // ----- Démarrage --------------------------------------------------------------------------
  function ouvrirApp(s) {
    if (s.role !== 'admin' && s.role !== 'utilisateur') { JEF.oublierSession(); location.reload(); return; }
    $('#connexion').hidden = true; $('#app').hidden = false;
    JEF.ecranAttente('Ouverture de la régie', 'Planning, animations et questions');
    charger().then(function () { JEF.ecranAttente(null); suivreEcran(); });
    setInterval(function () { rendreMaintenant(); rendreChrono(); }, 1000);
    setInterval(function () { if (!document.hidden) charger(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { charger(); tourEcran(); } });
    rendreChrono();
  }
  JEF.appli('regie.html', function (dispo) { $('#rg-installer').hidden = !dispo; });
  $('#rg-installer').addEventListener('click', JEF.installer);
  JEF.onSessionExpiree = function () { JEF.toast('Session expirée : reconnectez-vous.', 'erreur'); setTimeout(function () { location.reload(); }, 1500); };
  var session = JEF.session();
  if (session) ouvrirApp(session);
  else JEF.config().then(function (cfg) { JEF.connexionGoogle(cfg.googleClientId, ouvrirApp, $('#message-connexion')); })
    .catch(function (e) { $('#message-connexion').textContent = 'Serveur injoignable : ' + e.message; });
})();
