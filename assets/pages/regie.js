/* ==========================================================================
   Régie du jour J : séquence en cours et suivante d'après le Programme, chrono
   de l'intervenant, lancement des animations, aperçu de l'écran et modération.
   Les PowerPoint restent dans PowerPoint : la régie ouvre l'écran de projection
   dans une seconde fenêtre, la bascule se fait au clavier (Alt + Tab).
   ========================================================================== */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$;
  var R = null, ecart = 0, jour = '', minuteurApercu = null, fenetreEcran = null;
  var TYPES = { nuage: ['☁️', 'Nuage de mots'], sondage: ['📊', 'Sondage'], note: ['⭐', 'Note de 0 à 10'], questions: ['🙋', 'Questions de la salle'], questionnaire: ['📝', 'Questionnaire'] };

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
  function libelleJour(j) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(j)) return j || 'Sans date';
    return new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function etat(enLigne) { var e = $('#rg-etat'); e.className = 'rg-etat' + (enLigne ? '' : ' hors'); e.lastChild.textContent = enLigne ? 'En ligne' : 'Hors ligne'; }

  // ----- Chargement ---------------------------------------------------------
  function charger() {
    return JEF.post('module', { data: { op: 'regie_lire' } }, { delai: 30000 }).then(function (r) {
      R = r; ecart = r.maintenant - Date.now(); etat(true);
      $('#rg-edition').textContent = r.edition + ' - ' + r.dates;
      var jours = r.lignes.map(function (l) { return l.jour; }).filter(function (j, i, a) { return a.indexOf(j) === i; });
      var auj = new Date(maintenant()); var iso = auj.getFullYear() + '-' + deux(auj.getMonth() + 1) + '-' + deux(auj.getDate());
      if (!jour || jours.indexOf(jour) === -1) jour = jours.indexOf(iso) !== -1 ? iso : (jours[0] || '');
      JEF.rendre('#rg-jour', jours.map(function (j) { return h`<option value="${j}" ${JEF.brut(j === jour ? 'selected' : '')}>${libelleJour(j)}${j === iso ? ' (aujourd\'hui)' : ''}</option>`; }));
      rendreConducteur(); rendreAnimations(); suivreApercu();
    }).catch(function (e) { etat(false); JEF.toast(e.message, 'erreur'); });
  }

  // ----- Séquence en cours, suivante, conducteur ------------------------------
  function lignesDuJour() {
    var l = R ? R.lignes.filter(function (x) { return x.jour === jour; }) : [];
    // Sans durée, une séquence se termine au début de la suivante.
    l.forEach(function (x, i) { if (x.debut && !x.fin) { var s = l.slice(i + 1).filter(function (y) { return y.debut; })[0]; x.finCalc = s ? s.debut : null; } else x.finCalc = x.fin; });
    return l;
  }
  function situation() {
    var l = lignesDuJour(), t = maintenant(), enCours = null, suivante = null;
    l.forEach(function (x) { if (x.debut && x.debut <= t && (!x.finCalc || t < x.finCalc)) enCours = x; });
    suivante = l.filter(function (x) { return x.debut && x.debut > t; })[0] || null;
    return { l: l, enCours: enCours, suivante: suivante, t: t };
  }
  function rendreMaintenant() {
    if (!R) return;
    var s = situation(), c = s.enCours, n = s.suivante;
    $('#rg-horloge').textContent = hhmm(s.t);
    var bloc;
    if (c) {
      var reste = c.finCalc ? c.finCalc - s.t : null, total = c.finCalc ? c.finCalc - c.debut : null;
      var pct = total ? Math.min(100, Math.round((s.t - c.debut) / total * 100)) : 0;
      bloc = h`<div class="rg-etiquette">En cours ${c.type ? '- ' + c.type : ''}</div>
        <h2>${c.theme}</h2>${c.intervenants ? h`<p class="rg-qui">${c.intervenants}</p>` : ''}
        <div class="rg-temps"><span>${c.heure}${c.finCalc ? ' - ' + hhmm(c.finCalc) : ''}</span>${reste !== null ? h`<b class="${reste < 300000 ? 'bientot' : ''}">${duree(reste)}</b><small>restant</small>` : ''}</div>
        ${total ? h`<div class="rg-jauge"><i style="width:${pct}%;"></i></div>` : ''}
        ${c.diaporama ? h`<p class="rg-diapo">Diaporama : <b>${c.diaporama}</b></p>` : ''}${c.notes ? h`<p class="rg-notes">${c.notes}</p>` : ''}`;
    } else {
      var l = s.l, fini = l.length && l.every(function (x) { return !x.debut || (x.finCalc || x.debut) <= s.t; });
      bloc = h`<div class="rg-etiquette">${l.length ? (fini ? 'Journée terminée' : 'Pas de séquence en cours') : 'Programme vide'}</div>
        <h2>${l.length ? (fini ? 'Fin du programme du jour' : 'En attente') : 'Ajoutez le programme dans le cockpit'}</h2>`;
    }
    var suiv = n ? h`<div class="rg-suivante"><div class="rg-etiquette">Ensuite, dans ${duree(n.debut - s.t)}</div><b>${n.heure} - ${n.theme}</b>${n.intervenants ? h`<small>${n.intervenants}</small>` : ''}${n.diaporama ? h`<small>Diaporama : ${n.diaporama}</small>` : ''}</div>` : '';
    JEF.rendre('#rg-maintenant', h`${bloc}${suiv}`);
    $$('#rg-conducteur li').forEach(function (li) {
      var x = s.l[Number(li.getAttribute('data-i'))];
      li.classList.toggle('passe', !!(x && x.debut && (x.finCalc || x.debut) <= s.t && x !== c));
      li.classList.toggle('actif', x === c);
    });
  }
  function rendreConducteur() {
    var l = lignesDuJour();
    JEF.rendre('#rg-conducteur', l.length ? l.map(function (x, i) {
      return h`<li data-i="${i}"><span class="rg-h">${x.heure || '-'}</span><span><b>${x.theme}</b>${x.intervenants ? h`<small>${x.intervenants}</small>` : ''}</span>
        <span class="rg-d">${x.duree ? x.duree + ' min' : ''}</span>${x.duree ? h`<button class="rg-btn rg-mini" data-chrono="${x.duree}" title="Régler le chrono sur cette durée">⏱</button>` : ''}</li>`;
    }) : h`<li class="rg-vide">Aucune séquence ce jour-là.</li>`);
    $$('[data-chrono]').forEach(function (b) { b.addEventListener('click', function () { $('#rg-chrono-duree').value = b.getAttribute('data-chrono'); razChrono(); JEF.toast('Chrono réglé sur ' + b.getAttribute('data-chrono') + ' min', 'ok'); }); });
    rendreMaintenant();
  }

  // ----- Chrono de l'intervenant (gardé si la page se recharge) -----------------
  var chrono = lireLocal('jef_regie_chrono', { debut: 0, cumul: 0, marche: false });
  function ecoule() { return chrono.cumul + (chrono.marche ? Date.now() - chrono.debut : 0); }
  function rendreChrono() {
    var prevu = Math.max(1, Number($('#rg-chrono-duree').value) || 30) * 60000, e = ecoule(), reste = prevu - e;
    var z = $('#rg-chrono');
    z.textContent = duree(reste);
    z.className = 'rg-chrono-temps' + (reste < 0 ? ' depasse' : reste < 300000 ? ' bientot' : '');
    $('#rg-chrono-jauge').style.width = Math.min(100, Math.round(e / prevu * 100)) + '%';
    $('#rg-chrono-go').textContent = chrono.marche ? '⏸ Pause' : (chrono.cumul ? '▶ Reprendre' : '▶ Démarrer');
  }
  function razChrono() { chrono = { debut: 0, cumul: 0, marche: false }; ecrireLocal('jef_regie_chrono', chrono); rendreChrono(); }
  $('#rg-chrono-go').addEventListener('click', function () {
    if (chrono.marche) { chrono.cumul = ecoule(); chrono.marche = false; } else { chrono.debut = Date.now(); chrono.marche = true; }
    ecrireLocal('jef_regie_chrono', chrono); rendreChrono();
  });
  $('#rg-chrono-raz').addEventListener('click', razChrono);
  $('#rg-chrono-duree').addEventListener('input', rendreChrono);

  // ----- Animations -------------------------------------------------------------
  function rendreAnimations() {
    var A = R.impulsions || [];
    $('#rg-direct').className = 'rg-direct' + (R.active ? ' on' : '');
    JEF.rendre('#rg-direct', R.active ? h`<i></i>En direct` : 'Rien en direct');
    $('#rg-stop').hidden = !R.active;
    JEF.rendre('#rg-anims', A.length ? A.map(function (a) {
      var t = TYPES[a.type] || ['', a.type], actif = a.id === R.active;
      return h`<div class="rg-anim ${actif ? 'actif' : ''}"><span class="rg-ico">${t[0]}</span><span><b>${a.question || t[1]}</b><small>${t[1]} - ${a.moment || 'Libre'} - ${a.reponses} réponse(s)</small></span>
        ${actif ? h`<span class="rg-encours">En cours</span>` : h`<button class="rg-btn rg-btn-fort" data-lancer="${a.id}">▶ Lancer</button>`}</div>`;
    }) : h`<p class="rg-vide">Aucune animation préparée. Créez-les dans le cockpit, page Animation en direct.</p>`);
    $$('[data-lancer]').forEach(function (b) { b.addEventListener('click', function () { lancer(b.getAttribute('data-lancer'), b); }); });
  }
  function lancer(id, bouton) {
    var retablir = JEF.attente(bouton, id ? 'Lancement' : 'Arrêt');
    JEF.post('module', { data: { op: 'imp_lancer', id: id } }).then(function (r) {
      retablir(); R.impulsions = r.impulsions; R.active = r.active; rendreAnimations(); suivreApercu();
      if (id) JEF.toast('En direct. Basculez sur l\'écran de projection (Alt + Tab).', 'ok');
    }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
  }
  $('#rg-stop').addEventListener('click', function () { lancer('', this); });

  // ----- Aperçu de l'écran et modération ------------------------------------------
  function suivreApercu() {
    clearInterval(minuteurApercu);
    if (!R || !R.active) { JEF.rendre('#rg-apercu', h`<p class="rg-vide">Aucune animation en cours. L'écran affiche l'accueil de l'édition.</p>`); return; }
    var tour = function () {
      if (document.hidden) return;
      JEF.post('module', { data: { op: 'imp_ecran' } }, { delai: 15000, essais: 0 }).then(rendreApercu).catch(function () { etat(false); });
    };
    tour(); minuteurApercu = setInterval(tour, 3000);
  }
  function rendreApercu(r) {
    etat(true);
    var a = r.impulsion;
    if (!a) { JEF.rendre('#rg-apercu', h`<p class="rg-vide">L'animation vient de s'arrêter.</p>`); return; }
    var corps = '';
    if (a.type === 'nuage') corps = h`<div class="rg-mots">${(a.mots || []).slice(0, 25).map(function (m) { return h`<span style="font-size:${Math.min(26, 12 + m[1] * 3)}px;">${m[0]}</span>`; })}</div>`;
    if (a.type === 'sondage') { var tot = (a.comptes || []).reduce(function (s, c) { return s + c[1]; }, 0) || 1; corps = h`${(a.comptes || []).map(function (c) { return h`<div class="rg-sond"><span>${c[0]}</span><i style="width:${Math.round(c[1] / tot * 100)}%;"></i><b>${c[1]}</b></div>`; })}`; }
    if (a.type === 'note') corps = h`<div class="rg-moyenne">${a.moyenne === null ? '-' : a.moyenne}<small>/ 10</small></div>`;
    if (a.type === 'questionnaire') corps = h`<div class="rg-moyenne">${a.n}<small>/ ${a.attendus || '?'} réponses</small></div>`;
    if (a.type === 'questions') corps = h`<div class="rg-questions">${(a.questions || []).map(function (q) {
      return h`<div class="rg-q ${q.repondue ? 'repondue' : ''}"><b>${q.votes}</b><span>${q.texte}</span>
        <button class="rg-btn rg-mini" data-moderer="repondue" data-q="${q.id}" title="Marquer répondue">${q.repondue ? '↺' : '✓'}</button><button class="rg-btn rg-mini" data-moderer="masquer" data-q="${q.id}" title="Masquer de l'écran">✕</button></div>`;
    })}${(a.questions || []).length ? '' : h`<p class="rg-vide">Pas encore de question.</p>`}</div>`;
    JEF.rendre('#rg-apercu', h`<div class="rg-ap-tete"><b>${a.question || a.titreQuestionnaire || ''}</b><span>${a.n} participation(s)</span></div>${corps}`);
    $$('[data-moderer]').forEach(function (b) { b.addEventListener('click', function () {
      JEF.post('module', { data: { op: 'imp_moderer', action: b.getAttribute('data-moderer'), question: b.getAttribute('data-q') } }).then(rendreApercu).catch(function (e) { JEF.toast(e.message, 'erreur'); });
    }); });
  }

  // ----- Écran de projection dans une seconde fenêtre --------------------------------
  $('#rg-ecran').addEventListener('click', function () {
    if (!R) return;
    if (fenetreEcran && !fenetreEcran.closed) { fenetreEcran.focus(); return; }
    fenetreEcran = window.open(R.ecran, 'jef-ecran', 'popup,width=1280,height=720');
    if (!fenetreEcran) JEF.toast('Fenêtre bloquée : autorisez les fenêtres pour ce site, ou copiez le lien de l\'écran.', 'erreur');
    else JEF.toast('Glissez la fenêtre sur le vidéoprojecteur, puis F11 pour le plein écran.', 'ok');
  });
  $('#rg-copier').addEventListener('click', function () {
    if (!R) return;
    (navigator.clipboard ? navigator.clipboard.writeText(R.ecran) : Promise.reject()).then(function () { JEF.toast('Lien de l\'écran copié', 'ok'); })
      .catch(function () { window.prompt('Lien de l\'écran de projection', R.ecran); });
  });
  $('#rg-jour').addEventListener('change', function () { jour = this.value; rendreConducteur(); });

  // ----- Démarrage -----------------------------------------------------------------
  function ouvrirApp(s) {
    if (s.role !== 'admin' && s.role !== 'utilisateur') { JEF.oublierSession(); location.reload(); return; }
    $('#connexion').hidden = true; $('#app').hidden = false;
    JEF.ecranAttente('Ouverture de la régie', 'Programme et animations');
    charger().then(function () { JEF.ecranAttente(null); });
    setInterval(function () { rendreMaintenant(); rendreChrono(); }, 1000);
    setInterval(function () { if (!document.hidden) charger(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) charger(); });
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
