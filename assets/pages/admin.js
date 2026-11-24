/* ==========================================================================
   Cockpit du Bureau : tableau de bord, stagiaires, badges, exposants,
   restauration, accueil et Qualiopi, journal. Toutes les données affichées
   passent par JEF.h (échappement automatique).
   ========================================================================== */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$, brut = JEF.brut;
  var D = null, vue = 'tableau', ficheOuverte = null, journal = null, reglages = null, reglagesModifies = false;
  var filtres = { stag: { q: '', statut: '', tri: 'recent' }, badges: { q: '', profil: '' }, journal: '' };
  var TITRES = { tableau: 'Tableau de bord', stagiaires: 'Stagiaires', badges: 'Badges', societes: 'Exposants', restauration: 'Restauration', accueil: 'Accueil et Qualiopi', journal: 'Journal des actions', reglages: 'Réglages de l\'édition' };
  var PROFILS = {
    EXPOSANT: { libelle: 'Exposant', classe: 'p-orange' }, VISITEUR: { libelle: 'Visiteur', classe: 'p-vert' },
    INVITE: { libelle: 'Invité ACSES', classe: 'p-violet' }, INTERVENANT: { libelle: 'Intervenant', classe: 'p-bleu' }
  };
  var COURT = { JM: 'J', GALA: 'G', VM: 'V' };

  // ----- Outils --------------------------------------------------------------
  function normal(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function prefixe(l) { return String(l.Statut || '').slice(0, 1); }
  function actif(l) { var p = prefixe(l); return p !== '9' && p !== '8'; }
  function actifBadge(b) { return prefixe(b) !== '9'; }
  function nomComplet(l) { return (l.Prenom || '') + ' ' + (l.Nom || ''); }

  function pastilleStatut(l, estBadge) {
    var p = prefixe(l);
    var m = estBadge
      ? { 1: ['p-ambre', 'Enregistré'], 2: ['p-vert', 'Badge envoyé'], 9: ['p-rouge', 'Annulé'] }
      : { 1: ['p-ambre', 'Pré-inscrit'], 2: ['p-violet', 'Dossier complété'], 3: ['p-orange', 'Convention à valider'], 4: ['p-bleu', 'Validé'], 5: ['p-vert', 'Payé'], 8: ['p-ambre', 'Liste d\'attente'], 9: ['p-rouge', 'Annulé'] };
    var x = m[p] || ['', l.Statut || '-'];
    return h`<span class="pastille ${x[0]}">${x[1]}</span>`;
  }
  function pastilleProfil(b) { var p = PROFILS[b.Profil] || { libelle: b.Profil, classe: '' }; return h`<span class="pastille nue ${p.classe}">${p.libelle}</span>`; }
  function repasMini(l) {
    return h`<span class="repas-mini" title="Jeudi midi, gala, vendredi midi">${['JM', 'GALA', 'VM'].map(function (c) { return h`<span class="${JEF.oui(l['Repas_' + c]) ? 'on' : ''}">${COURT[c]}</span>`; })}</span>`;
  }
  function points(l) {
    return h`<span class="points">${(D.creneaux || []).map(function (c) { return h`<i class="${l['Presence_' + c.n] ? 'on' : ''}" title="${c.libelle}"></i>`; })}</span>`;
  }
  function trouver(type, id) { return (type === 'STAG' ? D.stagiaires : D.badges).filter(function (x) { return x.ID === id; })[0]; }

  // ----- Connexion -------------------------------------------------------------
  function demarrer() {
    JEF.onSessionExpiree = function () { JEF.toast('Session expirée : reconnectez-vous.', 'erreur'); setTimeout(function () { location.reload(); }, 1500); };
    var s = JEF.session();
    if (s) { ouvrirApp(s); return; }
    JEF.config().then(function (cfg) { JEF.connexionGoogle(cfg.googleClientId, ouvrirApp, $('#message-connexion')); })
      .catch(function (e) { $('#message-connexion').textContent = e.message; });
  }

  function ouvrirApp(s) {
    if (s.role !== 'admin') {
      JEF.rendre('#message-connexion', h`Votre compte a un accès accueil uniquement. <a href="scanner.html">Ouvrir le scanner</a>`);
      return;
    }
    $('#connexion').hidden = true;
    $('#app').hidden = false;
    $('#utilisateur').textContent = s.email;
    charger();
  }

  function charger(silencieux) {
    var btn = $('#rafraichir');
    var retablir = silencieux ? function () {} : JEF.attente(btn, 'Actualisation');
    return JEF.post('admin_liste').then(function (d) {
      D = d;
      retablir();
      $('#pastille-test').hidden = !d.reglages.modeTest;
      $('#edition').textContent = 'Version ' + d.reglages.version;
      var aValider = d.stagiaires.filter(function (l) { return prefixe(l) === '3'; }).length;
      $('#c-stag').hidden = !aValider; $('#c-stag').textContent = aValider;
      afficher();
      if (ficheOuverte) ouvrirFiche(ficheOuverte.type, ficheOuverte.id);
    }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
  }

  function afficher() {
    $('#titre-vue').textContent = TITRES[vue];
    $$('.barre-laterale [data-vue]').forEach(function (b) { if (b.getAttribute('data-vue') === vue) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (!D) return;
    ({ tableau: vueTableau, stagiaires: vueStagiaires, badges: vueBadges, societes: vueSocietes, restauration: vueRestauration, accueil: vueAccueil, journal: vueJournal, reglages: vueReglages })[vue]();
  }

  // ----- Tableau de bord -------------------------------------------------------
  function vueTableau() {
    var st = D.stagiaires, actifs = st.filter(actif), badges = D.badges.filter(actifBadge);
    var cap = D.reglages.capacite;
    var ca = actifs.reduce(function (t, l) { return t + (Number(l.Montant_Total) || 0); }, 0);
    var encaisse = actifs.filter(function (l) { return l.Date_Paiement; }).reduce(function (t, l) { return t + (Number(l.Montant_Total) || 0); }, 0);
    var parProfil = {};
    badges.forEach(function (b) { parProfil[b.Profil] = (parProfil[b.Profil] || 0) + 1; });
    var repas = { JM: 0, GALA: 0, VM: 0 };
    actifs.concat(badges).forEach(function (l) { Object.keys(repas).forEach(function (c) { if (JEF.oui(l['Repas_' + c])) repas[c]++; }); });

    var etapes = [['1', 'Pré-inscrits', '#F59E0B'], ['2', 'Dossiers complétés', '#7C3AED'], ['3', 'Conventions à valider', '#EB7E0C'], ['4', 'Validés, badge envoyé', '#2575B3'], ['5', 'Payés', '#047857']];
    var max = Math.max.apply(null, etapes.map(function (e) { return st.filter(function (l) { return prefixe(l) === e[0]; }).length; }).concat([1]));

    var alertes = [];
    var conv = st.filter(function (l) { return prefixe(l) === '3'; });
    if (conv.length) alertes.push({ t: conv.length + ' convention(s) signée(s) à valider', f: function () { filtres.stag.statut = '3'; aller('stagiaires'); } });
    var adh = actifs.filter(function (l) { return l.Adherent_Verifie === 'À vérifier'; });
    if (adh.length) alertes.push({ t: adh.length + ' tarif(s) adhérent à vérifier (email absent de la liste des adhérents)', f: function () { filtres.stag.q = ''; filtres.stag.statut = 'adh'; aller('stagiaires'); } });
    var anciens = st.filter(function (l) { return prefixe(l) === '1' && l.Date_Inscription && Date.now() - new Date(l.Date_Inscription) > 10 * 864e5; });
    if (anciens.length) alertes.push({ t: anciens.length + ' dossier(s) sans réponse du service formation depuis plus de 10 jours', f: function () { filtres.stag.statut = '1'; aller('stagiaires'); } });
    var supp = badges.filter(function (b) { return Number(b.Montant) > 0; });
    if (supp.length) alertes.push({ t: supp.length + ' pass exposant supplémentaire(s) à facturer', f: function () { filtres.badges.profil = 'EXPOSANT'; aller('badges'); } });
    var attente = st.filter(function (l) { return prefixe(l) === '8'; });
    if (attente.length) alertes.push({ t: attente.length + ' personne(s) en liste d\'attente', f: function () { filtres.stag.statut = '8'; aller('stagiaires'); } });
    var sansSoc = D.societes.filter(function (s) { return !s.Pass_Total; });
    if (sansSoc.length) alertes.push({ t: sansSoc.length + ' société(s) exposante(s) sans aucun représentant inscrit', f: function () { aller('societes'); } });

    // Rythme des inscriptions sur 10 semaines
    var semaines = [], maintenant = Date.now();
    for (var i = 9; i >= 0; i--) {
      var fin = maintenant - i * 7 * 864e5, deb = fin - 7 * 864e5;
      semaines.push(st.filter(function (l) { var t = new Date(l.Date_Inscription).getTime(); return t > deb && t <= fin; }).length);
    }
    var maxS = Math.max.apply(null, semaines.concat([1]));

    JEF.rendre('#vue', h`
      ${D.reglages.modeTest ? h`<div class="alerte a-attention" style="margin-bottom:16px;"><div><b>Mode test actif</b>Les formulaires sont ouverts et tous les emails partent vers l'adresse de test. Passez Mode_Test à NON dans PARAMETRES à l'ouverture.</div></div>` : ''}
      <div class="kpis">
        <div class="kpi"><div class="libelle">Stagiaires inscrits</div><div class="valeur">${actifs.length}${cap ? brut(' <small style="font-size:1rem;color:var(--texte-3)">/ ' + cap + '</small>') : ''}</div>
          ${cap ? h`<div class="jauge"><i style="width:${Math.min(100, Math.round(actifs.length / cap * 100))}%"></i></div>` : h`<div class="detail">Capacité non limitée</div>`}</div>
        <div class="kpi"><div class="libelle">Chiffre d'affaires prévu</div><div class="valeur">${JEF.euros(ca)}</div><div class="detail">dont ${JEF.euros(encaisse)} encaissés</div></div>
        <div class="kpi"><div class="libelle">Badges hors stagiaires</div><div class="valeur">${badges.length}</div>
          <div class="detail">${Object.keys(parProfil).map(function (k) { return (PROFILS[k] || {}).libelle + ' ' + parProfil[k]; }).join(' - ') || 'Aucun'}</div></div>
        <div class="kpi"><div class="libelle">Repas commandés</div><div class="valeur">${repas.GALA}</div>
          <div class="detail">au gala - jeudi midi ${repas.JM} - vendredi midi ${repas.VM}</div></div>
      </div>
      <div class="grille g2">
        <section class="carte"><h3>Avancement des dossiers stagiaires</h3>
          <div class="entonnoir">${etapes.map(function (e) {
            var n = st.filter(function (l) { return prefixe(l) === e[0]; }).length;
            return h`<div class="ligne"><span>${e[1]}</span><div class="barre"><i style="width:${Math.round(n / max * 100)}%;background:${e[2]};"></i></div><b>${n}</b></div>`;
          })}</div></section>
        <section class="carte"><h3>À traiter</h3>
          <ul class="liste-alertes" id="alertes">${alertes.length ? alertes.map(function (a, i) { return h`<li data-i="${i}">⚠️ ${a.t}</li>`; }) : h`<li class="ok">✅ Tout est à jour</li>`}</ul></section>
      </div>
      <section class="carte" style="margin-top:18px;"><h3>Rythme des inscriptions (10 dernières semaines)</h3>
        <div style="display:flex;align-items:flex-end;gap:8px;height:110px;">${semaines.map(function (n, i) {
          return h`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;"><small>${n || ''}</small><div style="width:100%;background:${i === 9 ? 'var(--orange)' : 'var(--bleu-2)'};border-radius:6px 6px 0 0;height:${Math.max(4, Math.round(n / maxS * 80))}px;"></div></div>`;
        })}</div><div class="petit" style="display:flex;justify-content:space-between;margin-top:4px;"><span>il y a 10 semaines</span><span>cette semaine</span></div></section>`);
    $$('#alertes li[data-i]').forEach(function (li) { li.addEventListener('click', function () { alertes[Number(li.getAttribute('data-i'))].f(); }); });
  }

  // ----- Stagiaires ------------------------------------------------------------
  function actionPrincipale(l) {
    var p = prefixe(l);
    if (p === '3') return h`<button class="btn btn-s btn-vert" data-op="valider">Valider</button>`;
    if (p === '4') return h`<button class="btn btn-s" data-op="payer">Encaisser</button>`;
    if (p === '1' || p === '2') return h`<button class="btn btn-s btn-fantome" data-op="lien" title="Renvoyer le lien au service formation">Relancer</button>`;
    if (p === '8') return h`<button class="btn btn-s" data-op="sortir_attente">Admettre</button>`;
    if (p === '5') return h`<button class="btn btn-s btn-fantome" data-op="badge_pdf">Badge</button>`;
    return '';
  }

  function vueStagiaires() {
    var f = filtres.stag;
    var q = normal(f.q);
    var liste = D.stagiaires.filter(function (l) {
      if (q && normal([l.ID, l.Nom, l.Prenom, l.Email, l.Etablissement, l.Raison_Sociale].join(' ')).indexOf(q) === -1) return false;
      if (f.statut === 'adh') return l.Adherent_Verifie === 'À vérifier' && actif(l);
      if (f.statut === 'bureau') return JEF.oui(l.Membre_Bureau);
      if (f.statut === 'actifs') return actif(l);
      if (f.statut) return prefixe(l) === f.statut;
      return true;
    }).sort(function (a, b) {
      if (f.tri === 'nom') return normal(a.Nom).localeCompare(normal(b.Nom));
      if (f.tri === 'etab') return normal(a.Etablissement).localeCompare(normal(b.Etablissement));
      if (f.tri === 'statut') return String(a.Statut).localeCompare(String(b.Statut));
      return String(b.ID).localeCompare(String(a.ID));
    });
    JEF.rendre('#vue', h`
      <div class="outils">
        <input type="search" id="q" placeholder="Rechercher un nom, un établissement, un ID..." value="${f.q}" aria-label="Rechercher">
        <select id="f-statut" aria-label="Filtrer par statut">
          ${[['', 'Tous les statuts'], ['actifs', 'Inscrits actifs'], ['1', 'Pré-inscrits'], ['2', 'Dossiers complétés'], ['3', 'Conventions à valider'], ['4', 'Validés'], ['5', 'Payés'], ['8', 'Liste d\'attente'], ['9', 'Annulés'], ['adh', 'Adhésion à vérifier'], ['bureau', 'Membres du Bureau']]
            .map(function (o) { return h`<option value="${o[0]}" ${brut(f.statut === o[0] ? 'selected' : '')}>${o[1]}</option>`; })}
        </select>
        <select id="f-tri" aria-label="Trier">
          ${[['recent', 'Plus récents'], ['nom', 'Nom'], ['etab', 'Établissement'], ['statut', 'Avancement']].map(function (o) { return h`<option value="${o[0]}" ${brut(f.tri === o[0] ? 'selected' : '')}>Tri : ${o[1]}</option>`; })}
        </select>
        <span class="petit">${liste.length} dossier(s)</span>
      </div>
      <div class="tableau-conteneur"><table class="tableau"><thead><tr>
        <th>Dossier</th><th>Stagiaire</th><th>Établissement</th><th>Formule</th><th>Avancement</th><th>Présence</th><th></th></tr></thead>
        <tbody>${liste.length ? liste.map(function (l) {
          return h`<tr data-id="${l.ID}" data-type="STAG">
            <td><div class="mono nom">${l.ID}</div><div class="sous">${JEF.date(l.Date_Inscription)}</div></td>
            <td><div class="nom">${nomComplet(l)} ${JEF.oui(l.Membre_Bureau) ? h`<span class="pastille nue p-nuit">Bureau</span>` : ''}</div><div class="sous">${l.Email}</div></td>
            <td>${l.Etablissement}${l.Adherent_Verifie === 'À vérifier' ? h` <span title="Email absent de la liste des adhérents">⚠️</span>` : ''}</td>
            <td><div>${l.Typologie} - ${JEF.euros(l.Montant_Total)}</div>${repasMini(l)}</td>
            <td>${pastilleStatut(l)}</td><td>${points(l)}</td>
            <td style="text-align:right;">${actionPrincipale(l)}</td></tr>`;
        }) : h`<tr><td colspan="7" class="vide">Aucun dossier ne correspond.</td></tr>`}</tbody></table></div>`);
    $('#q').addEventListener('input', function () { f.q = this.value; var pos = this.selectionStart; vueStagiaires(); var c = $('#q'); c.focus(); c.setSelectionRange(pos, pos); });
    $('#f-statut').addEventListener('change', function () { f.statut = this.value; vueStagiaires(); });
    $('#f-tri').addEventListener('change', function () { f.tri = this.value; vueStagiaires(); });
    brancherLignes();
  }

  function brancherLignes() {
    $$('#vue tbody tr[data-id]').forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        var type = tr.getAttribute('data-type'), id = tr.getAttribute('data-id');
        var b = e.target.closest('[data-op]');
        if (b) { e.stopPropagation(); executer(type, id, b.getAttribute('data-op'), {}, b); return; }
        ouvrirFiche(type, id);
      });
    });
  }

  // ----- Badges ----------------------------------------------------------------
  function vueBadges() {
    var f = filtres.badges, q = normal(f.q);
    var liste = D.badges.filter(function (b) {
      if (q && normal([b.ID, b.Nom, b.Prenom, b.Email, b.Organisme].join(' ')).indexOf(q) === -1) return false;
      return !f.profil || b.Profil === f.profil;
    }).sort(function (a, b) { return String(b.ID).localeCompare(String(a.ID)); });
    JEF.rendre('#vue', h`
      <div class="outils">
        <input type="search" id="q" placeholder="Rechercher..." value="${f.q}" aria-label="Rechercher">
        <select id="f-profil" aria-label="Profil"><option value="">Tous les profils</option>
          ${Object.keys(PROFILS).map(function (k) { return h`<option value="${k}" ${brut(f.profil === k ? 'selected' : '')}>${PROFILS[k].libelle}</option>`; })}</select>
        <span class="petit">${liste.length} badge(s)</span>
        <button class="btn btn-primaire btn-s" id="nouveau-badge" style="margin-left:auto;">+ Nouveau badge</button>
      </div>
      <div class="tableau-conteneur"><table class="tableau"><thead><tr><th>Réf.</th><th>Profil</th><th>Personne</th><th>Organisme</th><th>Repas / visite</th><th>État</th><th>Présence</th><th></th></tr></thead>
        <tbody>${liste.length ? liste.map(function (b) {
          return h`<tr data-id="${b.ID}" data-type="PRO">
            <td class="mono nom">${b.ID}</td><td>${pastilleProfil(b)}${Number(b.Montant) > 0 ? h`<div class="sous">${b.Type_Pass} ${JEF.euros(b.Montant)}</div>` : ''}</td>
            <td><div class="nom">${nomComplet(b)}</div><div class="sous">${b.Fonction}</div></td><td>${b.Organisme}</td>
            <td>${b.Profil === 'VISITEUR' ? h`<span class="sous">${b.Creneau_Visite}</span>` : repasMini(b)}</td>
            <td>${pastilleStatut(b, true)}</td><td>${points(b)}</td>
            <td style="text-align:right;"><button class="btn btn-s" data-op="${b.Email ? 'badge_envoyer' : 'badge_pdf'}">${b.Email ? 'Envoyer' : 'PDF'}</button></td></tr>`;
        }) : h`<tr><td colspan="8" class="vide">Aucun badge.</td></tr>`}</tbody></table></div>`);
    $('#q').addEventListener('input', function () { f.q = this.value; var pos = this.selectionStart; vueBadges(); var c = $('#q'); c.focus(); c.setSelectionRange(pos, pos); });
    $('#f-profil').addEventListener('change', function () { f.profil = this.value; vueBadges(); });
    $('#nouveau-badge').addEventListener('click', modaleBadge);
    brancherLignes();
  }

  function casesRepas(prefixeNom, valeurs) {
    return h`<div class="choix c3">${Object.keys(D.repas).map(function (c) {
      return h`<label class="option puce"><input type="checkbox" name="${prefixeNom + c}" ${brut(valeurs && JEF.oui(valeurs['Repas_' + c]) ? 'checked' : '')}><span>${D.repas[c].libelle}</span></label>`;
    })}</div>`;
  }

  function modaleBadge() {
    ouvrirModale('Nouveau badge', h`
      <div class="champ"><label for="m-profil">Profil</label><select id="m-profil" name="profil">
        ${Object.keys(PROFILS).map(function (k) { return h`<option value="${k}" ${brut(k === 'INVITE' ? 'selected' : '')}>${PROFILS[k].libelle}</option>`; })}</select></div>
      <div class="grille g2">
        <div class="champ"><label for="m-civ">Civilité</label><select id="m-civ" name="civilite"><option>Mme</option><option>M.</option></select></div>
        <div class="champ"><label for="m-fonction">Fonction</label><input id="m-fonction" name="fonction" type="text"></div>
        <div class="champ"><label class="obligatoire" for="m-prenom">Prénom</label><input id="m-prenom" name="prenom" type="text" required></div>
        <div class="champ"><label class="obligatoire" for="m-nom">Nom</label><input id="m-nom" name="nom" type="text" required></div>
        <div class="champ"><label for="m-email">Email</label><input id="m-email" name="email" type="email"></div>
        <div class="champ"><label for="m-org">Organisme</label><input id="m-org" name="organisme" type="text"></div>
      </div>
      <div class="champ" id="m-bloc-soc" hidden><label for="m-soc">Société exposante</label><select id="m-soc" name="societeId"><option value="">-</option>
        ${D.societes.map(function (s) { return h`<option value="${s.ID}">${s.Nom}</option>`; })}</select></div>
      <div class="champ" id="m-bloc-cr" hidden><label for="m-cr">Demi-journée de visite</label><select id="m-cr" name="creneauVisite">
        ${D.creneaux.map(function (c) { return h`<option>${c.libelle}</option>`; })}</select></div>
      <fieldset class="champ" id="m-bloc-repas"><legend class="legende">Repas</legend>${casesRepas('repas_', null)}</fieldset>
      <div class="champ"><label for="m-regime">Régime alimentaire</label><input id="m-regime" name="regime" type="text"></div>
      <label class="case"><input type="checkbox" name="envoyer" checked> <span>Envoyer le badge par email (sinon, ouvrir le PDF pour l'imprimer)</span></label>`,
    [{ texte: 'Annuler' }, { texte: 'Créer le badge', classe: 'btn-primaire', action: function (zone, btn) {
      if (!JEF.valider(zone)) return;
      var d = JEF.lireFormulaire(zone);
      d.repas = {}; Object.keys(D.repas).forEach(function (c) { d.repas[c] = d['repas_' + c]; });
      if (d.societeId) { var s = D.societes.filter(function (x) { return x.ID === d.societeId; })[0]; if (s && !d.organisme) d.organisme = s.Nom; }
      var retablir = JEF.attente(btn, 'Création...');
      JEF.post('admin_badge', { data: d }).then(function (r) {
        fermerModale(); JEF.toast('Badge ' + r.id + ' créé' + (r.envoye ? ' et envoyé' : ''), 'ok');
        if (r.pdfUrl) window.open(r.pdfUrl, '_blank', 'noopener');
        charger(true);
      }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
    } }]);
    function adapter() {
      var p = $('#m-profil').value;
      $('#m-bloc-soc').hidden = p !== 'EXPOSANT';
      $('#m-bloc-cr').hidden = p !== 'VISITEUR';
      $('#m-bloc-repas').hidden = p === 'VISITEUR';
    }
    $('#m-profil').addEventListener('change', adapter); adapter();
  }

  // ----- Sociétés exposantes ---------------------------------------------------
  function vueSocietes() {
    JEF.rendre('#vue', h`
      <div class="outils"><span class="petit">Chaque société reçoit un lien personnel : ses représentants s'inscrivent eux-mêmes et reçoivent leur badge. Quota par défaut : ${D.reglages.quota} pass inclus.</span>
        <button class="btn btn-primaire btn-s" id="nouvelle-soc" style="margin-left:auto;">+ Nouvelle société</button></div>
      <div class="tableau-conteneur"><table class="tableau"><thead><tr><th>Société</th><th>Stand</th><th>Contact</th><th>Pass inclus</th><th>Représentants</th><th></th></tr></thead>
        <tbody>${D.societes.length ? D.societes.map(function (s) {
          var plein = s.Pass_Inclus >= s.Quota;
          return h`<tr data-soc="${s.ID}">
            <td><div class="nom">${s.Nom}</div><div class="sous mono">${s.ID}</div></td><td>${s.Stand || '-'}</td><td class="sous">${s.Email_Contact || '-'}</td>
            <td><span class="pastille ${plein ? 'p-ambre' : 'p-vert'}">${s.Pass_Inclus} / ${s.Quota}</span></td><td>${s.Pass_Total}</td>
            <td style="text-align:right;white-space:nowrap;">
              <button class="btn btn-s" data-sop="copier">Copier le lien</button>
              <button class="btn btn-s" data-sop="envoyer_lien" ${brut(s.Email_Contact ? '' : 'disabled')}>Envoyer</button>
              <button class="btn btn-s btn-fantome" data-sop="modifier">Modifier</button></td></tr>`;
        }) : h`<tr><td colspan="6" class="vide">Aucune société. Créez-en une pour lui envoyer son lien d'inscription.</td></tr>`}</tbody></table></div>`);
    $('#nouvelle-soc').addEventListener('click', function () { modaleSociete(null); });
    $$('#vue tr[data-soc]').forEach(function (tr) {
      var s = D.societes.filter(function (x) { return x.ID === tr.getAttribute('data-soc'); })[0];
      $$('[data-sop]', tr).forEach(function (b) {
        b.addEventListener('click', function () {
          var op = b.getAttribute('data-sop');
          if (op === 'copier') JEF.copier(s.Lien);
          else if (op === 'modifier') modaleSociete(s);
          else {
            var retablir = JEF.attente(b, '...');
            JEF.post('admin_societe', { data: { op: op, id: s.ID } }).then(function () { retablir(); JEF.toast('Lien envoyé à ' + s.Email_Contact, 'ok'); })
              .catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
          }
        });
      });
    });
  }

  function modaleSociete(s) {
    ouvrirModale(s ? 'Modifier ' + s.Nom : 'Nouvelle société exposante', h`
      <div class="champ"><label class="obligatoire" for="s-nom">Société</label><input id="s-nom" name="nom" type="text" required value="${s ? s.Nom : ''}"></div>
      <div class="grille g2">
        <div class="champ"><label for="s-email">Email du contact</label><input id="s-email" name="email" type="email" value="${s ? s.Email_Contact : ''}"></div>
        <div class="champ"><label for="s-stand">Stand</label><input id="s-stand" name="stand" type="text" value="${s ? s.Stand : ''}"></div>
        <div class="champ"><label for="s-quota">Pass inclus</label><input id="s-quota" name="quota" type="number" min="0" max="20" placeholder="${D.reglages.quota} (par défaut)" value="${s && s.Quota_Gratuit !== '' ? s.Quota_Gratuit : ''}"></div>
      </div>
      <div class="champ"><label for="s-notes">Notes</label><input id="s-notes" name="notes" type="text" value="${s ? s.Notes : ''}"></div>
      ${s ? h`<button type="button" class="btn btn-s btn-danger" id="s-cle" style="justify-self:start;">Désactiver l'ancien lien et en créer un nouveau</button>`
        : h`<label class="case"><input type="checkbox" name="envoyer" checked> <span>Envoyer tout de suite le lien d'inscription au contact</span></label>`}`,
    [{ texte: 'Annuler' }, { texte: s ? 'Enregistrer' : 'Créer', classe: 'btn-primaire', action: function (zone, btn) {
      if (!JEF.valider(zone)) return;
      var d = JEF.lireFormulaire(zone);
      d.op = s ? 'modifier' : 'creer'; if (s) d.id = s.ID;
      var retablir = JEF.attente(btn, '...');
      JEF.post('admin_societe', { data: d }).then(function () { fermerModale(); JEF.toast('Société enregistrée', 'ok'); charger(true); })
        .catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
    } }]);
    if (s) $('#s-cle').addEventListener('click', function () {
      confirmer('Renouveler le lien', 'L\'ancien lien ne fonctionnera plus. Pensez à envoyer le nouveau à la société.', 'Renouveler', true).then(function (ok) {
        if (!ok) return;
        JEF.post('admin_societe', { data: { op: 'nouvelle_cle', id: s.ID } }).then(function () { JEF.toast('Nouveau lien créé', 'ok'); charger(true); })
          .catch(function (e) { JEF.toast(e.message, 'erreur'); });
      });
    });
  }

  // ----- Restauration ----------------------------------------------------------
  function vueRestauration() {
    var personnes = D.stagiaires.filter(actif).concat(D.badges.filter(actifBadge));
    var codes = Object.keys(D.repas), regimes = {}, totaux = {}, profils = {};
    codes.forEach(function (c) { totaux[c] = 0; });
    personnes.forEach(function (l) {
      var r = (l.Regime || 'Standard').trim() || 'Standard';
      var prof = l.Profil ? (PROFILS[l.Profil] || {}).libelle : 'Stagiaire';
      codes.forEach(function (c) {
        if (!JEF.oui(l['Repas_' + c])) return;
        regimes[r] = regimes[r] || {}; regimes[r][c] = (regimes[r][c] || 0) + 1; totaux[c]++;
        profils[prof] = profils[prof] || {}; profils[prof][c] = (profils[prof][c] || 0) + 1;
      });
    });
    function tableau(titre, objet) {
      return h`<section class="carte"><h3>${titre}</h3><div class="tableau-conteneur"><table class="tableau matrice"><thead><tr><th></th>${codes.map(function (c) { return h`<th>${D.repas[c].libelle}</th>`; })}</tr></thead>
        <tbody>${Object.keys(objet).sort().map(function (k) { return h`<tr><td>${k}</td>${codes.map(function (c) { return h`<td>${objet[k][c] || ''}</td>`; })}</tr>`; })}
        <tr><td><b>Total</b></td>${codes.map(function (c) { return h`<td><b>${totaux[c]}</b></td>`; })}</tr></tbody></table></div></section>`;
    }
    JEF.rendre('#vue', h`
      <div class="kpis">${codes.map(function (c) { return h`<div class="kpi"><div class="libelle">${D.repas[c].libelle}</div><div class="valeur">${totaux[c]}</div><div class="detail">couverts</div></div>`; })}</div>
      <div class="grille g2">${tableau('Par régime alimentaire', regimes)}${tableau('Par profil', profils)}</div>
      <p class="petit" style="margin-top:14px;">L'export « Liste traiteur » ne contient que des volumes, sans aucun nom (régimes et allergies sont des données de santé).</p>`);
  }

  // ----- Accueil et Qualiopi ---------------------------------------------------
  function vueAccueil() {
    var st = D.stagiaires.filter(actif), badges = D.badges.filter(actifBadge);
    var valides = st.filter(function (l) { return /^[45]/.test(prefixe(l)); });
    var presents = st.filter(function (l) { return Number(l.Heures) > 0; });
    var attest = st.filter(function (l) { return l.Attestation_Envoyee; });
    var r = D.reglages;
    JEF.rendre('#vue', h`
      <div class="kpis">${D.creneaux.map(function (c) {
        var ns = st.filter(function (l) { return l['Presence_' + c.n]; }).length;
        var nb = badges.filter(function (l) { return l['Presence_' + c.n]; }).length;
        return h`<div class="kpi"><div class="libelle">${c.libelle} (${c.heures} h)</div><div class="valeur">${ns} <small style="font-size:1rem;color:var(--texte-3)">/ ${valides.length}</small></div>
          <div class="jauge"><i style="width:${valides.length ? Math.round(ns / valides.length * 100) : 0}%"></i></div><div class="detail">stagiaires présents - ${nb} autres badges</div></div>`;
      })}
        <div class="kpi"><div class="libelle">Attestations envoyées</div><div class="valeur">${attest.length} <small style="font-size:1rem;color:var(--texte-3)">/ ${presents.length}</small></div><div class="detail">stagiaires ayant au moins une présence</div></div>
      </div>
      <div class="grille g2">
        <section class="carte"><h3>Jour J</h3>
          <p class="petit">Le scanner fonctionne sur téléphone (caméra) ou PC (douchette). Il continue hors connexion et synchronise ensuite.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a class="btn btn-primaire" href="scanner.html" target="_blank" rel="noopener">📷 Ouvrir le scanner</a>
            <button class="btn" data-lancer="feuille">Générer la feuille de présence</button>
          </div></section>
        <section class="carte"><h3>Envois automatiques</h3>
          <dl class="infos"><dt>Rappel avec badge</dt><dd>${r.dateRappel || '-'}</dd><dt>Attestations et feuille</dt><dd>${r.dateAttestations || '-'}</dd><dt>Emails restants aujourd'hui</dt><dd>${r.quotaEmails}</dd></dl>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
            <button class="btn btn-s" data-lancer="planifier">Programmer aux dates des paramètres</button>
            <button class="btn btn-s" data-lancer="rappels">Envoyer les rappels maintenant</button>
            <button class="btn btn-s btn-orange" data-lancer="attestations">Envoyer les attestations maintenant</button>
          </div></section>
        <section class="carte"><h3>Réglages actuels</h3>
          <dl class="infos"><dt>Mode test</dt><dd>${r.modeTest ? 'Actif' : 'Désactivé (production)'}</dd>
            <dt>Inscriptions</dt><dd>${r.ouverture.ouvert ? 'Ouvertes' : 'Fermées'}</dd>
            <dt>Facturation automatique</dt><dd>${r.facturationAuto ? 'Oui' : 'Non (factures manuelles)'}</dd>
            <dt>Capacité</dt><dd>${r.capacite || 'Illimitée'}</dd></dl>
          <p class="petit" style="margin:10px 0 0;">Ces réglages se modifient dans l'onglet PARAMETRES du classeur.</p></section>
        <section class="carte"><h3>Documents fixes</h3>
          <p class="petit">Après une modification du programme, des CGV ou du règlement, reconvertissez-les en PDF : ils sont joints à chaque pré-inscription.</p>
          <button class="btn btn-s" data-lancer="documents_fixes">Reconvertir en PDF</button></section>
      </div>`);
    $$('[data-lancer]').forEach(function (b) {
      b.addEventListener('click', function () {
        var op = b.getAttribute('data-lancer');
        var go = function () {
          var retablir = JEF.attente(b, 'En cours...');
          JEF.post('admin_lancer', { data: { op: op } }, { delai: 360000 }).then(function (rep) {
            retablir();
            if (rep.pdfUrl) window.open(rep.pdfUrl, '_blank', 'noopener');
            var msg = op === 'attestations' ? rep.envoyees + ' attestation(s) envoyée(s), ' + rep.restantes + ' restante(s) (suite automatique)'
              : op === 'rappels' ? rep.envoyes + ' rappel(s) envoyé(s), ' + rep.restants + ' restant(s)'
              : rep.resultat ? [].concat(rep.resultat).join(' - ') || 'Terminé' : 'Terminé';
            JEF.toast(msg, 'ok'); charger(true);
          }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
        };
        if (op === 'attestations' || op === 'rappels') {
          confirmer('Confirmer l\'envoi', op === 'attestations' ? 'Envoyer maintenant les attestations à tous les stagiaires présents qui ne l\'ont pas encore reçue, et générer la feuille de présence ?'
            : 'Envoyer maintenant le rappel avec badge à tous les participants validés qui ne l\'ont pas reçu ?', 'Envoyer', false).then(function (ok) { if (ok) go(); });
        } else go();
      });
    });
  }

  // ----- Journal ---------------------------------------------------------------
  function vueJournal() {
    if (!journal) {
      JEF.rendre('#vue', h`<div class="chargement"><span class="rotation"></span>Chargement du journal...</div>`);
      JEF.post('admin_journal').then(function (r) { journal = r.journal; if (vue === 'journal') vueJournal(); }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
      return;
    }
    var q = normal(filtres.journal);
    var liste = journal.filter(function (j) { return !q || normal([j.Utilisateur, j.Action, j.Cible, j.Detail].join(' ')).indexOf(q) !== -1; });
    JEF.rendre('#vue', h`<div class="outils"><input type="search" id="q" placeholder="Filtrer le journal..." value="${filtres.journal}"><span class="petit">300 dernières actions</span>
      <button class="btn btn-s" id="recharger-journal" style="margin-left:auto;">↻</button></div>
      <div class="tableau-conteneur"><table class="tableau"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th><th>Dossier</th><th>Détail</th></tr></thead>
      <tbody>${liste.map(function (j) { return h`<tr style="cursor:default;"><td class="sous">${JEF.date(j.Date, true)}</td><td>${j.Utilisateur}</td><td><b>${j.Action}</b></td><td class="mono">${j.Cible}</td><td class="sous">${j.Detail}</td></tr>`; })}</tbody></table></div>`);
    $('#q').addEventListener('input', function () { filtres.journal = this.value; var p = this.selectionStart; vueJournal(); var c = $('#q'); c.focus(); c.setSelectionRange(p, p); });
    $('#recharger-journal').addEventListener('click', function () { journal = null; vueJournal(); });
  }


  // ----- Réglages ----------------------------------------------------------------
  function champReglage(r) {
    var v = r.valeur || '', id = 'rg-' + r.cle;
    if (r.type === 'ouinon') {
      var oui = /^(oui|true|1)$/i.test(v);
      return h`<label class="option puce" style="justify-content:space-between;"><span><span class="titre">${r.libelle}</span>${r.aide ? h`<small>${r.aide}</small>` : ''}</span>
        <input type="checkbox" data-cle="${r.cle}" data-type="ouinon" ${brut(oui ? 'checked' : '')} style="width:22px;height:22px;"></label>`;
    }
    if (r.type === 'creneau') {
      var p = v ? v.split('|') : ['', '', '', '', ''];
      return h`<fieldset class="champ" data-cle="${r.cle}" data-type="creneau" style="border:1px solid var(--bord);border-radius:12px;padding:12px;">
        <legend class="legende" style="padding:0 6px;">${r.libelle}</legend>
        <div class="grille" style="grid-template-columns:2fr 1.2fr 1fr 1fr .8fr;gap:8px;">
          <input type="text" data-p="0" value="${p[0] || ''}" placeholder="Libellé (ex. Jeudi 10 juin - matin)" aria-label="Libellé">
          <input type="date" data-p="1" value="${p[1] || ''}" aria-label="Date">
          <input type="time" data-p="2" value="${p[2] || ''}" aria-label="Début du scan">
          <input type="time" data-p="3" value="${p[3] || ''}" aria-label="Fin du scan">
          <input type="number" data-p="4" min="0" max="12" step="0.5" value="${p[4] || ''}" placeholder="h" aria-label="Heures de formation">
        </div><span class="aide">Libellé, date, début et fin de la fenêtre de scan, heures de formation comptées. Laisser le libellé vide pour ne pas utiliser ce créneau.</span></fieldset>`;
    }
    var attrs = { euros: 'type="number" min="0" step="0.01"', nombre: 'type="number" min="0" step="0.5"', entier: 'type="number" min="0" step="1"',
      entier_vide: 'type="number" min="0" step="1" placeholder="Illimité"', compteur: 'type="number" min="1" step="1"',
      jour: 'type="date"', dateheure: 'type="datetime-local"', email: 'type="email"', url: 'type="url" placeholder="https://"' }[r.type] || 'type="text"';
    var valeur = r.type === 'dateheure' ? v.replace(' ', 'T') : v;
    var saisie = r.type === 'comptes'
      ? h`<textarea id="${id}" data-cle="${r.cle}" data-type="comptes" style="min-height:64px;" placeholder="prenom.nom@acses-asso.com, ...">${valeur}</textarea>`
      : h`<div style="display:flex;align-items:center;gap:8px;"><input id="${id}" data-cle="${r.cle}" data-type="${r.type}" ${brut(attrs)} value="${valeur}">${r.type === 'euros' ? h`<b>€</b>` : ''}</div>`;
    return h`<div class="champ"><label for="${id}">${r.libelle}</label>${saisie}${r.aide && r.type !== 'comptes' ? h`<span class="aide">${r.aide}</span>` : r.type === 'comptes' ? h`<span class="aide">Adresses @acses-asso.com séparées par des virgules.</span>` : ''}</div>`;
  }

  function lireValeursReglages() {
    var o = {};
    $$('#form-reglages [data-cle]').forEach(function (el) {
      var cle = el.getAttribute('data-cle'), type = el.getAttribute('data-type');
      if (type === 'ouinon') o[cle] = el.checked ? 'OUI' : 'NON';
      else if (type === 'creneau') {
        var p = $$('[data-p]', el).map(function (i) { return i.value.trim(); });
        o[cle] = p[0] ? p.join('|') : '';
      } else if (type === 'dateheure') o[cle] = el.value.replace('T', ' ');
      else o[cle] = el.value.trim();
    });
    return o;
  }

  function vueReglages() {
    if (!reglages) {
      JEF.rendre('#vue', h`<div class="chargement"><span class="rotation"></span>Chargement des réglages...</div>`);
      JEF.post('admin_reglages').then(function (r) { reglages = r.sections; if (vue === 'reglages') vueReglages(); }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
      return;
    }
    reglagesModifies = false;
    JEF.rendre('#vue', h`
      <div class="alerte a-info" style="margin-bottom:16px;"><div><b>Les réglages s'appliquent immédiatement</b>Formulaires, prix, documents et envois utilisent ces valeurs dès l'enregistrement. Chaque modification est inscrite au journal. Les identifiants Drive et la connexion Google se règlent dans l'onglet PARAMETRES du classeur.</div></div>
      <form id="form-reglages" novalidate>
        <div class="grille g2">${reglages.map(function (s) {
          return h`<section class="carte" ${brut(/demi-journées|Accès/.test(s.titre) ? 'style="grid-column:1/-1;"' : '')}><h3>${s.titre}</h3>
            <div class="grille" style="gap:14px;">${s.reglages.map(champReglage)}</div></section>`;
        })}</div>
        <div style="position:sticky;bottom:0;margin-top:18px;padding:14px 0;background:linear-gradient(transparent,var(--fond) 30%);display:flex;gap:10px;justify-content:flex-end;align-items:center;">
          <span class="petit" id="etat-reglages">Aucune modification</span>
          <button type="button" class="btn" id="annuler-reglages">Annuler</button>
          <button type="submit" class="btn btn-primaire btn-l" id="enregistrer-reglages" disabled>Enregistrer les réglages</button>
        </div>
      </form>`);
    var form = $('#form-reglages'), initial = JSON.stringify(lireValeursReglages());
    function majEtat() {
      reglagesModifies = JSON.stringify(lireValeursReglages()) !== initial;
      $('#enregistrer-reglages').disabled = !reglagesModifies;
      $('#etat-reglages').textContent = reglagesModifies ? 'Modifications non enregistrées' : 'Aucune modification';
    }
    form.addEventListener('input', majEtat);
    form.addEventListener('change', majEtat);
    $('#annuler-reglages').addEventListener('click', function () { reglagesModifies = false; vueReglages(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!JEF.valider(form)) return;
      var valeurs = lireValeursReglages();
      var go = function () {
        var retablir = JEF.attente($('#enregistrer-reglages'), 'Enregistrement...');
        JEF.post('admin_reglages_maj', { data: { valeurs: valeurs } }).then(function (r) {
          retablir();
          JEF.toast(r.modifies.length ? r.modifies.length + ' réglage(s) enregistré(s)' : 'Aucun changement', 'ok');
          (r.avertissements || []).forEach(function (a) { JEF.toast(a); });
          reglages = null; reglagesModifies = false;
          try { sessionStorage.removeItem('jef_config'); } catch (x) { /* rien */ }
          charger(true).then(function () { if (vue === 'reglages') vueReglages(); });
        }).catch(function (err) { retablir(); JEF.toast(err.message, 'erreur'); });
      };
      var avant = JSON.parse(initial);
      if (avant.Mode_Test === 'OUI' && valeurs.Mode_Test === 'NON') {
        confirmer('Passer en production', 'Les emails partiront aux vrais participants et les formulaires suivront les dates d\'ouverture. Avez-vous supprimé les données de démonstration ?', 'Passer en production', true)
          .then(function (ok) { if (ok) go(); });
      } else go();
    });
  }

  // ----- Fiche détaillée (tiroir) ----------------------------------------------
  function lignesInfos(paires) {
    return h`<dl class="infos">${paires.filter(function (p) { return p[1] !== undefined && p[1] !== null && p[1] !== ''; }).map(function (p) { return h`<dt>${p[0]}</dt><dd>${p[1]}</dd>`; })}</dl>`;
  }

  function ouvrirFiche(type, id) {
    var l = trouver(type, id);
    if (!l) { fermerFiche(); return; }
    ficheOuverte = { type: type, id: id };
    var stag = type === 'STAG', p = prefixe(l), visiteur = l.Profil === 'VISITEUR';
    var boutons = [];
    if (stag && /[123]/.test(p)) boutons.push(h`<button class="btn btn-s btn-vert" data-op="valider">✓ Valider et envoyer le badge</button>`);
    if (stag && /[34]/.test(p)) boutons.push(h`<button class="btn btn-s" data-op="payer">€ Marquer payé</button>`);
    if (stag && p === '8') boutons.push(h`<button class="btn btn-s" data-op="sortir_attente">Admettre (sortir de l'attente)</button>`);
    if (l.Email) boutons.push(h`<button class="btn btn-s" data-op="badge_envoyer">✉ Envoyer le badge</button>`);
    boutons.push(h`<button class="btn btn-s" data-op="badge_pdf">🖨 Badge PDF</button>`);
    if (stag && /[12]/.test(p)) boutons.push(h`<button class="btn btn-s" data-op="lien">Renvoyer le lien du dossier</button>`);
    if (stag && Number(l.Heures) > 0) boutons.push(h`<button class="btn btn-s" data-op="attestation">Envoyer l'attestation</button>`);
    if (stag) boutons.push(h`<button class="btn btn-s btn-fantome" data-op="bureau">${JEF.oui(l.Membre_Bureau) ? 'Retirer du Bureau' : 'Marquer membre du Bureau'}</button>`);
    boutons.push(p === '9' ? h`<button class="btn btn-s" data-op="reactiver">Réactiver</button>` : h`<button class="btn btn-s btn-danger" data-op="annuler">Annuler l'inscription</button>`);

    var champsEdit = stag
      ? [['Civilite', 'Civilité'], ['Prenom', 'Prénom'], ['Nom', 'Nom'], ['Fonction', 'Fonction'], ['Email', 'Email'], ['Telephone', 'Téléphone'], ['Etablissement', 'Établissement'], ['Email_Formation', 'Email service formation']]
      : [['Civilite', 'Civilité'], ['Prenom', 'Prénom'], ['Nom', 'Nom'], ['Fonction', 'Fonction'], ['Email', 'Email'], ['Telephone', 'Téléphone'], ['Organisme', 'Organisme']];

    var t = $('#tiroir');
    JEF.rendre(t, h`
      <header><div style="flex:1;"><div class="petit mono">${l.ID}</div><h2 style="margin:2px 0 6px;">${nomComplet(l)}</h2>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${stag ? pastilleStatut(l) : brut(JEF._val(pastilleProfil(l)) + JEF._val(pastilleStatut(l, true)))}
        ${stag && JEF.oui(l.Membre_Bureau) ? h`<span class="pastille nue p-nuit">Bureau</span>` : ''}</div></div>
        <button class="btn btn-fantome btn-s" id="fermer-fiche" aria-label="Fermer">✕</button></header>
      <div class="corps">
        <section><h4>Actions</h4><div style="display:flex;gap:6px;flex-wrap:wrap;" id="fiche-actions">${boutons}</div></section>
        ${stag ? h`<section><h4>Suivi du dossier</h4>${lignesInfos([
          ['Inscription', JEF.date(l.Date_Inscription, true)], ['Formule', l.Typologie + ' - ' + JEF.euros(l.Montant_Formation)],
          ['Repas', JEF.euros(l.Montant_Repas)], ['Total', JEF.euros(l.Montant_Total)],
          ['Adhésion vérifiée', l.Adherent_Verifie], ['Complété par le service', JEF.date(l.Date_Complement, true)],
          ['Convention reçue', JEF.date(l.Date_Convention, true)], ['Badge envoyé', JEF.date(l.Badge_Envoye, true)],
          ['Facture', l.Numero_Facture], ['Payé le', JEF.date(l.Date_Paiement)], ['Attestation', JEF.date(l.Attestation_Envoyee, true)]])}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
            ${l.Convention_Fichier ? h`<a class="btn btn-s" href="${l.Convention_Fichier}" target="_blank" rel="noopener">📄 Convention signée</a>` : ''}
            ${l.Dossier_Drive ? h`<a class="btn btn-s" href="${l.Dossier_Drive}" target="_blank" rel="noopener">📁 Dossier Drive</a>` : ''}</div></section>`
        : h`<section><h4>Badge</h4>${lignesInfos([['Pass', l.Type_Pass + (Number(l.Montant) ? ' - ' + JEF.euros(l.Montant) : '')], ['Société', l.Societe_ID],
          ['Visite', l.Creneau_Visite], ['Inscription', JEF.date(l.Date_Inscription, true)], ['Badge envoyé', JEF.date(l.Badge_Envoye, true)]])}
          ${l.Dossier_Drive ? h`<a class="btn btn-s" style="margin-top:10px;" href="${l.Dossier_Drive}" target="_blank" rel="noopener">📁 Dossier Drive</a>` : ''}</section>`}
        <section><h4>Présence</h4><div style="display:flex;gap:6px;flex-wrap:wrap;">${D.creneaux.map(function (c) {
          var on = l['Presence_' + c.n];
          return h`<button class="btn btn-s ${on ? 'btn-vert' : ''}" data-presence="${c.n}" data-on="${on ? 1 : 0}" title="${on ? 'Présent à ' + JEF.heure(on) + ' - cliquer pour retirer' : 'Marquer présent'}">${on ? '✓ ' : ''}${c.libelle}</button>`;
        })}</div>${stag ? h`<div class="petit" style="margin-top:6px;">${l.Heures || 0} h réalisées</div>` : ''}</section>
        ${visiteur ? '' : h`<section><h4>Repas</h4><div id="fiche-repas">${casesRepas('r_', l)}</div>
          <div class="champ" style="margin-top:10px;"><label for="f-regime">Régime alimentaire</label><input id="f-regime" type="text" value="${l.Regime}"></div>
          <button class="btn btn-s" style="margin-top:10px;" id="enr-repas">Enregistrer les repas</button></section>`}
        <section><h4>Coordonnées</h4><form id="fiche-form" class="grille g2" novalidate>
          ${champsEdit.map(function (c) { return h`<div class="champ"><label>${c[1]}</label><input name="${c[0]}" type="${/Email/.test(c[0]) ? 'email' : 'text'}" value="${l[c[0]]}"></div>`; })}
          ${stag ? h`<div class="champ"><label>Formule</label><select name="Typologie"><option ${brut(l.Typologie === 'Adhérent' ? 'selected' : '')}>Adhérent</option><option ${brut(l.Typologie === 'Non-adhérent' ? 'selected' : '')}>Non-adhérent</option></select></div>` : ''}
          ${!stag && visiteur ? h`<div class="champ"><label>Visite</label><select name="Creneau_Visite">${D.creneaux.map(function (c) { return h`<option ${brut(c.libelle === l.Creneau_Visite ? 'selected' : '')}>${c.libelle}</option>`; })}</select></div>` : ''}
          <div class="champ span2"><label>Notes internes</label><textarea name="Notes" style="min-height:60px;">${l.Notes}</textarea></div>
          <div class="span2"><button class="btn btn-s btn-primaire" type="submit">Enregistrer les coordonnées</button></div></form></section>
        ${stag ? h`<section><h4>Positionnement</h4>${lignesInfos([['Niveau', l.Niveau], ['Objectifs', l.Objectifs], ['Attentes', l.Attentes], ['Handicap', l.Handicap]])}</section>
          <section><h4>Informations administratives</h4>${lignesInfos([['Raison sociale', l.Raison_Sociale], ['SIRET', l.SIRET], ['Code NAF', l.Code_NAF],
            ['Adresse', l.Adresse_Facturation], ['Signataire', l.Signataire], ['Contact', l.Contact_Formation], ['Financement', l.Mode_Financement],
            ['OPCO / ANFH', l.Nom_OPCO], ['Bon de commande', l.Bon_Commande], ['Partage du QR', l.Partage_Coordonnees]])}</section>` : ''}
      </div>`);
    t.classList.add('ouvert'); t.setAttribute('aria-hidden', 'false');
    $('#fermer-fiche').addEventListener('click', fermerFiche);
    $$('#fiche-actions [data-op]').forEach(function (b) { b.addEventListener('click', function () { executer(type, id, b.getAttribute('data-op'), {}, b); }); });
    $$('[data-presence]', t).forEach(function (b) {
      b.addEventListener('click', function () { executer(type, id, 'presence', { creneau: b.getAttribute('data-presence'), retirer: b.getAttribute('data-on') === '1' }, b); });
    });
    var enrRepas = $('#enr-repas');
    if (enrRepas) enrRepas.addEventListener('click', function () {
      var repas = {}; Object.keys(D.repas).forEach(function (c) { repas[c] = $('[name="r_' + c + '"]', t).checked; });
      modifier(type, id, { repas: repas, champs: { Regime: $('#f-regime').value } }, enrRepas);
    });
    $('#fiche-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!JEF.valider(this)) return;
      modifier(type, id, { champs: JEF.lireFormulaire(this) }, $('button[type=submit]', this));
    });
  }

  function fermerFiche() { ficheOuverte = null; var t = $('#tiroir'); t.classList.remove('ouvert'); t.setAttribute('aria-hidden', 'true'); }

  function modifier(type, id, donnees, btn) {
    var retablir = JEF.attente(btn, 'Enregistrement...');
    JEF.post('admin_modifier', { data: Object.assign({ type: type, id: id }, donnees) }).then(function (r) {
      retablir(); JEF.toast(r.avertissement || 'Modifications enregistrées', r.avertissement ? '' : 'ok'); charger(true);
    }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
  }

  // ----- Actions ---------------------------------------------------------------
  var CONFIRMATIONS = {
    valider: ['Valider le dossier', 'Le badge sera envoyé au stagiaire (et la facture si la facturation automatique est active).', 'Valider'],
    payer: ['Enregistrer le paiement', 'Le dossier passera au statut « Payé ».', 'Confirmer'],
    annuler: ['Annuler l\'inscription', 'L\'inscription sera annulée. Elle reste dans le classeur et peut être réactivée.', 'Annuler l\'inscription', true],
    attestation: ['Envoyer l\'attestation', 'L\'attestation sera générée avec les heures réellement suivies et envoyée par email.', 'Envoyer'],
    sortir_attente: ['Admettre ce stagiaire', 'Le dossier provisoire et le lien du service formation lui seront envoyés.', 'Admettre'],
    badge_envoyer: ['Envoyer le badge', 'Le badge sera régénéré et envoyé par email.', 'Envoyer'],
    lien: ['Relancer le service formation', 'Le lien personnel du dossier sera renvoyé par email au service formation (ou au stagiaire).', 'Renvoyer le lien']
  };
  var SUCCES = { valider: 'Dossier validé, badge envoyé', payer: 'Paiement enregistré', badge_envoyer: 'Badge envoyé', lien: 'Lien renvoyé', annuler: 'Inscription annulée',
    reactiver: 'Inscription réactivée', bureau: 'Statut Bureau modifié', attestation: 'Attestation envoyée', presence: 'Présence mise à jour', sortir_attente: 'Stagiaire admis' };

  function executer(type, id, op, extra, btn, forcer) {
    var conf = CONFIRMATIONS[op];
    var lancer = function () {
      var retablir = JEF.attente(btn, '...');
      JEF.post('admin_action', { data: Object.assign({ type: type, id: id, op: op, forcer: !!forcer }, extra) }, { delai: 120000 }).then(function (r) {
        retablir();
        if (r.pdfUrl) { window.open(r.pdfUrl, '_blank', 'noopener'); JEF.toast('Badge ouvert dans un nouvel onglet', 'ok'); }
        else JEF.toast(SUCCES[op] || 'Fait', 'ok');
        charger(true);
      }).catch(function (e) {
        retablir();
        if (e.code === 'confirmation') {
          confirmer('Convention non reçue', e.message, 'Valider quand même', true).then(function (ok) { if (ok) executer(type, id, op, extra, btn, true); });
        } else JEF.toast(e.message, 'erreur');
      });
    };
    if (conf && !forcer) confirmer(conf[0], conf[1] + ' (' + id + ')', conf[2], conf[3]).then(function (ok) { if (ok) lancer(); });
    else lancer();
  }

  // ----- Modales -----------------------------------------------------------------
  function ouvrirModale(titre, corps, boutons) {
    var m = $('#modale');
    JEF.rendre(m, h`<header><h3>${titre}</h3></header><form class="corps" id="modale-corps" novalidate>${corps}</form>
      <footer>${boutons.map(function (b, i) { return h`<button type="button" class="btn ${b.classe || ''}" data-b="${i}">${b.texte}</button>`; })}</footer>`);
    $('#voile').classList.add('ouvert');
    $$('[data-b]', m).forEach(function (el) {
      el.addEventListener('click', function () {
        var b = boutons[Number(el.getAttribute('data-b'))];
        if (b.action) b.action($('#modale-corps'), el); else fermerModale();
      });
    });
    $('#modale-corps').addEventListener('submit', function (e) { e.preventDefault(); });
    var premier = $('input, select', m); if (premier) premier.focus();
  }
  function fermerModale() { $('#voile').classList.remove('ouvert'); }
  function confirmer(titre, texte, libelle, danger) {
    return new Promise(function (resoudre) {
      ouvrirModale(titre, h`<p style="margin:0;">${texte}</p>`, [
        { texte: 'Retour', action: function () { fermerModale(); resoudre(false); } },
        { texte: libelle, classe: danger ? 'btn-danger' : 'btn-primaire', action: function () { fermerModale(); resoudre(true); } }]);
    });
  }

  // ----- Navigation et événements globaux ---------------------------------------
  function aller(v) {
    if (vue === 'reglages' && reglagesModifies && v !== 'reglages') {
      confirmer('Modifications non enregistrées', 'Quitter les réglages sans enregistrer ?', 'Quitter', true).then(function (ok) { if (ok) { reglagesModifies = false; aller(v); } });
      return;
    }
    vue = v; fermerFiche(); afficher(); window.scrollTo(0, 0);
  }
  $$('.barre-laterale [data-vue]').forEach(function (b) { b.addEventListener('click', function () { aller(b.getAttribute('data-vue')); }); });
  $('#rafraichir').addEventListener('click', function () { journal = null; charger(); });
  $('#deconnexion').addEventListener('click', JEF.deconnexion);
  $('#voile').addEventListener('click', function (e) { if (e.target === this) fermerModale(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if ($('#voile').classList.contains('ouvert')) fermerModale(); else fermerFiche(); } });
  $('#export').addEventListener('change', function () {
    var kind = this.value, sel = this;
    if (!kind) return;
    sel.disabled = true;
    JEF.post('admin_export', { data: { kind: kind } }).then(function (r) { JEF.telecharger(r.nom, r.csv); JEF.toast('Export téléchargé', 'ok'); })
      .catch(function (e) { JEF.toast(e.message, 'erreur'); })
      .finally(function () { sel.value = ''; sel.disabled = false; });
  });
  // Actualisation discrète toutes les 2 minutes quand l'onglet est visible.
  setInterval(function () { if (D && !document.hidden && !ficheOuverte && !$('#voile').classList.contains('ouvert')) charger(true); }, 120000);

  demarrer();
})();
