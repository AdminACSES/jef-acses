/* Espace intervenant : documents (CV, photo, support), objectif, besoins, hébergement et repas. */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$;
  var id = JEF.parametre('id'), k = JEF.parametre('k');
  var I = null, cfg = null;

  function erreur(m) { $('#chargement').hidden = true; var e = $('#erreur'); e.hidden = false; e.textContent = m; }
  if (!id || !k) { erreur('Lien incomplet. Utilisez le lien reçu par email.'); return; }

  function rendre() {
    var i = I, ed = cfg.edition;
    var docs = [['cv', 'CV', '.pdf,.doc,.docx,.odt', 'PDF ou Word. Exigé pour la certification Qualiopi de l\'ACSES.'],
      ['photo', 'Photo', '.jpg,.jpeg,.png,.webp', 'Pour présenter votre intervention à l\'écran et dans le programme.'],
      ['support', 'Support de présentation', '.pdf,.ppt,.pptx,.odp,.key', 'Jusqu\'à ' + cfg.tailleMaxMo + ' Mo. Au-delà, envoyez-le au bureau par un service de transfert.']];
    var faits = [i.cv, i.photo, i.support].filter(Boolean).length + (i.objectif ? 1 : 0);
    JEF.rendre('#contenu', h`
      <section class="carte espace-entete" style="border-top:6px solid #0E7490;">
        <div class="petit">Bonjour</div><h1>${i.prenom} ${i.nom}</h1>
        <div class="espace-profil" style="background:#0E7490;">Intervenant</div>
        <dl class="infos" style="margin-top:12px;"><dt>Journées</dt><dd>${ed.dates}</dd><dt>Lieu</dt><dd>${ed.lieu}</dd>${i.theme ? h`<dt>Intervention</dt><dd>${i.theme}</dd>` : ''}${i.creneau ? h`<dt>Horaire</dt><dd>${i.creneau}</dd>` : ''}</dl>
        <div class="int-avancement"><div class="q-progression"><i style="width:${Math.round(faits / 4 * 100)}%"></i></div><span class="petit">${faits} sur 4 éléments fournis${i.maj ? ', mis à jour le ' + i.maj : ''}</span></div>
      </section>
      <section class="carte"><h2>Vos documents</h2><div class="int-docs">${docs.map(function (d) {
        var ok = i[d[0]];
        return h`<div class="int-doc ${ok ? 'ok' : ''}"><div class="int-doc-tete"><b>${ok ? '✓ ' : ''}${d[1]}</b>${ok ? h`<span class="tag t-vert">Reçu</span>` : ''}</div><p class="petit">${d[3]}</p>
          <label class="btn ${ok ? '' : 'btn-primaire'}">${ok ? 'Remplacer' : 'Déposer'}<input type="file" class="sr" data-doc="${d[0]}" accept="${d[2]}"></label></div>`; })}</div></section>
      <form class="carte" id="form-int" novalidate>
        <h2>Votre intervention</h2>
        <div class="grille g2">
          <div class="champ span2"><label for="theme">Titre de l'intervention</label><input id="theme" name="theme" type="text" maxlength="300" value="${i.theme}"></div>
          <div class="champ span2"><label for="objectif">Objectif pédagogique</label><textarea id="objectif" name="objectif" maxlength="600" rows="2" placeholder="Ex. Identifier les risques des panneaux photovoltaïques afin de sécuriser leur intégration dans un établissement de santé">${i.objectif}</textarea>
            <span class="aide">Ce que les participants sauront faire après votre intervention. Commencez par un verbe : expliquer, identifier, analyser... Il sert à l'évaluation des acquis.</span></div>
          <div class="champ span2"><label for="resume">Résumé pour le programme</label><textarea id="resume" name="resume" maxlength="1500" rows="3">${i.resume}</textarea></div>
          <div class="champ span2"><label for="questions">Une ou deux questions pour le test de connaissances</label><textarea id="questions" name="questions" maxlength="2000" rows="3" placeholder="Question, choix proposés, et la bonne réponse">${i.questions}</textarea>
            <span class="aide">Le même test est passé au début et à la fin des journées : il mesure ce que les participants ont appris.</span></div>
          <div class="champ span2"><label for="besoins">Besoins techniques</label><input id="besoins" name="besoins" type="text" maxlength="600" value="${i.besoins}" placeholder="Ex. micro HF, vidéo avec son, connexion internet"></div>
        </div>
        <h2 style="margin-top:18px;">Vos coordonnées</h2>
        <div class="grille g2">
          <div class="champ"><label for="fonction">Fonction</label><input id="fonction" name="fonction" type="text" maxlength="120" value="${i.fonction}"></div>
          <div class="champ"><label for="organisme">Organisme</label><input id="organisme" name="organisme" type="text" maxlength="150" value="${i.organisme}"></div>
          <div class="champ"><label for="telephone">Téléphone portable</label><input id="telephone" name="telephone" type="tel" maxlength="25" value="${i.telephone}"></div>
        </div>
        <h2 style="margin-top:18px;">Hébergement et repas</h2>
        <div class="grille g2">
          <div class="champ"><label for="arrivee">Arrivée prévue</label><input id="arrivee" name="arrivee" type="text" maxlength="120" value="${i.arrivee}" placeholder="Ex. mercredi soir en train"></div>
          <div class="champ"><label for="hotel">Nuits d'hôtel souhaitées</label><input id="hotel" name="hotel" type="text" maxlength="120" value="${i.hotel}" placeholder="Ex. mercredi et jeudi"></div>
        </div>
        <fieldset class="champ"><legend class="legende">Repas</legend><div class="choix c2">
          <label class="option puce"><input type="checkbox" name="repasVeille" ${JEF.brut(i.repasVeille ? 'checked' : '')}><span class="titre">Dîner la veille</span></label>
          ${Object.keys(cfg.repas).map(function (c) { return h`<label class="option puce"><input type="checkbox" name="repas_${c}" ${JEF.brut(i.repas[c] ? 'checked' : '')}><span class="titre">${cfg.repas[c].libelle}</span></label>`; })}</div></fieldset>
        <div class="champ"><label for="regime">Régime alimentaire ou allergie</label><input id="regime" name="regime" type="text" maxlength="120" value="${i.regime === 'Standard' ? '' : i.regime}"></div>
        <div class="champ"><label for="frais">Frais à prendre en charge</label><input id="frais" name="frais" type="text" maxlength="200" value="${i.frais}" placeholder="Ex. train aller-retour"></div>
        <div class="actions-etape"><span></span><button type="submit" class="btn btn-orange btn-l" id="enr">Enregistrer</button></div>
      </form>
      <p class="petit" style="text-align:center;">Une question ? <a href="mailto:${ed.email}">${ed.email}</a>${ed.telephone ? ' - ' + ed.telephone : ''}</p>`);
    $('#form-int').addEventListener('submit', enregistrer);
    $$('[data-doc]').forEach(function (inp) { inp.addEventListener('change', function () { deposer(inp); }); });
  }

  function enregistrer(e) {
    e.preventDefault();
    var v = JEF.lireFormulaire($('#form-int'));
    v.repas = {}; Object.keys(cfg.repas).forEach(function (c) { v.repas[c] = v['repas_' + c]; delete v['repas_' + c]; });
    var retablir = JEF.attente($('#enr'), 'Enregistrement');
    JEF.post('int_maj', { data: { id: id, k: k, champs: v } }).then(function (r) { retablir(); I = r.intervenant; rendre(); JEF.toast('Merci, c\'est enregistré.', 'ok'); window.scrollTo(0, 0); })
      .catch(function (x) { retablir(); JEF.toast(x.message, 'erreur'); });
  }

  function deposer(inp) {
    var f = inp.files[0]; if (!f) return;
    if (f.size > cfg.tailleMaxMo * 1048576) { JEF.toast('Fichier trop lourd (' + cfg.tailleMaxMo + ' Mo maximum). Envoyez-le au bureau par un service de transfert.', 'erreur'); return; }
    var lab = inp.closest('label'), retablir = JEF.attente(lab, 'Envoi en cours');
    var lect = new FileReader();
    lect.onload = function () {
      JEF.post('int_depot', { data: { id: id, k: k, type: inp.getAttribute('data-doc'), fichier: { nom: f.name, type: f.type, base64: String(lect.result).split(',')[1] } } }, { delai: 300000 })
        .then(function (r) { retablir(); I = r.intervenant; rendre(); JEF.toast('Document reçu, merci.', 'ok'); })
        .catch(function (x) { retablir(); JEF.toast(x.message, 'erreur'); });
    };
    lect.onerror = function () { retablir(); JEF.toast('Lecture du fichier impossible.', 'erreur'); };
    lect.readAsDataURL(f);
  }

  JEF.config().then(JEF.habiller).catch(function () { /* rien */ });
  JEF.post('int_lire', { data: { id: id, k: k } }).then(function (r) {
    I = r.intervenant; cfg = r;
    $('#chargement').hidden = true; $('#contenu').hidden = false;
    rendre();
  }).catch(function (e) { erreur(e.message); });
})();
