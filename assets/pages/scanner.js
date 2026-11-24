/* ==========================================================================
   Scanner de l'accueil : caméra ou douchette, présence par demi-journée,
   fonctionnement hors connexion avec file d'attente synchronisée.
   ========================================================================== */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$;
  var CLE_FILE = 'jef_file_scans', CLE_LISTE = 'jef_liste_accueil';
  var personnes = {}, creneaux = [], file = [], scansSession = 0, enCours = false, dernier = { code: '', t: 0 };
  var camera = null, cameraActive = false, minuteurEffacement = null, horsLigne = false;

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
      var notes = type === 'ok' ? [880] : type === 'deja' ? [660, 660] : [220];
      notes.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = f; o.connect(g); g.connect(audio.destination);
        var t = audio.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        o.start(t); o.stop(t + 0.16);
      });
    } catch (e) { /* audio indisponible */ }
    if (navigator.vibrate) navigator.vibrate(type === 'ok' ? 80 : type === 'deja' ? [60, 60, 60] : 300);
  }

  // ----- Affichage du résultat ----------------------------------------------
  var VERDICTS = {
    OK: ['ok', '✅ ACCÈS VALIDÉ'], DEJA: ['deja', '⚠️ DÉJÀ ENREGISTRÉ SUR CE CRÉNEAU'], HORS_LIGNE: ['ok', '✅ ENREGISTRÉ HORS LIGNE'],
    ANNULE: ['ko', '⛔ INSCRIPTION ANNULÉE'], FAUX: ['ko', '⛔ BADGE NON VALIDE'], INCONNU: ['ko', '⛔ BADGE INCONNU'], HORS_CRENEAU: ['deja', '⏸ AUCUNE DEMI-JOURNÉE EN COURS']
  };

  function afficher(r) {
    var v = VERDICTS[r.resultat] || ['ko', r.resultat];
    var p = r.personne;
    var el = $('#resultat');
    el.className = 'resultat visible ' + v[0];
    JEF.rendre(el, h`<div class="verdict">${v[1]}</div>
      ${p ? h`<div class="qui">${p.prenom} ${p.nom}</div>
        <div>${p.organisme}</div>
        <span class="profil" style="background:${p.couleur};color:${p.texte || '#fff'};">${p.profil}</span>
        ${p.creneauVisite ? h`<div style="margin-top:6px;">Visite : ${p.creneauVisite} - sans repas</div>`
          : h`<div class="repas">${Object.keys(p.repas || {}).map(function (c) { return h`<span class="${p.repas[c] ? 'on' : ''}">${({ JM: 'Jeudi midi', GALA: 'Gala', VM: 'Vendredi midi' })[c]}</span>`; })}</div>`}`
        : h`<div style="margin-top:6px;">${r.message || ''}</div>`}
      ${(r.alertes || []).length ? h`<div class="alertes">${r.alertes.join(' - ')}</div>` : ''}
      ${p && r.message ? h`<div style="margin-top:6px;">${r.message}</div>` : ''}`);
    bip(v[0] === 'ok' ? 'ok' : v[0]);
    clearTimeout(minuteurEffacement);
    minuteurEffacement = setTimeout(function () { el.className = 'resultat'; }, 7000);
    var li = document.createElement('li');
    JEF.rendre(li, h`<b>${v[0] === 'ok' ? '✅' : v[0] === 'deja' ? '⚠️' : '⛔'}</b> ${p ? p.prenom + ' ' + p.nom : (r.id || 'Inconnu')}<span>${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>`);
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
    if (!id) { afficher({ resultat: 'INCONNU', message: 'Ce QR Code n\'est pas un badge JEF.' }); return; }
    if (p && p['p' + n]) { afficher({ resultat: 'DEJA', personne: p, alertes: ['Mode hors ligne'] }); return; }
    file.push({ cle: Date.now() + '-' + Math.random().toString(36).slice(2, 7), qr: texte, horodatage: new Date().toISOString(), creneau: n });
    ecrireLocal(CLE_FILE, file);
    if (p) { p['p' + n] = true; ecrireLocal(CLE_LISTE, Object.keys(personnes).map(function (k) { return personnes[k]; })); }
    afficher({ resultat: 'HORS_LIGNE', personne: p, id: id, alertes: p ? ['Signature vérifiée à la reconnexion'] : ['Badge absent de la liste locale : vérifier l\'identité'] });
  }

  function traiter(texte) {
    texte = String(texte || '').trim();
    if (!texte || enCours) return;
    if (texte === dernier.code && Date.now() - dernier.t < 4000) return;
    dernier = { code: texte, t: Date.now() };
    enCours = true;
    scansSession++;
    var n = Number($('#creneau').value);
    JEF.post('scan', { data: { qr: texte, creneau: n } }, { delai: 15000 }).then(function (r) {
      etat(true);
      if (r.personne && personnes[r.personne.id] && (r.resultat === 'OK' || r.resultat === 'DEJA')) personnes[r.personne.id]['p' + n] = true;
      afficher(r);
    }).catch(function (e) {
      if (e.reseau || /trop de temps|Connexion impossible/.test(e.message)) { etat(false); enregistrerHorsLigne(texte); }
      else afficher({ resultat: 'INCONNU', message: e.message });
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
  function demarrerCamera() {
    if (typeof Html5Qrcode === 'undefined') { JEF.toast('Lecteur QR indisponible.', 'erreur'); return; }
    camera = camera || new Html5Qrcode('lecteur', { verbose: false });
    camera.start({ facingMode: 'environment' }, { fps: 12, qrbox: function (l, h2) { var c = Math.floor(Math.min(l, h2) * 0.72); return { width: c, height: c }; } },
      function (texte) { traiter(texte); }, function () { /* image sans QR */ })
      .then(function () { cameraActive = true; $('#camera').textContent = '⏹ Arrêter la caméra'; })
      .catch(function (e) { JEF.toast('Caméra inaccessible : ' + (e && e.message ? e.message : e) + '. Utilisez la saisie ou une douchette.', 'erreur'); });
  }
  function arreterCamera() {
    if (camera && cameraActive) camera.stop().then(function () { cameraActive = false; $('#camera').textContent = '📷 Démarrer la caméra'; });
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

  function ouvrirApp(s) {
    $('#connexion').hidden = true;
    $('#app').hidden = false;
    $('#utilisateur').textContent = s.email + ' (' + s.role + ')';
    file = lireLocal(CLE_FILE, []);
    chargerListe().then(function () { if (file.length) synchroniser(); });
    $('#saisie').focus();
  }

  $('#camera').addEventListener('click', function () { if (cameraActive) arreterCamera(); else demarrerCamera(); });
  $('#synchro').addEventListener('click', synchroniser);
  $('#creneau').addEventListener('change', majStats);
  $('#deconnexion').addEventListener('click', JEF.deconnexion);
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
