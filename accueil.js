/* Page d'accueil : état des inscriptions, compte à rebours, thèmes. */
(function () {
  'use strict';
  var h = JEF.h;

  function compteARebours(cible, legende) {
    var cases = JEF.$$('#compte b');
    function tic() {
      var ms = Math.max(0, cible - Date.now());
      var j = Math.floor(ms / 864e5), hh = Math.floor(ms / 36e5) % 24, mm = Math.floor(ms / 6e4) % 60, ss = Math.floor(ms / 1e3) % 60;
      [j, hh, mm, ss].forEach(function (v, i) { cases[i].textContent = i ? String(v).padStart(2, '0') : v; });
    }
    JEF.$('#compte-legende').textContent = legende;
    tic();
    setInterval(tic, 1000);
  }

  JEF.config().then(function (cfg) {
    JEF.habiller(cfg);
    JEF.rendre('#themes', (cfg.themes || []).map(function (t) { return h`<li>${t}</li>`; }));
    var etat = JEF.$('#etat-inscriptions');
    var o = cfg.ouverture || {};
    var debut = cfg.dateDebut ? new Date(cfg.dateDebut + 'T09:00:00') : null;
    if (o.ouvert) {
      var places = cfg.capacite ? ' - ' + cfg.capacite.restantes + ' places restantes' : '';
      etat.textContent = '✅ Inscriptions ouvertes' + places;
      if (debut) compteARebours(debut.getTime(), 'avant l\'ouverture des journées');
    } else if (o.raison === 'avant' && o.date) {
      etat.textContent = '⏳ Ouverture des inscriptions le ' + JEF.date(o.date, true);
      compteARebours(new Date(o.date).getTime(), 'avant l\'ouverture des inscriptions');
      fermer('Les inscriptions à la formation ouvriront le ' + JEF.date(o.date, true) + '.', 'Ouverture le ' + JEF.date(o.date));
    } else {
      etat.textContent = 'Inscriptions closes';
      if (debut) compteARebours(debut.getTime(), 'avant l\'ouverture des journées');
      fermer('Les inscriptions à la formation sont closes.', 'Inscriptions closes');
    }
    function fermer(texte, bouton) {
      var b = JEF.$('#bandeau-ferme');
      JEF.rendre(b, h`<div><b>${texte}</b> Pour toute question ou une demande particulière, écrivez à <a href="mailto:${cfg.contact.email}">${cfg.contact.email}</a>.</div>`);
      b.hidden = false;
      var bi = JEF.$('#bouton-inscription');
      bi.textContent = bouton; bi.classList.remove('btn-orange'); bi.classList.add('btn-blanc', 'inactif'); bi.removeAttribute('href'); bi.setAttribute('aria-disabled', 'true');
      var c = JEF.$('#carte-stagiaires .lien'); if (c) c.textContent = bouton;
    }
  }).catch(function (e) {
    JEF.$('#etat-inscriptions').textContent = 'Informations momentanément indisponibles.';
    console.error(e);
  });
})();
