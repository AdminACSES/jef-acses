/* Écran de projection : ce que la régie décide de montrer (accueil, animation, questions, écran noir).
   Aucune consigne affichée : la salle découvre, l'animateur explique (souffleur dans la régie).
   Sur le même ordinateur que la régie, les changements arrivent aussitôt (canal local du navigateur),
   et le dernier état reste affiché si le réseau tombe. */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$;
  var k = JEF.parametre('k'), derniere = '', echecs = 0, dernierLocal = 0;
  var COULEURS = ['#EB7E0C', '#2575B3', '#0E9F6E', '#7C3AED', '#DB2777', '#0E7490', '#B45309', '#15528F'];
  var canal = null;
  try { canal = new BroadcastChannel('jef-ecran'); } catch (e) { canal = null; }

  function etoiles(n) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= Math.round(n) ? '★' : '☆'; return s; }

  function nuage(mots) {
    if (!mots.length) return h`<div class="ec-attente-point"><i></i><i></i><i></i></div>`;
    var max = mots[0][1], ordre = [];
    mots.forEach(function (m, i) { if (i % 2) ordre.push(m); else ordre.unshift(m); });
    return h`<div class="ec-nuage">${ordre.map(function (m, i) {
      var emoji = /\p{Extended_Pictographic}/u.test(m[0]) && m[0].length <= 4;
      var t = (emoji ? 2.4 : 1.2) + (m[1] / max) * (emoji ? 4.6 : 4.2);
      return h`<span class="${emoji ? 'emoji' : ''}" style="font-size:${t.toFixed(2)}vw;color:${COULEURS[(m[0].length + i) % COULEURS.length]};">${m[0]}</span>`;
    })}</div>`;
  }

  function animation(i) {
    var corps = '';
    if (i.type === 'nuage') corps = nuage(i.mots || []);
    else if (i.type === 'sondage' || i.type === 'quiz') {
      corps = h`<div class="ec-sondage">${i.comptes.map(function (c, j) {
        var pct = i.n ? Math.round(c[1] / i.n * 100) : 0, bonne = i.revele && c[0] === i.bonne, faux = i.revele && !bonne;
        return h`<div class="ec-ligne ${bonne ? 'bonne' : ''} ${faux ? 'faux' : ''}"><span class="ec-lib">${bonne ? '✓ ' : ''}${c[0]}</span><div class="ec-barre"><i style="width:${pct}%;background:${bonne ? '#22C55E' : COULEURS[j % COULEURS.length]};"></i></div><b>${pct} %</b></div>`;
      })}</div>`;
    } else if (i.type === 'etoiles') {
      var max5 = Math.max.apply(null, (i.repartition || []).concat([1]));
      corps = h`<div class="ec-note"><div class="ec-score"><div class="ec-moyenne">${i.moyenne === null ? '-' : String(i.moyenne).replace('.', ',')}</div><div class="ec-etoiles">${i.moyenne === null ? '☆☆☆☆☆' : etoiles(i.moyenne)}</div></div>
        <div class="ec-histo ec-histo5">${(i.repartition || []).map(function (n, j) { return h`<div><b>${i.n ? Math.round(n / i.n * 100) : 0} %</b><i style="height:${Math.round(n / max5 * 100)}%;"></i><small>${j + 1}</small></div>`; })}</div></div>`;
    } else if (i.type === 'note') {
      var max = Math.max.apply(null, (i.repartition || []).concat([1]));
      corps = h`<div class="ec-note"><div class="ec-score"><div class="ec-moyenne">${i.moyenne === null ? '-' : String(i.moyenne).replace('.', ',')}<small>/ 10</small></div></div>
        <div class="ec-histo">${(i.repartition || []).map(function (n, j) { return h`<div><i style="height:${Math.round(n / max * 100)}%;background:${j >= 8 ? '#0E9F6E' : j >= 5 ? '#2575B3' : '#EB7E0C'};"></i><small>${j}</small></div>`; })}</div></div>`;
    } else if (i.type === 'questions') {
      corps = h`<div class="ec-questions">${(i.questions || []).map(function (q) { return h`<div class="ec-q ${q.repondue ? 'repondue' : ''}"><b>${q.votes}</b><span>${q.texte}</span></div>`; })}</div>`;
    } else if (i.type === 'questionnaire') {
      var pct = i.attendus ? Math.min(100, Math.round(i.n / i.attendus * 100)) : 0;
      return h`<div class="ec-quest"><div class="ec-badge">📱</div><h2>${i.titreQuestionnaire}</h2><div class="ec-compteur"><b>${i.n}</b><span>/ ${i.attendus}</span></div><div class="ec-jauge"><i style="width:${pct}%;"></i></div></div>`;
    }
    return h`<div class="ec-question">${i.question}</div>${i.n ? h`<div class="ec-compte"><span>${i.n}</span></div>` : h`<div class="ec-compte vide"></div>`}${corps}`;
  }

  function questions(q) {
    if (!q) return accueil({});
    var une = q.une;
    return h`<div class="ec-qa ${une ? 'avec-une' : ''}"><div class="ec-qa-titre">${q.titre}</div>
      ${une ? h`<div class="ec-une"><div class="ec-une-texte">${une.texte}</div><div class="ec-une-auteur">${une.auteur}${une.organisme ? ' - ' + une.organisme : ''}<span>👍 ${une.votes}</span></div></div>` : ''}
      <div class="ec-qa-liste">${(q.liste || []).filter(function (x) { return !une || x.id !== une.id; }).slice(0, une ? 3 : 6).map(function (x) {
        return h`<div class="ec-q"><b>${x.votes}</b><span>${x.texte}</span></div>`; })}</div></div>`;
  }

  function accueil(r) {
    return h`<div class="ec-accueil"><img src="logo-acses.png" alt=""><h1>${r.edition || 'Journées d\'études et de formation'}</h1><p>${[r.dates, r.ville].filter(Boolean).join(' - ')}</p></div>`;
  }

  function rendre(r, source) {
    if (source === 'local') dernierLocal = Date.now();
    try { localStorage.setItem('jef_ecran_dernier', JSON.stringify(r)); } catch (e) { /* rien */ }
    $('#ec-edition').textContent = r.edition || '';
    var cle = JSON.stringify([r.mode, r.impulsion, r.questions]);
    if (cle === derniere) return;
    derniere = cle;
    document.body.className = 'mode-' + (r.mode || 'auto') + (r.impulsion ? ' type-' + r.impulsion.type : '');
    var z = $('#ec-corps'), contenu;
    if (r.mode === 'noir') contenu = '';
    else if (r.mode === 'questions') contenu = questions(r.questions);
    else if (r.mode === 'accueil' || !r.impulsion) contenu = accueil(r);
    else contenu = animation(r.impulsion);
    z.classList.remove('entree'); void z.offsetWidth; z.classList.add('entree');
    JEF.rendre(z, contenu);
  }

  // La régie du même ordinateur envoie ses données : affichage immédiat, même sans réseau.
  if (canal) canal.onmessage = function (e) { if (e.data && e.data.k === k && e.data.r) rendre(e.data.r, 'local'); };

  function tic() {
    // Si la régie locale vient d'envoyer, inutile d'interroger le serveur.
    if (Date.now() - dernierLocal < 4000) { setTimeout(tic, 2000); return; }
    JEF.post('ecran_lire', { data: { k: k } }, { essais: 0, delai: 12000 }).then(function (r) {
      echecs = 0; $('#ec-etat').textContent = ''; rendre(r);
    }).catch(function (e) {
      echecs++;
      if (e.code === 'lien') { JEF.rendre('#ec-corps', h`<div class="ec-vide">${e.message}</div>`); return; }
      if (echecs > 3) $('#ec-etat').textContent = '•';
    }).finally(function () { setTimeout(tic, echecs ? Math.min(10000, 2000 + echecs * 1000) : 2000); });
  }

  $('#ec-plein').addEventListener('click', function () { try { document.documentElement.requestFullscreen(); } catch (e) { /* refus */ } });
  document.addEventListener('fullscreenchange', function () { $('#ec-plein').hidden = !!document.fullscreenElement; });
  if (!k) { JEF.rendre('#ec-corps', h`<div class="ec-vide">Ouvrez cet écran depuis la régie.</div>`); return; }
  try { var d = JSON.parse(localStorage.getItem('jef_ecran_dernier') || 'null'); if (d) rendre(d); } catch (e) { /* rien */ }
  tic();
})();
