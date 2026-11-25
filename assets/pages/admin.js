/* ==========================================================================
   Cockpit du bureau - version 2.1
   Toutes les données affichées passent par JEF.h (échappement automatique).
   Textes de l'interface : admin-contenus.js
   ========================================================================== */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$, $$ = JEF.$$, brut = JEF.brut;
  var C = window.JEF_COCKPIT;
  var D = null, session = null, vue = 'tableau', fiche = null, journal = null, prefs = {};
  var PAGES_ADMIN = ['reglages', 'acces'];
  var reglages = null, reglagesInitial = '', reglagesModifies = false;
  var connectes = [], tableCourante = null, filtresPages = {}, etatsTables = {};
  var COURT = { JM: 'J', GALA: 'G', VM: 'V' };
  var PROFILS = { EXPOSANT: 'Exposant', VISITEUR: 'Visiteur', INVITE: 'Invité ACSES', INTERVENANT: 'Intervenant' };
  var COULEURS_AVATAR = ['#15528F', '#EB7E0C', '#1E7B45', '#6D28D9', '#B25E00', '#2575B3', '#0E7490'];

  // ======================================================================
  // Outils
  // ======================================================================
  function lireLocal(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function ecrireLocal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* rien */ } }
  function normal(s) { return String(s === undefined || s === null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function prefixe(l) { return String(l.Statut || '').slice(0, 1); }
  function actif(l) { var p = prefixe(l); return p !== '9' && p !== '8'; }
  function actifBadge(b) { return prefixe(b) !== '9'; }
  function nomComplet(l) { return (l.Prenom || '') + ' ' + (l.Nom || ''); }
  function initiales(nom) { return String(nom || '?').split('@')[0].split(/[\s._-]+/).filter(String).slice(0, 2).map(function (x) { return x[0].toUpperCase(); }).join('') || '?'; }
  function couleurDe(s) { var n = 0; String(s).split('').forEach(function (c) { n = (n * 31 + c.charCodeAt(0)) % 997; }); return COULEURS_AVATAR[n % COULEURS_AVATAR.length]; }
  function tag(classe, texte) { return h`<span class="tag ${classe}">${texte}</span>`; }
  function trouver(type, id) {
    var liste = type === 'STAG' ? D.stagiaires : type === 'ENT' ? D.entreprises : D.badges;
    return liste.filter(function (x) { return x.ID === id; })[0];
  }
  function entrepriseDe(b) { return D.entreprises.filter(function (e) { return e.ID === b.Entreprise_ID; })[0]; }
  function entrepriseActive(e) { return String(e.Statut || 'Active') !== 'Annulée'; }
  function courtCreneau(lib) {
    var m = String(lib).match(/^(\S+)\s+\d+\s+\S+\s*-\s*(.+)$/);
    if (!m) return lib;
    var jour = m[1].slice(0, 3);
    return jour.charAt(0).toUpperCase() + jour.slice(1) + '. ' + m[2].replace('après-midi', 'ap.-midi');
  }
  function heureMaj(d) { return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h '); }

  function tagStatutStagiaire(l) {
    var m = { 1: ['t-violet', 'Pré-inscrit'], 2: ['t-violet', 'Dossier complété'], 3: ['t-orange', 'Convention à valider'], 4: ['t-bleu', 'Validé'], 5: ['t-vert', 'Payé'], 8: ['t-violet', 'Liste d\'attente'], 9: ['t-rouge', 'Annulé'] };
    var x = m[prefixe(l)] || ['t-gris', l.Statut || '-'];
    return tag(x[0], x[1]);
  }
  function tagStatutBadge(b) {
    var p = prefixe(b);
    if (p === '9') return tag('t-rouge', 'Annulé');
    if (b.Badge_Envoye) return tag('t-vert', 'Badge envoyé');
    return tag('t-orange', b.Email ? 'Badge à envoyer' : 'À imprimer');
  }
  function tagPass(b) { return b.Type_Pass === 'Supplémentaire' ? tag('t-orange', 'Pass supplémentaire ' + JEF.euros(b.Montant)) : tag('t-vert', 'Pass inclus'); }
  function repas3(l) {
    return h`<span class="repas3" title="Jeudi midi, gala, vendredi midi">${['JM', 'GALA', 'VM'].map(function (c) { return h`<span class="${JEF.oui(l['Repas_' + c]) ? 'on' : ''}">${COURT[c]}</span>`; })}</span>`;
  }
  function estPresent(l) { return D.creneaux.some(function (c) { return !!l['Presence_' + c.n]; }); }
  function estAdmin() { return session && session.role === 'admin'; }
  /** Présent ou non, point. Un clic marque présent sur toute la formation, un second retire. */
  function boutonsPresence(l) {
    var on = estPresent(l);
    var arrivee = on ? D.creneaux.map(function (c) { return l['Presence_' + c.n]; }).filter(Boolean)[0] : null;
    return h`<span class="pres-groupe"><button class="pres ${on ? 'on' : ''}" data-op="presence" data-n="tous" title="${on ? 'Présent, arrivé le ' + JEF.date(arrivee, true) + '. Cliquer pour retirer' : 'Cliquer pour marquer présent'}">${on ? 'Présent' : 'Marquer présent'}</button></span>`;
  }
  function legende(nom) {
    var l = C.legendes[nom];
    if (!l) return '';
    return h`<div class="legende-couleurs">${l.map(function (x) {
      if (x[0] === 'pres-on') return h`<span><span class="pres on" style="cursor:default;">Présent</span> ${x[1]}</span>`;
      if (x[0] === 'pres') return h`<span><span class="pres" style="cursor:default;">Marquer présent</span> ${x[1]}</span>`;
      return h`<span>${tag(x[0], x[1])}</span>`;
    })}</div>`;
  }
  function aidePage(page) {
    var a = C.aides[page] || { texte: '', points: [] };
    var ouvert = lireLocal('jef_aide_' + page, true);
    return h`<details class="aide-page" data-aide="${page}" ${brut(ouvert ? 'open' : '')}><summary>Aide de cette page</summary><div class="contenu">
      <p style="margin:0 0 4px;">${a.texte}</p>${a.points.length ? h`<ul>${a.points.map(function (p) { return h`<li>${p}</li>`; })}</ul>` : ''}
      ${a.legende ? h`<div><b>Légende</b>${legende(a.legende)}</div>` : ''}</div></details>`;
  }
  function brancherAide() {
    $$('details.aide-page').forEach(function (d) { d.addEventListener('toggle', function () { ecrireLocal('jef_aide_' + d.getAttribute('data-aide'), d.open); }); });
  }
  function panneau(titre, indice, contenu, outils, classe) {
    return h`<section class="panneau ${classe || ''}"><div class="panneau-tete"><div><h3>${titre}</h3>${indice ? h`<p class="indice">${indice}</p>` : ''}</div>
      ${outils ? h`<div class="outils-droite">${outils}</div>` : ''}</div>${contenu}</section>`;
  }

  // ======================================================================
  // Tableau générique : tri au clic sur le titre, filtre sous chaque titre,
  // en-tête et première colonne figés, lignes et noms cliquables.
  // ======================================================================
  function tableau(id, cfg) {
    var etat = etatsTables[id] = etatsTables[id] || { tri: cfg.triDefaut || null, sens: cfg.sensDefaut || 1, filtres: {} };
    function visibles() {
      var liste = cfg.lignes.filter(function (l) {
        return cfg.colonnes.every(function (c) {
          var f = etat.filtres[c.cle];
          return !f || normal(c.val(l)).indexOf(normal(f)) !== -1;
        });
      });
      var col = cfg.colonnes.filter(function (c) { return c.cle === etat.tri; })[0];
      if (col) {
        liste.sort(function (a, b) {
          var x = col.tri ? col.tri(a) : col.val(a), y = col.tri ? col.tri(b) : col.val(b);
          if (typeof x === 'number' && typeof y === 'number') return (x - y) * etat.sens;
          return String(x).localeCompare(String(y), 'fr', { numeric: true }) * etat.sens;
        });
      }
      return liste;
    }
    function corps() {
      var liste = visibles();
      tableCourante = { id: id, cfg: cfg, lignes: liste };
      var tb = $('#t-' + id + ' tbody');
      if (!tb) return;
      JEF.rendre(tb, liste.length ? liste.map(function (l) {
        return h`<tr data-cle="${l.ID}">${cfg.colonnes.map(function (c) { return h`<td class="${c.classe || ''}">${c.rendu ? c.rendu(l) : c.val(l)}</td>`; })}</tr>`;
      }) : h`<tr class="vide-l"><td colspan="${cfg.colonnes.length}">${cfg.vide || 'Aucune ligne ne correspond aux filtres.'}</td></tr>`);
      $('#tp-' + id).textContent = liste.length + ' ligne' + (liste.length > 1 ? 's' : '') + (liste.length !== cfg.lignes.length ? ' sur ' + cfg.lignes.length : '');
    }
    var html = h`<div class="table-defile"><table class="tab" id="t-${id}"><thead>
      <tr>${cfg.colonnes.map(function (c) {
        var actifTri = etat.tri === c.cle;
        return h`<th>${c.trier === false ? c.titre : h`<button class="tri" data-tri="${c.cle}" ${brut(actifTri ? 'data-sens="' + etat.sens + '"' : '')}>${c.titre}<span class="fleche">${actifTri && etat.sens < 0 ? '▼' : '▲'}</span></button>`}</th>`;
      })}</tr>
      <tr class="filtres">${cfg.colonnes.map(function (c) {
        return h`<th>${c.filtre === false ? '' : h`<input type="search" data-filtre="${c.cle}" value="${etat.filtres[c.cle] || ''}" placeholder="Filtrer" aria-label="Filtrer ${c.titre}">`}</th>`;
      })}</tr></thead><tbody></tbody></table></div><div class="table-pied"><span id="tp-${id}"></span><span>${cfg.pied || 'Cliquez sur une ligne pour ouvrir la fiche'}</span></div>`;
    return {
      html: html,
      monter: function () {
        corps();
        var t = $('#t-' + id);
        $$('[data-tri]', t).forEach(function (b) {
          b.addEventListener('click', function () {
            var cle = b.getAttribute('data-tri');
            if (etat.tri === cle) etat.sens = -etat.sens; else { etat.tri = cle; etat.sens = 1; }
            $$('[data-tri]', t).forEach(function (x) { x.removeAttribute('data-sens'); $('.fleche', x).textContent = '▲'; });
            b.setAttribute('data-sens', etat.sens); $('.fleche', b).textContent = etat.sens < 0 ? '▼' : '▲';
            corps();
          });
        });
        $$('[data-filtre]', t).forEach(function (i) { i.addEventListener('input', function () { etat.filtres[i.getAttribute('data-filtre')] = i.value; corps(); }); });
        $('tbody', t).addEventListener('click', function (e) {
          var tr = e.target.closest('tr[data-cle]');
          if (!tr) return;
          var l = cfg.lignes.filter(function (x) { return x.ID === tr.getAttribute('data-cle'); })[0];
          var b = e.target.closest('[data-op]');
          if (b) { e.stopPropagation(); cfg.action(b.getAttribute('data-op'), l, b); return; }
          if (cfg.clic) cfg.clic(l);
        });
      }
    };
  }

  // ======================================================================
  // Connexion, chargement, structure
  // ======================================================================
  function demarrer() {
    JEF.onSessionExpiree = function () { JEF.toast('Session expirée : reconnectez-vous.', 'erreur'); setTimeout(function () { location.reload(); }, 1500); };
    var s = JEF.session();
    if (s) { ouvrirApp(s); return; }
    JEF.config().then(function (cfg) { JEF.connexionGoogle(cfg.googleClientId, ouvrirApp, $('#message-connexion')); })
      .catch(function (e) { $('#message-connexion').textContent = 'Serveur injoignable. ' + e.message; });
  }

  function ouvrirApp(s) {
    if (s.role !== 'admin' && s.role !== 'utilisateur') { JEF.oublierSession(); JEF.rendre('#message-connexion', h`Votre session a changé, reconnectez-vous.`); setTimeout(function () { location.reload(); }, 1500); return; }
    session = s;
    prefs = lireLocal('jef_prefs', {});
    JEF.post('preferences', { data: {} }).then(function (r) { prefs = r.preferences || {}; ecrireLocal('jef_prefs', prefs); if (vue === 'tableau' && D) afficher(); }).catch(function () { /* préférences locales */ });
    $('#connexion').hidden = true;
    $('#app').hidden = false;
    construireMenu();
    construireCompte();
    var depart = (location.hash || '').replace('#', '');
    var ficheDemandee = depart.indexOf('fiche=') === 0 ? decodeURIComponent(depart.slice(6)) : '';
    var typeDemande = /^JEF/.test(ficheDemandee) ? 'STAG' : (/^ENT/.test(ficheDemandee) ? 'ENT' : 'PRO');
    vue = ficheDemandee ? (typeDemande === 'STAG' ? 'stagiaires' : (typeDemande === 'ENT' || /^EXP/.test(ficheDemandee) ? 'entreprises' : 'badges')) : (C.aides[depart] ? depart : lireLocal('jef_vue', 'tableau'));
    if (PAGES_ADMIN.indexOf(vue) !== -1 && !estAdmin()) vue = 'tableau';
    if (ficheDemandee && typeDemande === 'STAG') filtresPages.stagiaires = 'tous';
    charger().then(function () {
      signalerPresence();
      if (ficheDemandee && trouver(typeDemande, ficheDemandee)) {
        history.replaceState(null, '', '#' + vue);
        ouvrirFiche(typeDemande, ficheDemandee);
        var l = trouver(typeDemande, ficheDemandee);
        if (typeDemande === 'STAG' && prefixe(l) === '3' && l.Convention_Fichier) apercuConvention(l);
      } else afficherNouveautesUneFois();
    });
    setInterval(signalerPresence, 30000);
    setInterval(function () { if (D && !document.hidden && !fiche && !$('#voile').classList.contains('ouvert') && !reglagesModifies) charger(true); }, 120000);
  }

  function construireMenu() {
    JEF.rendre('#nav', C.menu.map(function (g) {
      return h`<div class="menu-groupe"><div class="menu-groupe-titre"><i style="background:${g.couleur};"></i>${g.titre}</div>
        ${g.pages.filter(function (p) { return estAdmin() || PAGES_ADMIN.indexOf(p[0]) === -1; }).map(function (p) { return h`<button class="menu-btn" data-vue="${p[0]}">${p[1]}<span class="compteur" id="c-${p[0]}" hidden></span></button>`; })}</div>`;
    }));
    $('#menu-bas').textContent = 'Version ' + C.version;
    $$('#nav [data-vue]').forEach(function (b) { b.addEventListener('click', function () { aller(b.getAttribute('data-vue')); $('#menu').classList.remove('ouvert'); }); });
  }

  function construireCompte() {
    var b = $('#b-compte');
    JEF.rendre(b, h`<span class="avatar" style="background:${couleurDe(session.email)};">${initiales(session.nom || session.email)}</span><span>${String(session.nom && session.nom.indexOf('@') === -1 ? session.nom : session.email.split('@')[0]).split(' ')[0]}</span>`);
    JEF.rendre('#menu-compte', h`<div class="entete-menu"><b>${session.nom || ''}</b><br>${session.email}<br>${estAdmin() ? 'Administrateur' : 'Utilisateur'}</div>
      <a href="scanner.html" target="_blank" rel="noopener">Ouvrir le scanner</a>
      <button data-compte="aide">Mode d'emploi</button><button data-compte="sortir">Se déconnecter</button>`);
  }

  function etatSynchro(classe, texte) { var e = $('#etat-synchro'); e.className = 'etat-synchro ' + (classe || ''); e.textContent = texte; }

  function charger(silencieux) {
    if (!silencieux) etatSynchro('en-cours', 'Actualisation');
    return JEF.post('admin_liste').then(function (d) {
      D = d;
      etatSynchro(reglagesModifies ? 'attention' : '', reglagesModifies ? 'Pensez à enregistrer' : 'À jour à ' + heureMaj(new Date()));
      majCompteurs();
      afficherBandeaux();
      afficher();
      if (fiche) ouvrirFiche(fiche.type, fiche.id, true);
    }).catch(function (e) { etatSynchro('erreur', 'Erreur de connexion'); JEF.toast(e.message, 'erreur'); });
  }

  function majCompteurs() {
    var n = { stagiaires: D.stagiaires.filter(function (l) { return prefixe(l) === '3'; }).length,
      entreprises: D.badges.filter(function (b) { return b.Profil === 'EXPOSANT' && actifBadge(b) && b.Email && !b.Badge_Envoye; }).length };
    Object.keys(n).forEach(function (k) { var c = $('#c-' + k); if (c) { c.hidden = !n[k]; c.textContent = n[k]; } });
  }

  // ----- Bandeaux ----------------------------------------------------------
  function afficherBandeaux() {
    var liste = [];
    var r = D.reglages;
    if (r.modeTest) liste.push({ g: 'violet', essentiel: true, t: brut('<b>Mode test actif.</b> Les formulaires restent ouverts et tous les emails partent vers l\'adresse de test.'), a: [['Réglages', function () { aller('reglages'); }]] });
    if (r.quotaEmails < 150) liste.push({ g: 'rouge', essentiel: true, t: 'Plus que ' + r.quotaEmails + ' emails possibles aujourd\'hui. Les envois en nombre risquent d\'échouer.' });
    var conv = D.stagiaires.filter(function (l) { return prefixe(l) === '3'; }).length;
    if (conv) liste.push({ g: 'orange', t: conv + ' convention' + (conv > 1 ? 's signées attendent' : ' signée attend') + ' votre validation.', a: [['Voir', function () { filtresPages.stagiaires = 'valider'; aller('stagiaires'); }]] });
    if (!r.ouverture.ouvert && !r.modeTest) liste.push({ g: 'gris', t: 'Les inscriptions sont fermées en ce moment.', a: [['Dates', function () { aller('reglages'); }]] });
    var vu = lireLocal('jef_version_vue', '');
    if (vu && vu !== C.version) liste.push({ g: 'gris', t: 'Nouvelle version ' + C.version + ' du cockpit.', a: [['Quoi de neuf', function () { aller('nouveautes'); }]] });
    var z = $('#bandeaux');
    var rendu = function (b, i) {
      return h`<div class="bandeau b-${b.g}"><span class="texte">${b.t}</span>${(b.a || []).map(function (a, j) { return h`<button class="btn btn-s" data-bandeau="${i}-${j}">${a[0]}</button>`; })}</div>`;
    };
    var essentiels = liste.filter(function (b) { return b.essentiel; }), autres = liste.filter(function (b) { return !b.essentiel; });
    JEF.rendre(z, h`${essentiels.map(function (b) { return rendu(b, liste.indexOf(b)); })}
      ${autres.length === 1 ? rendu(autres[0], liste.indexOf(autres[0])) : ''}
      ${autres.length > 1 ? h`<details class="groupe-bandeaux"><summary>${autres.length} informations en attente</summary><div>${autres.map(function (b) { return rendu(b, liste.indexOf(b)); })}</div></details>` : ''}`);
    $$('[data-bandeau]', z).forEach(function (b) {
      var p = b.getAttribute('data-bandeau').split('-');
      b.addEventListener('click', liste[Number(p[0])].a[Number(p[1])][1]);
    });
  }

  function afficherNouveautesUneFois() {
    var vu = lireLocal('jef_version_vue', '');
    if (vu === C.version) return;
    ecrireLocal('jef_version_vue', C.version);
    var n = C.nouveautes[0];
    ouvrirModale('Nouveautés de la version ' + n.version, h`<ul style="margin:0;padding-left:18px;display:grid;gap:4px;">${n.points.map(function (p) { return h`<li>${p}</li>`; })}</ul>`,
      [{ texte: 'Voir le mode d\'emploi', action: function () { fermerModale(); aller('aide'); } }, { texte: 'C\'est noté', classe: 'btn-primaire' }]);
  }

  // ----- Personnes connectées ----------------------------------------------
  function signalerPresence() {
    if (!session) return;
    JEF.post('presence', { data: { vue: vue, fiche: fiche ? fiche.id : '' } }, { delai: 20000 }).then(function (r) {
      connectes = r.connectes || [];
      var autres = connectes.filter(function (c) { return !c.moi; });
      JEF.rendre('#connectes', autres.map(function (c) {
        var page = ((C.menu.map(function (g) { return g.pages; }).reduce(function (a, b) { return a.concat(b); }, []).filter(function (p) { return p[0] === c.vue; })[0]) || [])[1] || 'cockpit';
        return h`<span class="avatar" style="background:${couleurDe(c.email)};" title="${(c.nom || c.email) + ' - ' + (c.role === 'accueil' ? 'scanner' : page) + (c.fiche ? ', fiche ' + c.fiche : '')}">${initiales(c.nom || c.email)}</span>`;
      }));
      if (fiche) avertirFicheOuverte();
    }).catch(function () { /* silencieux : n'empêche pas de travailler */ });
  }
  function avertirFicheOuverte() {
    var z = $('#fiche-partagee');
    if (!z || !fiche) return;
    var autres = connectes.filter(function (c) { return !c.moi && c.fiche === fiche.id; });
    JEF.rendre(z, autres.length ? h`<div class="bandeau b-violet" style="margin:0 0 4px;"><span class="texte"><b>${autres.map(function (c) { return c.nom || c.email; }).join(', ')}</b> consulte aussi cette fiche. Évitez de modifier la même chose en même temps.</span></div>` : '');
  }

  // ======================================================================
  // Navigation
  // ======================================================================
  function titrePage(v) {
    var t = 'Cockpit';
    C.menu.forEach(function (g) { g.pages.forEach(function (p) { if (p[0] === v) t = p[1]; }); });
    return t;
  }
  function aller(v) {
    if (PAGES_ADMIN.indexOf(v) !== -1 && !estAdmin()) { JEF.toast('Page réservée aux administrateurs.', 'erreur'); return; }
    if (vue === 'reglages' && reglagesModifies && v !== 'reglages') {
      confirmer('Modifications non enregistrées', 'Vous avez modifié des réglages sans les enregistrer. Quitter la page les annule.', 'Quitter sans enregistrer', true)
        .then(function (ok) { if (ok) { reglagesModifies = false; aller(v); } });
      return;
    }
    if (!reglagesModifies) reglages = null; // réglages relus à chaque page : jamais de valeur périmée
    vue = v; ecrireLocal('jef_vue', v);
    history.replaceState(null, '', '#' + v);
    fermerFiche(); afficher(); window.scrollTo(0, 0); signalerPresence();
  }
  function afficher() {
    $('#titre-vue').textContent = titrePage(vue);
    document.title = titrePage(vue) + ' - Cockpit JEF ACSES';
    $$('#nav [data-vue]').forEach(function (b) { if (b.getAttribute('data-vue') === vue) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    tableCourante = null;
    JEF.rendre('#actions-contexte', '');
    if (!D) return;
    var f = { tableau: vueTableau, stagiaires: vueStagiaires, presences: vuePresences, qualiopi: vueQualiopi, acces: vueAcces, entreprises: vueEntreprises, badges: vueBadges,
      restauration: vueRestauration, jourj: vueJourJ, reglages: vueReglages, journal: vueJournal, aide: vueAide, nouveautes: vueNouveautes }[vue] || vueTableau;
    f();
    brancherAide();
    $$('#vue [data-sur-place]').forEach(function (b) { b.addEventListener('click', function () { modaleSurPlace(); }); });
  }

  // ======================================================================
  // Tableau de bord
  // ======================================================================
  function vueTableau() {
    var st = D.stagiaires, actifs = st.filter(actif), badges = D.badges.filter(actifBadge);
    var r = D.reglages, maintenant = Date.now();
    var exposants = badges.filter(function (b) { return b.Profil === 'EXPOSANT'; });
    var aFaire = [
      { n: st.filter(function (l) { return prefixe(l) === '3'; }).length, t: 'Conventions à valider', s: 'Signées et déposées par le service formation', go: function () { filtresPages.stagiaires = 'valider'; aller('stagiaires'); } },
      { n: st.filter(function (l) { return prefixe(l) === '4'; }).length, t: 'Paiements attendus', s: 'Dossiers validés, à encaisser', go: function () { filtresPages.stagiaires = 'encaisser'; aller('stagiaires'); } },
      { n: st.filter(function (l) { return /[12]/.test(prefixe(l)) && l.Date_Inscription && maintenant - new Date(l.Date_Inscription) > 10 * 864e5; }).length, t: 'Dossiers à relancer', s: 'Sans document signé depuis plus de 10 jours', go: function () { filtresPages.stagiaires = 'relance'; aller('stagiaires'); } },
      { n: actifs.filter(function (l) { return l.Adherent_Verifie === 'À vérifier'; }).length, t: 'Tarifs adhérent à vérifier', s: 'Email absent de la liste des adhérents', go: function () { filtresPages.stagiaires = 'adh'; aller('stagiaires'); } },
      { n: st.filter(function (l) { return prefixe(l) === '8'; }).length, t: 'Personnes en liste d\'attente', s: 'À admettre si une place se libère', go: function () { filtresPages.stagiaires = 'attente'; aller('stagiaires'); } },
      { n: D.entreprises.filter(function (e) { return entrepriseActive(e) && !e.Pass_Total; }).length, t: 'Entreprises sans représentant', s: 'Noms des exposants à demander', go: function () { filtresPages.entreprises = 'sans'; aller('entreprises'); } },
      { n: exposants.filter(function (b) { return b.Email && !b.Badge_Envoye; }).length, t: 'Badges exposants à envoyer', s: 'Représentants ajoutés, badge pas encore parti', go: function () { filtresPages.entreprises = 'envoyer'; aller('entreprises'); } },
      { n: exposants.filter(function (b) { return Number(b.Montant) > 0; }).length, t: 'Pass exposants supplémentaires', s: 'À facturer aux entreprises', go: function () { filtresPages.entreprises = 'supp'; aller('entreprises'); } },
      { n: badges.filter(function (b) { return b.Profil !== 'EXPOSANT' && b.Email && !b.Badge_Envoye; }).length, t: 'Badges visiteurs ou invités à envoyer', s: 'Pas encore partis', go: function () { filtresPages.badges = 'envoyer'; aller('badges'); } },
      { n: actifs.filter(function (l) { return Number(l.Heures) > 0 && !l.Attestation_Envoyee; }).length, t: 'Attestations à envoyer', s: 'Stagiaires présents sans attestation', go: function () { aller('presences'); } }
    ].filter(function (x) { return x.n > 0; });

    var cap = r.capacite;
    var ca = actifs.reduce(function (t, l) { return t + (Number(l.Montant_Total) || 0); }, 0)
      + exposants.reduce(function (t, b) { return t + (Number(b.Montant) || 0); }, 0);
    var facture = actifs.filter(function (l) { return l.Numero_Facture; }).reduce(function (t, l) { return t + (Number(l.Montant_Total) || 0); }, 0);
    var encaisse = actifs.filter(function (l) { return l.Date_Paiement; }).reduce(function (t, l) { return t + (Number(l.Montant_Total) || 0); }, 0);
    var visiteurs = badges.filter(function (b) { return b.Profil === 'VISITEUR'; }).length;
    var invites = badges.filter(function (b) { return b.Profil === 'INVITE' || b.Profil === 'INTERVENANT'; }).length;

    // Repas par jour et par profil
    var groupes = [['Stagiaires', actifs], ['Exposants', exposants], ['Invités et intervenants', badges.filter(function (b) { return b.Profil === 'INVITE' || b.Profil === 'INTERVENANT'; })]];
    var codes = Object.keys(D.repas);
    var lignesRepas = codes.map(function (c) {
      var par = groupes.map(function (g) { return g[1].filter(function (l) { return JEF.oui(l['Repas_' + c]); }).length; });
      var tous = actifs.concat(badges).filter(function (l) { return JEF.oui(l['Repas_' + c]); });
      var regimes = tous.filter(function (l) { return l.Regime && !/^standard$/i.test(String(l.Regime).trim()); }).length;
      return { lib: D.repas[c].libelle, par: par, total: tous.length, regimes: regimes };
    });

    // Avancement, financement, établissements, aménagements
    var etapes = [['1', 'Pré-inscrits', '#6D28D9'], ['2', 'Dossiers complétés', '#8B5CF6'], ['3', 'Conventions à valider', '#EB7E0C'], ['4', 'Validés', '#2F6BFF'], ['5', 'Payés', '#1E7B45']];
    var maxE = Math.max.apply(null, etapes.map(function (e) { return st.filter(function (l) { return prefixe(l) === e[0]; }).length; }).concat([1]));
    var fin = {};
    actifs.forEach(function (l) { var k = l.Mode_Financement || 'Pas encore indiqué'; fin[k] = (fin[k] || 0) + 1; });
    var maxF = Math.max.apply(null, Object.keys(fin).map(function (k) { return fin[k]; }).concat([1]));
    var etab = {};
    actifs.forEach(function (l) { var k = l.Etablissement || '-'; etab[k] = (etab[k] || 0) + 1; });
    var topEtab = Object.keys(etab).sort(function (a, b) { return etab[b] - etab[a]; }).slice(0, 6);
    var amenagements = actifs.filter(function (l) { return l.Handicap && !/^aucun/i.test(String(l.Handicap).trim()); });
    var adh = actifs.filter(function (l) { return l.Typologie === 'Adhérent'; }).length;
    var semaines = [];
    for (var i = 9; i >= 0; i--) {
      var finS = maintenant - i * 7 * 864e5, debS = finS - 7 * 864e5;
      semaines.push(st.filter(function (l) { var t = new Date(l.Date_Inscription).getTime(); return t > debS && t <= finS; }).length);
    }
    var maxS = Math.max.apply(null, semaines.concat([1]));

    var presentsJ = actifs.concat(badges).filter(estPresent).length;
    var W = {
      afaire: { titre: 'Actions à faire', large: true, html: panneau('Actions à faire', 'Un clic ouvre la liste concernée.', aFaire.length
        ? h`<div class="a-faire">${aFaire.map(function (x, i) { return h`<button class="carte-faire" data-faire="${i}"><b>${x.n}</b><span>${x.t}<small>${x.s}</small></span></button>`; })}</div>`
        : h`<div class="a-faire"><div class="carte-faire ok"><b>✓</b><span>Rien à faire pour le moment<small>Tous les dossiers sont à jour</small></span></div></div>`) },
      chiffres: { titre: 'Chiffres clés', large: true, html: h`<div class="chiffres" style="margin:0;">
        <div class="chiffre"><div class="lib">Stagiaires inscrits</div><div class="val">${actifs.length}${cap ? brut('<small style="font-size:14px;color:var(--texte-2)"> / ' + cap + '</small>') : ''}</div>
          ${cap ? h`<div class="jauge2"><i style="width:${Math.min(100, Math.round(actifs.length / cap * 100))}%"></i></div><div class="det">${Math.max(0, cap - actifs.length)} places restantes</div>` : h`<div class="det">Places non limitées</div>`}</div>
        <div class="chiffre"><div class="lib">Chiffre d'affaires prévu</div><div class="val">${JEF.euros(ca)}</div><div class="det">${JEF.euros(facture)} facturés, ${JEF.euros(encaisse)} encaissés</div></div>
        <div class="chiffre"><div class="lib">Entreprises partenaires</div><div class="val">${D.entreprises.filter(entrepriseActive).length}</div><div class="det">${exposants.length} badges exposants</div></div>
        <div class="chiffre"><div class="lib">Visiteurs de l'espace exposants</div><div class="val">${visiteurs}</div><div class="det">Invitations gratuites</div></div>
        <div class="chiffre"><div class="lib">Invités et intervenants</div><div class="val">${invites}</div><div class="det">Créés par le bureau</div></div>
        <div class="chiffre"><div class="lib">Participants attendus</div><div class="val">${actifs.length + badges.length}</div><div class="det">Tous badges confondus</div></div>
      </div>` },
      surplace: { titre: 'Inscription sur place', html: panneau('Inscription sur place', 'Une personne arrive sans inscription : stagiaire, exposant, invité, intervenant ou visiteur.',
        h`<button class="btn btn-l btn-action" style="width:100%;justify-content:center;" data-sur-place>+ Inscrire et imprimer le badge</button>
          <p class="indice" style="margin:8px 0 0;">Sans repas par défaut. Le badge prend le modèle du profil choisi.</p>`) },
      repas: { titre: 'Repas par jour', large: true, html: panneau('Repas par jour', 'Couverts à commander, par profil. Les régimes particuliers sont détaillés dans Restauration.', h`<div class="table-defile" style="max-height:none;"><table class="tab">
        <thead><tr><th>Repas</th>${groupes.map(function (g) { return h`<th>${g[0]}</th>`; })}<th>Total</th><th>Dont régimes particuliers</th></tr></thead>
        <tbody>${lignesRepas.map(function (x) { return h`<tr style="cursor:default;"><td><b>${x.lib}</b></td>${x.par.map(function (n) { return h`<td>${n}</td>`; })}<td><b>${x.total}</b></td><td>${x.regimes}</td></tr>`; })}</tbody></table></div>`,
        h`<button class="btn btn-s" data-aller="restauration">Détail des régimes</button>`) },
      avancement: { titre: 'Avancement des dossiers', html: panneau('Avancement des dossiers', 'Nombre de dossiers à chaque étape.', h`<div class="barres">${etapes.map(function (e) {
          var n = st.filter(function (l) { return prefixe(l) === e[0]; }).length;
          return h`<div class="l"><span>${e[1]}</span><div class="b"><i style="width:${Math.round(n / maxE * 100)}%;background:${e[2]};"></i></div><b>${n}</b></div>`;
        })}</div>`) },
      financement: { titre: 'Financement', html: panneau('Financement', 'Mode de prise en charge des stagiaires.', h`<div class="barres">${Object.keys(fin).sort().map(function (k) {
          return h`<div class="l"><span>${k}</span><div class="b"><i style="width:${Math.round(fin[k] / maxF * 100)}%;background:var(--bleu-2);"></i></div><b>${fin[k]}</b></div>`;
        })}${Object.keys(fin).length ? '' : h`<p class="indice">Aucun stagiaire pour le moment.</p>`}</div>`) },
      adhesion: { titre: 'Adhésion', html: panneau('Adhésion', 'Répartition des stagiaires inscrits.', h`<div class="barres">
          <div class="l"><span>Adhérents</span><div class="b"><i style="width:${actifs.length ? Math.round(adh / actifs.length * 100) : 0}%;background:var(--vert);"></i></div><b>${adh}</b></div>
          <div class="l"><span>Non-adhérents</span><div class="b"><i style="width:${actifs.length ? Math.round((actifs.length - adh) / actifs.length * 100) : 0}%;background:var(--orange-acses);"></i></div><b>${actifs.length - adh}</b></div></div>`) },
      etablissements: { titre: 'Établissements représentés', html: panneau('Établissements représentés', Object.keys(etab).length + ' établissements différents.', h`<div class="barres">${topEtab.map(function (k) {
          return h`<div class="l"><span title="${k}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${k}</span><div class="b"><i style="width:${Math.round(etab[k] / (etab[topEtab[0]] || 1) * 100)}%;background:var(--bleu);"></i></div><b>${etab[k]}</b></div>`;
        })}</div>`) },
      amenagements: { titre: 'Besoins d\'aménagement', html: panneau('Besoins d\'aménagement', 'Données de santé, à ne pas diffuser. Cliquez sur un nom pour ouvrir la fiche.', amenagements.length
          ? h`<ul style="margin:0;padding-left:18px;display:grid;gap:4px;">${amenagements.map(function (l) { return h`<li><button class="lien-nom" data-fiche="${l.ID}">${nomComplet(l)}</button> - ${l.Handicap}</li>`; })}</ul>`
          : h`<p class="indice" style="margin:0;">Aucun besoin signalé.</p>`) },
      presences: { titre: 'Présences', html: panneau('Présences', 'Personnes enregistrées présentes, tous profils.', h`<div class="chiffre" style="border:0;padding:0;"><div class="val">${presentsJ}<small style="font-size:14px;color:var(--texte-2)"> / ${actifs.length + badges.length}</small></div>
          <div class="jauge2"><i style="width:${Math.round(presentsJ / Math.max(1, actifs.length + badges.length) * 100)}%"></i></div><div class="det">personnes arrivées</div></div>`,
          h`<button class="btn btn-s" data-aller="presences">Voir</button>`) },
      rythme: { titre: 'Rythme des inscriptions', large: true, html: panneau('Rythme des inscriptions', 'Nouvelles inscriptions par semaine, sur les 10 dernières semaines.', h`<div style="display:flex;align-items:flex-end;gap:8px;height:110px;">${semaines.map(function (n, i) {
          return h`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;"><small>${n || ''}</small><div style="width:100%;background:${i === 9 ? 'var(--orange-acses)' : 'var(--bleu-2)'};border-radius:6px 6px 0 0;height:${Math.max(3, Math.round(n / maxS * 80))}px;"></div></div>`;
        })}</div><div class="indice" style="display:flex;justify-content:space-between;"><span>Il y a 10 semaines</span><span>Cette semaine</span></div>`) }
    };
    var ordre = ordreWidgets(Object.keys(W));
    JEF.rendre('#actions-contexte', h`<button class="btn btn-s" id="b-personnaliser">Personnaliser le tableau de bord</button>`);
    JEF.rendre('#vue', h`${aidePage('tableau')}
      <div class="widgets">${ordre.filter(function (w) { return w.visible; }).map(function (w) {
        return h`<div class="widget ${W[w.id].large ? 'large' : ''}" data-widget="${w.id}">${W[w.id].html}</div>`;
      })}</div>
      ${ordre.every(function (w) { return !w.visible; }) ? h`<p class="indice">Tous les widgets sont masqués. Cliquez sur « Personnaliser le tableau de bord ».</p>` : ''}`);
    $$('[data-faire]').forEach(function (b) { b.addEventListener('click', function () { aFaire[Number(b.getAttribute('data-faire'))].go(); }); });
    $$('[data-fiche]').forEach(function (b) { b.addEventListener('click', function () { ouvrirFiche('STAG', b.getAttribute('data-fiche')); }); });
    $$('[data-aller]').forEach(function (b) { b.addEventListener('click', function () { aller(b.getAttribute('data-aller')); }); });
    $('#b-personnaliser').addEventListener('click', function () { modaleWidgets(W); });
  }

  // ----- Widgets : affichage et ordre, enregistrés pour chaque compte ------------
  function ordreWidgets(ids) {
    var p = (prefs.widgets || []).filter(function (w) { return ids.indexOf(w.id) !== -1; });
    var vus = p.map(function (w) { return w.id; });
    return p.concat(ids.filter(function (id) { return vus.indexOf(id) === -1; }).map(function (id) { return { id: id, visible: true }; }));
  }
  function modaleWidgets(W) {
    var liste = ordreWidgets(Object.keys(W)).map(function (w) { return { id: w.id, visible: w.visible }; });
    function rendre() {
      JEF.rendre('#liste-widgets', liste.map(function (w, i) {
        return h`<li draggable="true" data-i="${i}" class="${w.visible ? '' : 'masque'}"><span class="poignee" aria-hidden="true">⋮⋮</span>
          <label class="case" style="flex:1;"><input type="checkbox" data-vis="${i}" ${brut(w.visible ? 'checked' : '')}> <span>${W[w.id].titre}</span></label>
          <button type="button" class="btn btn-s" data-monter="${i}" aria-label="Monter" ${brut(i === 0 ? 'disabled' : '')}>▲</button>
          <button type="button" class="btn btn-s" data-descendre="${i}" aria-label="Descendre" ${brut(i === liste.length - 1 ? 'disabled' : '')}>▼</button></li>`;
      }));
      $$('[data-vis]').forEach(function (c) { c.addEventListener('change', function () { liste[Number(c.getAttribute('data-vis'))].visible = c.checked; rendre(); }); });
      $$('[data-monter]').forEach(function (b) { b.addEventListener('click', function () { var i = Number(b.getAttribute('data-monter')); liste.splice(i - 1, 0, liste.splice(i, 1)[0]); rendre(); }); });
      $$('[data-descendre]').forEach(function (b) { b.addEventListener('click', function () { var i = Number(b.getAttribute('data-descendre')); liste.splice(i + 1, 0, liste.splice(i, 1)[0]); rendre(); }); });
      var depart = null;
      $$('#liste-widgets li').forEach(function (li) {
        li.addEventListener('dragstart', function (e) { depart = Number(li.getAttribute('data-i')); li.classList.add('glisse'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(depart)); } catch (x) { /* rien */ } });
        li.addEventListener('dragend', function () { li.classList.remove('glisse'); });
        li.addEventListener('dragover', function (e) { e.preventDefault(); li.classList.add('cible'); });
        li.addEventListener('dragleave', function () { li.classList.remove('cible'); });
        li.addEventListener('drop', function (e) { e.preventDefault(); var arrivee = Number(li.getAttribute('data-i')); if (depart !== null && depart !== arrivee) { liste.splice(arrivee, 0, liste.splice(depart, 1)[0]); rendre(); } });
      });
    }
    ouvrirModale('Personnaliser le tableau de bord', h`<p class="indice" style="margin:0;">Cochez les widgets à afficher. Glissez une ligne, ou utilisez les flèches, pour changer l'ordre. Le réglage suit votre compte, sur tous vos appareils.</p>
      <ul class="liste-widgets" id="liste-widgets"></ul>`,
    [{ texte: 'Annuler' },
      { texte: 'Tout réafficher', action: function () { liste = Object.keys(W).map(function (id) { return { id: id, visible: true }; }); rendre(); } },
      { texte: 'Enregistrer', classe: 'btn-primaire', action: function (z, b) {
        prefs.widgets = liste;
        ecrireLocal('jef_prefs', prefs);
        var retablir = JEF.attente(b, 'Enregistrement');
        JEF.post('preferences', { data: { op: 'enregistrer', preferences: prefs } }).then(function () { retablir(); fermerModale(); JEF.toast('Tableau de bord enregistré', 'ok'); afficher(); })
          .catch(function (e) { retablir(); fermerModale(); afficher(); JEF.toast('Enregistré sur cet appareil seulement : ' + e.message, 'erreur'); });
      } }]);
    rendre();
  }

  // ======================================================================
  // Stagiaires
  // ======================================================================
  function puces(page, options, defaut) {
    var courant = filtresPages[page] || defaut;
    return h`<div class="barre-filtres" role="group" aria-label="Filtres rapides">${options.map(function (o) {
      return h`<button class="puce-filtre" data-puce="${o[0]}" aria-pressed="${courant === o[0] ? 'true' : 'false'}">${o[1]}<span class="n">${o[2]}</span></button>`;
    })}</div>`;
  }
  function brancherPuces(page, rendre) {
    $$('[data-puce]').forEach(function (b) { b.addEventListener('click', function () { filtresPages[page] = b.getAttribute('data-puce'); rendre(); }); });
  }

  function actionPrincipaleStagiaire(l) {
    var p = prefixe(l);
    if (p === '3') return h`<button class="btn btn-s btn-action" data-op="verifier">Vérifier et valider</button>`;
    if (p === '4') return h`<button class="btn btn-s btn-primaire" data-op="payer">Encaisser</button>`;
    if (p === '1' || p === '2') return h`<button class="btn btn-s" data-op="lien">Relancer</button>`;
    if (p === '8') return h`<button class="btn btn-s" data-op="sortir_attente">Admettre</button>`;
    if (p === '5') return h`<button class="btn btn-s" data-op="badge_pdf">Badge</button>`;
    return h`<button class="btn btn-s" data-op="reactiver">Réactiver</button>`;
  }

  function vueStagiaires() {
    var st = D.stagiaires, maintenant = Date.now();
    var filtres = {
      tous: ['Tous', function () { return true; }],
      actifs: ['Inscrits', actif],
      valider: ['À valider', function (l) { return prefixe(l) === '3'; }],
      attente_sf: ['Document signé attendu', function (l) { return /[12]/.test(prefixe(l)); }],
      relance: ['À relancer', function (l) { return /[12]/.test(prefixe(l)) && maintenant - new Date(l.Date_Inscription) > 10 * 864e5; }],
      encaisser: ['À encaisser', function (l) { return prefixe(l) === '4'; }],
      payes: ['Payés', function (l) { return prefixe(l) === '5'; }],
      attente: ['Liste d\'attente', function (l) { return prefixe(l) === '8'; }],
      annules: ['Annulés', function (l) { return prefixe(l) === '9'; }],
      adh: ['Adhésion à vérifier', function (l) { return actif(l) && l.Adherent_Verifie === 'À vérifier'; }],
      bureau: ['Membres du bureau', function (l) { return JEF.oui(l.Membre_Bureau); }]
    };
    var courant = filtresPages.stagiaires && filtres[filtresPages.stagiaires] ? filtresPages.stagiaires : 'actifs';
    var t = tableau('stag', {
      lignes: st.filter(filtres[courant][1]), triDefaut: 'id', sensDefaut: -1,
      colonnes: [
        { cle: 'nom', titre: 'Stagiaire', val: function (l) { return nomComplet(l); }, tri: function (l) { return normal(l.Nom); },
          rendu: function (l) { return h`<button class="lien-nom" data-op="fiche">${nomComplet(l)}</button> ${JEF.oui(l.Membre_Bureau) ? tag('t-encre nu', 'Bureau') : ''}<div class="sous">${l.Email}</div>`; } },
        { cle: 'id', titre: 'Dossier', val: function (l) { return l.ID; }, rendu: function (l) { return h`<span class="mono">${l.ID}</span><div class="sous">${JEF.date(l.Date_Inscription)}</div>`; } },
        { cle: 'etab', titre: 'Établissement', val: function (l) { return l.Etablissement; }, rendu: function (l) { return h`${l.Etablissement}${l.Adherent_Verifie === 'À vérifier' ? h` ${tag('t-orange nu', 'Adhésion ?')}` : ''}`; } },
        { cle: 'formule', titre: 'Formule', val: function (l) { return l.Typologie + ' ' + l.Montant_Total; }, tri: function (l) { return Number(l.Montant_Total) || 0; },
          rendu: function (l) { return h`${l.Typologie}<div class="sous">${JEF.euros(l.Montant_Total)}${l.Parcours === 'PERSONNEL' ? ' - paie lui-même' : (l.Parcours === 'SERVICE' ? ' - inscrit par le SF' : '')}</div>`; } },
        { cle: 'repas', titre: 'Repas', val: function (l) { return ['JM', 'GALA', 'VM'].filter(function (c) { return JEF.oui(l['Repas_' + c]); }).join(' '); }, rendu: repas3, filtre: false },
        { cle: 'statut', titre: 'Avancement', val: function (l) { return String(l.Statut).slice(3); }, tri: function (l) { return String(l.Statut); }, rendu: tagStatutStagiaire },
        { cle: 'presence', titre: 'Présence', val: function (l) { return String(l.Heures || 0) + ' h'; }, tri: function (l) { return Number(l.Heures) || 0; }, rendu: function (l) { return boutonsPresence(l); }, filtre: false },
        { cle: 'action', titre: 'Action', val: function () { return ''; }, rendu: actionPrincipaleStagiaire, trier: false, filtre: false }
      ],
      clic: function (l) { ouvrirFiche('STAG', l.ID); },
      action: function (op, l, b) { if (op === 'fiche') ouvrirFiche('STAG', l.ID); else if (op === 'verifier') { ouvrirFiche('STAG', l.ID); apercuConvention(l); } else if (op === 'presence') basculerPresence('STAG', l, b); else executer('STAG', l.ID, op, {}, b); },
      vide: 'Aucun dossier dans cette catégorie.'
    });
    JEF.rendre('#vue', h`${aidePage('stagiaires')}
      ${puces('stagiaires', Object.keys(filtres).map(function (k) { return [k, filtres[k][0], st.filter(filtres[k][1]).length]; }), 'actifs')}
      ${t.html}`);
    t.monter();
    brancherPuces('stagiaires', vueStagiaires);
  }

  // ======================================================================
  // Présences et Qualiopi
  // ======================================================================
  function vuePresences() {
    var st = D.stagiaires.filter(function (l) { return /[3458]/.test(prefixe(l)) || Number(l.Heures) > 0; });
    var valides = D.stagiaires.filter(function (l) { return /[45]/.test(prefixe(l)); });
    var t = tableau('presences', {
      lignes: st, triDefaut: 'nom',
      colonnes: [
        { cle: 'nom', titre: 'Stagiaire', val: nomComplet, tri: function (l) { return normal(l.Nom); }, rendu: function (l) { return h`<button class="lien-nom" data-op="fiche">${nomComplet(l)}</button><div class="sous">${l.Etablissement}</div>`; } },
        { cle: 'statut', titre: 'Dossier', val: function (l) { return String(l.Statut).slice(3); }, rendu: tagStatutStagiaire },
        { cle: 'presence', titre: 'Présent', val: function (l) { return estPresent(l) ? 'Présent' : 'Absent'; }, rendu: boutonsPresence, filtre: false },
        { cle: 'heures', titre: 'Heures', val: function (l) { return Number(l.Heures) || 0; }, rendu: function (l) { return h`<b>${l.Heures || 0} h</b>`; }, filtre: false },
        { cle: 'attestation', titre: 'Attestation', val: function (l) { return l.Attestation_Envoyee ? 'envoyée' : 'non'; },
          rendu: function (l) { return l.Attestation_Envoyee ? tag('t-vert', 'Envoyée le ' + JEF.date(l.Attestation_Envoyee)) : (Number(l.Heures) > 0 ? h`<button class="btn btn-s" data-op="attestation">Envoyer</button>` : tag('t-gris', 'Pas de présence')); } }
      ],
      clic: function (l) { ouvrirFiche('STAG', l.ID); },
      action: function (op, l, b) { if (op === 'fiche') ouvrirFiche('STAG', l.ID); else if (op === 'presence') basculerPresence('STAG', l, b); else executer('STAG', l.ID, op, {}, b); },
      vide: 'Aucun stagiaire validé pour le moment.'
    });
    var r = D.reglages;
    JEF.rendre('#vue', h`${aidePage('presences')}
      <div class="chiffres">${(function () { var n = valides.filter(estPresent).length;
        return h`<div class="chiffre"><div class="lib">Présents</div><div class="val">${n}<small style="font-size:14px;color:var(--texte-2)"> / ${valides.length}</small></div>
          <div class="jauge2"><i style="width:${valides.length ? Math.round(n / valides.length * 100) : 0}%"></i></div><div class="det">stagiaires validés</div></div>
          <div class="chiffre"><div class="lib">Absents</div><div class="val">${valides.length - n}</div><div class="det">pas encore arrivés ou non scannés</div></div>`; })()}
        <div class="chiffre"><div class="lib">Attestations envoyées</div><div class="val">${D.stagiaires.filter(function (l) { return l.Attestation_Envoyee; }).length}</div><div class="det">Envoi automatique le ${JEF.date(String(r.dateAttestations).replace(' ', 'T'), true) || '-'}</div></div></div>
      ${panneau('Émargement', 'Corrigez ici une présence oubliée par le scanner. Chaque modification est inscrite au journal.', t.html,
        h`<button class="btn btn-s" data-lancer="feuille">Générer la feuille de présence</button><button class="btn btn-s btn-action" data-lancer="attestations">Envoyer les attestations maintenant</button>`)}
      ${panneauReglages('presences', 'Réglages des présences et attestations', 'Réservé aux administrateurs. Enregistré aussitôt, et visible aussi dans l\'onglet Réglages.',
        ['Scan_Unique', 'Date_Envoi_Attestations', 'URL_Questionnaire_Satisfaction', 'Duree_Formation_Heures', 'Signataire_Attestation'])}`);
    t.monter();
    brancherLancer();
    monterPanneauxReglages();
  }

  // ----- Réglages affichés dans une autre page (administrateurs seulement) ---------
  function panneauReglages(id, titre, indice, cles) {
    if (!estAdmin()) return '';
    return h`<section class="panneau" data-reglages-panneau="${id}" data-cles="${cles.join(',')}"><div class="panneau-tete"><div><h3>${titre}</h3><p class="indice">${indice}</p></div></div>
      <div class="chargement"><span class="rotation"></span>Chargement</div></section>`;
  }
  function monterPanneauxReglages() {
    var zones = $$('[data-reglages-panneau]');
    if (!zones.length) return;
    if (!reglages) {
      JEF.post('admin_reglages').then(function (r) { reglages = r.sections; monterPanneauxReglages(); }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
      return;
    }
    var defs = {};
    reglages.forEach(function (sec) { sec.reglages.forEach(function (r) { defs[r.cle] = r; }); });
    zones.forEach(function (z) {
      var cles = z.getAttribute('data-cles').split(',').filter(function (c) { return defs[c]; });
      var tete = $('.panneau-tete', z).outerHTML;
      JEF.rendre(z, h`${brut(tete)}<form novalidate>${cles.map(function (c) { return champReglage(defs[c]); })}
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;"><button type="button" class="btn btn-s" data-pr-annuler disabled>Annuler</button><button type="submit" class="btn btn-s" data-pr-enregistrer disabled>Enregistrer</button></div></form>`);
      var form = $('form', z), initial = JSON.stringify(lireValeursReglages(form));
      var maj = function () {
        var sale = JSON.stringify(lireValeursReglages(form)) !== initial;
        $('[data-pr-enregistrer]', z).disabled = !sale; $('[data-pr-annuler]', z).disabled = !sale;
        $('[data-pr-enregistrer]', z).className = 'btn btn-s ' + (sale ? 'btn-action' : '');
      };
      form.addEventListener('input', maj);
      form.addEventListener('change', function (e) { if (e.target.matches('.interrupteur input')) e.target.nextElementSibling.textContent = e.target.checked ? 'Oui' : 'Non'; maj(); });
      $('[data-pr-annuler]', z).addEventListener('click', function () { monterPanneauxReglages(); });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var envoyer = function (conf) {
          var b = $('[data-pr-enregistrer]', z), retablir = JEF.attente(b, 'Enregistrement');
          JEF.post('admin_reglages_maj', { data: { valeurs: changements(lireValeursReglages(form), JSON.parse(initial)), confirmer: conf } }).then(function (r) {
            retablir(); JEF.toast(r.modifies.length ? r.modifies.length + ' réglage(s) enregistré(s)' : 'Aucun changement', 'ok');
            (r.avertissements || []).forEach(function (a) { JEF.toast(a); });
            reglages = null; charger(true);
          }).catch(function (err) {
            retablir(); maj();
            if (err.code === 'confirmation') confirmer('Réglage sensible', err.message, 'Confirmer', true).then(function (ok) { if (ok) envoyer(true); });
            else JEF.toast(err.message, 'erreur');
          });
        };
        envoyer(false);
      });
    });
  }

  function brancherLancer() {
    $$('[data-lancer]').forEach(function (b) {
      b.addEventListener('click', function () {
        var op = b.getAttribute('data-lancer');
        var go = function () {
          var fenetre = op === 'feuille' ? preparerFenetre('Préparation de la feuille de présence') : null;
          var retablir = JEF.attente(b, 'En cours');
          JEF.post('admin_lancer', { data: { op: op } }, { delai: 360000 }).then(function (rep) {
            retablir();
            if (rep.pdfUrl && fenetre) fenetre.location.href = rep.pdfUrl;
            var msg = op === 'attestations' ? rep.envoyees + ' attestation(s) envoyée(s), ' + rep.restantes + ' restante(s) (la suite part seule)'
              : op === 'rappels' ? rep.envoyes + ' rappel(s) envoyé(s), ' + rep.restants + ' restant(s)'
              : op === 'feuille' ? 'Feuille de présence créée dans Drive' : [].concat(rep.resultat || 'Terminé').join(' - ');
            JEF.toast(msg, 'ok'); charger(true);
          }).catch(function (e) { retablir(); if (fenetre) fenetre.close(); JEF.toast(e.message, 'erreur'); });
        };
        var textes = {
          attestations: ['Envoyer les attestations', 'Chaque stagiaire présent qui n\'a pas encore son attestation la reçoit maintenant, avec les heures suivies. La feuille de présence est générée en même temps.'],
          rappels: ['Envoyer les rappels', 'Chaque participant validé qui n\'a pas encore reçu le rappel le reçoit maintenant, avec son badge.'],
          planifier: ['Programmer les envois', 'Le rappel et les attestations seront envoyés seuls aux dates des réglages.']
        };
        if (textes[op]) confirmer(textes[op][0], textes[op][1], 'Confirmer', false).then(function (ok) { if (ok) go(); });
        else go();
      });
    });
  }

  // ======================================================================
  // Entreprises partenaires
  // ======================================================================
  function vueEntreprises() {
    var ents = D.entreprises;
    var exposants = D.badges.filter(function (b) { return b.Profil === 'EXPOSANT' && actifBadge(b); });
    var filtres = {
      toutes: ['Toutes', function (e) { return entrepriseActive(e); }],
      sans: ['Sans représentant', function (e) { return entrepriseActive(e) && !e.Pass_Total; }],
      envoyer: ['Badges à envoyer', function (e) { return exposants.some(function (b) { return b.Entreprise_ID === e.ID && b.Email && !b.Badge_Envoye; }); }],
      supp: ['Pass supplémentaires', function (e) { return exposants.some(function (b) { return b.Entreprise_ID === e.ID && Number(b.Montant) > 0; }); }],
      annulees: ['Annulées', function (e) { return !entrepriseActive(e); }]
    };
    var courant = filtresPages.entreprises && filtres[filtresPages.entreprises] ? filtresPages.entreprises : 'toutes';
    var t = tableau('ent', {
      lignes: ents.filter(filtres[courant][1]), triDefaut: 'nom',
      colonnes: [
        { cle: 'nom', titre: 'Entreprise partenaire', val: function (e) { return e.Nom; }, rendu: function (e) { return h`<button class="lien-nom" data-op="fiche">${e.Nom}</button><div class="sous">${e.ID}</div>`; } },
        { cle: 'emplacement', titre: 'Emplacement exposant', val: function (e) { return e.Emplacement || ''; } },
        { cle: 'contact', titre: 'Contact', val: function (e) { return (e.Contact || '') + ' ' + (e.Email_Contact || ''); }, rendu: function (e) { return h`${e.Contact || '-'}<div class="sous">${e.Email_Contact || ''}</div>`; } },
        { cle: 'pass', titre: 'Pass inclus', val: function (e) { return e.Pass_Inclus + '/' + e.Quota; }, tri: function (e) { return e.Pass_Inclus; },
          rendu: function (e) { return tag(e.Pass_Inclus >= e.Quota ? 't-vert' : 't-gris', e.Pass_Inclus + ' sur ' + e.Quota); }, filtre: false },
        { cle: 'badges', titre: 'Représentants', val: function (e) { return e.Pass_Total; }, rendu: function (e) {
          var supp = e.Pass_Total - e.Pass_Inclus;
          return h`<b>${e.Pass_Total}</b>${supp > 0 ? h` ${tag('t-orange nu', supp + ' supp.')}` : ''}<div class="sous">${e.Badges_Envoyes} badge(s) envoyé(s)</div>`;
        }, filtre: false },
        { cle: 'actions', titre: 'Actions', val: function () { return ''; }, trier: false, filtre: false,
          rendu: function (e) { return entrepriseActive(e) ? h`<button class="btn btn-s btn-primaire" data-op="ajouter">Ajouter un représentant</button>` : tag('t-rouge', 'Annulée'); } }
      ],
      clic: function (e) { ouvrirFiche('ENT', e.ID); },
      action: function (op, e) { if (op === 'ajouter') modaleRepresentant(e); else ouvrirFiche('ENT', e.ID); },
      vide: ents.length ? 'Aucune entreprise dans cette catégorie.' : 'Aucune entreprise partenaire. Créez-en une ou importez votre liste.'
    });
    JEF.rendre('#vue', h`${aidePage('entreprises')}
      ${panneau('Entreprises partenaires exposantes', D.entreprises.filter(entrepriseActive).length + ' entreprises, ' + exposants.length + ' badges exposants. Pass inclus par défaut ' + D.reglages.quota + ', pass supplémentaire ' + JEF.euros(D.reglages.tarifPassSupp) + '.',
        h`${puces('entreprises', Object.keys(filtres).map(function (k) { return [k, filtres[k][0], ents.filter(filtres[k][1]).length]; }), 'toutes')}${t.html}`,
        h`<button class="btn btn-s btn-primaire" id="b-nouvelle-ent">Nouvelle entreprise</button><button class="btn btn-s" id="b-import">Importer en masse</button>`)}`);
    t.monter();
    brancherPuces('entreprises', vueEntreprises);
    $('#b-nouvelle-ent').addEventListener('click', function () { modaleEntreprise(null); });
    $('#b-import').addEventListener('click', function () { modaleImport('entreprises'); });
  }

  function modaleEntreprise(e) {
    ouvrirModale(e ? 'Modifier ' + e.Nom : 'Nouvelle entreprise partenaire', h`
      <p class="indice" style="margin:0;">Seul le nom est obligatoire. Les représentants s'ajoutent ensuite dans la fiche de l'entreprise.</p>
      <div class="champ"><label class="obligatoire" for="e-nom">Entreprise</label><input id="e-nom" name="nom" type="text" required value="${e ? e.Nom : ''}"></div>
      <div class="grille g2">
        <div class="champ"><label for="e-contact">Contact</label><input id="e-contact" name="contact" type="text" value="${e ? e.Contact || '' : ''}"></div>
        <div class="champ"><label for="e-email">Email du contact</label><input id="e-email" name="email" type="email" value="${e ? e.Email_Contact || '' : ''}"></div>
        <div class="champ"><label for="e-tel">Téléphone du contact</label><input id="e-tel" name="telephone" type="tel" value="${e ? e.Telephone_Contact || '' : ''}"></div>
        <div class="champ"><label for="e-empl">Emplacement exposant</label><input id="e-empl" name="emplacement" type="text" placeholder="Ex. Exposant 12" value="${e ? e.Emplacement || '' : ''}"></div>
        <div class="champ"><label for="e-quota">Pass inclus</label><input id="e-quota" name="quota" type="number" min="0" max="20" placeholder="${D.reglages.quota} par défaut" value="${e && e.Quota_Gratuit !== '' && e.Quota_Gratuit !== undefined ? e.Quota_Gratuit : ''}"></div>
      </div>
      <div class="champ"><label for="e-notes">Notes internes</label><input id="e-notes" name="notes" type="text" value="${e ? e.Notes || '' : ''}"></div>`,
    [{ texte: 'Annuler' }, { texte: e ? 'Enregistrer' : 'Créer l\'entreprise', classe: 'btn-primaire', action: function (zone, btn) {
      if (!JEF.valider(zone)) return;
      var d = JEF.lireFormulaire(zone);
      d.op = e ? 'modifier' : 'creer'; if (e) d.id = e.ID;
      var retablir = JEF.attente(btn, 'Enregistrement');
      JEF.post('admin_entreprise', { data: d }).then(function (r) {
        fermerModale(); JEF.toast(e ? 'Entreprise modifiée' : 'Entreprise créée', 'ok');
        charger(true).then(function () { if (!e && r.id) ouvrirFiche('ENT', r.id); });
      }).catch(function (err) { retablir(); JEF.toast(err.message, 'erreur'); });
    } }]);
  }

  function champsRepresentant(prefixeNom) {
    return h`<div class="grille g2">
      <div class="champ"><label class="obligatoire" for="${prefixeNom}prenom">Prénom</label><input id="${prefixeNom}prenom" name="prenom" type="text" required></div>
      <div class="champ"><label class="obligatoire" for="${prefixeNom}nom">Nom</label><input id="${prefixeNom}nom" name="nom" type="text" required></div>
      <div class="champ"><label for="${prefixeNom}fonction">Fonction</label><input id="${prefixeNom}fonction" name="fonction" type="text"></div>
      <div class="champ"><label for="${prefixeNom}email">Email</label><input id="${prefixeNom}email" name="email" type="email"></div>
      <div class="champ"><label for="${prefixeNom}tel">Téléphone</label><input id="${prefixeNom}tel" name="telephone" type="tel"></div>
    </div>
    <fieldset class="champ"><legend class="legende">Repas compris avec le pass</legend>${casesRepas('repas_', null, true)}</fieldset>
    <div class="champ"><label for="${prefixeNom}regime">Régime alimentaire</label><input id="${prefixeNom}regime" name="regime" type="text" placeholder="Standard"></div>`;
  }

  function modaleRepresentant(e) {
    var restant = Math.max(0, e.Quota - e.Pass_Inclus);
    ouvrirModale('Ajouter un représentant - ' + e.Nom, h`
      <div class="bandeau ${restant ? 'b-gris' : 'b-orange'}"><span class="texte">${restant ? 'Pass inclus : il en reste ' + restant + ' sur ' + e.Quota + '.' : 'Les ' + e.Quota + ' pass inclus sont utilisés : ce représentant sera un pass supplémentaire à ' + JEF.euros(D.reglages.tarifPassSupp) + ', à facturer.'}</span></div>
      ${champsRepresentant('r-')}
      <label class="case"><input type="checkbox" name="envoyer" ${brut(D.reglages.badgeExposantAuto ? 'checked' : '')}> <span>Envoyer le badge par email tout de suite</span></label>`,
    [{ texte: 'Annuler' }, { texte: 'Ajouter', classe: 'btn-primaire', action: function (zone, btn) {
      if (!JEF.valider(zone)) return;
      var d = JEF.lireFormulaire(zone);
      d.profil = 'EXPOSANT'; d.entrepriseId = e.ID;
      d.repas = {}; Object.keys(D.repas).forEach(function (c) { d.repas[c] = d['repas_' + c]; });
      var retablir = JEF.attente(btn, 'Ajout');
      JEF.post('admin_badge', { data: d }).then(function (r) {
        fermerModale();
        JEF.toast(d.prenom + ' ' + d.nom + ' ajouté(e), ' + (r.typePass === 'Inclus' ? 'pass inclus' : 'pass supplémentaire à facturer') + (r.envoye ? ', badge envoyé' : ''), 'ok');
        charger(true);
      }).catch(function (err) { retablir(); JEF.toast(err.message, 'erreur'); });
    } }]);
  }

  // ----- Import en masse (CSV ou copier-coller depuis Excel) ---------------
  var CHAMPS_IMPORT = {
    entreprises: [['nom', ['entreprise', 'entreprise partenaire', 'societe', 'nom', 'raison sociale']], ['contact', ['contact', 'nom du contact', 'interlocuteur']],
      ['email', ['email', 'e mail', 'mail', 'email du contact']], ['telephone', ['telephone', 'tel', 'telephone du contact']],
      ['emplacement', ['emplacement', 'emplacement exposant', 'stand', 'numero']], ['quota', ['pass inclus', 'quota', 'nombre de pass']], ['notes', ['notes', 'remarques', 'commentaire']]],
    representants: [['entrepriseId', ['id entreprise', 'identifiant entreprise', 'id']], ['entreprise', ['entreprise', 'entreprise partenaire', 'societe']], ['emplacement', ['emplacement', 'emplacement exposant']],
      ['civilite', ['civilite']], ['nom', ['nom']], ['prenom', ['prenom']], ['fonction', ['fonction', 'poste']], ['email', ['email', 'e mail', 'mail']], ['telephone', ['telephone', 'tel']],
      ['repasJM', ['repas 1', 'jeudi midi', 'dejeuner du jeudi', 'dejeuner jeudi']], ['repasGALA', ['repas 2', 'gala', 'soiree de gala']], ['repasVM', ['repas 3', 'vendredi midi', 'dejeuner du vendredi', 'dejeuner vendredi']],
      ['regime', ['regime', 'regime alimentaire', 'allergies']]]
  };
  function enteteNormal(s) { return normal(s).replace(/[^a-z0-9]+/g, ' ').trim(); }
  function analyserCSV(texte) {
    texte = texte.replace(/^﻿/, '');
    var premiere = texte.split(/\r?\n/)[0] || '';
    var sep = [';', '\t', ','].sort(function (a, b) { return premiere.split(b).length - premiere.split(a).length; })[0];
    var lignes = [], ligne = [], champ = '', guillemets = false;
    for (var i = 0; i < texte.length; i++) {
      var c = texte[i];
      if (guillemets) {
        if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
        else if (c === '"') guillemets = false;
        else champ += c;
      } else if (c === '"') guillemets = true;
      else if (c === sep) { ligne.push(champ); champ = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && texte[i + 1] === '\n') i++; ligne.push(champ); lignes.push(ligne); ligne = []; champ = ''; }
      else champ += c;
    }
    if (champ !== '' || ligne.length) { ligne.push(champ); lignes.push(ligne); }
    return lignes.filter(function (l) { return l.some(function (x) { return String(x).trim() !== ''; }); });
  }
  function versObjets(lignes, type) {
    if (!lignes.length) return { objets: [], inconnues: [] };
    var entetes = lignes[0].map(enteteNormal);
    var champs = CHAMPS_IMPORT[type];
    if (type === 'representants') {
      // Les colonnes de repas portent les libellés des réglages.
      champs = champs.map(function (c) {
        var code = { repasJM: 'JM', repasGALA: 'GALA', repasVM: 'VM' }[c[0]];
        return code ? [c[0], c[1].concat([enteteNormal(D.repas[code].libelle)])] : c;
      });
    }
    var correspondance = entetes.map(function (e) {
      var trouve = champs.filter(function (c) { return c[1].indexOf(e) !== -1; })[0];
      return trouve ? trouve[0] : null;
    });
    var inconnues = lignes[0].filter(function (x, i) { return !correspondance[i] && String(x).trim(); });
    var objets = lignes.slice(1).map(function (l) {
      var o = {};
      correspondance.forEach(function (cle, i) { if (cle) o[cle] = String(l[i] === undefined ? '' : l[i]).trim(); });
      return o;
    });
    return { objets: objets, inconnues: inconnues, reconnues: correspondance.filter(Boolean) };
  }
  function lireFichierTexte(fichier) {
    return fichier.arrayBuffer().then(function (buf) {
      try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
      catch (e) { return new TextDecoder('windows-1252').decode(buf); }
    });
  }
  function csvDepuis(lignes) {
    return '﻿' + lignes.map(function (l) {
      return l.map(function (v) { var s = String(v === undefined || v === null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';');
    }).join('\r\n');
  }
  function modeleEntreprises() {
    JEF.telecharger('modele_entreprises_partenaires.csv', csvDepuis([
      ['Entreprise', 'Contact', 'Email', 'Téléphone', 'Emplacement exposant', 'Pass inclus', 'Notes'],
      ['Exemple Sécurité SA', 'Marie Dupont', 'marie.dupont@exemple.fr', '06 00 00 00 00', 'Exposant 12', '2', 'Ligne d\'exemple, à supprimer'],
      ['Exemple Incendie', '', '', '', '', '', 'Seul le nom est obligatoire']
    ]));
  }
  function feuilleRepresentants() {
    var lib = D.repas;
    var lignes = [['ID entreprise', 'Entreprise', 'Emplacement exposant', 'Nom', 'Prénom', 'Fonction', 'Email', 'Téléphone',
      lib.JM.libelle, lib.GALA.libelle, lib.VM.libelle, 'Régime alimentaire']];
    D.entreprises.filter(entrepriseActive).sort(function (a, b) { return String(a.Nom).localeCompare(String(b.Nom), 'fr'); }).forEach(function (e) {
      var reps = D.badges.filter(function (b) { return b.Entreprise_ID === e.ID && actifBadge(b); });
      reps.forEach(function (b) {
        lignes.push([e.ID, e.Nom, e.Emplacement || '', b.Nom, b.Prenom, b.Fonction, b.Email, b.Telephone,
          JEF.oui(b.Repas_JM) ? 'OUI' : 'NON', JEF.oui(b.Repas_GALA) ? 'OUI' : 'NON', JEF.oui(b.Repas_VM) ? 'OUI' : 'NON', b.Regime]);
      });
      var vides = Math.max(1, e.Quota - e.Pass_Inclus);
      for (var i = 0; i < vides; i++) lignes.push([e.ID, e.Nom, e.Emplacement || '', '', '', '', '', '', 'OUI', 'OUI', 'OUI', '']);
    });
    JEF.telecharger('feuille_representants_a_completer.csv', csvDepuis(lignes));
  }

  function modaleImport(onglet) {
    var etat = { type: onglet, objets: [], verdicts: null };
    var TEXTES = {
      entreprises: { etapes: ['Téléchargez le modèle et remplissez une ligne par entreprise, dans Excel ou Google Sheets.', 'Enregistrez au format CSV, ou copiez directement les lignes avec leurs titres.', 'Déposez le fichier ou collez les lignes, puis vérifiez. Rien n\'est enregistré avant votre confirmation.'],
        bouton: 'Télécharger le modèle', fn: modeleEntreprises },
      representants: { etapes: ['Téléchargez la feuille à compléter : une ligne par pass inclus restant de chaque entreprise, déjà remplie avec l\'entreprise. Les représentants déjà inscrits y figurent aussi, ils ne seront pas recréés.', 'Complétez nom, prénom, fonction, email et repas (OUI ou NON). Ajoutez des lignes pour des pass supplémentaires, laissez vides les lignes inutiles.', 'Déposez le fichier ou collez les lignes, puis vérifiez.'],
        bouton: 'Télécharger la feuille à compléter', fn: feuilleRepresentants }
    };
    function rendre() {
      var tx = TEXTES[etat.type];
      var etiquettes = { nouvelle: ['t-vert', 'Nouvelle'], maj: ['t-bleu', 'Mise à jour'], nouveau: ['t-vert', 'À créer'], existe: ['t-gris', 'Déjà inscrit'], doublon: ['t-gris', 'Doublon ignoré'], erreur: ['t-rouge', 'Erreur'] };
      var aImporter = etat.verdicts ? etat.verdicts.filter(function (v) { return v.etat === 'nouvelle' || v.etat === 'maj' || v.etat === 'nouveau'; }).length : 0;
      JEF.rendre('#modale-corps', h`
        <div class="onglets" role="tablist">
          <button type="button" role="tab" data-onglet="entreprises" aria-selected="${etat.type === 'entreprises'}">1. Les entreprises</button>
          <button type="button" role="tab" data-onglet="representants" aria-selected="${etat.type === 'representants'}">2. Les représentants</button>
        </div>
        <ol class="etapes-import">${tx.etapes.map(function (e) { return h`<li>${e}</li>`; })}</ol>
        <div><button type="button" class="btn btn-s" id="i-modele">${tx.bouton}</button></div>
        <div class="grille g2">
          <div class="champ"><label for="i-fichier">Fichier CSV</label><input type="file" id="i-fichier" accept=".csv,.txt,text/csv"></div>
          <div class="champ"><label for="i-coller">Ou collez les lignes copiées depuis Excel</label><textarea id="i-coller" style="min-height:70px;" placeholder="Copiez les lignes, titres compris, puis collez ici"></textarea></div>
        </div>
        ${etat.type === 'representants' ? h`<label class="case"><input type="checkbox" id="i-envoyer"> <span>Envoyer les badges par email juste après l'import (représentants qui ont un email)</span></label>` : ''}
        <div id="i-resultat">${etat.verdicts ? h`
          <div class="bandeau ${aImporter ? 'b-gris' : 'b-orange'}"><span class="texte"><b>${aImporter}</b> ligne(s) prête(s) à importer sur ${etat.verdicts.length}.
            ${etat.inconnues && etat.inconnues.length ? 'Colonnes ignorées : ' + etat.inconnues.join(', ') + '.' : ''}</span></div>
          <div class="table-defile" style="max-height:260px;"><table class="tab"><thead><tr><th>Ligne</th><th>${etat.type === 'entreprises' ? 'Entreprise' : 'Représentant'}</th>${etat.type === 'representants' ? h`<th>Entreprise</th>` : ''}<th>Résultat</th><th>Détail</th></tr></thead>
          <tbody>${etat.verdicts.map(function (v) { var e = etiquettes[v.etat] || ['t-gris', v.etat]; return h`<tr style="cursor:default;"><td>${v.ligne + 1}</td><td>${v.nom}</td>${etat.type === 'representants' ? h`<td>${v.entreprise}</td>` : ''}<td>${tag(e[0], e[1])}</td><td class="sous">${v.message || ''}</td></tr>`; })}</tbody></table></div>` : ''}</div>`);
      $$('[data-onglet]').forEach(function (b) { b.addEventListener('click', function () { etat.type = b.getAttribute('data-onglet'); etat.verdicts = null; etat.objets = []; rendre(); }); });
      $('#i-modele').addEventListener('click', tx.fn);
      $('#i-fichier').addEventListener('change', function () { var f = this.files[0]; if (f) lireFichierTexte(f).then(function (t) { $('#i-coller').value = t; }); });
      var bv = $('#modale [data-b="1"]'), bi = $('#modale [data-b="2"]');
      if (bi) { bi.disabled = !aImporter; bi.textContent = aImporter ? 'Importer ' + aImporter + ' ligne(s)' : 'Importer'; bi.className = 'btn ' + (aImporter ? 'btn-action' : ''); }
      if (bv) bv.className = 'btn ' + (etat.verdicts ? '' : 'btn-primaire');
    }
    function verifier(btn) {
      var texte = $('#i-coller').value;
      if (!texte.trim()) { JEF.toast('Déposez un fichier ou collez des lignes.', 'erreur'); return; }
      var r = versObjets(analyserCSV(texte), etat.type);
      var obligatoire = etat.type === 'entreprises' ? 'nom' : 'nom';
      if (r.reconnues.indexOf(obligatoire) === -1) { JEF.toast('Colonne « ' + (etat.type === 'entreprises' ? 'Entreprise' : 'Nom') + ' » introuvable : gardez la ligne des titres du modèle.', 'erreur'); return; }
      etat.objets = r.objets; etat.inconnues = r.inconnues;
      var retablir = JEF.attente(btn, 'Vérification');
      JEF.post('admin_entreprise', { data: { op: etat.type === 'entreprises' ? 'import' : 'import_representants', apercu: true, lignes: r.objets } }).then(function (rep) {
        retablir(); etat.verdicts = rep.verdicts; rendre();
      }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
    }
    function importer(btn) {
      var envoyer = $('#i-envoyer') ? $('#i-envoyer').checked : false;
      var retablir = JEF.attente(btn, 'Import en cours');
      JEF.post('admin_entreprise', { data: { op: etat.type === 'entreprises' ? 'import' : 'import_representants', lignes: etat.objets, envoyer: envoyer } }, { delai: 360000 }).then(function (rep) {
        fermerModale();
        JEF.toast(etat.type === 'entreprises' ? rep.crees + ' entreprise(s) créée(s), ' + rep.majs + ' mise(s) à jour'
          : rep.crees + ' badge(s) créé(s)' + (rep.supplementaires ? ', dont ' + rep.supplementaires + ' pass supplémentaire(s) à facturer' : '') + (envoyer ? ', ' + rep.envoyes + ' envoyé(s)' : ''), 'ok');
        charger(true);
      }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
    }
    ouvrirModale('Importer en masse', h`<div></div>`, [{ texte: 'Fermer' }, { texte: 'Vérifier', classe: 'btn-primaire', action: function (z, b) { verifier(b); } },
      { texte: 'Importer', action: function (z, b) { importer(b); } }], 'large');
    rendre();
  }

  // ======================================================================
  // Visiteurs et invités
  // ======================================================================
  function vueBadges() {
    var liste = D.badges.filter(function (b) { return b.Profil !== 'EXPOSANT'; });
    var filtres = {
      tous: ['Tous', actifBadge],
      VISITEUR: ['Visiteurs', function (b) { return actifBadge(b) && b.Profil === 'VISITEUR'; }],
      INVITE: ['Invités ACSES', function (b) { return actifBadge(b) && b.Profil === 'INVITE'; }],
      INTERVENANT: ['Intervenants', function (b) { return actifBadge(b) && b.Profil === 'INTERVENANT'; }],
      envoyer: ['Badges à envoyer', function (b) { return actifBadge(b) && b.Email && !b.Badge_Envoye; }],
      annules: ['Annulés', function (b) { return !actifBadge(b); }]
    };
    var courant = filtresPages.badges && filtres[filtresPages.badges] ? filtresPages.badges : 'tous';
    var t = tableau('badges', {
      lignes: liste.filter(filtres[courant][1]), triDefaut: 'id', sensDefaut: -1,
      colonnes: [
        { cle: 'nom', titre: 'Personne', val: nomComplet, tri: function (b) { return normal(b.Nom); }, rendu: function (b) { return h`<button class="lien-nom" data-op="fiche">${nomComplet(b)}</button><div class="sous">${b.Fonction || ''}</div>`; } },
        { cle: 'id', titre: 'Badge', val: function (b) { return b.ID; }, rendu: function (b) { return h`<span class="mono">${b.ID}</span>`; } },
        { cle: 'profil', titre: 'Profil', val: function (b) { return PROFILS[b.Profil] || b.Profil; }, rendu: function (b) { return tag('t-gris nu', PROFILS[b.Profil] || b.Profil); } },
        { cle: 'org', titre: 'Établissement ou organisme', val: function (b) { return b.Organisme || ''; } },
        { cle: 'repas', titre: 'Repas ou visite', val: function (b) { return b.Profil === 'VISITEUR' ? b.Creneau_Visite : ''; }, rendu: function (b) { return b.Profil === 'VISITEUR' ? h`<span class="sous">${b.Creneau_Visite}</span>` : repas3(b); } },
        { cle: 'etat', titre: 'Badge', val: function (b) { return b.Badge_Envoye ? 'envoyé' : 'à envoyer'; }, rendu: tagStatutBadge },
        { cle: 'presence', titre: 'Présence', val: function () { return ''; }, rendu: boutonsPresence, filtre: false, trier: false },
        { cle: 'action', titre: 'Action', val: function () { return ''; }, trier: false, filtre: false,
          rendu: function (b) { return b.Email ? h`<button class="btn btn-s ${b.Badge_Envoye ? '' : 'btn-action'}" data-op="badge_envoyer">${b.Badge_Envoye ? 'Renvoyer' : 'Envoyer'}</button>` : h`<button class="btn btn-s" data-op="badge_pdf">PDF</button>`; } }
      ],
      clic: function (b) { ouvrirFiche('PRO', b.ID); },
      action: function (op, b, btn) { if (op === 'fiche') ouvrirFiche('PRO', b.ID); else if (op === 'presence') basculerPresence('PRO', b, btn); else executer('PRO', b.ID, op, {}, btn); },
      vide: 'Aucun badge dans cette catégorie.'
    });
    JEF.rendre('#vue', h`${aidePage('badges')}
      ${panneau('Visiteurs, invités et intervenants', 'Lien d\'invitation des visiteurs : jef.acses-asso.com/visiteur.html',
        h`${puces('badges', Object.keys(filtres).map(function (k) { return [k, filtres[k][0], liste.filter(filtres[k][1]).length]; }), 'tous')}${t.html}`,
        h`<button class="btn btn-s" id="b-copier-lien">Copier le lien visiteurs</button><button class="btn btn-s btn-primaire" id="b-nouveau-badge">Nouveau badge</button>`)}`);
    t.monter();
    brancherPuces('badges', vueBadges);
    $('#b-nouveau-badge').addEventListener('click', modaleBadge);
    $('#b-copier-lien').addEventListener('click', function () { JEF.copier('https://jef.acses-asso.com/visiteur.html'); });
  }

  function casesRepas(prefixeNom, valeurs, tousCoches) {
    return h`<div class="choix c3">${Object.keys(D.repas).map(function (c) {
      var coche = valeurs ? JEF.oui(valeurs['Repas_' + c]) : !!tousCoches;
      return h`<label class="option puce"><input type="checkbox" name="${prefixeNom + c}" ${brut(coche ? 'checked' : '')}><span>${D.repas[c].libelle}</span></label>`;
    })}</div>`;
  }

  function modaleBadge() {
    ouvrirModale('Nouveau badge', h`
      <p class="indice" style="margin:0;">Pour un exposant, passez par la fiche de son entreprise partenaire.</p>
      <div class="champ"><label for="m-profil">Profil</label><select id="m-profil" name="profil">
        <option value="INVITE">Invité de l'ACSES</option><option value="INTERVENANT">Intervenant</option><option value="VISITEUR">Visiteur de l'espace exposants</option></select></div>
      <div class="grille g2">
        <div class="champ"><label class="obligatoire" for="m-prenom">Prénom</label><input id="m-prenom" name="prenom" type="text" required></div>
        <div class="champ"><label class="obligatoire" for="m-nom">Nom</label><input id="m-nom" name="nom" type="text" required></div>
        <div class="champ"><label for="m-fonction">Fonction</label><input id="m-fonction" name="fonction" type="text"></div>
        <div class="champ"><label for="m-email">Email</label><input id="m-email" name="email" type="email"></div>
        <div class="champ"><label for="m-org">Établissement ou organisme</label><input id="m-org" name="organisme" type="text"></div>
      </div>
      <div class="champ" id="m-bloc-cr" hidden><label for="m-cr">Demi-journée de visite</label><select id="m-cr" name="creneauVisite">${D.creneaux.map(function (c) { return h`<option>${c.libelle}</option>`; })}</select></div>
      <fieldset class="champ" id="m-bloc-repas"><legend class="legende">Repas</legend>${casesRepas('repas_', null, false)}</fieldset>
      <div class="champ"><label for="m-regime">Régime alimentaire</label><input id="m-regime" name="regime" type="text"></div>
      <label class="case"><input type="checkbox" name="envoyer" checked> <span>Envoyer le badge par email (sans email, le PDF s'ouvre pour l'impression)</span></label>`,
    [{ texte: 'Annuler' }, { texte: 'Créer le badge', classe: 'btn-primaire', action: function (zone, btn) {
      if (!JEF.valider(zone)) return;
      var d = JEF.lireFormulaire(zone);
      d.repas = {}; Object.keys(D.repas).forEach(function (c) { d.repas[c] = d['repas_' + c]; });
      var fenetre = (!d.envoyer || !d.email) ? preparerFenetre('Préparation du badge') : null;
      var retablir = JEF.attente(btn, 'Création');
      JEF.post('admin_badge', { data: d }).then(function (r) {
        fermerModale(); JEF.toast('Badge ' + r.id + ' créé' + (r.envoye ? ' et envoyé' : ''), 'ok');
        if (fenetre && r.id) ouvrirBadgePdf('PRO', r.id, fenetre); else if (fenetre) fenetre.close();
        charger(true);
      }).catch(function (e) { retablir(); if (fenetre) fenetre.close(); JEF.toast(e.message, 'erreur'); });
    } }]);
    function adapter() { var p = $('#m-profil').value; $('#m-bloc-cr').hidden = p !== 'VISITEUR'; $('#m-bloc-repas').hidden = p === 'VISITEUR'; }
    $('#m-profil').addEventListener('change', adapter); adapter();
  }

  // ======================================================================
  // Restauration
  // ======================================================================
  function vueRestauration() {
    var personnes = D.stagiaires.filter(actif).map(function (l) { return { l: l, p: 'Stagiaires' }; })
      .concat(D.badges.filter(actifBadge).map(function (b) { return { l: b, p: b.Profil === 'EXPOSANT' ? 'Exposants' : (b.Profil === 'VISITEUR' ? 'Visiteurs' : 'Invités et intervenants') }; }));
    var codes = Object.keys(D.repas), regimes = {}, profils = {}, totaux = {};
    codes.forEach(function (c) { totaux[c] = 0; });
    personnes.forEach(function (x) {
      var r = String(x.l.Regime || '').trim() || 'Standard';
      codes.forEach(function (c) {
        if (!JEF.oui(x.l['Repas_' + c])) return;
        totaux[c]++;
        regimes[r] = regimes[r] || {}; regimes[r][c] = (regimes[r][c] || 0) + 1;
        profils[x.p] = profils[x.p] || {}; profils[x.p][c] = (profils[x.p][c] || 0) + 1;
      });
    });
    function matrice(objet) {
      return h`<div class="table-defile" style="max-height:none;"><table class="tab"><thead><tr><th></th>${codes.map(function (c) { return h`<th>${D.repas[c].libelle}</th>`; })}</tr></thead>
        <tbody>${Object.keys(objet).sort().map(function (k) { return h`<tr style="cursor:default;"><td><b>${k}</b></td>${codes.map(function (c) { return h`<td>${objet[k][c] || ''}</td>`; })}</tr>`; })}
        <tr style="cursor:default;"><td><b>Total</b></td>${codes.map(function (c) { return h`<td><b>${totaux[c]}</b></td>`; })}</tr></tbody></table></div>`;
    }
    JEF.rendre('#vue', h`${aidePage('restauration')}
      <div class="chiffres">${codes.map(function (c) { return h`<div class="chiffre"><div class="lib">${D.repas[c].libelle}</div><div class="val">${totaux[c]}</div><div class="det">couverts, prix stagiaire ${JEF.euros(D.repas[c].tarif)}</div></div>`; })}</div>
      <div class="grille2">
        ${panneau('Par profil', 'Qui mange à chaque repas.', matrice(profils))}
        ${panneau('Par régime alimentaire', 'À transmettre au traiteur. L\'export ne contient aucun nom.', matrice(regimes), h`<button class="btn btn-s" data-export-direct="traiteur">Exporter pour le traiteur</button>`)}
      </div>`);
    $$('[data-export-direct]').forEach(function (b) { b.addEventListener('click', function () { exporter(b.getAttribute('data-export-direct')); }); });
  }

  // ======================================================================
  // Accueil jour J
  // ======================================================================
  function vueJourJ() {
    var tous = D.stagiaires.filter(actif).concat(D.badges.filter(actifBadge));
    var r = D.reglages;
    JEF.rendre('#vue', h`${aidePage('jourj')}
      <div class="chiffres">${(function () { var n = tous.filter(estPresent).length;
        return h`<div class="chiffre"><div class="lib">Personnes présentes</div><div class="val">${n}<small style="font-size:14px;color:var(--texte-2)"> / ${tous.length}</small></div><div class="jauge2"><i style="width:${tous.length ? Math.round(n / tous.length * 100) : 0}%"></i></div><div class="det">tous profils</div></div>
          <div class="chiffre"><div class="lib">Inscriptions sur place</div><div class="val">${D.stagiaires.filter(function (l) { return l.Parcours === 'SUR_PLACE'; }).length + D.badges.filter(function (b) { return /sur place/i.test(b.Notes || ''); }).length}</div><div class="det"><button class="btn btn-s btn-action" data-sur-place>+ Inscription sur place</button></div></div>`; })()}</div>
      <div class="grille2">
        ${panneau('Scanner de l\'accueil', 'Téléphone ou PC avec douchette. Tous les membres du bureau peuvent s\'y connecter.',
          h`<ol class="etapes-import"><li>Ouvrez le scanner sur chaque poste d'accueil.</li><li>Mode Accueil : scannez le QR code à l'arrivée. Écran vert, présence enregistrée pour toute la formation et repas affichés. Orange, déjà enregistré. Rouge, badge refusé.</li><li>Mode Vérifier : le scan ouvre la fiche de la personne, avec ses repas, et permet de renvoyer le badge ou l'attestation.</li></ol>`,
          h`<a class="btn btn-s btn-primaire" href="scanner.html" target="_blank" rel="noopener">Ouvrir le scanner</a>`)}
        ${panneau('Envois avant et après', 'Programmés aux dates des réglages.', h`<dl class="infos"><dt>Rappel avec badge</dt><dd>${r.dateRappel || '-'}</dd><dt>Attestations</dt><dd>${r.dateAttestations || '-'}</dd><dt>Emails restants aujourd'hui</dt><dd>${r.quotaEmails}</dd></dl>`,
          h`<button class="btn btn-s" data-lancer="planifier">Programmer</button><button class="btn btn-s" data-lancer="rappels">Envoyer les rappels maintenant</button>`)}
        ${panneau('Plan de secours', 'En cas de coupure du réseau.', h`<ul style="margin:0;padding-left:18px;display:grid;gap:4px;">
          <li>Le scanner continue sans réseau et envoie les scans au retour de la connexion.</li>
          <li>La veille, exportez la liste des participants (bouton Exporter) sur le PC de l'accueil.</li>
          <li>Imprimez quelques badges vierges pour les arrivées de dernière minute.</li>
          <li>Une présence oubliée se rattrape ensuite dans Présences et Qualiopi.</li></ul>`, h`<button class="btn btn-s" data-export-direct="participants">Exporter les participants</button>`)}
      </div>`);
    brancherLancer();
    $$('[data-export-direct]').forEach(function (b) { b.addEventListener('click', function () { exporter(b.getAttribute('data-export-direct')); }); });
  }

  // ======================================================================
  // Réglages
  // ======================================================================
  function champReglage(r) {
    var v = r.valeur || '', id = 'rg-' + r.cle;
    var saisie;
    if (r.type === 'ouinon') {
      saisie = h`<label class="interrupteur"><input type="checkbox" id="${id}" data-cle="${r.cle}" data-type="ouinon" ${brut(/^(oui|true|1)$/i.test(v) ? 'checked' : '')}><span>${/^(oui|true|1)$/i.test(v) ? 'Oui' : 'Non'}</span></label>`;
    } else if (r.type === 'creneau') {
      var p = v ? v.split('|') : ['', '', '', '', ''];
      saisie = h`<div data-cle="${r.cle}" data-type="creneau" style="display:grid;grid-template-columns:2fr 1.3fr 1fr 1fr .8fr;gap:6px;">
        <input type="text" data-p="0" value="${p[0] || ''}" placeholder="Libellé" aria-label="Libellé">
        <input type="date" data-p="1" value="${p[1] || ''}" aria-label="Date">
        <input type="time" data-p="2" value="${p[2] || ''}" aria-label="Début du scan">
        <input type="time" data-p="3" value="${p[3] || ''}" aria-label="Fin du scan">
        <input type="number" data-p="4" min="0" max="12" step="0.5" value="${p[4] || ''}" placeholder="h" aria-label="Heures de formation"></div>
        <div class="exp">Libellé, date, début et fin du scan, heures de formation. Libellé vide = demi-journée non utilisée.</div>`;
    } else if (r.type === 'comptes') {
      saisie = h`<textarea id="${id}" data-cle="${r.cle}" data-type="comptes" style="min-height:56px;width:100%;" placeholder="prenom.nom@acses-asso.com, ...">${v}</textarea>`;
    } else if (r.type === 'secret') {
      saisie = h`<input id="${id}" data-cle="${r.cle}" data-type="secret" type="url" style="width:100%;" placeholder="${r.defini ? 'Configuré. Collez un nouveau lien pour le remplacer' : 'https://chat.googleapis.com/...'}">`;
    } else {
      var attrs = { euros: 'type="number" min="0" step="0.01" style="width:120px;"', nombre: 'type="number" min="0" step="0.5" style="width:120px;"', entier: 'type="number" min="0" step="1" style="width:120px;"',
        entier_vide: 'type="number" min="0" step="1" placeholder="Illimité" style="width:120px;"', compteur: 'type="number" min="1" step="1" style="width:120px;"',
        jour: 'type="date"', dateheure: 'type="datetime-local"', email: 'type="email" style="width:100%;"', url: 'type="url" style="width:100%;" placeholder="https://"',
        drive_dossier: 'type="text" style="width:100%;" placeholder="Lien ou identifiant du dossier Drive"', drive_fichier: 'type="text" style="width:100%;" placeholder="Lien ou identifiant du fichier Drive"',
        client_google: 'type="text" style="width:100%;"' }[r.type] || 'type="text" style="width:100%;"';
      saisie = h`<div style="display:flex;gap:6px;align-items:center;"><input id="${id}" data-cle="${r.cle}" data-type="${r.type}" ${brut(attrs)} value="${r.type === 'dateheure' ? v.replace(' ', 'T') : v}">${r.type === 'euros' ? h`<b>€</b>` : ''}</div>`;
    }
    return h`<div class="reglage-ligne"><label class="lib" for="${id}">${r.libelle}${r.explication && r.type !== 'creneau' ? h`<div class="exp">${r.explication}</div>` : ''}</label><div>${saisie}</div></div>`;
  }
  function lireValeursReglages(racine) {
    var o = {};
    $$('[data-cle]', racine || $('#form-reglages')).forEach(function (el) {
      var cle = el.getAttribute('data-cle'), type = el.getAttribute('data-type');
      if (type === 'ouinon') o[cle] = el.checked ? 'OUI' : 'NON';
      else if (type === 'creneau') { var p = $$('[data-p]', el).map(function (i) { return i.value.trim(); }); o[cle] = p[0] ? p.join('|') : ''; }
      else if (type === 'dateheure') o[cle] = el.value.replace('T', ' ');
      else o[cle] = el.value.trim();
    });
    return o;
  }
  function majEtatReglages() {
    reglagesModifies = JSON.stringify(lireValeursReglages()) !== reglagesInitial;
    $$('[data-enregistrer]').forEach(function (b) { b.disabled = !reglagesModifies; b.className = 'btn ' + (b.classList.contains('btn-l') ? 'btn-l ' : 'btn-s ') + (reglagesModifies ? 'btn-action' : ''); });
    $$('[data-annuler-reglages]').forEach(function (b) { b.disabled = !reglagesModifies; });
    etatSynchro(reglagesModifies ? 'attention' : '', reglagesModifies ? 'Pensez à enregistrer' : 'Réglages enregistrés');
  }
  function vueReglages() {
    if (!reglages) {
      JEF.rendre('#vue', h`${aidePage('reglages')}<div class="chargement"><span class="rotation"></span>Chargement des réglages</div>`);
      JEF.post('admin_reglages').then(function (r) { reglages = r.sections; if (vue === 'reglages') { vueReglages(); brancherAide(); } }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
      return;
    }
    JEF.rendre('#actions-contexte', h`<button class="btn btn-s" data-annuler-reglages disabled>Annuler</button> <button class="btn btn-s" data-enregistrer disabled>Enregistrer</button>`);
    var couleurs = { violet: 'var(--violet)', bleu: 'var(--bleu)', vert: 'var(--vert)', orange: 'var(--orange-acses)', gris: '#94A3B8', rouge: 'var(--rouge)' };
    JEF.rendre('#vue', h`${aidePage('reglages')}
      <form id="form-reglages" novalidate class="grille2">${reglages.map(function (s) {
        return h`<section class="panneau ${s.large ? 'pleine' : ''}" style="border-top:3px solid ${couleurs[s.couleur] || '#94A3B8'};">
          <div class="panneau-tete"><div><h3>${s.titre}</h3><p class="indice">${s.aide}</p></div>${s.avance ? tag('t-rouge nu', 'Avancé') : ''}</div>
          ${s.reglages.map(champReglage)}</section>`;
      })}
        <div class="pleine" style="position:sticky;bottom:0;padding:12px 0;background:linear-gradient(transparent,var(--fond) 35%);display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" class="btn btn-l" data-annuler-reglages disabled>Annuler les modifications</button>
          <button type="submit" class="btn btn-l" data-enregistrer disabled>Enregistrer les réglages</button></div>
      </form>`);
    var form = $('#form-reglages');
    reglagesInitial = JSON.stringify(lireValeursReglages());
    reglagesModifies = false;
    form.addEventListener('input', majEtatReglages);
    form.addEventListener('change', function (e) {
      if (e.target.matches('.interrupteur input')) e.target.nextElementSibling.textContent = e.target.checked ? 'Oui' : 'Non';
      majEtatReglages();
    });
    $$('[data-annuler-reglages]').forEach(function (b) { b.addEventListener('click', function () { reglagesModifies = false; vueReglages(); brancherAide(); etatSynchro('', 'Modifications annulées'); }); });
    $$('[data-enregistrer]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); enregistrerReglages(false); }); });
    form.addEventListener('submit', function (e) { e.preventDefault(); enregistrerReglages(false); });
  }
  /** Seules les valeurs changées sont envoyées : un compteur avancé entre-temps ne bloque rien. */
  function changements(valeurs, avant) {
    var o = {};
    Object.keys(valeurs).forEach(function (k) { if (valeurs[k] !== avant[k]) o[k] = valeurs[k]; });
    return o;
  }
  function enregistrerReglages(confirme) {
    var avant = JSON.parse(reglagesInitial);
    var toutes = lireValeursReglages();
    var valeurs = changements(toutes, avant);
    var envoyer = function (conf) {
      var b = $('#form-reglages [data-enregistrer]');
      var retablir = JEF.attente(b, 'Enregistrement');
      etatSynchro('en-cours', 'Enregistrement');
      JEF.post('admin_reglages_maj', { data: { valeurs: valeurs, confirmer: conf } }).then(function (r) {
        retablir();
        JEF.toast(r.modifies.length ? r.modifies.length + ' réglage(s) enregistré(s)' : 'Aucun changement', 'ok');
        (r.avertissements || []).forEach(function (a) { JEF.toast(a); });
        reglages = null; reglagesModifies = false;
        try { sessionStorage.removeItem('jef_config'); } catch (x) { /* rien */ }
        etatSynchro('', 'Enregistré à ' + heureMaj(new Date()));
        charger(true);
      }).catch(function (err) {
        retablir(); majEtatReglages();
        if (err.code === 'confirmation') confirmer('Réglage sensible', err.message, 'Confirmer la modification', true).then(function (ok) { if (ok) envoyer(true); });
        else JEF.toast(err.message, 'erreur');
      });
    };
    if (avant.Mode_Test === 'OUI' && toutes.Mode_Test === 'NON' && !confirme) {
      confirmer('Passer en production', 'Les emails partiront aux vrais participants et les formulaires suivront les dates d\'ouverture. Les données de démonstration doivent être supprimées avant.', 'Passer en production', true)
        .then(function (ok) { if (ok) envoyer(false); });
    } else envoyer(false);
  }

  // ======================================================================
  // Journal, mode d'emploi, nouveautés
  // ======================================================================
  function vueJournal() {
    if (!journal) {
      JEF.rendre('#vue', h`${aidePage('journal')}<div class="chargement"><span class="rotation"></span>Chargement du journal</div>`);
      JEF.post('admin_journal').then(function (r) { journal = r.journal.map(function (j, i) { j.ID = 'J' + i; return j; }); if (vue === 'journal') { vueJournal(); brancherAide(); } }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
      return;
    }
    var t = tableau('journal', {
      lignes: journal,
      colonnes: [
        { cle: 'date', titre: 'Date', val: function (j) { return JEF.date(j.Date, true); }, tri: function (j) { return new Date(j.Date).getTime() || 0; } },
        { cle: 'qui', titre: 'Qui', val: function (j) { return j.Utilisateur; } },
        { cle: 'action', titre: 'Action', val: function (j) { return j.Action; }, rendu: function (j) { return h`<b>${j.Action}</b>`; } },
        { cle: 'cible', titre: 'Dossier', val: function (j) { return j.Cible; }, rendu: function (j) { return j.Cible ? h`<button class="lien-nom mono" data-op="cible">${j.Cible}</button>` : ''; } },
        { cle: 'detail', titre: 'Détail', val: function (j) { return j.Detail; }, rendu: function (j) { return h`<span class="sous">${j.Detail}</span>`; } }
      ],
      pied: '300 dernières actions',
      action: function (op, j) { var id = String(j.Cible); var type = id.indexOf('JEF') === 0 ? 'STAG' : id.indexOf('ENT') === 0 || id.indexOf('SOC') === 0 ? 'ENT' : 'PRO'; if (trouver(type, id)) ouvrirFiche(type, id); }
    });
    JEF.rendre('#vue', h`${aidePage('journal')}${panneau('Actions du bureau', 'Inscrites automatiquement, non modifiables.', t.html, h`<button class="btn btn-s" id="b-recharger-journal">Recharger</button>`)}`);
    t.monter();
    $('#b-recharger-journal').addEventListener('click', function () { journal = null; vueJournal(); brancherAide(); });
  }

  function vueAide() {
    JEF.rendre('#vue', h`${aidePage('aide')}<section class="panneau texte-aide">${C.modeEmploi.map(function (s) {
      return h`<h3>${s.titre}</h3>${s.blocs.map(function (b) {
        if (b[0] === 'p') return h`<p>${b[1]}</p>`;
        if (b[0] === 'ol') return h`<ol>${b[1].map(function (x) { return h`<li>${x}</li>`; })}</ol>`;
        if (b[0] === 'ul') return h`<ul>${b[1].map(function (x) { return h`<li>${x}</li>`; })}</ul>`;
        if (b[0] === 'legende') return h`<div class="legende-couleurs">${b[1].map(function (x) { return tag(x[0], x[1]); })}</div>`;
        return '';
      })}`;
    })}</section>`);
  }

  function vueNouveautes() {
    JEF.rendre('#vue', h`${aidePage('nouveautes')}${C.nouveautes.map(function (n) {
      return panneau('Version ' + n.version, n.date, h`<ul style="margin:0;padding-left:18px;display:grid;gap:4px;">${n.points.map(function (p) { return h`<li>${p}</li>`; })}</ul>`);
    })}`);
  }

  // ======================================================================
  // Inscription sur place : badge immédiat, modèle selon le profil, sans repas par défaut
  // ======================================================================
  var BANDEAUX = { INVITE: ['Invité ACSES', '#6D28D9'], STAGIAIRE: ['Stagiaire', '#15528F'], EXPOSANT: ['Exposant', '#C2410C'], INTERVENANT: ['Intervenant', '#0E7490'], VISITEUR: ['Visiteur espace exposants', '#047857'] };
  function modaleSurPlace() {
    var ents = D.entreprises.filter(entrepriseActive).sort(function (a, b) { return String(a.Nom).localeCompare(String(b.Nom), 'fr'); });
    ouvrirModale('Inscription sur place', h`
      <fieldset class="champ"><legend class="legende">Profil, qui détermine le modèle du badge</legend>
        <div class="choix-profils">${Object.keys(BANDEAUX).map(function (k, i) {
          return h`<label class="option puce"><input type="radio" name="profil" value="${k}" ${brut(i === 0 ? 'checked' : '')}><span class="titre">${BANDEAUX[k][0]}</span></label>`;
        })}</div>
        <div class="apercu-bandeau" id="sp-bandeau"></div></fieldset>
      <div class="grille g2">
        <div class="champ"><label class="obligatoire" for="sp-prenom">Prénom</label><input id="sp-prenom" name="prenom" type="text" required></div>
        <div class="champ"><label class="obligatoire" for="sp-nom">Nom</label><input id="sp-nom" name="nom" type="text" required></div>
        <div class="champ"><label for="sp-fonction">Fonction</label><input id="sp-fonction" name="fonction" type="text"></div>
        <div class="champ"><label for="sp-email">Email</label><input id="sp-email" name="email" type="email"><span class="aide">Facultatif, pour envoyer le badge et les documents.</span></div>
        <div class="champ span2" id="sp-bloc-org"><label for="sp-org" id="sp-lib-org">Établissement ou organisme</label><input id="sp-org" name="organisme" type="text"></div>
        <div class="champ span2" id="sp-bloc-ent" hidden><label class="obligatoire" for="sp-ent">Entreprise partenaire</label>
          <select id="sp-ent" name="entrepriseId">${ents.length ? ents.map(function (e) { return h`<option value="${e.ID}">${e.Nom} (${e.Pass_Inclus}/${e.Quota} pass inclus)</option>`; }) : h`<option value="">Aucune entreprise : créez-la d'abord</option>`}</select></div>
        <div class="champ" id="sp-bloc-typo" hidden><label for="sp-typo">Formule</label><select id="sp-typo" name="typologie"><option value="ADHERENT">Adhérent</option><option value="NON_ADHERENT">Non-adhérent</option></select></div>
        <div class="champ" id="sp-bloc-cr" hidden><label for="sp-cr">Demi-journée de visite</label><select id="sp-cr" name="creneauVisite">${D.creneaux.map(function (c) { return h`<option>${c.libelle}</option>`; })}</select></div>
      </div>
      <fieldset class="champ" id="sp-bloc-repas"><legend class="legende">Repas (aucun par défaut)</legend>${casesRepas('repas_', null, false)}</fieldset>
      <div class="champ" id="sp-bloc-regime"><label for="sp-regime">Régime alimentaire</label><input id="sp-regime" name="regime" type="text"></div>
      <div class="bandeau b-orange" id="sp-info-stag" hidden><span class="texte">Le dossier est validé tout de suite. La convention et la facture sont à régulariser ensuite depuis sa fiche, un email part à inscription@ pour le rappeler.</span></div>
      <label class="case"><input type="checkbox" name="present" checked> <span>La personne est là : la marquer présente</span></label>
      <label class="case"><input type="checkbox" name="envoyer"> <span>Envoyer aussi le badge par email</span></label>`,
    [{ texte: 'Annuler' }, { texte: 'Créer et imprimer le badge', classe: 'btn-action', action: function (zone, btn) {
      if (!JEF.valider(zone)) return;
      var d = JEF.lireFormulaire(zone);
      if (d.profil === 'EXPOSANT' && !d.entrepriseId) { JEF.toast('Choisissez l\'entreprise partenaire.', 'erreur'); return; }
      d.repas = {}; Object.keys(D.repas).forEach(function (c) { d.repas[c] = d['repas_' + c]; });
      var fenetre = preparerFenetre('Préparation du badge');
      var retablir = JEF.attente(btn, 'Création du badge');
      JEF.post('sur_place', { data: d }, { delai: 120000 }).then(function (r) {
        fermerModale();
        JEF.toast(d.prenom + ' ' + d.nom + ' inscrit(e), badge ' + r.id + (r.envoye ? ' envoyé' : '') + (r.typePass === 'Supplémentaire' ? ', pass supplémentaire à facturer' : ''), 'ok');
        ouvrirPdfBase64(r.pdf, r.nom, fenetre);
        charger(true);
      }).catch(function (e) { retablir(); if (fenetre) fenetre.close(); JEF.toast(e.message, 'erreur'); });
    } }], 'large');
    function adapter() {
      var p = ($('#modale input[name=profil]:checked') || {}).value || 'INVITE';
      $('#sp-bloc-ent').hidden = p !== 'EXPOSANT';
      $('#sp-bloc-org').hidden = p === 'EXPOSANT';
      $('#sp-bloc-typo').hidden = p !== 'STAGIAIRE';
      $('#sp-bloc-cr').hidden = p !== 'VISITEUR';
      $('#sp-bloc-repas').hidden = p === 'VISITEUR';
      $('#sp-bloc-regime').hidden = p === 'VISITEUR';
      $('#sp-info-stag').hidden = p !== 'STAGIAIRE';
      $('#sp-lib-org').textContent = p === 'STAGIAIRE' ? 'Établissement' : 'Établissement ou organisme';
      JEF.rendre('#sp-bandeau', h`<span>Badge imprimé avec le bandeau</span> <b style="background:${BANDEAUX[p][1]};">${BANDEAUX[p][0].toUpperCase()}</b>`);
    }
    $$('#modale input[name=profil]').forEach(function (r) { r.addEventListener('change', adapter); });
    adapter();
    $('#sp-prenom').focus();
  }

  // ======================================================================
  // Accès : utilisateurs et administrateurs (administrateurs seulement)
  // ======================================================================
  function vueAcces() {
    if (!estAdmin()) { aller('tableau'); return; }
    JEF.rendre('#vue', h`${aidePage('acces')}<div class="chargement"><span class="rotation"></span>Chargement des comptes</div>`);
    JEF.post('acces_lire').then(function (r) { if (vue === 'acces') rendreAcces(r.comptes); }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
  }
  function rendreAcces(comptes) {
    var nbAdmins = comptes.filter(function (c) { return c.admin; }).length;
    JEF.rendre('#vue', h`${aidePage('acces')}
      ${panneau('Comptes du bureau', comptes.length + ' compte(s), dont ' + nbAdmins + ' administrateur(s). Seules les adresses @acses-asso.com sont acceptées.', h`
        <div class="table-defile" style="max-height:none;"><table class="tab table-acces"><thead><tr><th>Compte</th><th>Dernière connexion</th><th>Utilisateur</th><th>Administrateur</th><th></th></tr></thead>
        <tbody>${comptes.map(function (c) {
          return h`<tr style="cursor:default;" data-email="${c.email}"><td><span class="avatar" style="background:${couleurDe(c.email)};">${initiales(c.email)}</span> <b>${c.email}</b>${c.moi ? h` ${tag('t-bleu nu', 'Vous')}` : ''}</td>
            <td class="sous">${c.derniere || 'Jamais connecté'}</td>
            <td><label class="interrupteur" title="Tous les comptes sont utilisateurs"><input type="checkbox" checked disabled><span>Oui</span></label></td>
            <td><label class="interrupteur"><input type="checkbox" data-admin ${brut(c.admin ? 'checked' : '')} ${brut(c.moi ? 'disabled title="Vous ne pouvez pas retirer votre propre accès administrateur"' : '')}><span>${c.admin ? 'Oui' : 'Non'}</span></label></td>
            <td>${c.moi ? '' : h`<button class="btn btn-s btn-danger croix" data-retirer aria-label="Retirer l'accès de ${c.email}" title="Retirer l'accès">✕</button>`}</td></tr>`;
        })}</tbody></table></div>
        <form id="form-acces" class="ajout-acces" novalidate>
          <div class="champ" style="flex:1;"><label for="ac-email">Ajouter un membre du bureau</label><input id="ac-email" name="email" type="email" required placeholder="Ex. prenom.nom@acses-asso.com"></div>
          <label class="case"><input type="checkbox" name="admin"> <span>Administrateur</span></label>
          <button type="submit" class="btn btn-primaire">Ajouter</button></form>`)}
      ${panneau('Ce que chaque profil peut faire', '', h`<dl class="infos"><dt>Utilisateur</dt><dd>Tout le cockpit (dossiers, validation, paiements, badges, entreprises, Qualiopi) et le scanner.</dd>
        <dt>Administrateur</dt><dd>Comme un utilisateur, plus les Réglages et cet onglet Accès.</dd>
        <dt>Effet immédiat</dt><dd>Un compte retiré ou dont le profil change est déconnecté aussitôt et doit se reconnecter.</dd></dl>`)}`);
    brancherAide();
    var envoyer = function (d, msg) {
      return JEF.post('acces_maj', { data: d }).then(function (r) { JEF.toast(msg, 'ok'); rendreAcces(r.comptes); }).catch(function (e) { JEF.toast(e.message, 'erreur'); vueAcces(); });
    };
    $$('#vue [data-admin]').forEach(function (c) {
      c.addEventListener('change', function () {
        var email = c.closest('tr').getAttribute('data-email');
        envoyer({ op: 'role', email: email, admin: c.checked }, email + (c.checked ? ' est administrateur' : ' est utilisateur'));
      });
    });
    $$('#vue [data-retirer]').forEach(function (b) {
      b.addEventListener('click', function () {
        var email = b.closest('tr').getAttribute('data-email');
        confirmer('Retirer l\'accès', email + ' ne pourra plus se connecter au cockpit ni au scanner. Sa session en cours est coupée.', 'Retirer l\'accès', true)
          .then(function (ok) { if (ok) envoyer({ op: 'retirer', email: email }, 'Accès retiré à ' + email); });
      });
    });
    $('#form-acces').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!JEF.valider(this)) return;
      var d = JEF.lireFormulaire(this);
      envoyer({ op: 'ajouter', email: d.email, admin: d.admin }, d.email + ' ajouté(e)');
    });
  }

  // ======================================================================
  // Qualiopi : préparation des audits, en lien avec le Drive
  // ======================================================================
  var qualiopi = null, filtreQualiopi = 'applicables';
  var COULEURS_STATUT = { 'À fournir': 't-orange', 'En cours': 't-bleu', 'Fourni': 't-vert', 'À mettre à jour': 't-violet', 'Non applicable': 't-gris' };
  function vueQualiopi() {
    if (!qualiopi) {
      JEF.rendre('#vue', h`${aidePage('qualiopi')}<div class="chargement"><span class="rotation"></span>Chargement des indicateurs</div>`);
      JEF.post('qualiopi_lire').then(function (r) { qualiopi = r; if (vue === 'qualiopi') { vueQualiopi(); brancherAide(); } }).catch(function (e) { JEF.toast(e.message, 'erreur'); });
      return;
    }
    var q = qualiopi, app = q.indicateurs.filter(function (i) { return i.applicable; });
    var compte = function (st) { return app.filter(function (i) { return i.statut === st; }).length; };
    var fournis = compte('Fourni');
    var filtres = { applicables: ['Applicables', function (i) { return i.applicable; }], afournir: ['À fournir', function (i) { return i.applicable && i.statut === 'À fournir'; }],
      encours: ['En cours', function (i) { return i.statut === 'En cours'; }], fournis: ['Fournis', function (i) { return i.statut === 'Fourni'; }],
      maj: ['À mettre à jour', function (i) { return i.statut === 'À mettre à jour'; }], tous: ['Tous les 33', function () { return true; }] };
    var liste = q.indicateurs.filter(filtres[filtreQualiopi][1]);
    JEF.rendre('#vue', h`${aidePage('qualiopi')}
      <div class="chiffres">
        <div class="chiffre"><div class="lib">Indicateurs prêts pour l'audit</div><div class="val">${fournis}<small style="font-size:14px;color:var(--texte-2)"> / ${app.length}</small></div>
          <div class="jauge2"><i style="width:${app.length ? Math.round(fournis / app.length * 100) : 0}%"></i></div><div class="det">applicables aux JEF</div></div>
        <div class="chiffre"><div class="lib">À fournir</div><div class="val">${compte('À fournir')}</div><div class="det">justificatif manquant</div></div>
        <div class="chiffre"><div class="lib">En cours ou à mettre à jour</div><div class="val">${compte('En cours') + compte('À mettre à jour')}</div><div class="det">à finaliser</div></div>
        <div class="chiffre"><div class="lib">Non applicables</div><div class="val">${q.indicateurs.length - app.length}</div><div class="det">alternance, apprentissage, certifiant...</div></div>
      </div>
      ${panneau('Indicateurs du référentiel national qualité', '7 critères, 33 indicateurs depuis le 1er novembre 2026. Cliquez sur un indicateur pour joindre les justificatifs du Drive.', h`
        <div class="barre-filtres" role="group" aria-label="Filtres">${Object.keys(filtres).map(function (k) {
          return h`<button class="puce-filtre" data-fq="${k}" aria-pressed="${filtreQualiopi === k ? 'true' : 'false'}">${filtres[k][0]}<span class="n">${q.indicateurs.filter(filtres[k][1]).length}</span></button>`; })}</div>
        ${q.criteres.map(function (crit, ci) {
          var inds = liste.filter(function (i) { return i.critere === ci + 1; });
          if (!inds.length) return '';
          return h`<h4 class="titre-critere">Critère ${ci + 1} - ${crit}</h4><div class="liste-indicateurs">${inds.map(function (i) {
            return h`<button class="indicateur ${i.applicable ? '' : 'na'}" data-ind="${i.n}"><span class="num">${i.n}</span>
              <span class="corps-ind"><b>${i.intitule}</b><small>${i.exemples}</small>
                ${i.auto ? h`<small class="auto">Plateforme : ${i.auto}</small>` : ''}
                ${i.liens.length ? h`<span class="liens">${i.liens.map(function (l) { return h`<span class="lien-pj">📄 ${l.nom}</span>`; })}</span>` : ''}
                ${i.notes ? h`<small class="note">${i.notes}</small>` : ''}</span>
              <span class="etat-ind">${tag(COULEURS_STATUT[i.statut] || 't-gris', i.statut)}${i.maj ? h`<small>${i.maj}</small>` : ''}</span></button>`;
          })}</div>`;
        })}`,
        h`${q.dossierDrive ? h`<a class="btn btn-s" href="${q.dossierDrive}" target="_blank" rel="noopener">Ouvrir le Drive Qualiopi</a>` : ''}<button class="btn btn-s" id="b-recharger-q">Actualiser</button>`)}
      ${panneauReglages('qualiopi', 'Réglages Qualiopi', 'Réservé aux administrateurs. Dossier Drive des justificatifs, identité et attestations.',
        ['ID_Dossier_Audit_Qualiopi', 'NDA', 'Signataire_Attestation', 'Date_Envoi_Attestations', 'URL_Questionnaire_Satisfaction', 'Scan_Unique'])}`);
    $$('[data-fq]').forEach(function (b) { b.addEventListener('click', function () { filtreQualiopi = b.getAttribute('data-fq'); vueQualiopi(); brancherAide(); }); });
    $$('[data-ind]').forEach(function (b) { b.addEventListener('click', function () { modaleIndicateur(Number(b.getAttribute('data-ind'))); }); });
    $('#b-recharger-q').addEventListener('click', function () { qualiopi = null; vueQualiopi(); brancherAide(); });
    monterPanneauxReglages();
  }

  var fichiersDrive = null;
  function modaleIndicateur(n) {
    var i = qualiopi.indicateurs.filter(function (x) { return x.n === n; })[0];
    var liens = i.liens.slice();
    function rendreLiens() {
      JEF.rendre('#q-liens', liens.length ? liens.map(function (l, k) {
        return h`<li><a href="${l.url}" target="_blank" rel="noopener">📄 ${l.nom}</a><button type="button" class="btn btn-s croix" data-sup="${k}" aria-label="Retirer ${l.nom}">✕</button></li>`;
      }) : h`<li class="indice">Aucun justificatif rattaché.</li>`);
      $$('[data-sup]').forEach(function (b) { b.addEventListener('click', function () { liens.splice(Number(b.getAttribute('data-sup')), 1); rendreLiens(); }); });
    }
    function rendreDrive(filtre) {
      var z = $('#q-drive');
      if (!fichiersDrive) { JEF.rendre(z, h`<div class="chargement"><span class="rotation"></span>Lecture du Drive</div>`); return; }
      var f = normal(filtre || '');
      var res = fichiersDrive.filter(function (x) { return !f || normal(x.nom + ' ' + x.dossier).indexOf(f) !== -1; }).slice(0, 60);
      JEF.rendre(z, res.length ? res.map(function (x, k) {
        return h`<button type="button" class="fichier-drive" data-fd="${fichiersDrive.indexOf(x)}"><b>${x.nom}</b><small>${x.dossier || 'Racine'} - modifié le ${x.maj}</small></button>`;
      }) : h`<p class="indice">Aucun fichier trouvé.</p>`);
      $$('[data-fd]').forEach(function (b) { b.addEventListener('click', function () {
        var x = fichiersDrive[Number(b.getAttribute('data-fd'))];
        if (!liens.some(function (l) { return l.url === x.url; })) liens.push({ nom: x.nom, url: x.url });
        rendreLiens();
      }); });
    }
    ouvrirModale('Indicateur ' + i.n + ' - ' + i.intitule, h`
      <p class="indice" style="margin:0;">Critère ${i.critere} - ${qualiopi.criteres[i.critere - 1]}. Exemples de justificatifs pour les JEF : ${i.exemples}.</p>
      ${i.auto ? h`<div class="bandeau b-gris"><span class="texte"><b>Produit par la plateforme :</b> ${i.auto}</span></div>` : ''}
      <div class="grille g2">
        <div class="champ"><label for="q-app">Applicable aux JEF</label><label class="interrupteur"><input type="checkbox" id="q-app" ${brut(i.applicable ? 'checked' : '')}><span>${i.applicable ? 'Oui' : 'Non'}</span></label></div>
        <div class="champ"><label for="q-statut">État</label><select id="q-statut">${qualiopi.statuts.filter(function (s) { return s !== 'Non applicable'; }).map(function (s) { return h`<option ${brut(s === i.statut ? 'selected' : '')}>${s}</option>`; })}</select></div>
      </div>
      <div class="champ"><label>Justificatifs rattachés</label><ul class="liste-liens" id="q-liens"></ul></div>
      <div class="champ"><label for="q-cherche">Ajouter depuis le Drive Qualiopi</label><input id="q-cherche" type="search" placeholder="Rechercher un fichier"><div class="fichiers-drive" id="q-drive"></div></div>
      <div class="grille g2">
        <div class="champ"><label for="q-nom-lien">Ou un lien : nom</label><input id="q-nom-lien" type="text" placeholder="Ex. CV des intervenants"></div>
        <div class="champ"><label for="q-url">Adresse (https://)</label><div style="display:flex;gap:6px;"><input id="q-url" type="url" placeholder="https://"><button type="button" class="btn btn-s" id="q-ajout-lien">Ajouter</button></div></div>
      </div>
      <div class="champ"><label for="q-notes">Notes pour l'audit</label><textarea id="q-notes" style="min-height:70px;">${i.notes}</textarea></div>
      ${i.maj ? h`<p class="indice" style="margin:0;">Mis à jour le ${i.maj} par ${i.par}.</p>` : ''}`,
    [{ texte: 'Annuler' }, { texte: 'Enregistrer', classe: 'btn-primaire', action: function (z, b) {
      var retablir = JEF.attente(b, 'Enregistrement');
      JEF.post('qualiopi_maj', { data: { indicateur: n, applicable: $('#q-app').checked, statut: $('#q-statut').value, liens: liens, notes: $('#q-notes').value } }).then(function (r) {
        qualiopi = r; fermerModale(); JEF.toast('Indicateur ' + n + ' enregistré', 'ok'); vueQualiopi(); brancherAide();
      }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
    } }], 'large');
    rendreLiens();
    $('#q-app').addEventListener('change', function () { this.nextElementSibling.textContent = this.checked ? 'Oui' : 'Non'; $('#q-statut').disabled = !this.checked; });
    $('#q-statut').disabled = !i.applicable;
    $('#q-cherche').addEventListener('input', function () { rendreDrive(this.value); });
    $('#q-ajout-lien').addEventListener('click', function () {
      var url = $('#q-url').value.trim(), nom = $('#q-nom-lien').value.trim() || url;
      if (!/^https:\/\//.test(url)) { JEF.toast('L\'adresse doit commencer par https://', 'erreur'); return; }
      liens.push({ nom: nom, url: url }); $('#q-url').value = ''; $('#q-nom-lien').value = ''; rendreLiens();
    });
    rendreDrive('');
    if (!fichiersDrive) JEF.post('qualiopi_drive', {}, { delai: 60000 }).then(function (r) { fichiersDrive = r.fichiers; if ($('#q-drive')) rendreDrive($('#q-cherche').value); })
      .catch(function (e) { if ($('#q-drive')) JEF.rendre('#q-drive', h`<p class="indice">${e.message}</p>`); });
  }

  // ======================================================================
  // Fiches détaillées (tiroir)
  // ======================================================================
  function infos(paires) {
    return h`<dl class="infos">${paires.filter(function (p) { return p[1] !== undefined && p[1] !== null && p[1] !== ''; }).map(function (p) { return h`<dt>${p[0]}</dt><dd>${p[1]}</dd>`; })}</dl>`;
  }

  function ouvrirFiche(type, id, rafraichissement) {
    var l = trouver(type, id);
    if (!l) { fermerFiche(); return; }
    var nouveau = !fiche || fiche.id !== id;
    fiche = { type: type, id: id };
    if (type === 'ENT') ficheEntreprise(l); else fichePersonne(type, l);
    var t = $('#tiroir');
    t.classList.add('ouvert'); t.setAttribute('aria-hidden', 'false');
    $('#fermer-fiche').addEventListener('click', fermerFiche);
    avertirFicheOuverte();
    if (nouveau && !rafraichissement) signalerPresence();
  }

  function fichePersonne(type, l) {
    var stag = type === 'STAG', p = prefixe(l), visiteur = l.Profil === 'VISITEUR';
    var boutons = [];
    if (stag && /[123]/.test(p)) boutons.push(h`<button class="btn btn-s btn-vert" data-op="valider">Valider le dossier</button>`);
    if (stag && /[34]/.test(p)) boutons.push(h`<button class="btn btn-s btn-primaire" data-op="payer">Encaisser</button>`);
    if (stag && p === '8') boutons.push(h`<button class="btn btn-s btn-primaire" data-op="sortir_attente">Admettre</button>`);
    if (l.Email) boutons.push(h`<button class="btn btn-s ${!stag && !l.Badge_Envoye ? 'btn-action' : ''}" data-op="badge_envoyer">${l.Badge_Envoye ? 'Renvoyer le badge' : 'Envoyer le badge'}</button>`);
    boutons.push(h`<button class="btn btn-s" data-op="badge_pdf">Ouvrir le badge PDF</button>`);
    if (stag && /[12]/.test(p)) boutons.push(h`<button class="btn btn-s" data-op="lien">Relancer le service formation</button>`);
    if (stag && Number(l.Heures) > 0) boutons.push(h`<button class="btn btn-s" data-op="attestation">Envoyer l'attestation</button>`);
    if (stag && /[45]/.test(p)) boutons.push(h`<button class="btn btn-s" data-op="facture">${l.Numero_Facture ? 'Renvoyer la facture' : 'Envoyer la facture'}</button>`);
    if (stag && l.Parcours === 'SERVICE' && !l.Date_Positionnement) boutons.push(h`<button class="btn btn-s" data-op="positionnement">Renvoyer le lien de positionnement</button>`);
    if (stag) boutons.push(h`<button class="btn btn-s" data-op="bureau">${JEF.oui(l.Membre_Bureau) ? 'Retirer du bureau' : 'Marquer membre du bureau'}</button>`);
    boutons.push(p === '9' ? h`<button class="btn btn-s" data-op="reactiver">Réactiver</button>` : h`<button class="btn btn-s btn-danger" data-op="annuler">Annuler l'inscription</button>`);
    var ent = !stag && l.Profil === 'EXPOSANT' ? entrepriseDe(l) : null;
    var champsEdit = stag
      ? [['Prenom', 'Prénom'], ['Nom', 'Nom'], ['Fonction', 'Fonction'], ['Email', 'Email'], ['Telephone', 'Téléphone'], ['Etablissement', 'Établissement'], ['Email_Formation', 'Email du service formation']]
      : [['Prenom', 'Prénom'], ['Nom', 'Nom'], ['Fonction', 'Fonction'], ['Email', 'Email'], ['Telephone', 'Téléphone'], ['Organisme', 'Organisme']];
    JEF.rendre('#tiroir', h`
      <header><div style="flex:1;"><div class="petit mono">${l.ID}</div><h2 style="margin:2px 0 6px;font-size:18px;">${nomComplet(l)}</h2>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${stag ? tagStatutStagiaire(l) : [tag('t-gris nu', PROFILS[l.Profil] || l.Profil), tagStatutBadge(l), l.Profil === 'EXPOSANT' ? tagPass(l) : '']}
        ${stag && JEF.oui(l.Membre_Bureau) ? tag('t-encre nu', 'Bureau') : ''}</div></div>
        <button class="btn btn-s" id="fermer-fiche" aria-label="Fermer la fiche">Fermer</button></header>
      <div class="corps">
        <div id="fiche-partagee"></div>
        ${stag && l.Convention_Fichier ? h`<section class="bloc-convention ${p === '3' ? 'a-verifier' : ''}">
          <div><h4>${l.Parcours === 'PERSONNEL' ? 'Contrat de formation signé' : 'Convention signée'}</h4>
          <div>${p === '3' ? 'Déposé(e) le ' + JEF.date(l.Date_Convention, true) + '. À vérifier avant de valider le dossier.' : 'Déposé(e) le ' + JEF.date(l.Date_Convention, true) + '.'}</div></div>
          <button class="btn ${p === '3' ? 'btn-action' : ''}" id="voir-convention">${p === '3' ? 'Vérifier et valider' : 'Voir le document'}</button></section>` : ''}
        ${stag && !l.Convention_Fichier && /[12]/.test(p) ? h`<section class="bloc-convention"><div><h4>Document signé</h4><div>Pas encore déposé. ${l.Parcours === 'PERSONNEL' ? 'Le stagiaire doit signer et déposer son contrat.' : 'Le service formation doit déposer la convention signée.'}</div></div></section>` : ''}
        <section><h4>Actions</h4><div style="display:flex;gap:6px;flex-wrap:wrap;" id="fiche-actions">${boutons}</div></section>
        ${stag ? h`<section><h4>Suivi du dossier</h4>${infos([
          ['Parcours', { STAGIAIRE: 'Le stagiaire s\'est inscrit, son service formation complète', SERVICE: 'Inscrit par le service formation', PERSONNEL: 'Le stagiaire paie lui-même' }[l.Parcours || 'STAGIAIRE']],
          ['Mode de règlement', l.Mode_Reglement ? l.Mode_Reglement + ', après la formation' : ''],
          ['Inscription', JEF.date(l.Date_Inscription, true)], ['Formule', l.Typologie + ', ' + JEF.euros(l.Montant_Formation)], ['Repas', JEF.euros(l.Montant_Repas)], ['Total', JEF.euros(l.Montant_Total)],
          ['Adhésion vérifiée', l.Adherent_Verifie], ['Complété par le service formation', JEF.date(l.Date_Complement, true)], ['Convention reçue', JEF.date(l.Date_Convention, true)],
          ['Badge envoyé', JEF.date(l.Badge_Envoye, true)], ['Facture', l.Numero_Facture ? l.Numero_Facture + ' du ' + JEF.date(l.Date_Facture) : ''], ['Payé le', JEF.date(l.Date_Paiement)],
          ['Attestation', JEF.date(l.Attestation_Envoyee, true)]])}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
            ${l.Convention_Fichier ? h`<a class="btn btn-s" href="${l.Convention_Fichier}" target="_blank" rel="noopener">Document signé dans Drive</a>` : ''}
            ${l.Dossier_Drive ? h`<a class="btn btn-s" href="${l.Dossier_Drive}" target="_blank" rel="noopener">Dossier Drive</a>` : ''}</div></section>`
        : h`<section><h4>Badge</h4>${infos([['Entreprise partenaire', ent ? ent.Nom : ''], ['Pass', l.Profil === 'EXPOSANT' ? l.Type_Pass + (Number(l.Montant) ? ', ' + JEF.euros(l.Montant) : '') : ''],
          ['Visite', l.Creneau_Visite], ['Créé le', JEF.date(l.Date_Inscription, true)], ['Badge envoyé', JEF.date(l.Badge_Envoye, true)]])}
          ${ent ? h`<button class="btn btn-s" style="margin-top:8px;" data-ouvrir-ent="${ent.ID}">Ouvrir la fiche de ${ent.Nom}</button>` : ''}</section>`}
        <section><h4>Présence</h4><div>${boutonsPresence(l)}</div>${stag ? h`<div class="indice" style="margin-top:6px;">${l.Heures || 0} h réalisées</div>` : ''}</section>
        ${visiteur ? '' : h`<section><h4>Repas</h4><div id="fiche-repas">${casesRepas('r_', l)}</div>
          <div class="champ" style="margin-top:8px;"><label for="f-regime">Régime alimentaire</label><input id="f-regime" type="text" value="${l.Regime || ''}"></div>
          <button class="btn btn-s btn-primaire" style="margin-top:8px;" id="enr-repas">Enregistrer les repas</button></section>`}
        <section><h4>Coordonnées</h4><form id="fiche-form" class="grille g2" novalidate>
          ${champsEdit.map(function (c) { return h`<div class="champ"><label>${c[1]}</label><input name="${c[0]}" type="${/Email/.test(c[0]) ? 'email' : 'text'}" value="${l[c[0]] || ''}"></div>`; })}
          ${stag ? h`<div class="champ"><label>Formule</label><select name="Typologie"><option ${brut(l.Typologie === 'Adhérent' ? 'selected' : '')}>Adhérent</option><option ${brut(l.Typologie === 'Non-adhérent' ? 'selected' : '')}>Non-adhérent</option></select></div>` : ''}
          ${visiteur ? h`<div class="champ"><label>Visite</label><select name="Creneau_Visite">${D.creneaux.map(function (c) { return h`<option ${brut(c.libelle === l.Creneau_Visite ? 'selected' : '')}>${c.libelle}</option>`; })}</select></div>` : ''}
          <div class="champ span2"><label>Notes internes</label><textarea name="Notes" style="min-height:56px;">${l.Notes || ''}</textarea></div>
          <div class="span2"><button class="btn btn-s btn-primaire" type="submit">Enregistrer les coordonnées</button></div></form></section>
        ${stag ? h`<section><h4>Positionnement</h4>${!l.Niveau && !l.Objectifs ? h`<p class="indice" style="margin:0 0 6px;">${l.Parcours === 'SERVICE' ? 'Pas encore rempli par le stagiaire, qui a reçu un lien.' : 'Non renseigné.'}</p>` : ''}${infos([['Niveau', l.Niveau], ['Objectifs', l.Objectifs], ['Attentes', l.Attentes], ['Besoin d\'aménagement', l.Handicap]])}</section>
          <section><h4>Informations administratives</h4>${infos([['Raison sociale', l.Raison_Sociale], ['SIRET', l.SIRET], ['Code NAF', l.Code_NAF], ['Adresse de facturation', l.Adresse_Facturation],
            ['Signataire', l.Signataire], ['Contact', l.Contact_Formation], ['Financement', l.Mode_Financement], ['OPCO ou ANFH', l.Nom_OPCO], ['Bon de commande', l.Bon_Commande]])}</section>` : ''}
      </div>`);
    $$('#fiche-actions [data-op]').forEach(function (b) { b.addEventListener('click', function () { executer(type, l.ID, b.getAttribute('data-op'), {}, b); }); });
    var vc = $('#voir-convention'); if (vc) vc.addEventListener('click', function () { apercuConvention(l); });
    $$('#tiroir .pres').forEach(function (b) { b.addEventListener('click', function () { basculerPresence(type, l, b); }); });
    $$('[data-ouvrir-ent]').forEach(function (b) { b.addEventListener('click', function () { ouvrirFiche('ENT', b.getAttribute('data-ouvrir-ent')); }); });
    var er = $('#enr-repas');
    if (er) er.addEventListener('click', function () {
      var repas = {}; Object.keys(D.repas).forEach(function (c) { repas[c] = $('[name="r_' + c + '"]', $('#tiroir')).checked; });
      modifier(type, l.ID, { repas: repas, champs: { Regime: $('#f-regime').value } }, er);
    });
    $('#fiche-form').addEventListener('submit', function (e) { e.preventDefault(); if (JEF.valider(this)) modifier(type, l.ID, { champs: JEF.lireFormulaire(this) }, $('button[type=submit]', this)); });
  }

  function ficheEntreprise(e) {
    var reps = D.badges.filter(function (b) { return b.Entreprise_ID === e.ID; });
    var actifs = reps.filter(actifBadge);
    var aEnvoyer = actifs.filter(function (b) { return b.Email && !b.Badge_Envoye; }).length;
    var active = entrepriseActive(e);
    JEF.rendre('#tiroir', h`
      <header><div style="flex:1;"><div class="petit mono">${e.ID}</div><h2 style="margin:2px 0 6px;font-size:18px;">${e.Nom}</h2>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${active ? tag('t-vert', 'Entreprise partenaire exposante') : tag('t-rouge', 'Annulée')}
        ${tag(e.Pass_Inclus >= e.Quota ? 't-vert' : 't-gris', e.Pass_Inclus + ' pass inclus sur ' + e.Quota)}</div></div>
        <button class="btn btn-s" id="fermer-fiche" aria-label="Fermer la fiche">Fermer</button></header>
      <div class="corps">
        <div id="fiche-partagee"></div>
        <section><h4>Actions</h4><div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${active ? h`<button class="btn btn-s btn-primaire" id="e-ajouter">Ajouter un représentant</button>` : ''}
          ${aEnvoyer ? h`<button class="btn btn-s btn-action" id="e-envoyer">Envoyer les badges (${aEnvoyer})</button>` : ''}
          <button class="btn btn-s" id="e-modifier">Modifier l'entreprise</button>
          ${active ? h`<button class="btn btn-s btn-danger" id="e-annuler">Annuler l'entreprise</button>` : h`<button class="btn btn-s" id="e-reactiver">Réactiver</button>`}</div></section>
        <section><h4>Coordonnées</h4>${infos([['Contact', e.Contact], ['Email', e.Email_Contact], ['Téléphone', e.Telephone_Contact], ['Emplacement exposant', e.Emplacement],
          ['Pass inclus', e.Quota + (String(e.Quota_Gratuit || '') === '' ? ' (valeur par défaut)' : '')], ['Notes', e.Notes]])}</section>
        <section><h4>Représentants (${actifs.length})</h4>
          ${reps.length ? h`<div class="table-defile" style="max-height:none;"><table class="tab"><thead><tr><th>Personne</th><th>Pass</th><th>Repas</th><th>Badge</th><th></th></tr></thead><tbody>
            ${reps.map(function (b) { return h`<tr data-rep="${b.ID}"><td><button class="lien-nom" data-rep-op="fiche">${nomComplet(b)}</button><div class="sous">${b.Fonction || ''} ${b.Email || 'sans email'}</div></td>
              <td>${actifBadge(b) ? tagPass(b) : tag('t-rouge', 'Annulé')}</td><td>${repas3(b)}</td><td>${tagStatutBadge(b)}</td>
              <td style="white-space:nowrap;">${b.Email && actifBadge(b) ? h`<button class="btn btn-s" data-rep-op="badge_envoyer">${b.Badge_Envoye ? 'Renvoyer' : 'Envoyer'}</button>` : ''}<button class="btn btn-s" data-rep-op="badge_pdf">PDF</button></td></tr>`; })}
          </tbody></table></div>` : h`<p class="indice" style="margin:0;">Aucun représentant pour le moment. Ajoutez-les un par un, ou importez la feuille à compléter depuis la liste des entreprises.</p>`}</section>
      </div>`);
    var ajouter = $('#e-ajouter'); if (ajouter) ajouter.addEventListener('click', function () { modaleRepresentant(e); });
    $('#e-modifier').addEventListener('click', function () { modaleEntreprise(e); });
    var env = $('#e-envoyer');
    if (env) env.addEventListener('click', function () {
      confirmer('Envoyer les badges', aEnvoyer + ' représentant(s) de ' + e.Nom + ' vont recevoir leur badge par email.', 'Envoyer', false).then(function (ok) {
        if (!ok) return;
        var retablir = JEF.attente(env, 'Envoi');
        JEF.post('admin_entreprise', { data: { op: 'envoyer_badges', id: e.ID } }, { delai: 300000 }).then(function (r) { retablir(); JEF.toast(r.envoyes + ' badge(s) envoyé(s)' + (r.restants ? ', ' + r.restants + ' restant(s) : relancez' : ''), 'ok'); charger(true); })
          .catch(function (err) { retablir(); JEF.toast(err.message, 'erreur'); });
      });
    });
    var an = $('#e-annuler') || $('#e-reactiver');
    an.addEventListener('click', function () {
      var op = an.id === 'e-annuler' ? 'annuler' : 'reactiver';
      var go = function () { JEF.post('admin_entreprise', { data: { op: op, id: e.ID } }).then(function () { JEF.toast(op === 'annuler' ? 'Entreprise annulée' : 'Entreprise réactivée', 'ok'); charger(true); }).catch(function (err) { JEF.toast(err.message, 'erreur'); }); };
      if (op === 'annuler') confirmer('Annuler l\'entreprise', 'Plus aucun représentant ne pourra être ajouté. Les badges déjà créés restent valables : annulez-les un par un si besoin.', 'Annuler l\'entreprise', true).then(function (ok) { if (ok) go(); });
      else go();
    });
    $$('#tiroir [data-rep]').forEach(function (tr) {
      tr.addEventListener('click', function (ev) {
        var id = tr.getAttribute('data-rep'), b = ev.target.closest('[data-rep-op]');
        var op = b ? b.getAttribute('data-rep-op') : 'fiche';
        if (op === 'fiche') ouvrirFiche('PRO', id); else executer('PRO', id, op, {}, b);
      });
    });
  }

  function fermerFiche() { var etaitOuverte = !!fiche; fiche = null; var t = $('#tiroir'); t.classList.remove('ouvert'); t.setAttribute('aria-hidden', 'true'); if (etaitOuverte) signalerPresence(); }

  // ======================================================================
  // Actions
  // ======================================================================
  var CONFIRMATIONS = {
    valider: ['Valider le dossier', 'Le badge part au stagiaire, et la facture au service formation si la facturation automatique est active.', 'Valider'],
    payer: ['Enregistrer le paiement', 'Le dossier passe au statut Payé. La facture acquittée part au service formation si la facturation automatique est active.', 'Encaisser'],
    annuler: ['Annuler l\'inscription', 'L\'inscription est annulée. Elle reste dans le classeur et peut être réactivée.', 'Annuler l\'inscription', true],
    attestation: ['Envoyer l\'attestation', 'L\'attestation est créée avec les heures réellement suivies et envoyée par email.', 'Envoyer'],
    sortir_attente: ['Admettre ce stagiaire', 'Le dossier provisoire et le lien du service formation lui sont envoyés.', 'Admettre'],
    badge_envoyer: ['Envoyer le badge', 'Le badge est recréé avec les informations actuelles et envoyé par email.', 'Envoyer'],
    lien: ['Relancer', 'Le lien personnel du dossier est renvoyé au service formation, ou au stagiaire s\'il n\'y a pas d\'adresse.', 'Relancer'],
    facture: ['Envoyer la facture', 'La facture est créée si besoin et envoyée par email (acquittée si le paiement est enregistré).', 'Envoyer'],
    positionnement: ['Renvoyer le lien de positionnement', 'Le stagiaire reçoit à nouveau le lien pour remplir son positionnement.', 'Envoyer']
  };
  var SUCCES = { valider: 'Dossier validé, badge envoyé', payer: 'Paiement enregistré', badge_envoyer: 'Badge envoyé', lien: 'Lien renvoyé', annuler: 'Inscription annulée',
    reactiver: 'Inscription réactivée', bureau: 'Statut bureau modifié', attestation: 'Attestation envoyée', presence: 'Présence mise à jour', sortir_attente: 'Stagiaire admis', facture: 'Facture envoyée', positionnement: 'Lien de positionnement envoyé' };

  /** Ouvre une fenêtre tout de suite (sinon le navigateur la bloque), remplie quand le document est prêt. */
  function preparerFenetre(message) {
    var w = null;
    try { w = window.open('', '_blank'); } catch (e) { w = null; }
    if (w) { try { w.document.title = message; w.document.body.style.font = '14px Segoe UI, sans-serif'; w.document.body.textContent = message + '...'; } catch (e) { /* rien */ } }
    return w;
  }
  function ouvrirPdfBase64(b64, nom, fenetre) {
    var octets = atob(b64), tab = new Uint8Array(octets.length);
    for (var i = 0; i < octets.length; i++) tab[i] = octets.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([tab], { type: 'application/pdf' }));
    if (fenetre && !fenetre.closed) { fenetre.location.href = url; JEF.toast('Badge ouvert dans un nouvel onglet', 'ok'); return; }
    ouvrirModale('Badge prêt', h`<p style="margin:0;">Votre navigateur a bloqué l'ouverture automatique. Utilisez un des boutons ci-dessous.</p>`, [
      { texte: 'Fermer' },
      { texte: 'Télécharger', action: function () { var a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); fermerModale(); } },
      { texte: 'Ouvrir', classe: 'btn-primaire', action: function () { window.open(url, '_blank'); fermerModale(); } }]);
  }
  function ouvrirBadgePdf(type, id, fenetre, btn) {
    var retablir = JEF.attente(btn, 'Préparation');
    JEF.post('admin_action', { data: { type: type, id: id, op: 'badge_pdf' } }, { delai: 120000 }).then(function (r) {
      retablir(); ouvrirPdfBase64(r.pdf, r.nom, fenetre);
    }).catch(function (e) { retablir(); if (fenetre) fenetre.close(); JEF.toast(e.message, 'erreur'); });
  }

  /** Aperçu du document signé dans le cockpit, avec le bouton Valider à côté. */
  function apercuConvention(l) {
    var aValider = prefixe(l) === '3';
    var titre = (l.Parcours === 'PERSONNEL' ? 'Contrat signé' : 'Convention signée') + ' - ' + nomComplet(l);
    var url = null;
    ouvrirModale(titre, h`<div id="apercu-doc" class="apercu-doc"><div class="chargement"><span class="rotation"></span>Chargement du document</div></div>
      <dl class="infos"><dt>Dossier</dt><dd>${l.ID}</dd><dt>Établissement</dt><dd>${l.Raison_Sociale || l.Etablissement || '-'}</dd><dt>Montant</dt><dd>${JEF.euros(l.Montant_Total)}</dd><dt>Déposé le</dt><dd>${JEF.date(l.Date_Convention, true)}</dd></dl>`,
      [{ texte: 'Fermer', action: function () { fermerModale(); if (url) URL.revokeObjectURL(url); } },
        { texte: 'Ouvrir dans un onglet', action: function () { if (url) window.open(url, '_blank'); } }]
        .concat(aValider ? [{ texte: 'Valider le dossier', classe: 'btn-vert', action: function (z, b) { fermerModale(); executer('STAG', l.ID, 'valider', {}, null, false, true); } }] : []), 'large');
    JEF.post('admin_action', { data: { type: 'STAG', id: l.ID, op: 'convention' } }, { delai: 60000 }).then(function (r) {
      var octets = atob(r.fichier), tab = new Uint8Array(octets.length);
      for (var i = 0; i < octets.length; i++) tab[i] = octets.charCodeAt(i);
      url = URL.createObjectURL(new Blob([tab], { type: r.type }));
      var z = $('#apercu-doc'); if (!z) return;
      if (/^image\//.test(r.type)) JEF.rendre(z, h`<img src="${url}" alt="Document signé">`);
      else JEF.rendre(z, h`<object data="${url}" type="application/pdf"><p class="indice">L'aperçu n'est pas disponible dans ce navigateur. Utilisez « Ouvrir dans un onglet ».</p></object>`);
    }).catch(function (e) { var z = $('#apercu-doc'); if (z) JEF.rendre(z, h`<p class="indice">${e.message}</p>`); });
  }

  function basculerPresence(type, l, btn) {
    var n = btn.getAttribute('data-n'), on = btn.classList.contains('on');
    if (n === 'tous' && on) {
      confirmer('Retirer la présence', 'La présence de ' + nomComplet(l) + ' sera retirée sur toutes les demi-journées.', 'Retirer', true).then(function (ok) { if (ok) { btn.classList.remove('on'); envoyerPresence(type, l, btn, n, true); } });
      return;
    }
    btn.classList.toggle('on', !on);
    envoyerPresence(type, l, btn, n, on);
  }
  function envoyerPresence(type, l, btn, n, on) {
    JEF.post('admin_action', { data: { type: type, id: l.ID, op: 'presence', creneau: n, retirer: on } }).then(function () {
      JEF.toast((on ? 'Présence retirée' : 'Présence validée') + ' pour ' + nomComplet(l), 'ok');
      charger(true);
    }).catch(function (e) { btn.classList.toggle('on', on); JEF.toast(e.message, 'erreur'); });
  }

  function executer(type, id, op, extra, btn, forcer, dejaConfirme) {
    if (op === 'badge_pdf') { ouvrirBadgePdf(type, id, preparerFenetre('Préparation du badge'), btn); return; }
    var conf = CONFIRMATIONS[op];
    var lancer = function () {
      var retablir = JEF.attente(btn, 'En cours');
      etatSynchro('en-cours', 'Envoi en cours');
      JEF.post('admin_action', { data: Object.assign({ type: type, id: id, op: op, forcer: !!forcer }, extra) }, { delai: 120000 }).then(function () {
        retablir(); JEF.toast(SUCCES[op] || 'Fait', 'ok'); charger(true);
      }).catch(function (e) {
        retablir(); etatSynchro('', 'À jour');
        if (e.code === 'confirmation') confirmer('Convention non reçue', e.message, 'Valider quand même', true).then(function (ok) { if (ok) executer(type, id, op, extra, btn, true); });
        else JEF.toast(e.message, 'erreur');
      });
    };
    if (conf && !forcer && !dejaConfirme) confirmer(conf[0], conf[1] + ' Dossier ' + id + '.', conf[2], conf[3]).then(function (ok) { if (ok) lancer(); });
    else lancer();
  }

  function modifier(type, id, donnees, btn) {
    var retablir = JEF.attente(btn, 'Enregistrement');
    JEF.post('admin_modifier', { data: Object.assign({ type: type, id: id }, donnees) }).then(function (r) {
      retablir(); JEF.toast(r.avertissement || 'Modifications enregistrées', r.avertissement ? '' : 'ok'); charger(true);
    }).catch(function (e) { retablir(); JEF.toast(e.message, 'erreur'); });
  }

  // ----- Exports ---------------------------------------------------------------
  function exporter(kind) {
    if (kind === 'vue') {
      if (!tableCourante) { JEF.toast('Cette page n\'a pas de tableau à exporter.', 'erreur'); return; }
      var cols = tableCourante.cfg.colonnes.filter(function (c) { return c.trier !== false || c.cle === 'presence'; });
      var lignes = [cols.map(function (c) { return c.titre; })].concat(tableCourante.lignes.map(function (l) { return cols.map(function (c) { return c.val(l); }); }));
      JEF.telecharger('JEF_' + vue + '_' + new Date().toISOString().slice(0, 10) + '.csv', csvDepuis(lignes));
      JEF.toast('Tableau exporté', 'ok');
      return;
    }
    etatSynchro('en-cours', 'Préparation de l\'export');
    JEF.post('admin_export', { data: { kind: kind } }).then(function (r) { JEF.telecharger(r.nom, r.csv); JEF.toast('Export téléchargé', 'ok'); etatSynchro('', 'À jour'); })
      .catch(function (e) { etatSynchro('erreur', 'Erreur'); JEF.toast(e.message, 'erreur'); });
  }

  // ----- Fenêtres ----------------------------------------------------------------
  function ouvrirModale(titre, corps, boutons, taille) {
    var m = $('#modale');
    m.className = 'modale ' + (taille || '');
    JEF.rendre(m, h`<header><h3>${titre}</h3></header><form class="corps" id="modale-corps" novalidate>${corps}</form>
      <footer>${boutons.map(function (b, i) { return h`<button type="button" class="btn ${b.classe || ''} ${i === 0 && boutons.length > 1 ? 'gauche' : ''}" data-b="${i}">${b.texte}</button>`; })}</footer>`);
    $('#voile').classList.add('ouvert');
    $$('[data-b]', m).forEach(function (el) {
      el.addEventListener('click', function () { var b = boutons[Number(el.getAttribute('data-b'))]; if (b.action) b.action($('#modale-corps'), el); else fermerModale(); });
    });
    $('#modale-corps').addEventListener('submit', function (e) { e.preventDefault(); });
    var premier = $('input:not([type=checkbox]):not([type=file]), select', m); if (premier) premier.focus();
  }
  function fermerModale() { $('#voile').classList.remove('ouvert'); }
  function confirmer(titre, texte, libelle, danger) {
    return new Promise(function (resoudre) {
      ouvrirModale(titre, h`<p style="margin:0;">${texte}</p>`, [
        { texte: 'Annuler', action: function () { fermerModale(); resoudre(false); } },
        { texte: libelle, classe: danger ? 'btn-danger' : 'btn-primaire', action: function () { fermerModale(); resoudre(true); } }]);
    });
  }

  // ======================================================================
  // Recherche rapide et événements de la barre
  // ======================================================================
  function rechercher(q) {
    var z = $('#resultats');
    q = normal(q).trim();
    if (q.length < 2 || !D) { z.hidden = true; return; }
    var res = [];
    D.stagiaires.forEach(function (l) { if (normal([l.ID, l.Nom, l.Prenom, l.Email, l.Etablissement].join(' ')).indexOf(q) !== -1) res.push({ type: 'STAG', id: l.ID, nom: nomComplet(l), info: 'Stagiaire - ' + (l.Etablissement || '') }); });
    D.badges.forEach(function (b) { if (normal([b.ID, b.Nom, b.Prenom, b.Email, b.Organisme].join(' ')).indexOf(q) !== -1) res.push({ type: 'PRO', id: b.ID, nom: nomComplet(b), info: (PROFILS[b.Profil] || b.Profil) + ' - ' + (b.Organisme || '') }); });
    D.entreprises.forEach(function (e) { if (normal([e.ID, e.Nom, e.Contact, e.Email_Contact].join(' ')).indexOf(q) !== -1) res.push({ type: 'ENT', id: e.ID, nom: e.Nom, info: 'Entreprise partenaire' }); });
    res = res.slice(0, 10);
    JEF.rendre(z, res.length ? res.map(function (r, i) { return h`<button data-r="${i}" class="${i === 0 ? 'actif' : ''}"><b>${r.nom}</b><small>${r.info}</small></button>`; }) : h`<div style="padding:8px;color:var(--texte-2);">Aucun résultat</div>`);
    z.hidden = false;
    z._res = res;
    $$('[data-r]', z).forEach(function (b) { b.addEventListener('click', function () { var r = res[Number(b.getAttribute('data-r'))]; z.hidden = true; $('#recherche').value = ''; ouvrirFiche(r.type, r.id); }); });
  }

  function basculerMenu(bouton, menu) {
    var ouvert = !menu.hidden;
    $$('.deroulant').forEach(function (d) { d.hidden = true; });
    menu.hidden = ouvert;
    bouton.setAttribute('aria-expanded', String(!ouvert));
  }

  $('#recherche').addEventListener('input', function () { rechercher(this.value); });
  $('#recherche').addEventListener('keydown', function (e) {
    var z = $('#resultats');
    if (e.key === 'Escape') { z.hidden = true; this.value = ''; }
    if (e.key === 'Enter' && z._res && z._res[0]) { var r = z._res[0]; z.hidden = true; this.value = ''; ouvrirFiche(r.type, r.id); }
  });
  $('#b-exporter').addEventListener('click', function (e) { e.stopPropagation(); basculerMenu(this, $('#menu-export')); });
  $('#b-compte').addEventListener('click', function (e) { e.stopPropagation(); basculerMenu(this, $('#menu-compte')); });
  $('#menu-export').addEventListener('click', function (e) { var b = e.target.closest('[data-export]'); if (b) { this.hidden = true; exporter(b.getAttribute('data-export')); } });
  $('#menu-compte').addEventListener('click', function (e) {
    var b = e.target.closest('[data-compte]'); if (!b) return;
    this.hidden = true;
    if (b.getAttribute('data-compte') === 'sortir') JEF.deconnexion(); else aller('aide');
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.deroulant-zone')) $$('.deroulant').forEach(function (d) { d.hidden = true; });
    if (!e.target.closest('.recherche')) $('#resultats').hidden = true;
  });
  $('#b-imprimer').addEventListener('click', function () { window.print(); });
  $('#b-sur-place').addEventListener('click', function () { if (D) modaleSurPlace(); });
  $('#b-actualiser').addEventListener('click', function () { journal = null; if (vue === 'reglages' && !reglagesModifies) reglages = null; charger(); });
  $('#menu-ouvrir').addEventListener('click', function () { $('#menu').classList.add('ouvert'); });
  $('#menu-fermer').addEventListener('click', function () { $('#menu').classList.remove('ouvert'); });
  $('#voile').addEventListener('click', function (e) { if (e.target === this) fermerModale(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if ($('#voile').classList.contains('ouvert')) fermerModale(); else if (fiche) fermerFiche(); }
    if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); $('#recherche').focus(); }
  });
  window.addEventListener('beforeunload', function (e) { if (reglagesModifies) { e.preventDefault(); e.returnValue = ''; } });

  demarrer();
})();
