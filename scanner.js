/* ==========================================================================
   Scanner : mode Présence (fenêtre plein écran après chaque scan), mode Contrôle
   (fiche de la personne, sans pointer), mode Borne d'auto-accueil (scanner.html?borne=1).
   Fonctionne hors connexion avec une file d'attente synchronisée.
   ========================================================================== */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$;
  var CLE_FILE = 'jef_file_scans', CLE_LISTE = 'jef_liste_accueil';
  var BORNE = /[?&]borne=1/.test(location.search);
  var personnes = {}, creneaux = [], file = [], scansSession = 0, enCours = false, dernier = { code: '', t: 0 };
  var camera = null, cameraActive = false, cameraEnPause = false, horsLigne = false, mode = 'accueil';
  var pleinOuvert = false, minuteurPlein = null;
  var REPAS_LIB = { JM: 'Jeudi midi', GALA: 'Gala', VM: 'Vendredi midi' };

  // ----- Persistance locale -------------------------------------------------
  function lireLocal(cle, defaut) { try { return JSON.parse(localStorage.getItem(cle) || 'null') || defaut; } catch (e) { return defaut; } }
  function ecrireLocal(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* stockage plein ou interdit */ } }

  function indexer(liste) { personnes = {}; liste.forEach(function (p) { personnes[p.id] = p; }); }

  function majStats() {
    var n = Number($('#creneau').value);
    var presents = Object.keys(personnes).filter(function (id) { return personnes[id]['p' + n]; }).length;
    $('#st-presents').textContent = presents;
    $('#st-session').textContent = scansSession;
    $('#st-file').textContent = file.length;
    $('#synchro').hidden = !file.length;
  }

  function etat(enLigne) {
    horsLigne = !enLigne;
    var e = $('#etat');
    e.className = 'etat' + (enLigne ? '' : ' horsligne');
    $('span', e).textContent = enLigne ? 'En ligne' : 'Hors ligne : les scans sont gardés';
  }

  // ----- Retour sonore et vibration -----------------------------------------
  var audio = null;
  function bip(type) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var notes = type === 'ok' ? [880] : type === 'deja' ? [660, 660] : [220, 180];
      notes.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = f; o.connect(g); g.connect(audio.destination);
        var t = audio.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.16);
      });
    } catch (e) { /* audio indisponible */ }
    if (navigator.vibrate) navigator.vibrate(type === 'ok' ? 80 : type === 'deja' ? [60, 60, 60] : [300, 100, 300]);
  }

  // ----- Fenêtre plein écran ------------------------------------------------
  var VERDICTS = {
    OK: ['ok', '✅', 'Présence enregistrée'], DEJA: ['deja', '⚠️', 'Déjà enregistré'], HORS_LIGNE: ['ok', '✅', 'Enregistré hors ligne'],
    ANNULE: ['ko', '⛔', 'Inscription annulée'], FAUX: ['ko', '⛔', 'Badge non valide'], INCONNU: ['ko', '⛔', 'Badge inconnu'], HORS_CRENEAU: ['deja', '⏸', 'Aucune demi-journée en cours']
  };
  var VERDICTS_BORNE = {
    OK: 'Bienvenue !', DEJA: 'Vous êtes déjà enregistré, bonne journée', HORS_LIGNE: 'Bienvenue !',
    ANNULE: 'Merci de vous présenter à l\'accueil', FAUX: 'Merci de vous présenter à l\'accueil', INCONNU: 'Merci de vous présenter à l\'accueil', HORS_CRENEAU: 'Merci de vous présenter à l\'accueil'
  };

  function ouvrirPlein(r) {
    var v = VERDICTS[r.resultat] || ['ko', '⛔', r.resultat];
    var p = r.personne;
    var z = $('#plein');
    var repas = p && !p.creneauVisite ? Object.keys(p.repas || {}).map(function (c) { return h`<span class="${p.repas[c] ? 'on' : ''}">${REPAS_LIB[c]}</span>`; }) : '';
    var fermeSeul = v[0] === 'ok' || BORNE;
    z.className = 'plein ' + v[0] + (BORNE ? ' borne-plein' : '');
    JEF.rendre(z, h`<div class="plein-contenu">
      <div class="plein-icone">${v[1]}</div>
      <div class="plein-verdict">${BORNE ? VERDICTS_BORNE[r.resultat] || v[2] : v[2]}</div>
      ${p ? h`<div class="plein-qui">${p.prenom} ${p.nom}</div>
        ${p.organisme ? h`<div class="plein-org">${p.organisme}</div>` : ''}
        <span class="plein-profil" style="background:${p.couleur};color:${p.texte || '#fff'};">${p.profil}</span>
        ${p.creneauVisite ? h`<div class="plein-info">Visite : ${p.creneauVisite} - sans repas</div>` : h`<div class="plein-repas">${repas}</div>`}`
        : h`<div class="plein-info">${BORNE ? '' : r.message || ''}</div>`}
      ${!BORNE && (r.alertes || []).length ? h`<div class="plein-alertes">${r.alertes.join(' - ')}</div>` : ''}
      ${!BORNE && p && r.message ? h`<div class="plein-info">${r.message}</div>` : ''}
      ${BORNE && r.resultat === 'OK' && p && /Stagiaire|Bureau/.test(p.profil) ? h`<div class="plein-info">Avant la première conférence, faites votre test d'entrée : scannez le QR « Mon espace participant » de votre badge avec votre téléphone.</div>` : ''}
      <div class="plein-bas">${fermeSeul ? h`<span class="plein-barre"><i></i></span>` : h`<b>Touchez l'écran pour continuer</b>`}</div>
    </div>`);
    z.hidden = false;
    pleinOuvert = true;
    try { z.focus(); } catch (e) { /* rien */ }
    bip(v[0]);
    clearTimeout(minuteurPlein);
    if (fermeSeul) {
      var duree = BORNE ? (v[0] === 'ok' ? 3500 : 6000) : 2000;
      var barre = $('.plein-barre i', z);
      if (barre) { barre.style.animationDuration = duree + 'ms'; }
      minuteurPlein = setTimeout(fermerPlein, duree);
    }
    historiser(v, p, r);
  }

  function fermerPlein() {
    clearTimeout(minuteurPlein);
    $('#plein').hidden = true;
    pleinOuvert = false;
    dernier = { code: dernier.code, t: Date.now() - 2500 }; // le même badge peut être relu 1,5 s après
    if (!BORNE) { try { $('#saisie').focus(); } catch (e) { /* rien */ } }
  }

  function historiser(v, p, r) {
    if (BORNE) return;
    var li = document.createElement('li');
    JEF.rendre(li, h`<b>${v[1]}</b> ${p ? p.prenom + ' ' + p.nom : (r.id || 'Inconnu')}<span>${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>`);
    var hist = $('#historique');
    hist.insertBefore(li, hist.firstChild);
    while (hist.children.length > 12) hist.lastChild.remove();
  }

  // ----- Traitement d'un scan -----------------------------------------------
  function idLocal(texte) {
    var m = String(texte).match(/ID_ACSES:([A-Z]{3}\d{4}-\d{3,4}):/i) || String(texte).trim().toUpperCase().match(/^([A-Z]{3}\d{4}-\d{3,4})$/);
    return m ? m[1].toUpperCase() : '';
  }

  function enregistrerHorsLigne(texte) {
    var id = idLocal(texte);
    var p = personnes[id];
    var n = Number($('#creneau').value);
    if (!id) { ouvrirPlein({ resultat: 'INCONNU', message: 'Ce QR Code n\'est pas un badge JEF.' }); return; }
    if (p && p['p' + n]) { ouvrirPlein({ resultat: 'DEJA', personne: p, alertes: ['Mode hors ligne'] }); return; }
    file.push({ cle: Date.now() + '-' + Math.random().toString(36).slice(2, 7), qr: texte, horodatage: new Date().toISOString(), creneau: n });
    ecrireLocal(CLE_FILE, file);
    if (p) { p['p' + n] = true; ecrireLocal(CLE_LISTE, Object.keys(personnes).map(function (k) { return personnes[k]; })); }
    ouvrirPlein({ resultat: 'HORS_LIGNE', personne: p, id: id, alertes: p ? ['Signature vérifiée à la reconnexion'] : ['Badge absent de la liste locale : vérifier l\'identité'] });
  }

  // ----- Mode Contrôle : le lecteur s'efface, la fiche s'affiche -------------
  function pauseCamera() {
    if (!camera || !cameraActive || cameraEnPause) return;
    try { camera.pause(true); cameraEnPause = true; } catch (e) { /* ancienne version : on laisse tourner */ }
  }
  function repriseCamera() {
    if (!camera || !cameraActive || !cameraEnPause) return;
    try { camera.resume(); } catch (e) { /* rien */ }
    cameraEnPause = false;
  }

  function verifier(texte) {
    enCours = true;
    pauseCamera();
    $('#zone-lecteur').hidden = true;
    var z = $('#fiche');
    z.hidden = false;
    JEF.rendre(z, h`<div class="chargement" style="color:#0B2540;"><span class="rotation"></span>Recherche de la fiche</div>`);
    JEF.post('verifier', { data: { qr: texte } }, { delai: 20000 }).then(function (r) {
      etat(true);
      if (!r.trouve) { bip('ko'); JEF.rendre(z, h`<div class="alerte-fiche ko">${r.message}</div>${boutonSuivant()}`); brancherSuivant(); return; }
      bip('ok');
      afficherFiche(r.fiche);
    }).catch(function (e) {
      if (e.reseau) etat(false);
      JEF.rendre(z, h`<div class="alerte-fiche ko">${e.reseau ? 'Pas de réseau : le contrôle demande une connexion.' : e.message}</div>${boutonSuivant()}`);
      brancherSuivant();
    }).finally(function () { enCours = false; });
  }

  function boutonSuivant() { return h`<button class="btn btn-l btn-orange suivant" data-suivant>📷 Scanner le suivant</button>`; }
  function brancherSuivant() { JEF.$$('[data-suivant]', $('#fiche')).forEach(function (b) { b.addEventListener('click', suivant); }); }
  function suivant() {
    $('#fiche').hidden = true;
    $('#zone-lecteur').hidden = false;
    dernier = { code: '', t: 0 };
    repriseCamera();
    try { $('#saisie').focus(); } catch (e) { /* rien */ }
    window.scrollTo(0, 0);
  }

  function afficherFiche(f) {
    var z = $('#fiche');
    JEF.rendre(z, h`${boutonSuivant()}
      <div class="entete-fiche"><div><div class="qui">${f.prenom} ${f.nom}</div><div>${f.fonction}${f.fonction && f.organisme ? ' - ' : ''}${f.organisme}</div></div>
        <span class="profil" style="background:${f.couleur};color:${f.texte || '#fff'};">${f.profil}</span></div>
      ${f.annule ? h`<div class="alerte-fiche ko">Inscription annulée</div>` : ''}
      ${f.aRegulariser ? h`<div class="alerte-fiche">Inscrit sur place : convention et facture à régulariser</div>` : ''}
      <dl><dt>Badge</dt><dd>${f.id}</dd><dt>Dossier</dt><dd>${f.statut}</dd>
        <dt>Présence</dt><dd>${f.present ? 'Présent, arrivé le ' + f.arrivee : 'Pas encore enregistré'}</dd>
        ${f.visite ? h`<dt>Visite</dt><dd>${f.visite}, sans repas</dd>` : h`<dt>Repas</dt><dd>${Object.keys(f.repas).filter(function (c) { return f.repas[c]; }).map(function (c) { return REPAS_LIB[c]; }).join(', ') || 'Aucun'}</dd>`}
        ${f.regime ? h`<dt>Régime</dt><dd>${f.regime}</dd>` : ''}
        <dt>Badge envoyé</dt><dd>${f.badgeEnvoye || (f.email ? 'Non' : 'Pas d\'email')}</dd>
        ${f.attestation !== null ? h`<dt>Attestation</dt><dd>${f.attestation ? 'Envoyée le ' + f.attestation : 'Pas encore envoyée'}</dd>` : ''}</dl>
      <div class="actions-fiche">
        <button class="btn ${f.present ? '' : 'btn-orange'}" data-a="presence">${f.present ? 'Retirer la présence' : 'Marquer présent'}</button>
        <button class="btn" data-a="badge_pdf">Badge PDF</button>
        ${f.email ? h`<button class="btn" data-a="badge_envoyer">Renvoyer le badge</button>` : ''}
        ${f.type === 'STAG' && f.present ? h`<button class="btn" data-a="attestation">Envoyer l'attestation</button>` : ''}
        <a class="btn" href="admin.html#fiche=${encodeURIComponent(f.id)}" target="_blank" rel="noopener">Ouvrir dans le cockpit</a>
      </div>`);
    brancherSuivant();
    JEF.$$('[data-a]', z).forEach(function (b) {
      b.addEventListener('click', function () { action(f, b.getAttribute('data-a'), b); });
    });
  }

  function action(f, op, b) {
    var fenetre = null;
    if (op === 'badge_pdf') { try { fenetre = window.open('', '_blank'); } catch (e) { fenetre = null; } }
    var retablir = JEF.attente(b, 'En cours');
    var data = { type: f.type, id: f.id, op: op };
    if (op === 'presence') { data.creneau = 'tous'; data.retirer = f.present; }
    JEF.post('admin_action', { data: data }, { delai: 120000 }).then(function (r) {
      retablir();
      if (op === 'badge_pdf') {
        var o = atob(r.pdf), t = new Uint8Array(o.length);
        for (var i = 0; i < o.length; i++) t[i] = o.charCodeAt(i);
        var url = URL.createObjectURL(new Blob([t], { type: 'application/pdf' }));
        if (fenetre && !fenetre.closed) fenetre.location.href = url; else window.location.href = url;
        return;
      }
      JEF.toast({ presence: f.present ? 'Présence retirée' : 'Présence enregistrée', badge_envoyer: 'Badge renvoyé', attestation: 'Attestation envoyée' }[op] || 'Fait', 'ok');
      if (op === 'presence') { f.present = !f.present; f.arrivee = f.present ? new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', ' à ') : ''; if (personnes[f.id]) creneaux.forEach(function (c) { personnes[f.id]['p' + c.n] = f.present; }); majStats(); }
      if (op === 'badge_envoyer') f.badgeEnvoye = new Date().toLocaleDateString('fr-FR');
      if (op === 'attestation') f.attestation = new Date().toLocaleDateString('fr-FR');
      afficherFiche(f);
    }).catch(function (e) { retablir(); if (fenetre) fenetre.close(); JEF.toast(e.message, 'erreur'); });
  }

  function changerMode(m) {
    mode = m;
    JEF.$$('[data-mode]').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-mode') === m)); });
    $('#app').classList.toggle('controle', m === 'verifier');
    $('#stats').hidden = m === 'verifier';
    $('#bandeau-mode').textContent = m === 'verifier' ? 'Mode contrôle : la fiche s\'ouvre, la présence n\'est pas pointée.' : 'Mode présence : chaque badge scanné est pointé présent.';
    suivant();
    $('#saisie').placeholder = m === 'verifier' ? 'Scanner ou saisir le badge à contrôler' : 'Douchette ou saisie : JEF2027-012';
  }

  function traiter(texte) {
    texte = String(texte || '').trim();
    if (!texte || enCours || pleinOuvert) return;
    if (mode === 'verifier' && !$('#fiche').hidden) return;
    if (texte === dernier.code && Date.now() - dernier.t < 4000) return;
    dernier = { code: texte, t: Date.now() };
    if (mode === 'verifier') { verifier(texte); return; }
    enCours = true;
    scansSession++;
    var n = Number($('#creneau').value);
    JEF.post('scan', { data: { qr: texte, creneau: n } }, { delai: 15000 }).then(function (r) {
      etat(true);
      if (r.personne && personnes[r.personne.id] && (r.resultat === 'OK' || r.resultat === 'DEJA')) personnes[r.personne.id]['p' + n] = true;
      ouvrirPlein(r);
    }).catch(function (e) {
      if (e.reseau || /trop de temps|Connexion impossible/.test(e.message)) { etat(false); enregistrerHorsLigne(texte); }
      else ouvrirPlein({ resultat: 'INCONNU', message: e.message });
    }).finally(function () { enCours = false; majStats(); });
  }

  // ----- Synchronisation de la file ------------------------------------------
  function synchroniser() {
    if (!file.length) return;
    var lot = file.slice(0, 200);
    JEF.post('scan_synchro', { data: { scans: lot } }, { delai: 120000 }).then(function (r) {
      etat(true);
      var faits = {}; r.resultats.forEach(function (x) { if (x.resultat !== 'ERREUR') faits[x.cle] = true; });
      file = file.filter(function (s) { return !faits[s.cle]; });
      ecrireLocal(CLE_FILE, file);
      var refus = r.resultats.filter(function (x) { return x.resultat === 'FAUX' || x.resultat === 'INCONNU' || x.resultat === 'ANNULE'; }).length;
      JEF.toast(Object.keys(faits).length + ' scan(s) envoyé(s)' + (refus ? ', dont ' + refus + ' refusé(s) : voir le journal' : ''), refus ? 'erreur' : 'ok');
      majStats();
    }).catch(function () { etat(false); });
  }
  setInterval(function () { if (file.length && navigator.onLine !== false) synchroniser(); }, 30000);
  window.addEventListener('online', function () { etat(true); synchroniser(); });
  window.addEventListener('offline', function () { etat(false); });

  // ----- Caméra --------------------------------------------------------------
  function demarrerCamera(cible, facing) {
    if (typeof Html5Qrcode === 'undefined') { JEF.toast('Lecteur QR indisponible.', 'erreur'); return Promise.resolve(); }
    camera = camera || new Html5Qrcode(cible || 'lecteur', { verbose: false });
    return camera.start({ facingMode: facing || 'environment' }, { fps: 12, qrbox: function (l, h2) { var c = Math.floor(Math.min(l, h2) * 0.72); return { width: c, height: c }; } },
      function (texte) { traiter(texte); }, function () { /* image sans QR */ })
      .then(function () { cameraActive = true; cameraEnPause = false; if (!BORNE) $('#camera').textContent = '⏹ Arrêter la caméra'; })
      .catch(function (e) { JEF.toast(BORNE ? 'Caméra inaccessible. Branchez une douchette ou autorisez la caméra, puis rechargez la page.' : 'Caméra inaccessible : ' + (e && e.message ? e.message : e) + '. Utilisez la saisie ou une douchette.', 'erreur'); });
  }
  function arreterCamera() {
    if (camera && cameraActive) camera.stop().then(function () { cameraActive = false; cameraEnPause = false; $('#camera').textContent = '📷 Démarrer la caméra'; });
  }

  // ----- Démarrage -----------------------------------------------------------
  function chargerListe() {
    return JEF.post('accueil_liste', {}, { delai: 45000 }).then(function (r) {
      etat(true);
      creneaux = r.creneaux;
      indexer(r.personnes);
      ecrireLocal(CLE_LISTE, r.personnes);
      ecrireLocal('jef_creneaux', creneaux);
      remplirCreneaux(r.creneauCourant);
    }).catch(function () {
      etat(false);
      creneaux = lireLocal('jef_creneaux', []);
      indexer(lireLocal(CLE_LISTE, []));
      remplirCreneaux(null);
      JEF.toast('Hors ligne : liste locale utilisée.', 'erreur');
    });
  }

  function remplirCreneaux(courant) {
    var sel = $('#creneau'), avant = sel.value;
    JEF.rendre(sel, creneaux.map(function (c) { return h`<option value="${c.n}">${c.libelle}</option>`; }));
    sel.value = courant ? String(courant) : (avant || (creneaux[0] ? String(creneaux[0].n) : ''));
    majStats();
  }

  /** Borne : écran d'accueil simplifié, caméra frontale si la tablette en a une. */
  function ouvrirBorne() {
    $('#borne').hidden = false;
    document.body.classList.add('mode-borne');
    JEF.config().then(function (c) { if (c && c.intitule) $('#borne-titre').textContent = 'Bienvenue aux ' + c.intitule; }).catch(function () { /* titre par défaut */ });
    demarrerCamera('lecteur-borne', 'user');
    try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () { /* refus */ }); } catch (e) { /* rien */ }
    // Douchette USB branchée sur la borne : elle tape le code puis Entrée.
    var tampon = '', dernierTouche = 0;
    document.addEventListener('keydown', function (e) {
      if (Date.now() - dernierTouche > 400) tampon = '';
      dernierTouche = Date.now();
      if (e.key === 'Enter') { if (tampon.length > 5) traiter(tampon); tampon = ''; return; }
      if (e.key.length === 1) tampon += e.key;
    });
    $('#borne-sortie').addEventListener('click', function () {
      var b = $('#borne-sortie');
      if (b.dataset.arme) { location.href = 'scanner.html'; return; }
      b.dataset.arme = '1'; b.textContent = 'Toucher encore pour quitter';
      setTimeout(function () { delete b.dataset.arme; b.textContent = 'Quitter'; }, 3000);
    });
  }

  function ouvrirApp(s) {
    $('#connexion').hidden = true;
    file = lireLocal(CLE_FILE, []);
    if (BORNE) { ouvrirBorne(); chargerListe().then(function () { if (file.length) synchroniser(); }); return; }
    $('#app').hidden = false;
    $('#utilisateur').textContent = s.email + ' (' + (s.role === 'admin' ? 'administrateur' : 'utilisateur') + ')';
    chargerListe().then(function () { if (file.length) synchroniser(); });
    $('#saisie').focus();
  }

  JEF.appli('scanner.html', function (dispo) { $('#b-installer').hidden = !dispo; });
  $('#b-installer').addEventListener('click', JEF.installer);
  JEF.$$('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { changerMode(b.getAttribute('data-mode')); }); });
  $('#camera').addEventListener('click', function () { if (cameraActive) arreterCamera(); else demarrerCamera(); });
  $('#synchro').addEventListener('click', synchroniser);
  $('#creneau').addEventListener('change', majStats);
  $('#deconnexion').addEventListener('click', JEF.deconnexion);
  $('#plein').addEventListener('click', fermerPlein);
  document.addEventListener('keydown', function (e) { if (pleinOuvert && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); fermerPlein(); } });
  $('#form-saisie').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('#saisie').value; $('#saisie').value = '';
    traiter(v);
  });
  // Recharge la liste toutes les 10 minutes (nouveaux inscrits, changement de créneau).
  setInterval(function () { if (!horsLigne && !document.hidden) chargerListe(); }, 600000);

  JEF.onSessionExpiree = function () { JEF.toast('Session expirée : reconnectez-vous.', 'erreur'); setTimeout(function () { location.reload(); }, 1500); };
  var session = JEF.session();
  if (session) ouvrirApp(session);
  else JEF.config().then(function (cfg) { JEF.connexionGoogle(cfg.googleClientId, ouvrirApp, $('#message-connexion')); })
    .catch(function (e) {
      $('#message-connexion').textContent = 'Serveur injoignable : ' + e.message;
    });
})();
