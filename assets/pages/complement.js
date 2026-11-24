/* Espace service formation : compléter le dossier, déposer la convention signée. */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$;
  var id = JEF.parametre('id'), k = JEF.parametre('k');
  var dossier = null, fichierChoisi = null;
  var TAILLE_MAX = 8 * 1024 * 1024;

  JEF.config().then(JEF.habiller).catch(function () {});

  function erreur(message) {
    $('#chargement').hidden = true;
    var e = $('#erreur'); e.hidden = false; e.textContent = message;
  }

  function etapes(n) {
    ['s1', 's2', 's3'].forEach(function (s, i) { $('#' + s).className = i + 1 < n ? 'fait' : (i + 1 === n ? 'actif' : ''); });
  }

  function afficherDossier(d) {
    JEF.rendre('#dossier', h`<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;">
      <div style="flex:1;min-width:240px;">
        <div class="petit">Dossier <span class="mono">${d.id}</span></div>
        <h2 style="margin:4px 0;">${d.civilite} ${d.prenom} ${d.nom}</h2>
        <div class="petit">${d.fonction} - ${d.etablissement}</div>
      </div>
      <dl class="infos" style="grid-template-columns:auto auto;">
        <dt>Formation (${d.typologie})</dt><dd>${JEF.euros(d.montantFormation)}</dd>
        <dt>Repas</dt><dd>${d.repas} (${JEF.euros(d.montantRepas)})</dd>
        <dt>Total</dt><dd style="color:var(--bleu);font-size:1.1rem;">${JEF.euros(d.total)}</dd>
      </dl></div>`);
  }

  function remplirFormulaire(d) {
    var f = $('#form-admin');
    var map = { raisonSociale: d.raisonSociale, siret: d.siret, codeNaf: d.codeNaf, effectif: d.effectif, adresseFacturation: d.adresseFacturation,
      signataire: d.signataire, contactFormation: d.contactFormation, emailFormation: d.emailFormation, nomOpco: d.nomOpco, bonCommande: d.bonCommande };
    Object.keys(map).forEach(function (n) { if (map[n]) f.elements[n].value = map[n]; });
    if (d.modeFinancement) f.elements.modeFinancement.value = d.modeFinancement;
  }

  function montrer(etape) {
    $('#form-admin').hidden = etape !== 'completer';
    $('#bloc-depot').hidden = etape !== 'deposer';
    $('#bloc-fin').hidden = ['recue', 'validee', 'attente'].indexOf(etape) === -1;
    if (etape === 'completer') etapes(1);
    if (etape === 'deposer') etapes(2);
    if (etape === 'recue') {
      etapes(3);
      JEF.rendre('#bloc-fin', h`<div class="coche">✓</div><h2>Convention reçue</h2>
        <p>Reçue le ${dossier.conventionRecue || 'aujourd\'hui'}. Le Bureau de l'ACSES va la valider, puis le badge d'accès sera envoyé au stagiaire.</p>
        <button class="btn" type="button" id="redeposer">Déposer une version corrigée</button>`);
      $('#redeposer').addEventListener('click', function () { montrer('deposer'); });
    }
    if (etape === 'validee') {
      etapes(4);
      JEF.rendre('#bloc-fin', h`<div class="coche">✓</div><h2>Dossier validé</h2><p>Le dossier est complet et validé. Pour toute modification, contactez l'ACSES.</p>`);
    }
    if (etape === 'attente') {
      JEF.rendre('#bloc-fin', h`<div class="coche" style="background:var(--ambre-clair);color:var(--ambre);">⏳</div><h2>Liste d'attente</h2><p>Ce stagiaire est sur liste d'attente. Le lien sera actif dès qu'une place se libère.</p>`);
    }
  }

  if (!id || !k) { erreur('Lien incomplet. Utilisez le lien reçu par email.'); return; }
  JEF.piege($('#form-admin'));

  JEF.post('rh_lire', { data: { id: id, k: k } }).then(function (rep) {
    dossier = rep.dossier;
    $('#chargement').hidden = true;
    $('#contenu').hidden = false;
    afficherDossier(dossier);
    remplirFormulaire(dossier);
    montrer(rep.etape);
  }).catch(function (e) { erreur(e.message); });

  $('#form-admin').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = this;
    if (!JEF.valider(f)) return;
    var data = JEF.lireFormulaire(f);
    data.id = id; data.k = k;
    var retablir = JEF.attente($('#btn-admin'), 'Préparation de la convention...');
    JEF.post('rh_completer', { data: data }).then(function () {
      retablir();
      JEF.toast('Informations enregistrées : la convention définitive vient d\'être envoyée par email.', 'ok');
      montrer('deposer');
    }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
  });

  $('#modifier-admin').addEventListener('click', function () { montrer('completer'); });

  // ----- Dépôt du fichier -----
  var zone = $('#zone-depot');
  function choisir(f) {
    fichierChoisi = null;
    $('#btn-depot').disabled = true;
    if (!f) return;
    if (['application/pdf', 'image/jpeg', 'image/png'].indexOf(f.type) === -1) { JEF.toast('Format non accepté : PDF, JPG ou PNG.', 'erreur'); return; }
    if (f.size > TAILLE_MAX) { JEF.toast('Fichier trop lourd (8 Mo maximum).', 'erreur'); return; }
    fichierChoisi = f;
    $('#nom-fichier').textContent = f.name + ' (' + Math.round(f.size / 1024) + ' Ko)';
    $('#btn-depot').disabled = false;
  }
  $('#fichier').addEventListener('change', function () { choisir(this.files[0]); });
  ['dragenter', 'dragover'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.add('survol'); }); });
  ['dragleave', 'drop'].forEach(function (t) { zone.addEventListener(t, function (e) { e.preventDefault(); zone.classList.remove('survol'); }); });
  zone.addEventListener('drop', function (e) { choisir(e.dataTransfer.files[0]); });

  $('#btn-depot').addEventListener('click', function () {
    if (!fichierChoisi) return;
    var retablir = JEF.attente(this, 'Envoi sécurisé en cours...');
    var lecteur = new FileReader();
    lecteur.onload = function () {
      var b64 = String(lecteur.result).split(',')[1];
      JEF.post('rh_deposer', { data: { id: id, k: k, fichier: { nom: fichierChoisi.name, type: fichierChoisi.type, base64: b64 } } }, { delai: 120000 })
        .then(function () { retablir(); dossier.conventionRecue = JEF.date(new Date(), true); montrer('recue'); JEF.toast('Convention déposée. Un accusé de réception vous a été envoyé.', 'ok'); })
        .catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
    };
    lecteur.onerror = function () { retablir(); JEF.toast('Lecture du fichier impossible.', 'erreur'); };
    lecteur.readAsDataURL(fichierChoisi);
  });
})();
