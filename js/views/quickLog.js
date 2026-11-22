/* מסך תיעוד מהיר: מועדפים ואחרונים, מזונות וכמויות, או הזנה ידנית. */
(function () {
  var st;
  var TABS = [['recent', 'מועדפים ואחרונים', 'favorite'], ['foods', 'מזונות וכמויות', 'scale'], ['manual', 'הזנה ידנית', 'tune']];

  function reset() {
    st = {
      type: Nutrition.defaultType(), tab: 'recent', picked: null, q: '',
      items: [], foodsName: '', manual: { name: '', kcal: '', protein: '', carbs: '', fat: '' }, cost: ''
    };
  }

  // רשימת בחירה מהירה: ארוחות מועדפות + ארוחות אחרונות מהיומן (ללא כפילויות)
  function quickList() {
    var out = [], seen = {};
    Store.favorites.forEach(function (id) {
      var m = MEALS.filter(function (x) { return x.id === id; })[0];
      if (m && !seen[m.name]) { seen[m.name] = true; out.push({ fav: true, e: Nutrition.entryFromMeal(m) }); }
    });
    var days = Object.keys(Store.log).sort().reverse();
    for (var i = 0; i < days.length && out.length < 10; i++) {
      var list = Store.log[days[i]];
      for (var j = list.length - 1; j >= 0 && out.length < 10; j--) {
        if (!seen[list[j].name]) { seen[list[j].name] = true; out.push({ fav: false, e: list[j] }); }
      }
    }
    return out;
  }

  function fallbackList() {
    return MEALS.filter(function (m) { return m.goals.indexOf(Store.profile.goal) !== -1; })
      .slice(0, 4).map(function (m) { return { fav: false, e: Nutrition.entryFromMeal(m) }; });
  }

  function foodTotals() {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    st.items.forEach(function (it) {
      var fd = FOODS[it.i], k = (parseFloat(it.grams) || 0) / 100;
      t.kcal += fd.kcal * k; t.protein += fd.p * k; t.carbs += fd.c * k; t.fat += fd.f * k;
    });
    return t;
  }

  // הטיוטה הנוכחית לפי הלשונית הפעילה, או null אם אין מה לשמור
  function draft() {
    var d = null;
    if (st.tab === 'recent' && st.picked) {
      var e = st.picked;
      d = { name: e.name, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat, mealId: e.mealId || null, source: e.mealId ? 'meal' : 'recent' };
    } else if (st.tab === 'foods' && st.items.length) {
      var t = foodTotals();
      if (t.kcal > 0) {
        var auto = st.items.map(function (it) { return FOODS[it.i].n; }).join(', ');
        d = { name: st.foodsName.trim() || auto, kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat, source: 'foods' };
      }
    } else if (st.tab === 'manual') {
      var m = st.manual;
      var p = parseFloat(m.protein) || 0, c = parseFloat(m.carbs) || 0, f = parseFloat(m.fat) || 0;
      var kcal = parseFloat(m.kcal) || (p * 4 + c * 4 + f * 9);
      if (kcal > 0) d = { name: m.name.trim() || 'ארוחה (הזנה ידנית)', kcal: kcal, protein: p, carbs: c, fat: f, source: 'manual' };
    }
    if (!d) return null;
    ['kcal', 'protein', 'carbs', 'fat'].forEach(function (k) { d[k] = Math.max(0, Math.round(d[k])); });
    var cost = parseFloat(st.cost);
    d.cost = cost > 0 ? Math.round(cost * 10) / 10 : null;
    return d;
  }

  /* ---------- חלקי תצוגה ---------- */

  function quickRow(x, idx, selected) {
    var e = x.e;
    return '<button type="button" data-pick="' + idx + '" class="w-full text-right rounded-xl p-3 flex items-center justify-between gap-2 border transition-all min-h-[60px] ' +
      (selected ? 'bg-primary/15 border-primary' : 'bg-surface-container border-white/5') + '">' +
      '<div class="flex flex-col min-w-0"><span class="font-label-badge text-body-md text-on-surface font-bold truncate">' +
        (x.fav ? UI.icon('favorite', 'text-sm text-secondary align-middle ml-1', true) : '') + UI.esc(e.name) + '</span>' +
        '<span class="font-label-macro text-label-macro text-on-surface-variant font-normal"><span class="text-secondary">' + UI.g(e.protein) + ' חלבון</span> · ' + UI.num(e.kcal) + ' קק״ל</span></div>' +
      '<div class="flex items-center gap-2 flex-shrink-0">' +
        (e.cost ? '<span class="bg-primary-container/20 text-primary font-label-macro text-label-macro px-2 py-0.5 rounded-full">' + UI.nis(e.cost) + '</span>' : '') +
        UI.icon(selected ? 'check_circle' : 'add_circle', 'text-2xl ' + (selected ? 'text-primary' : 'text-on-surface-variant'), selected) +
      '</div></button>';
  }

  var currentList = [];

  function recentHtml() {
    var list = quickList(), empty = !list.length;
    if (empty) list = fallbackList();
    currentList = list;
    return '<span class="font-label-badge text-label-badge text-on-surface-variant">' +
        (empty ? 'עדיין אין ארוחות קודמות. הנה כמה הצעות מהמאגר:' : 'בחירה בלחיצה אחת') + '</span>' +
      list.map(function (x, i) { return quickRow(x, i, !!st.picked && st.picked.name === x.e.name); }).join('') +
      '<a href="#/meals" class="text-primary font-label-badge text-label-badge min-h-[44px] flex items-center justify-center gap-1">' + UI.icon('restaurant_menu', 'text-lg') + 'לכל מאגר הארוחות</a>';
  }

  function foodResultsHtml() {
    var q = st.q.trim(), res = [];
    FOODS.forEach(function (fd, i) { if (!q || fd.n.indexOf(q) !== -1) res.push(i); });
    res = res.slice(0, q ? 8 : 5);
    if (!res.length) return '<span class="text-on-surface-variant py-2">לא נמצא מזון בשם הזה. אפשר להשתמש בהזנה ידנית.</span>';
    return res.map(function (i) {
      var fd = FOODS[i];
      return '<button type="button" data-food="' + i + '" class="w-full text-right rounded-lg bg-surface-container px-3 min-h-[48px] flex items-center justify-between gap-2 active:bg-surface-container-high">' +
        '<span class="text-on-surface">' + UI.esc(fd.n) + '</span>' +
        '<span class="flex items-center gap-2 font-label-macro text-label-macro text-on-surface-variant font-normal flex-shrink-0">' + UI.num(fd.kcal) + ' קק״ל · ' + UI.g(fd.p) + ' חלבון ל-100 גרם' + UI.icon('add', 'text-lg text-primary') + '</span></button>';
    }).join('');
  }

  function foodItemsHtml() {
    if (!st.items.length) return '';
    return '<span class="font-label-badge text-label-badge text-on-surface-variant mt-1">מה אכלתי (כמות בגרמים)</span>' +
      st.items.map(function (it, idx) {
        var fd = FOODS[it.i];
        return '<div class="rounded-xl bg-surface-container-high p-2.5 flex items-center gap-2">' +
          '<span class="flex-1 min-w-0 text-on-surface truncate">' + UI.esc(fd.n) + '</span>' +
          (fd.unit ? '<button type="button" data-unit="' + idx + '" class="flex-shrink-0 bg-surface-container-highest text-primary rounded-full px-2.5 min-h-[40px] font-label-macro text-label-macro">+ ' + UI.esc(fd.unit.l) + '</button>' : '') +
          '<input type="number" inputmode="decimal" dir="ltr" data-grams="' + idx + '" value="' + UI.esc(it.grams) + '" min="0" max="3000" aria-label="כמות בגרמים: ' + UI.esc(fd.n) + '" class="w-20 flex-shrink-0 bg-surface-container-lowest text-on-surface rounded-lg px-2 py-2.5 text-center outline-none border border-white/5 focus:border-primary/70"/>' +
          '<span class="font-label-macro text-label-macro text-on-surface-variant flex-shrink-0">גרם</span>' +
          '<button type="button" data-rm="' + idx + '" aria-label="הסרת ' + UI.esc(fd.n) + '" class="w-9 h-10 flex-shrink-0 flex items-center justify-center text-on-surface-variant">' + UI.icon('close', 'text-lg') + '</button>' +
        '</div>';
      }).join('') +
      UI.field('שם הארוחה (לא חובה)', '<input type="text" id="foods-name" maxlength="60" class="' + UI.INPUT + '" value="' + UI.esc(st.foodsName) + '" placeholder="למשל: ארוחת צהריים בקמפוס"/>');
  }

  function foodsHtml() {
    return '<div class="relative"><span class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">' + UI.icon('search', 'text-xl') + '</span>' +
        '<input id="food-q" type="search" class="' + UI.INPUT + ' pr-10" placeholder="חיפוש מזון: עוף, אורז, ביצה..." value="' + UI.esc(st.q) + '" aria-label="חיפוש מזון"/></div>' +
      '<div id="food-results" class="flex flex-col gap-1.5">' + foodResultsHtml() + '</div>' +
      '<div id="food-items" class="flex flex-col gap-2">' + foodItemsHtml() + '</div>';
  }

  function manualHtml() {
    var m = st.manual;
    function inp(k, ph, attrs) { return UI.numInput('m-' + k, m[k], 'data-m="' + k + '" min="0" placeholder="' + ph + '" ' + (attrs || '')); }
    return UI.field('שם הארוחה (לא חובה)', '<input type="text" data-m="name" maxlength="60" class="' + UI.INPUT + '" value="' + UI.esc(m.name) + '" placeholder="למשל: פלאפל בקפטריה"/>') +
      '<div class="grid grid-cols-2 gap-2">' +
        UI.field('קלוריות', inp('kcal', '550', 'max="5000"')) +
        UI.field('חלבון (גרם)', inp('protein', '40', 'max="400"')) +
        UI.field('פחמימות (גרם)', inp('carbs', '60', 'max="800"')) +
        UI.field('שומן (גרם)', inp('fat', '15', 'max="400"')) +
      '</div>' +
      '<span class="font-label-macro text-label-macro text-on-surface-variant/70 font-normal">אם משאירים את הקלוריות ריקות, הן יחושבו מהמאקרו.</span>';
  }

  function tabBodyHtml() {
    return st.tab === 'recent' ? recentHtml() : st.tab === 'foods' ? foodsHtml() : manualHtml();
  }

  function summaryHtml() {
    var d = draft(), type = UI.TYPES[st.type];
    function cell(icon, color, label, val) {
      return '<div class="flex flex-col items-center gap-0.5">' + UI.icon(icon, 'text-lg ' + color) +
        '<span class="font-label-macro text-label-macro text-on-surface-variant font-normal">' + label + '</span>' +
        '<span class="font-label-badge text-body-md text-on-surface font-bold">' + val + '</span></div>';
    }
    if (!d) {
      return '<div class="flex items-center gap-2 text-on-surface-variant">' + UI.icon('fact_check', 'text-xl') +
        '<span>בחרו ארוחה או הזינו ערכים כדי לראות את הסיכום.</span></div>';
    }
    return '<div class="flex items-center justify-between gap-2"><span class="font-label-badge text-label-badge text-on-surface-variant flex items-center gap-1">' + UI.icon('fact_check', 'text-lg') + 'יתווסף ליומן</span>' +
        '<span class="font-label-badge text-label-badge text-primary">' + type.label + '</span></div>' +
      '<span class="text-on-surface font-semibold truncate">' + UI.esc(d.name) + '</span>' +
      '<div class="grid grid-cols-4 gap-1">' +
        cell('local_fire_department', 'text-primary', 'קלוריות', '+' + UI.num(d.kcal)) +
        cell('fitness_center', 'text-secondary', 'חלבון', '+' + UI.g(d.protein)) +
        cell('grain', 'text-carb', 'פחמימות', '+' + UI.g(d.carbs)) +
        cell('water_drop', 'text-tertiary', 'שומן', '+' + UI.g(d.fat)) +
      '</div>';
  }

  Views.log = {
    nav: false, back: true, title: 'תיעוד ארוחה מהיר',
    render: function (arg, isNew) {
      if (isNew || !st) reset();
      var types = Object.keys(UI.TYPES).map(function (k) {
        var on = st.type === k;
        return '<button type="button" data-type="' + k + '" aria-pressed="' + on + '" class="flex flex-col items-center justify-center gap-1 rounded-xl min-h-[64px] px-1 border transition-all ' +
          (on ? 'bg-primary/15 border-primary text-primary' : 'bg-surface-container border-white/5 text-on-surface-variant') + '">' +
          UI.icon(UI.TYPES[k].icon, 'text-2xl') + '<span class="font-label-macro text-label-macro text-center leading-tight">' + UI.TYPES[k].label + '</span></button>';
      }).join('');
      var tabs = TABS.map(function (t) {
        return UI.chip(UI.icon(t[2], 'text-base align-middle ml-1') + t[1], st.tab === t[0], 'data-tab="' + t[0] + '"');
      }).join('');

      return '<section class="flex flex-col gap-0.5 mt-1">' +
          '<h1 class="font-headline-lg text-headline-lg text-on-surface">מה אכלת? ⚡</h1>' +
          '<p class="text-on-surface-variant">תיעוד בפחות מדקה.</p>' +
        '</section>' +
        '<section class="grid grid-cols-4 gap-2">' + types + '</section>' +
        '<section class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">' + tabs + '</section>' +
        '<section id="tab-body" class="flex flex-col gap-2">' + tabBodyHtml() + '</section>' +
        '<section class="' + UI.CARD + '">' +
          UI.field(UI.icon('payments', 'text-base align-middle ml-1') + 'עלות הארוחה ב-₪ (לא חובה, למעקב התקציב)',
            '<input id="log-cost" type="number" inputmode="decimal" dir="ltr" min="0" max="500" step="0.5" class="' + UI.INPUT + '" value="' + UI.esc(st.cost) + '" placeholder="0"/>') +
        '</section>' +
        '<div class="h-40"></div>' +
        '<div class="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-xl pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.45)]">' +
          '<div class="max-w-md mx-auto px-margin py-3 flex flex-col gap-2.5">' +
            '<div id="log-summary" class="flex flex-col gap-1.5">' + summaryHtml() + '</div>' +
            '<button type="button" id="log-save" class="' + UI.BTN_PRIMARY + '">' + UI.icon('check_circle', 'text-xl') + 'שמירה ביומן</button>' +
          '</div></div>';
    },
    mount: function (root) {
      function $(sel) { return root.querySelector(sel); }
      function refreshSummary() { $('#log-summary').innerHTML = summaryHtml(); }
      function refreshBody() { $('#tab-body').innerHTML = tabBodyHtml(); refreshSummary(); }
      function refreshItems() { $('#food-items').innerHTML = foodItemsHtml(); refreshSummary(); }
      function setCost(v) { st.cost = v == null ? '' : String(v); $('#log-cost').value = st.cost; }

      root.addEventListener('click', function (ev) {
        var el;
        if ((el = ev.target.closest('[data-type]'))) { st.type = el.dataset.type; return App.render(); }
        if ((el = ev.target.closest('[data-tab]'))) {
          if (st.tab !== el.dataset.tab) { st.tab = el.dataset.tab; setCost(st.tab === 'recent' && st.picked ? st.picked.cost : ''); }
          return App.render();
        }
        if ((el = ev.target.closest('[data-pick]'))) {
          var x = currentList[parseInt(el.dataset.pick, 10)];
          if (!x) return;
          st.picked = st.picked && st.picked.name === x.e.name ? null : x.e;
          setCost(st.picked ? st.picked.cost : '');
          return refreshBody();
        }
        if ((el = ev.target.closest('[data-food]'))) {
          var i = parseInt(el.dataset.food, 10), fd = FOODS[i];
          var existing = st.items.filter(function (it) { return it.i === i; })[0];
          if (existing) existing.grams = String((parseFloat(existing.grams) || 0) + (fd.unit ? fd.unit.g : 100));
          else st.items.push({ i: i, grams: String(fd.unit ? fd.unit.g : 100) });
          return refreshItems();
        }
        if ((el = ev.target.closest('[data-unit]'))) {
          var it = st.items[parseInt(el.dataset.unit, 10)];
          it.grams = String((parseFloat(it.grams) || 0) + FOODS[it.i].unit.g);
          return refreshItems();
        }
        if ((el = ev.target.closest('[data-rm]'))) {
          st.items.splice(parseInt(el.dataset.rm, 10), 1);
          return refreshItems();
        }
        if (ev.target.closest('#log-save')) {
          var d = draft();
          if (!d) return App.toast('בחרו ארוחה או הזינו ערכים לפני השמירה', true);
          d.time = Nutrition.nowTime();
          d.type = st.type;
          Store.addEntry(Nutrition.dateKey(), d);
          st = null;
          App.toast('הארוחה תועדה בהצלחה! 🎉');
          App.go('#/dashboard');
        }
      });

      root.addEventListener('input', function (ev) {
        var t = ev.target;
        if (t.id === 'food-q') { st.q = t.value; $('#food-results').innerHTML = foodResultsHtml(); return; }
        if (t.id === 'log-cost') { st.cost = t.value; return; }
        if (t.id === 'foods-name') { st.foodsName = t.value; return refreshSummary(); }
        if (t.dataset.grams != null) { st.items[parseInt(t.dataset.grams, 10)].grams = t.value; return refreshSummary(); }
        if (t.dataset.m) { st.manual[t.dataset.m] = t.value; return refreshSummary(); }
      });
    }
  };
})();
