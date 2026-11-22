/* מסך ארוחות: מאגר עם חיפוש וסינון לפי מטרה, זמן הכנה ותקציב. */
(function () {
  var f = null; // מצב הסינון נשמר בין מעברים

  var TIMES = [[0, 'כל זמן'], [5, 'עד 5 דק׳'], [10, 'עד 10 דק׳'], [15, 'עד 15 דק׳']];
  var BUDGETS = [[0, 'כל מחיר'], [8, 'עד ₪8'], [10, 'עד ₪10'], [12, 'עד ₪12']];

  function init() {
    if (!f) f = { goal: Store.profile.goal, time: 0, budget: 0, noCook: false, q: '' };
  }

  function filtered() {
    var q = f.q.trim();
    return MEALS.filter(function (m) {
      if (f.goal !== 'all' && m.goals.indexOf(f.goal) === -1) return false;
      if (f.time && m.time > f.time) return false;
      if (f.budget && m.cost > f.budget) return false;
      if (f.noCook && !m.noCook) return false;
      if (q) {
        var hay = m.name + ' ' + m.desc + ' ' + m.ingredients.map(function (i) { return i.n; }).join(' ');
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return b.p / b.cost - a.p / a.cost; });
  }

  function card(m) {
    var fav = Store.isFavorite(m.id);
    return '<div class="rounded-xl bg-surface-container p-3.5 shadow-md flex flex-col gap-2.5">' +
      '<a href="#/meal/' + m.id + '" class="flex flex-col gap-2">' +
        '<div class="flex items-start justify-between gap-2">' +
          '<div class="flex items-center gap-2.5 min-w-0">' +
            '<div class="w-11 h-11 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">' + UI.icon(m.icon, 'text-2xl') + '</div>' +
            '<div class="flex flex-col min-w-0"><span class="font-headline-sm text-body-lg text-on-surface font-bold leading-snug">' + UI.esc(m.name) +
              (fav ? ' ' + UI.icon('favorite', 'text-sm text-secondary align-middle', true) : '') + '</span>' +
            '<span class="font-label-badge text-label-badge text-on-surface-variant font-normal">' + UI.esc(m.desc) + '</span></div>' +
          '</div>' +
          '<span class="bg-primary-container/20 text-primary font-label-badge text-label-badge px-2 py-1 rounded-lg font-bold flex-shrink-0">' + UI.nis(m.cost) + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-2 flex-wrap font-label-macro text-label-macro">' +
          '<span class="bg-surface-container-highest text-on-surface-variant px-2 py-1 rounded-lg flex items-center gap-1">' + UI.icon('schedule', 'text-sm') + m.time + ' דק׳</span>' +
          '<span class="bg-secondary-container/20 text-secondary px-2 py-1 rounded-lg">' + UI.g(m.p) + ' חלבון</span>' +
          '<span class="bg-surface-container-highest text-on-surface px-2 py-1 rounded-lg">' + UI.num(m.kcal) + ' קק״ל</span>' +
          '<span class="text-on-surface-variant font-normal">' + UI.esc(m.note) + '</span>' +
        '</div>' +
      '</a>' +
      '<div class="flex items-center gap-2">' +
        '<a href="#/meal/' + m.id + '" class="flex-1 bg-white/5 border border-white/10 rounded-full min-h-[44px] flex items-center justify-center font-label-badge text-label-badge text-on-surface">מתכון וערכים</a>' +
        '<button type="button" data-add="' + m.id + '" class="flex-1 bg-primary text-on-primary rounded-full min-h-[44px] flex items-center justify-center gap-1 font-label-badge text-label-badge font-bold active:scale-95 transition-all">' + UI.icon('add', 'text-lg') + 'הוסף ליומן</button>' +
      '</div>' +
    '</div>';
  }

  function listHtml() {
    var list = filtered();
    if (!list.length) {
      return '<div class="rounded-xl border border-dashed border-white/10 p-6 flex flex-col items-center gap-2 text-center">' +
        UI.icon('search_off', 'text-3xl text-on-surface-variant') +
        '<span class="text-on-surface-variant">לא נמצאו ארוחות שמתאימות לסינון.</span>' +
        '<button type="button" id="clear-filters" class="text-primary font-label-badge text-label-badge min-h-[44px]">ניקוי הסינון</button></div>';
    }
    return '<span class="font-label-macro text-label-macro text-on-surface-variant font-normal">' + list.length + ' ארוחות · ממוינות לפי חלבון לשקל</span>' +
      list.map(card).join('');
  }

  function chipRow(icon, items) {
    return '<div class="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">' +
      '<span class="text-on-surface-variant flex-shrink-0">' + UI.icon(icon, 'text-xl') + '</span>' + items + '</div>';
  }

  Views.meals = {
    nav: true,
    render: function () {
      init();
      var goalChips = UI.chip('הכל', f.goal === 'all', 'data-f="goal" data-v="all"') +
        Object.keys(UI.GOALS).map(function (k) {
          return UI.chip(UI.GOALS[k].short + (k === Store.profile.goal ? ' (המטרה שלי)' : ''), f.goal === k, 'data-f="goal" data-v="' + k + '"');
        }).join('');
      var timeChips = TIMES.map(function (x) { return UI.chip(x[1], f.time === x[0], 'data-f="time" data-v="' + x[0] + '"'); }).join('') +
        UI.chip('ללא בישול', f.noCook, 'data-f="noCook"');
      var budgetChips = BUDGETS.map(function (x) { return UI.chip(x[1], f.budget === x[0], 'data-f="budget" data-v="' + x[0] + '"'); }).join('');

      return '<section class="flex flex-col gap-1 mt-1">' +
          '<h1 class="font-headline-lg text-headline-lg text-on-surface">ארוחות לסטודנטים</h1>' +
          '<p class="text-on-surface-variant">בריאות, זולות ומהירות. סננו לפי המטרה, הזמן והתקציב.</p>' +
        '</section>' +
        '<div class="relative">' +
          '<span class="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">' + UI.icon('search', 'text-xl') + '</span>' +
          '<input id="meal-q" type="search" class="' + UI.INPUT + ' pr-10" placeholder="חיפוש ארוחה או מצרך" value="' + UI.esc(f.q) + '" aria-label="חיפוש ארוחה"/>' +
        '</div>' +
        '<section class="flex flex-col gap-2">' +
          chipRow('flag', goalChips) + chipRow('schedule', timeChips) + chipRow('payments', budgetChips) +
        '</section>' +
        '<section id="meal-list" class="flex flex-col gap-3">' + listHtml() + '</section>' +
        '<p class="font-label-macro text-label-macro text-on-surface-variant/70 font-normal text-center">הערכים התזונתיים והמחירים הם הערכות.</p>';
    },
    mount: function (root) {
      root.querySelector('#meal-q').addEventListener('input', function (e) {
        f.q = e.target.value;
        root.querySelector('#meal-list').innerHTML = listHtml();
      });
      root.addEventListener('click', function (ev) {
        var chip = ev.target.closest('[data-f]');
        if (chip) {
          var k = chip.dataset.f;
          if (k === 'noCook') f.noCook = !f.noCook;
          else if (k === 'goal') f.goal = chip.dataset.v;
          else f[k] = parseInt(chip.dataset.v, 10);
          return App.render();
        }
        if (ev.target.closest('#clear-filters')) {
          f = { goal: 'all', time: 0, budget: 0, noCook: false, q: '' };
          return App.render();
        }
        var add = ev.target.closest('[data-add]');
        if (add) {
          var m = MEALS.filter(function (x) { return x.id === add.dataset.add; })[0];
          if (!m) return;
          Nutrition.logMeal(m);
          App.toast('הארוחה נוספה למעקב היומי ✓');
        }
      });
    },
    resetFilters: function () { f = null; }
  };
})();
