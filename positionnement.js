/* Positionnement rempli par le stagiaire lui-même, quand un tiers l'a inscrit. */
(function () {
  'use strict';
  var $ = JEF.$, $$ = JEF.$$;
  var id = JEF.parametre('id'), k = JEF.parametre('k');
  var form = $('#form');
  JEF.config().then(JEF.habiller).catch(function () {});

  function erreur(m) { $('#chargement').hidden = true; var e = $('#erreur'); e.hidden = false; e.textContent = m; }
  if (!id || !k) { erreur('Lien incomplet. Utilisez le lien reçu par email.'); return; }
  JEF.piege(form);

  JEF.post('pos_lire', { data: { id: id, k: k } }).then(function (rep) {
    var d = rep.dossier;
    $('#chargement').hidden = true;
    form.hidden = false;
    $('#bonjour').textContent = 'Bonjour ' + d.prenom + ', votre positionnement';
    $('#bloc-regime').hidden = !rep.repas;
    if (d.niveau) $$('input[name=niveau]', form).forEach(function (r) { r.checked = r.value === d.niveau; });
    ['objectifs', 'attentes', 'handicap'].forEach(function (c) { if (d[c]) form.elements[c].value = d[c]; });
    if (d.regime && d.regime !== 'Standard') form.elements.regime.value = d.regime;
  }).catch(function (e) { erreur(e.message); });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var data = JEF.lireFormulaire(form);
    data.id = id; data.k = k;
    var retablir = JEF.attente($('#envoyer'), 'Enregistrement...');
    JEF.post('pos_completer', { data: data }).then(function () {
      retablir(); form.hidden = true; $('#fin').hidden = false;
    }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
  });
})();
