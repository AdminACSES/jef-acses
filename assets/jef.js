/* ==========================================================================
   JEF ACSES - Bibliothèque commune du site (aucune dépendance)
   - Appels à l'API Apps Script avec délai maximal et messages clairs
   - Gabarits HTML échappés automatiquement : h`<b>${valeur}</b>`
   - Connexion Google pour le cockpit et le scanner
   ========================================================================== */
(function () {
  'use strict';
  var CONF = window.JEF_CONFIG || {};
  var JEF = window.JEF = {};

  // ----- Sélecteurs et échappement -----------------------------------------
  JEF.$ = function (s, racine) { return (racine || document).querySelector(s); };
  JEF.$$ = function (s, racine) { return Array.prototype.slice.call((racine || document).querySelectorAll(s)); };

  var ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  JEF.esc = function (v) { return String(v === undefined || v === null ? '' : v).replace(/[&<>"'`]/g, function (c) { return ENT[c]; }); };

  /** Marque un fragment HTML comme sûr (produit par le code, jamais par une saisie). */
  JEF.brut = function (html) { return { __brut: String(html) }; };

  /** Gabarit étiqueté : toutes les valeurs interpolées sont échappées, sauf JEF.brut() et les tableaux de fragments. */
  JEF.h = function (morceaux) {
    var vals = Array.prototype.slice.call(arguments, 1);
    var sortie = '';
    for (var i = 0; i < morceaux.length; i++) {
      sortie += morceaux[i];
      if (i < vals.length) sortie += JEF._val(vals[i]);
    }
    return JEF.brut(sortie);
  };
  JEF._val = function (v) {
    if (v && v.__brut !== undefined) return v.__brut;
    if (Array.isArray(v)) return v.map(JEF._val).join('');
    return JEF.esc(v);
  };
  /** Insère un fragment produit par JEF.h dans un élément. */
  JEF.rendre = function (el, fragment) { (typeof el === 'string' ? JEF.$(el) : el).innerHTML = JEF._val(fragment); };

  // ----- Formats -------------------------------------------------------------
  JEF.euros = function (n) {
    var x = Number(n) || 0;
    return x.toLocaleString('fr-FR', { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  };
  JEF.date = function (iso, avecHeure) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    var o = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (avecHeure) { o.hour = '2-digit'; o.minute = '2-digit'; }
    return d.toLocaleString('fr-FR', o);
  };
  JEF.heure = function (iso) { var d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
  JEF.oui = function (v) { return v === true || /^(oui|true|1|x)$/i.test(String(v || '')); };

  // ----- API -----------------------------------------------------------------
  function attendre(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function appel(url, options, delaiMs) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var minuteur = ctrl ? setTimeout(function () { ctrl.abort(); }, delaiMs) : null;
    if (ctrl) options.signal = ctrl.signal;
    options.redirect = 'follow';
    options.credentials = 'omit';
    return fetch(url, options).then(function (rep) {
      if (!rep.ok) throw new Error('Le serveur a répondu ' + rep.status + '.');
      return rep.json();
    }).catch(function (e) {
      if (e && e.name === 'AbortError') throw new Error('Le serveur met trop de temps à répondre. Vérifiez votre connexion et réessayez.');
      if (e instanceof TypeError) { var err = new Error('Connexion impossible avec le serveur. Vérifiez votre connexion internet.'); err.reseau = true; throw err; }
      throw e;
    }).finally(function () { if (minuteur) clearTimeout(minuteur); });
  }

  JEF.get = function (action) {
    if (!CONF.API_URL) return Promise.reject(new Error('API_URL non configurée dans assets/config.js'));
    return appel(CONF.API_URL + '?action=' + encodeURIComponent(action), { method: 'GET' }, 30000);
  };

  /** POST JSON en text/plain (pas de pré-vérification CORS, compatible Apps Script). */
  JEF.post = function (action, contenu, opts) {
    opts = opts || {};
    if (!CONF.API_URL) return Promise.reject(new Error('API_URL non configurée dans assets/config.js'));
    var corps = Object.assign({ action: action }, contenu || {});
    var s = JEF.session();
    if (s && !corps.token) corps.token = s.token;
    return appel(CONF.API_URL, { method: 'POST', body: JSON.stringify(corps) }, opts.delai || 90000).then(function (rep) {
      if (rep && rep.code === 'session') { JEF.oublierSession(); if (JEF.onSessionExpiree) JEF.onSessionExpiree(); }
      if (!rep || rep.succes === false) {
        var e = new Error((rep && rep.message) || 'Erreur inconnue.');
        e.code = rep && rep.code;
        throw e;
      }
      return rep;
    });
  };

  /** Configuration publique de l'édition, gardée 2 minutes dans l'onglet. */
  JEF.config = function () {
    try {
      var c = JSON.parse(sessionStorage.getItem('jef_config') || 'null');
      if (c && Date.now() - c.t < 120000) return Promise.resolve(c.v);
    } catch (e) { /* stockage indisponible */ }
    return JEF.get('config').then(function (v) {
      try { sessionStorage.setItem('jef_config', JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* rien */ }
      return v;
    });
  };

  // ----- Interface -----------------------------------------------------------
  JEF.toast = function (message, type) {
    var zone = JEF.$('#toasts');
    if (!zone) { zone = document.createElement('div'); zone.id = 'toasts'; zone.setAttribute('role', 'status'); zone.setAttribute('aria-live', 'polite'); document.body.appendChild(zone); }
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = message;
    zone.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 320); }, type === 'erreur' ? 7000 : 4200);
  };

  /** Met un bouton en attente ; retourne une fonction qui le rétablit. */
  JEF.attente = function (btn, texte) {
    if (!btn) return function () {};
    var avant = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="rotation" aria-hidden="true"></span> ' + JEF.esc(texte || 'Patientez...');
    return function () { btn.disabled = false; btn.innerHTML = avant; };
  };

  JEF.copier = function (texte) {
    if (navigator.clipboard) return navigator.clipboard.writeText(texte).then(function () { JEF.toast('Copié dans le presse-papiers', 'ok'); });
    var t = document.createElement('textarea'); t.value = texte; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); JEF.toast('Copié dans le presse-papiers', 'ok'); } finally { t.remove(); }
    return Promise.resolve();
  };

  JEF.telecharger = function (nom, contenu, type) {
    var url = URL.createObjectURL(new Blob([contenu], { type: type || 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };

  /** Lit les champs nommés d'un formulaire. Cases à cocher -> booléen. */
  JEF.lireFormulaire = function (form) {
    var o = {};
    JEF.$$('input[name], select[name], textarea[name]', form).forEach(function (el) {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; else if (!(el.name in o)) o[el.name] = ''; }
      else o[el.name] = el.value.trim();
    });
    return o;
  };

  /** Ajoute le champ piège invisible (les robots le remplissent, pas les humains). */
  JEF.piege = function (form) {
    var d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    d.innerHTML = '<label>Site web <input type="text" name="site_web" tabindex="-1" autocomplete="off"></label>';
    form.appendChild(d);
  };

  /** Vérifie les champs requis visibles d'un conteneur, marque les erreurs, retourne true si tout est bon. */
  JEF.valider = function (conteneur) {
    var premier = null;
    JEF.$$('.erreur-champ', conteneur).forEach(function (e) { e.remove(); });
    JEF.$$('input, select, textarea', conteneur).forEach(function (el) {
      if (el.closest('[hidden]') || el.type === 'hidden') return;
      el.removeAttribute('aria-invalid');
      var ok = el.checkValidity();
      if (el.required && el.type === 'radio') {
        ok = JEF.$$('input[name="' + el.name + '"]', conteneur).some(function (r) { return r.checked; });
      }
      if (!ok) {
        el.setAttribute('aria-invalid', 'true');
        var bloc = el.closest('.champ') || el.closest('fieldset') || el.parentNode;
        if (bloc && !JEF.$('.erreur-champ', bloc)) {
          var m = document.createElement('div');
          m.className = 'erreur-champ';
          m.textContent = el.type === 'email' && el.value ? 'Adresse email invalide.' : (el.type === 'checkbox' ? 'Cette case est obligatoire.' : 'Champ obligatoire.');
          bloc.appendChild(m);
        }
        if (!premier) premier = el;
      }
    });
    if (premier) { premier.focus({ preventScroll: true }); premier.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return !premier;
  };

  JEF.parametre = function (nom) { return new URLSearchParams(location.search).get(nom) || ''; };

  /** Affiche le bandeau de mode test et remplit les éléments data-cfg="cle". */
  JEF.habiller = function (cfg) {
    if (cfg && cfg.ouverture && cfg.ouverture.test && !JEF.$('.bandeau-test')) {
      var b = document.createElement('div');
      b.className = 'bandeau-test';
      b.textContent = 'MODE TEST : les emails sont redirigés vers l\'équipe ACSES, rien n\'est envoyé aux participants.';
      document.body.insertBefore(b, document.body.firstChild);
    }
    JEF.$$('[data-cfg]').forEach(function (el) {
      var cle = el.getAttribute('data-cfg').split('.');
      var v = cfg;
      cle.forEach(function (k) { v = v ? v[k] : ''; });
      if (v !== undefined && v !== null && v !== '') el.textContent = v;
    });
  };

  // ----- Session Google (cockpit et scanner) --------------------------------
  JEF.session = function () {
    try {
      var s = JSON.parse(sessionStorage.getItem('jef_session') || 'null');
      if (s && s.expire > Date.now()) return s;
    } catch (e) { /* rien */ }
    return null;
  };
  JEF.oublierSession = function () { try { sessionStorage.removeItem('jef_session'); } catch (e) { /* rien */ } };

  /**
   * Affiche le bouton « Se connecter avec Google » dans #bouton-google.
   * Le jeton Google est vérifié par le serveur, qui contrôle le domaine et la liste des comptes autorisés.
   */
  JEF.connexionGoogle = function (clientId, quandConnecte, zoneMessage) {
    function message(t) { if (zoneMessage) zoneMessage.textContent = t || ''; }
    if (!clientId) { message('Connexion Google non configurée : renseigner Google_Client_ID dans PARAMETRES.'); return; }
    function initialiser() {
      if (!window.google || !google.accounts || !google.accounts.id) { setTimeout(initialiser, 150); return; }
      google.accounts.id.initialize({
        client_id: clientId, ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true, hd: 'acses-asso.com',
        callback: function (rep) {
          message('Vérification du compte...');
          JEF.post('connexion', { credential: rep.credential }, { delai: 30000 }).then(function (s) {
            try { sessionStorage.setItem('jef_session', JSON.stringify(s)); } catch (e) { /* rien */ }
            message('');
            quandConnecte(s);
          }).catch(function (e) { message(e.message); });
        }
      });
      google.accounts.id.renderButton(JEF.$('#bouton-google'), { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', locale: 'fr', width: 280 });
    }
    initialiser();
  };

  JEF.deconnexion = function () {
    var s = JEF.session();
    JEF.oublierSession();
    if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
    if (s) return JEF.post('deconnexion', { token: s.token }).catch(function () {}).then(function () { location.reload(); });
    location.reload();
  };
})();
