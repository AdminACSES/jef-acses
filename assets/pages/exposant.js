/* Espace exposants : lien personnel par société, quota de pass inclus. */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$;
  var s = JEF.parametre('s');
  var cfg = null, soc = null;

  if (!s) { $('#sans-lien').hidden = false; JEF.config().then(JEF.habiller).catch(function () {}); return; }
  $('#chargement').hidden = false;
  JEF.piege($('#form'));

  function infoPass() {
    var restant = soc.quota - soc.inclusUtilises;
    $('#info-pass').textContent = restant > 0
      ? 'Ce représentant bénéficiera d\'un pass inclus dans votre partenariat (' + restant + ' restant' + (restant > 1 ? 's' : '') + ' sur ' + soc.quota + ').'
      : 'Les ' + soc.quota + ' pass inclus sont utilisés : ce pass supplémentaire sera facturé ' + JEF.euros(soc.tarifSupp) + ', repas compris.';
  }

  function afficherSociete() {
    var restant = Math.max(0, soc.quota - soc.inclusUtilises);
    JEF.rendre('#societe', h`<div class="petit">Société exposante</div>
      <h1 style="margin:2px 0 6px;">${soc.nom}</h1>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${soc.stand ? h`<span class="pastille p-bleu">${soc.stand}</span>` : ''}
        <span class="pastille ${restant ? 'p-vert' : 'p-ambre'}">${soc.inclusUtilises} / ${soc.quota} pass inclus utilisés</span>
      </div>
      ${soc.inscrits.length ? h`<p class="petit" style="margin:12px 0 0;">Déjà inscrits : ${soc.inscrits.join(', ')}</p>` : ''}`);
    infoPass();
  }

  Promise.all([JEF.config(), JEF.post('societe_lire', { data: { s: s } })]).then(function (r) {
    cfg = r[0]; soc = r[1].societe;
    JEF.habiller(cfg);
    $('#chargement').hidden = true;
    $('#contenu').hidden = false;
    JEF.rendre('#repas', Object.keys(cfg.repas).map(function (c) {
      return h`<label class="option"><input type="checkbox" name="repas_${c}" checked><span class="titre">${cfg.repas[c].libelle}</span></label>`;
    }));
    afficherSociete();
  }).catch(function (e) {
    $('#chargement').hidden = true;
    var el = $('#erreur'); el.hidden = false; el.textContent = e.message;
  });

  $('#form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = this;
    if (!JEF.valider(f)) return;
    var data = JEF.lireFormulaire(f);
    data.s = s;
    data.repas = {};
    $$('input[name^="repas_"]', f).forEach(function (c) { data.repas[c.name.slice(6)] = c.checked; });
    var retablir = JEF.attente($('#envoyer'), 'Enregistrement et création du badge...');
    JEF.post('inscrire_exposant', { data: data }).then(function (rep) {
      retablir();
      f.hidden = true;
      var r = $('#resultat');
      r.hidden = false;
      JEF.rendre(r, h`<div class="coche">✓</div><h2>${data.prenom} ${data.nom} est inscrit(e)</h2>
        <p>Référence <b class="mono">${rep.id}</b> - pass ${rep.typePass.toLowerCase()}${rep.montant ? ' (' + JEF.euros(rep.montant) + ')' : ''}.</p>
        <p>${rep.badgeEnvoye ? 'Le badge vient d\'être envoyé par email.' : 'Le badge sera envoyé par email avant l\'événement.'}</p>
        <button class="btn btn-primaire" type="button" id="autre">Inscrire un autre représentant</button>`);
      if (rep.typePass === 'Inclus') soc.inclusUtilises++;
      soc.inscrits.push(data.prenom + ' ' + data.nom.toUpperCase());
      afficherSociete();
      $('#autre').addEventListener('click', function () {
        f.reset();
        $$('input[name^="repas_"]', f).forEach(function (c) { c.checked = true; });
        r.hidden = true; f.hidden = false;
        f.scrollIntoView({ behavior: 'smooth' });
      });
    }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
  });
})();
