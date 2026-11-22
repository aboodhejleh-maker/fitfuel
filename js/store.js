/* FitFuel – נתוני המשתמש. המקור הוא השרת (Flask + Supabase); כאן נשמר עותק בזיכרון
   כדי שהמסכים יקראו ממנו באופן סינכרוני. כל שינוי מתעדכן מיד בעותק ונשלח לשרת ברקע. */
var Store = (function () {
  var s;

  function clear() { s = { user: null, profile: null, goals: null, log: {}, favorites: [] }; }
  clear();

  function api(method, url, body) {
    var opts = { method: method, credentials: 'same-origin' };
    if (body) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body); }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || 'שגיאת שרת'); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  // טוען את מצב המשתמש המחובר (ואת מאגר הארוחות והמזונות). ללא התחברות: user נשאר null.
  function init() {
    return api('GET', '/api/state').then(function (j) {
      s = { user: j.email, profile: j.profile, goals: j.goals, log: j.log || {}, favorites: j.favorites || [] };
      MEALS = j.meals; FOODS = j.foods;
    }, function (e) {
      if (e.status !== 401) throw e;
      clear();
    });
  }

  // שמירה ברקע. אם נכשלה, מודיעים וטוענים מחדש מהשרת כדי שהמסך לא יציג נתון שלא נשמר.
  function push(method, url, body) {
    api(method, url, body).catch(function (e) {
      App.toast('השמירה נכשלה: ' + e.message, true);
      init().then(App.render, function () {});
    });
  }

  return {
    get user() { return s.user; },
    get profile() { return s.profile; },
    get goals() { return s.goals; },
    get favorites() { return s.favorites; },
    get log() { return s.log; },

    init: init,
    login: function (email, password) {
      return api('POST', '/api/auth/login', { email: email, password: password }).then(init);
    },
    register: function (email, password) {
      return api('POST', '/api/auth/register', { email: email, password: password }).then(init);
    },
    logout: function () { return api('POST', '/api/auth/logout').then(clear); },

    setProfile: function (p) { s.profile = p; push('PUT', '/api/profile', { profile: p }); },
    setGoals: function (g) { s.goals = g; push('PUT', '/api/profile', { goals: g }); },

    entries: function (dateKey) { return s.log[dateKey] || []; },
    addEntry: function (dateKey, entry) {
      // עותק חדש עם מזהה חדש, גם כשמתעדים שוב ארוחה מהיומן
      entry = Object.assign({}, entry, {
        id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
      });
      if (!s.log[dateKey]) s.log[dateKey] = [];
      s.log[dateKey].push(entry);
      push('POST', '/api/log', { date: dateKey, entry: entry });
      return entry;
    },
    removeEntry: function (dateKey, id) {
      var list = s.log[dateKey];
      if (!list) return;
      s.log[dateKey] = list.filter(function (e) { return e.id !== id; });
      if (!s.log[dateKey].length) delete s.log[dateKey];
      push('DELETE', '/api/log/' + encodeURIComponent(id));
    },

    isFavorite: function (mealId) { return s.favorites.indexOf(mealId) !== -1; },
    toggleFavorite: function (mealId) {
      var i = s.favorites.indexOf(mealId);
      if (i === -1) s.favorites.push(mealId); else s.favorites.splice(i, 1);
      push('PUT', '/api/favorites/' + encodeURIComponent(mealId), { on: i === -1 });
      return i === -1;
    },

    // מוחק פרופיל, יעדים ויומן מהחשבון (החשבון עצמו נשאר)
    reset: function () {
      s.profile = null; s.goals = null; s.log = {}; s.favorites = [];
      push('DELETE', '/api/account/data');
    }
  };
})();
