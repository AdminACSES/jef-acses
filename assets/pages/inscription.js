/* Inscription stagiaire en 4 étapes, prix calculé en direct (recalculé par le serveur). */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$;
  var form = $('#form');
  var cfg = null, etape = 1, NB = 4;
  var CLE_BROUILLON = 'jef_brouillon_inscription';

  JEF.piege(form);

  function valeurs() {
    var v = JEF.lireFormulaire(form);
    v.repas = {};
    $$('input[name^="repas_"]', form).forEach(function (c) { v.repas[c.name.slice(6)] = c.checked; });
    return v;
  }

  function majRecap() {
    if (!cfg) return;
    var v = valeurs();
    var formation = v.typologie === 'NON_ADHERENT' ? cfg.tarifs.nonAdherent : cfg.tarifs.adherent;
    var lignes = [h`<dt>Formation ${v.typologie === 'NON_ADHERENT' ? 'non-adhérent' : 'adhérent'}</dt><dd>${JEF.euros(formation)}</dd>`];
    var total = formation, nbRepas = 0;
    Object.keys(cfg.repas).forEach(function (c) {
      if (v.repas[c]) { nbRepas++; total += cfg.repas[c].tarif; lignes.push(h`<dt>${cfg.repas[c].libelle}</dt><dd>${JEF.euros(cfg.repas[c].tarif)}</dd>`); }
    });
    if (!nbRepas) lignes.push(h`<dt>Repas</dt><dd>Aucun</dd>`);
    JEF.rendre('#recap-lignes', lignes);
    $('#recap-total').textContent = JEF.euros(total);
    $('#bloc-regime').hidden = !nbRepas;
  }

  function allerA(n) {
    etape = n;
    $$('[data-etape]', form).forEach(function (s) { s.hidden = Number(s.getAttribute('data-etape')) !== n; });
    $$('.stepper li', form).forEach(function (li, i) { li.className = i + 1 < n ? 'fait' : (i + 1 === n ? 'actif' : ''); });
    $('#precedent').hidden = n === 1;
    $('#suivant').hidden = n === NB;
    $('#envoyer').hidden = n !== NB;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function etapeCourante() { return $('[data-etape="' + etape + '"]', form); }

  $('#suivant').addEventListener('click', function () { if (JEF.valider(etapeCourante())) allerA(etape + 1); });
  $('#precedent').addEventListener('click', function () { allerA(etape - 1); });
  $('#envoiDirect').addEventListener('change', function () { $('#emailFormation').required = this.checked; });
  form.addEventListener('input', function () {
    majRecap();
    try { var v = valeurs(); delete v.site_web; sessionStorage.setItem(CLE_BROUILLON, JSON.stringify(v)); } catch (e) { /* rien */ }
  });
  form.addEventListener('change', majRecap);

  function restaurerBrouillon() {
    try {
      var v = JSON.parse(sessionStorage.getItem(CLE_BROUILLON) || 'null');
      if (!v) return;
      Object.keys(v).forEach(function (k) {
        if (k === 'repas') { Object.keys(v.repas).forEach(function (c) { var el = form.elements['repas_' + c]; if (el) el.checked = !!v.repas[c]; }); return; }
        var el = form.elements[k];
        if (!el) return;
        if (el instanceof RadioNodeList) { $$('input[name="' + k + '"]', form).forEach(function (r) { r.checked = r.value === v[k]; }); }
        else if (el.type === 'checkbox') el.checked = !!v[k];
        else el.value = v[k];
      });
      $('#emailFormation').required = $('#envoiDirect').checked;
    } catch (e) { /* rien */ }
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!JEF.valider(etapeCourante())) return;
    var retablir = JEF.attente($('#envoyer'), 'Enregistrement et préparation de votre dossier...');
    JEF.post('inscrire_stagiaire', { data: valeurs() }).then(function (rep) {
      try { sessionStorage.removeItem(CLE_BROUILLON); } catch (e) { /* rien */ }
      afficherResultat(rep);
    }).catch(function (e) {
      retablir();
      JEF.toast(e.message, 'erreur');
    });
  });

  function afficherResultat(rep) {
    $('#zone-formulaire').hidden = true;
    var r = $('#resultat');
    r.hidden = false;
    if (rep.attente) {
      JEF.rendre(r, h`<div class="coche" style="background:var(--ambre-clair);color:var(--ambre);">⏳</div>
        <h1>Vous êtes sur liste d'attente</h1>
        <p>Toutes les places sont réservées pour le moment. Votre demande <b>${rep.id}</b> est enregistrée : nous vous recontactons dès qu'une place se libère.</p>`);
      return;
    }
    JEF.rendre(r, h`<div class="coche">✓</div>
      <h1>Votre place est réservée</h1>
      <p>Dossier <b class="mono">${rep.id}</b> - total ${JEF.euros(rep.total)}</p>
      <div class="alerte a-info" style="text-align:left;max-width:640px;margin:18px auto;">
        <div><b>Prochaine étape : votre service formation</b>
        ${rep.envoiDirect ? 'Le dossier vient de lui être envoyé, vous êtes en copie.' : 'Vous venez de recevoir le dossier par email : transférez-le à votre service formation.'}
        Il complète les informations administratives puis dépose la convention signée avec ce lien personnel :</div>
      </div>
      <div class="lien-copie"><input type="text" readonly value="${rep.lien}" aria-label="Lien du dossier"><button class="btn" type="button" id="copier">Copier</button></div>
      <p class="petit" style="margin-top:18px;">Vous recevrez votre badge d'accès dès la validation de la convention par le Bureau de l'ACSES.</p>
      <a class="btn" href="./" style="margin-top:8px;">Retour à l'accueil</a>`);
    $('#copier').addEventListener('click', function () { JEF.copier(rep.lien); });
    r.scrollIntoView({ behavior: 'smooth' });
  }

  JEF.config().then(function (c) {
    cfg = c;
    JEF.habiller(c);
    $('#prix-adh').textContent = JEF.euros(c.tarifs.adherent);
    $('#prix-nonadh').textContent = JEF.euros(c.tarifs.nonAdherent);
    JEF.rendre('#repas', Object.keys(c.repas).map(function (code) {
      var r = c.repas[code];
      return h`<label class="option"><input type="checkbox" name="repas_${code}">
        <span><span class="titre">${r.libelle}</span></span><span class="prix">${JEF.euros(r.tarif)}</span></label>`;
    }));
    restaurerBrouillon();
    majRecap();
    if (c.capacite) {
      $('#places').textContent = c.capacite.restantes > 0 ? c.capacite.restantes + ' places restantes' : 'Complet : les nouvelles demandes passent en liste d\'attente.';
    }
    var o = c.ouverture || {};
    if (!o.ouvert) {
      var f = $('#ferme');
      f.hidden = false;
      f.textContent = o.raison === 'avant' ? 'Les inscriptions ouvriront le ' + JEF.date(o.date, true) + '. Vous pouvez découvrir le formulaire dès maintenant.'
        : 'Les inscriptions sont closes. Contactez ' + c.contact.email + '.';
      $('#envoyer').disabled = true;
    }
  }).catch(function (e) {
    JEF.toast('Impossible de charger les informations : ' + e.message, 'erreur');
  });
})();
