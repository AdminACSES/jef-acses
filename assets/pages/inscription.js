/* Inscription stagiaire en 4 étapes, trois parcours, prix calculé en direct (recalculé par le serveur). */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$;
  var form = $('#form');
  var cfg = null, etape = 1, NB = 4;
  var CLE_BROUILLON = 'jef_brouillon_inscription_v2';

  var TEXTES = {
    STAGIAIRE: { etape2: 'Vos coordonnées', titre2: 'Vos coordonnées', etape4: 'Service formation', aideEmail: 'Pour recevoir votre badge et vos documents.',
      partage: 'J\'accepte que le QR Code de mon badge contienne mon email et mon téléphone, pour échanger mes coordonnées avec les exposants que je choisis de rencontrer.' },
    SERVICE: { etape2: 'Le stagiaire', titre2: 'Coordonnées du stagiaire', etape4: 'Établissement', aideEmail: 'Email du stagiaire, pour recevoir son badge et ses documents.',
      partage: 'Le stagiaire accepte que le QR Code de son badge contienne son email et son téléphone, pour échanger ses coordonnées avec les exposants.' },
    PERSONNEL: { etape2: 'Vos coordonnées', titre2: 'Vos coordonnées', etape4: 'Règlement', aideEmail: 'Pour recevoir votre contrat, votre badge et vos documents.',
      partage: 'J\'accepte que le QR Code de mon badge contienne mon email et mon téléphone, pour échanger mes coordonnées avec les exposants que je choisis de rencontrer.' }
  };

  JEF.piege(form);

  function parcours() { var r = $('input[name=parcours]:checked', form); return r ? r.value : 'STAGIAIRE'; }

  function valeurs() {
    var v = JEF.lireFormulaire(form);
    v.repas = {}; v.accRepas = {};
    $$('input[name^="repas_"]', form).forEach(function (c) { v.repas[c.name.slice(6)] = c.checked; });
    $$('input[name^="accrepas_"]', form).forEach(function (c) { v.accRepas[c.name.slice(9)] = c.checked; });
    Object.keys(v).forEach(function (k) { if (/^accrepas_|^repas_/.test(k)) delete v[k]; });
    if (!v.accompagnant) { v.accPrenom = ''; v.accNom = ''; v.accRegime = ''; v.accRepas = {}; }
    if (v.parcours === 'SERVICE') { v.emailFormation = v.emailFormationSF; v.envoiDirect = true; }
    if (v.parcours === 'PERSONNEL') { v.adresseFacturation = v.adressePerso; v.emailFormation = ''; v.envoiDirect = false; }
    if (v.parcours !== 'PERSONNEL') v.modeReglement = '';
    if (v.parcours === 'SERVICE') { v.niveau = ''; v.objectifs = ''; v.attentes = ''; v.handicap = ''; }
    delete v.emailFormationSF; delete v.adressePerso;
    return v;
  }

  /** Adapte libellés, champs obligatoires et blocs au parcours choisi. */
  function adapterParcours() {
    var p = parcours(), t = TEXTES[p];
    $$('[data-libelle]', form).forEach(function (el) { var k = el.getAttribute('data-libelle'); if (t[k]) el.textContent = t[k]; });
    $$('[data-pour]', form).forEach(function (el) { el.hidden = el.getAttribute('data-pour') !== p; });
    $$('[data-pas-pour]', form).forEach(function (el) { el.hidden = el.getAttribute('data-pas-pour') === p; });
    var requis = { telephone: p !== 'SERVICE', etablissement: p !== 'PERSONNEL' };
    Object.keys(requis).forEach(function (id) {
      $('#' + id).required = requis[id];
      $('[data-requis="' + id + '"]').classList.toggle('obligatoire', requis[id]);
    });
    $('#emailFormation').required = p === 'STAGIAIRE' && $('#envoiDirect').checked;
    $('#envoyer').textContent = p === 'SERVICE' ? 'Inscrire le stagiaire' : 'Réserver ma place';
    var acc = $('#accompagnant').checked;
    $('#zone-accompagnant').hidden = !acc;
    $('#accPrenom').required = acc; $('#accNom').required = acc;
    $('[for=accPrenom]').classList.toggle('obligatoire', acc); $('[for=accNom]').classList.toggle('obligatoire', acc);
  }

  function majRecap() {
    if (!cfg) return;
    var v = valeurs();
    var formation = v.typologie === 'NON_ADHERENT' ? cfg.tarifs.nonAdherent : cfg.tarifs.adherent;
    var lignes = [h`<dt>Formation ${v.typologie === 'NON_ADHERENT' ? 'non-adhérent' : 'adhérent'}</dt><dd>${JEF.euros(formation)}</dd>`];
    var total = formation, nbRepas = 0;
    Object.keys(cfg.repas).forEach(function (c) {
      if (!v.repas[c]) return;
      nbRepas++;
      if (cfg.repasCompris) return;
      total += cfg.repas[c].tarif; lignes.push(h`<dt>${cfg.repas[c].libelle}</dt><dd>${JEF.euros(cfg.repas[c].tarif)}</dd>`);
    });
    if (cfg.repasCompris) lignes.push(h`<dt>Repas</dt><dd>${nbRepas ? nbRepas + ' compris' : 'Aucun'}</dd>`);
    else if (!nbRepas) lignes.push(h`<dt>Repas</dt><dd>Aucun</dd>`);
    JEF.rendre('#recap-lignes', lignes);
    $('#recap-total').textContent = JEF.euros(total);
    var zAcc = $('#recap-acc');
    if (!zAcc) { zAcc = document.createElement('p'); zAcc.id = 'recap-acc'; zAcc.className = 'petit'; $('#places').before(zAcc); }
    zAcc.textContent = v.accompagnant ? 'Accompagnant : ' + JEF.euros(cfg.tarifs.accompagnant) + ', réglé à part.' : '';
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
  $('#envoiDirect').addEventListener('change', adapterParcours);
  $('#accompagnant').addEventListener('change', adapterParcours);
  form.addEventListener('change', function (e) { if (e.target.name === 'parcours') adapterParcours(); majRecap(); });
  form.addEventListener('input', function () {
    majRecap();
    try { var v = JEF.lireFormulaire(form); delete v.site_web; sessionStorage.setItem(CLE_BROUILLON, JSON.stringify(v)); } catch (e) { /* rien */ }
  });

  function restaurerBrouillon() {
    try {
      var v = JSON.parse(sessionStorage.getItem(CLE_BROUILLON) || 'null');
      if (!v) return;
      Object.keys(v).forEach(function (k) {
        var el = form.elements[k];
        if (!el) return;
        if (el instanceof RadioNodeList) { $$('input[name="' + k + '"]', form).forEach(function (r) { r.checked = r.value === v[k]; }); }
        else if (el.type === 'checkbox') el.checked = !!v[k];
        else el.value = v[k];
      });
    } catch (e) { /* rien */ }
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!JEF.valider(etapeCourante())) return;
    var retablir = JEF.attente($('#envoyer'), 'Enregistrement et préparation du dossier...');
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
        <h1>Inscription sur liste d'attente</h1>
        <p>Toutes les places sont réservées pour le moment. La demande <b>${rep.id}</b> est enregistrée : nous recontactons le stagiaire dès qu'une place se libère.</p>`);
      return;
    }
    if (rep.parcours === 'SERVICE' || rep.parcours === 'PERSONNEL') {
      var perso = rep.parcours === 'PERSONNEL';
      JEF.rendre(r, h`<div class="coche">✓</div>
        <h1>${perso ? 'Votre place est réservée' : 'Le stagiaire est inscrit'}</h1>
        <p>Dossier <b class="mono">${rep.id}</b> - total ${JEF.euros(rep.total)}</p>
        <div class="alerte a-info" style="text-align:left;max-width:640px;margin:18px auto;"><div>
          <b>Prochaine étape : ${perso ? 'signer le contrat de formation' : 'déposer la convention signée'}</b>
          ${perso ? 'Le contrat vient de vous être envoyé par email. Signez-le, puis déposez-le en PDF ou en photo.'
            : 'La convention vient d\'être envoyée au service formation. Une fois signée, déposez-la en PDF ou en photo. Le stagiaire a reçu un lien pour remplir son positionnement.'}
          Vous pouvez le faire maintenant ou plus tard avec le lien reçu par email.</div></div>
        <a class="btn btn-orange btn-l" href="${rep.lien}">${perso ? 'Déposer le contrat signé' : 'Déposer la convention signée'}</a>
        <p class="petit" style="margin-top:18px;">Le badge d'accès est envoyé au stagiaire dès la validation par le bureau de l'ACSES.</p>
        <a class="btn" href="./" style="margin-top:8px;">Retour à l'accueil</a>`);
      r.scrollIntoView({ behavior: 'smooth' });
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
      <p class="petit" style="margin-top:14px;">Si votre établissement utilise une demande de formation interne, joignez-la au dossier. Votre service formation pourra la déposer avec la convention.</p>
      <p class="petit">Vous recevrez votre badge d'accès dès la validation de la convention par le bureau de l'ACSES.</p>
      ${rep.accompagnant ? h`<p class="petit">Votre accompagnant est enregistré (${rep.accompagnant}). Son badge partira avec le vôtre.</p>` : ''}
      <a class="btn" href="./" style="margin-top:8px;">Retour à l'accueil</a>`);
    $('#copier').addEventListener('click', function () { JEF.copier(rep.lien); });
    r.scrollIntoView({ behavior: 'smooth' });
  }

  /** Inscriptions fermées : on le dit tout de suite, sans laisser remplir le formulaire. */
  function afficherFermeture(c) {
    var o = c.ouverture || {};
    var f = $('#ferme');
    JEF.rendre(f, h`<div class="ferme-bloc"><div class="coche" style="background:var(--ambre-clair);color:var(--ambre);">🔒</div>
      <h1>${o.raison === 'avant' ? 'Les inscriptions ne sont pas encore ouvertes' : 'Les inscriptions sont closes'}</h1>
      <p>${o.raison === 'avant' && o.date ? 'Elles ouvriront le ' + JEF.date(o.date, true) + '.' : 'Il n\'est plus possible de s\'inscrire en ligne.'}</p>
      <p>Pour toute question ou une demande particulière, écrivez à <a href="mailto:${c.contact.email}"><b>${c.contact.email}</b></a>.</p>
      <a class="btn" href="./" style="margin-top:8px;">Retour à l'accueil</a></div>`);
    f.hidden = false;
  }

  JEF.config().then(function (c) {
    cfg = c;
    JEF.habiller(c);
    $('#chargement').hidden = true;
    if (!(c.ouverture || {}).ouvert) { afficherFermeture(c); return; }
    $('#zone-formulaire').hidden = false;
    $('#prix-adh').textContent = JEF.euros(c.tarifs.adherent);
    $('#prix-nonadh').textContent = JEF.euros(c.tarifs.nonAdherent);
    $('#presentation').hidden = false;
    $('#prix-acc').textContent = JEF.euros(c.tarifs.accompagnant);
    if (c.repasCompris) {
      $('#legende-repas').textContent = 'Repas compris dans le prix';
      $('#aide-repas').hidden = false;
    } else {
      $('#pf-repas').closest('li').hidden = true;
    }
    $('#pf-repas').textContent = Object.keys(c.repas).map(function (k) { return c.repas[k].libelle; }).join(', ');
    var caseRepas = function (prefixe, avecPrix) {
      return Object.keys(c.repas).map(function (code) {
        var r = c.repas[code];
        return h`<label class="option"><input type="checkbox" name="${prefixe}${code}" ${JEF.brut(c.repasCompris ? 'checked' : '')}>
          <span><span class="titre">${r.libelle}</span>${c.repasCompris ? h`<small>Compris</small>` : ''}</span>${avecPrix && !c.repasCompris ? h`<span class="prix">${JEF.euros(r.tarif)}</span>` : ''}</label>`;
      });
    };
    JEF.rendre('#repas', caseRepas('repas_', true));
    JEF.rendre('#acc-repas', caseRepas('accrepas_', false));
    restaurerBrouillon();
    adapterParcours();
    majRecap();
    if (c.capacite) {
      $('#places').textContent = c.capacite.restantes > 0 ? c.capacite.restantes + ' places restantes' : 'Complet : les nouvelles demandes passent en liste d\'attente.';
    }
  }).catch(function (e) {
    $('#chargement').hidden = true;
    JEF.toast('Impossible de charger les informations : ' + e.message, 'erreur');
  });
})();
