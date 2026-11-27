/* Écran de projection : affiche en direct l'animation lancée depuis le cockpit (lien signé, sans connexion). */
(function () {
  'use strict';
  var h = JEF.h, $ = JEF.$;
  var k = JEF.parametre('k'), derniere = '', echecs = 0;
  var COULEURS = ['#15528F', '#EB7E0C', '#1E7B45', '#6D28D9', '#0E7490', '#BE185D', '#B25E00', '#2575B3'];

  function nuage(mots) {
    if (!mots.length) return h`<div class="ec-vide">Les mots apparaissent ici dès les premières réponses</div>`;
    var max = mots[0][1];
    // Le plus fréquent au centre, les autres autour.
    var ordre = [];
    mots.forEach(function (m, i) { if (i % 2) ordre.push(m); else ordre.unshift(m); });
    return h`<div class="ec-nuage">${ordre.map(function (m, i) {
      var t = 1.1 + (m[1] / max) * 4.2;
      return h`<span style="font-size:${t.toFixed(2)}vw;color:${COULEURS[(m[0].length + i) % COULEURS.length]};transform:rotate(${(i % 5 === 3) ? -6 : (i % 7 === 2 ? 5 : 0)}deg);">${m[0]}</span>`;
    })}</div>`;
  }

  function rendre(r) {
    var i = r.impulsion;
    $('#ec-edition').textContent = r.edition || '';
    var cle = JSON.stringify(i);
    if (cle === derniere) return;
    derniere = cle;
    var z = $('#ec-corps');
    if (!i) { JEF.rendre(z, h`<div class="ec-accueil"><img src="logo-acses.png" alt=""><h1>${r.edition}</h1><p>${r.dates}</p></div>`); return; }
    var corps;
    if (i.type === 'nuage') corps = nuage(i.mots || []);
    else if (i.type === 'sondage') corps = h`<div class="ec-sondage">${i.comptes.map(function (c, j) { var pct = i.n ? Math.round(c[1] / i.n * 100) : 0;
      return h`<div class="ec-ligne"><span class="ec-lib">${c[0]}</span><div class="ec-barre"><i style="width:${pct}%;background:${COULEURS[j % COULEURS.length]};"></i></div><b>${pct} %</b></div>`; })}</div>`;
    else if (i.type === 'note') { var max = Math.max.apply(null, (i.repartition || []).concat([1]));
      corps = h`<div class="ec-note"><div class="ec-moyenne">${i.moyenne === null ? '-' : String(i.moyenne).replace('.', ',')}<small>/ 10</small></div>
        <div class="ec-histo">${(i.repartition || []).map(function (n, j) { return h`<div><i style="height:${Math.round(n / max * 100)}%;background:${j >= 8 ? '#1E7B45' : j >= 5 ? '#2575B3' : '#EB7E0C'};"></i><small>${j}</small></div>`; })}</div></div>`; }
    else if (i.type === 'questions') corps = h`<div class="ec-questions">${(i.questions || []).length ? i.questions.map(function (q) { return h`<div class="ec-q ${q.repondue ? 'repondue' : ''}"><b>👍 ${q.votes}</b><span>${q.texte}</span></div>`; }) : h`<div class="ec-vide">Posez vos questions depuis votre téléphone</div>`}</div>`;
    else if (i.type === 'questionnaire') { var pct = i.attendus ? Math.min(100, Math.round(i.n / i.attendus * 100)) : 0;
      corps = h`<div class="ec-quest"><div class="ec-badge">🪪</div><h2>Sortez votre badge</h2><p>Retournez-le et scannez le QR code <b>« Mon espace participant »</b> avec l'appareil photo de votre téléphone, puis touchez <b>« Répondre maintenant »</b>.</p>
        <div class="ec-compteur"><b>${i.n}</b><span>réponse${i.n > 1 ? 's' : ''} sur ${i.attendus}</span></div><div class="ec-jauge"><i style="width:${pct}%;"></i></div></div>`; }
    JEF.rendre(z, h`<div class="ec-question">${i.type === 'questionnaire' ? i.titreQuestionnaire : i.question}</div>${i.type !== 'questionnaire' ? h`<div class="ec-compte">${i.n} participant${i.n > 1 ? 's' : ''}</div>` : ''}${corps}`);
  }

  function tic() {
    JEF.post('ecran_lire', { data: { k: k } }, { essais: 0, delai: 12000 }).then(function (r) {
      echecs = 0; $('#ec-etat').textContent = ''; rendre(r);
    }).catch(function (e) {
      echecs++;
      if (e.code === 'lien') { JEF.rendre('#ec-corps', h`<div class="ec-vide">${e.message}</div>`); return; }
      if (echecs > 2) $('#ec-etat').textContent = 'Connexion instable';
    }).finally(function () { if (echecs < 50) setTimeout(tic, echecs ? 4000 : 2000); });
  }

  $('#ec-plein').addEventListener('click', function () { try { document.documentElement.requestFullscreen(); } catch (e) { /* refus */ } });
  document.addEventListener('fullscreenchange', function () { $('#ec-plein').hidden = !!document.fullscreenElement; });
  if (!k) { JEF.rendre('#ec-corps', h`<div class="ec-vide">Ouvrez cet écran depuis le cockpit, page Animation en direct.</div>`); return; }
  tic();
})();
