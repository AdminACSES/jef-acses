/* Invitation visiteur des stands : une demi-journée, sans repas. */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$;
  var form = $('#form');
  JEF.piege(form);

  JEF.config().then(function (cfg) {
    JEF.habiller(cfg);
    JEF.rendre('#creneaux', (cfg.creneaux || []).map(function (c, i) {
      return h`<label class="option"><input type="radio" name="creneau" value="${c.n}" ${JEF.brut(i ? '' : 'required')}><span class="titre">${c.libelle}</span></label>`;
    }));
    if (!cfg.visiteursOuverts) {
      var f = $('#ferme'); f.hidden = false; f.textContent = 'Les invitations visiteurs ne sont pas encore ouvertes.';
      $('#envoyer').disabled = true;
    }
  }).catch(function (e) { JEF.toast(e.message, 'erreur'); });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!JEF.valider(form)) return;
    var data = JEF.lireFormulaire(form);
    var retablir = JEF.attente($('#envoyer'), 'Création de votre badge...');
    JEF.post('inscrire_visiteur', { data: data }).then(function (rep) {
      form.hidden = true;
      var r = $('#resultat'); r.hidden = false;
      JEF.rendre(r, h`<div class="coche">✓</div><h2>À bientôt sur les stands</h2>
        <p>Invitation <b class="mono">${rep.id}</b> enregistrée.</p>
        <p>${rep.badgeEnvoye ? 'Votre badge visiteur vient d\'être envoyé par email : imprimez-le et présentez-le à l\'accueil.' : 'Votre badge vous sera envoyé par email avant l\'événement.'}</p>
        <a class="btn" href="./">Retour à l'accueil</a>`);
      r.scrollIntoView({ behavior: 'smooth' });
    }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
  });
})();
