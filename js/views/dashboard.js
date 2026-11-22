/* מסך מעקב יומי: סיכום מול היעדים, תקציב, הצעות וארוחות שתועדו היום. */
(function () {
  var WEEK_TARGET = 4;

  function ring(r, width, color, percent, glow) {
    var c = 2 * Math.PI * r;
    return '<circle cx="60" cy="60" fill="none" opacity="0.4" r="' + r + '" stroke="#2d3449" stroke-width="' + width + '"></circle>' +
      '<circle class="transition-all duration-1000 ease-out' + (glow ? ' ring-glow' : '') + '" cx="60" cy="60" fill="none" r="' + r + '" stroke="' + color +
      '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - percent / 100)).toFixed(1) + '" stroke-linecap="round" stroke-width="' + width + '"></circle>';
  }

  function bar(label, dot, barCls, val, target, h) {
    return '<div class="flex flex-col gap-1"><div class="flex items-center justify-between">' +
      '<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full ' + dot + '"></span><span class="font-label-macro text-label-macro text-on-surface">' + label + '</span></div>' +
      '<span class="font-label-macro text-label-macro text-on-surface-variant" dir="ltr">' + UI.num(val) + 'g / ' + UI.num(target) + 'g</span></div>' +
      '<div class="w-full bg-surface-container-highest rounded-full ' + h + ' overflow-hidden"><div class="' + barCls + ' ' + h + ' rounded-full transition-all duration-500" style="width:' + UI.pct(val, target) + '%"></div></div></div>';
  }

  function suggestions(p, gl, t, entries) {
    var remK = gl.kcal - t.kcal;
    var remB = gl.budget ? gl.budget - t.cost : null;
    var eaten = {};
    entries.forEach(function (e) { if (e.mealId) eaten[e.mealId] = true; });
    return MEALS.filter(function (m) { return m.goals.indexOf(p.goal) !== -1; })
      .map(function (m) {
        var score = m.p / m.cost;
        if (m.kcal <= remK + 50) score += 3;
        if (remB !== null && m.cost <= remB) score += 2;
        if (eaten[m.id]) score -= 5;
        return { m: m, score: score };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 3).map(function (x) { return x.m; });
  }

  function suggestionCard(m) {
    return '<div class="flex-shrink-0 w-56 rounded-xl bg-surface-container p-3 flex flex-col gap-2 shadow-sm">' +
      '<a href="#/meal/' + m.id + '" class="flex flex-col gap-1.5">' +
        '<div class="flex items-center justify-between">' +
          '<div class="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">' + UI.icon(m.icon, 'text-xl') + '</div>' +
          '<span class="bg-primary-container/20 text-primary font-label-macro text-label-macro px-2 py-0.5 rounded-full">' + UI.nis(m.cost) + '</span>' +
        '</div>' +
        '<span class="font-label-badge text-body-md text-on-surface font-bold leading-snug min-h-[40px]">' + UI.esc(m.name) + '</span>' +
        '<div class="flex items-center gap-2 font-label-macro text-label-macro">' +
          '<span class="text-secondary">' + UI.g(m.p) + ' חלבון</span><span class="text-on-surface-variant">' + UI.num(m.kcal) + ' קק״ל</span><span class="text-on-surface-variant">' + m.time + ' דק׳</span>' +
        '</div>' +
      '</a>' +
      '<button type="button" data-add="' + m.id + '" class="bg-surface-container-highest text-primary rounded-lg min-h-[40px] font-label-badge text-label-badge font-bold flex items-center justify-center gap-1 active:scale-95 transition-all">' + UI.icon('add', 'text-lg') + 'אכלתי, הוסף ליומן</button>' +
    '</div>';
  }

  function entryCard(e) {
    var type = UI.TYPES[e.type] || UI.TYPES.snack;
    return '<div class="rounded-xl bg-surface-container p-3 flex flex-col gap-2 shadow-sm">' +
      '<div class="flex items-center justify-between gap-2">' +
        '<div class="flex items-center gap-2.5 min-w-0">' +
          '<div class="w-11 h-11 rounded-lg flex-shrink-0 bg-surface-container-highest text-primary flex items-center justify-center">' + UI.icon(type.icon, 'text-2xl') + '</div>' +
          '<div class="flex flex-col min-w-0">' +
            '<div class="flex items-center gap-1.5"><span class="font-label-badge text-label-badge text-on-surface font-bold">' + type.label + '</span>' +
            '<span class="font-label-macro text-label-macro text-on-surface-variant" dir="ltr">' + UI.esc(e.time) + '</span></div>' +
            '<p class="text-on-surface-variant truncate">' + UI.esc(e.name) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="flex items-center flex-shrink-0">' +
          (e.cost ? '<span class="bg-primary-container/20 text-primary font-label-macro text-label-macro px-2 py-0.5 rounded-full">' + UI.nis(e.cost) + '</span>' : '') +
          '<button type="button" data-del="' + e.id + '" aria-label="מחיקת הארוחה" class="w-10 h-10 -ml-2 flex items-center justify-center text-on-surface-variant active:text-error">' + UI.icon('close', 'text-lg') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="flex items-center justify-between bg-surface-container-lowest/60 px-2.5 py-1.5 rounded-lg font-label-macro text-label-macro">' +
        '<div class="flex items-center gap-3">' +
          '<span class="flex items-center gap-1 text-on-surface">' + UI.icon('local_fire_department', 'text-sm text-primary') + UI.num(e.kcal) + ' קק״ל</span>' +
          '<span class="flex items-center gap-1 text-secondary">' + UI.icon('fitness_center', 'text-sm') + UI.g(e.protein) + ' חלבון</span>' +
        '</div>' +
        '<span class="text-on-surface-variant font-normal">פחמ׳ ' + UI.g(e.carbs) + ' · שומן ' + UI.g(e.fat) + '</span>' +
      '</div>' +
    '</div>';
  }

  Views.dashboard = {
    nav: true,
    render: function () {
      var p = Store.profile, gl = Store.goals;
      var entries = Store.entries(Nutrition.dateKey());
      var t = Nutrition.totals(entries);
      var week = Nutrition.weekDaysLogged();
      var dateStr = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
      var remK = gl.kcal - t.kcal, remP = gl.protein - t.protein;
      var kcalPct = UI.pct(t.kcal, gl.kcal);

      var html = '';

      // ברכה ויעד שבועי
      html += '<section class="flex flex-col gap-2 mt-1">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<div class="min-w-0"><h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight truncate">היי ' + UI.esc(p.name) + ' 💪</h1>' +
          '<p class="text-on-surface-variant">' + dateStr + '</p></div>' +
          '<div class="flex flex-col items-center justify-center bg-surface-container-high px-3 py-1.5 rounded-xl flex-shrink-0">' +
            '<span class="font-label-macro text-label-macro text-secondary-fixed">ימי תיעוד השבוע</span>' +
            '<span class="font-headline-sm text-headline-sm text-primary font-bold" dir="ltr">' + week + '/' + WEEK_TARGET + '</span></div>' +
        '</div>' +
        '<div class="rounded-xl bg-gradient-to-l from-surface-container-high via-surface-container to-surface-container-low p-3 flex items-center gap-2.5">' +
          '<div class="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary flex-shrink-0">' + UI.icon(week >= WEEK_TARGET ? 'verified' : 'event_available', 'text-lg', true) + '</div>' +
          '<span class="font-label-badge text-label-badge text-on-surface">' +
            (week >= WEEK_TARGET ? 'יעד ההתמדה השבועי הושג! 🎯'
              : week === 0 ? 'תעדו ארוחה היום כדי לפתוח את השבוע. היעד: ' + WEEK_TARGET + ' ימי תיעוד.'
              : 'תיעדת ' + week + ' מתוך ' + WEEK_TARGET + ' ימים השבוע. עוד ' + (WEEK_TARGET - week) + ' ליעד.') +
          '</span>' +
        '</div>' +
      '</section>';

      // טבעות וסיכום מאקרו
      html += '<section class="rounded-xl bg-surface-container-high/90 p-4 shadow-xl relative overflow-hidden flex flex-col gap-4">' +
        '<div class="absolute -top-12 -left-12 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>' +
        '<div class="flex items-center justify-between z-10 gap-2">' +
          '<div class="flex flex-col"><span class="font-label-macro text-label-macro text-on-surface-variant">צריכה יומית</span>' +
            '<div class="flex items-baseline gap-1.5"><span class="font-display-hero-mobile text-display-hero-mobile text-primary leading-none">' + UI.num(t.kcal) + '</span>' +
            '<span class="text-on-surface-variant">/ ' + UI.num(gl.kcal) + ' קק״ל</span></div></div>' +
          (remK >= 0
            ? '<span class="bg-primary/15 text-primary font-label-badge text-label-badge px-2.5 py-1 rounded-full font-bold flex-shrink-0">נותרו ' + UI.num(remK) + ' קק״ל</span>'
            : '<span class="bg-secondary-container/25 text-secondary font-label-badge text-label-badge px-2.5 py-1 rounded-full font-bold flex-shrink-0">' + UI.num(-remK) + ' קק״ל מעל היעד</span>') +
        '</div>' +
        '<div class="grid grid-cols-12 gap-3 items-center z-10">' +
          '<div class="col-span-5 flex items-center justify-center relative">' +
            '<svg class="w-32 h-32 -rotate-90" viewBox="0 0 120 120" role="img" aria-label="התקדמות יומית">' +
              ring(50, 8, '#4edea3', kcalPct, kcalPct >= 100) +
              ring(38, 8, '#ffb690', UI.pct(t.protein, gl.protein)) +
              ring(26, 7, '#f59e0b', UI.pct(t.carbs, gl.carbs)) +
            '</svg>' +
            '<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">' +
              '<span class="font-label-badge text-label-badge text-on-surface font-bold">' + kcalPct + '%</span></div>' +
          '</div>' +
          '<div class="col-span-7 flex flex-col gap-2.5">' +
            '<div class="bg-surface-container p-2.5 rounded-lg flex flex-col gap-1">' +
              '<div class="flex items-center justify-between"><div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-secondary"></span>' +
                '<span class="font-label-badge text-label-badge text-secondary font-bold">חלבון</span></div>' +
                '<span class="font-label-macro text-label-macro text-on-surface-variant" dir="ltr">' + UI.num(t.protein) + 'g / ' + UI.num(gl.protein) + 'g</span></div>' +
              '<div class="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden"><div class="bg-secondary h-2 rounded-full transition-all duration-500" style="width:' + UI.pct(t.protein, gl.protein) + '%"></div></div>' +
              '<span class="font-label-macro text-label-macro text-secondary">' + (remP > 0 ? 'עוד ' + UI.g(remP) + ' ליעד' : 'יעד החלבון הושג! 💪') + '</span>' +
            '</div>' +
            bar('פחמימות', 'bg-carb', 'bg-carb', t.carbs, gl.carbs, 'h-1.5') +
            bar('שומנים', 'bg-tertiary', 'bg-tertiary', t.fat, gl.fat, 'h-1.5') +
          '</div>' +
        '</div>' +
      '</section>';

      // תקציב
      var remB = gl.budget ? gl.budget - t.cost : null;
      html += '<section class="rounded-xl bg-surface-container p-3.5 shadow-md flex items-center gap-3">' +
        '<div class="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary flex-shrink-0">' + UI.icon('savings', 'text-2xl') + '</div>' +
        '<div class="flex flex-col min-w-0">' +
          '<div class="flex items-baseline gap-1 flex-wrap"><span class="font-label-badge text-label-badge text-on-surface">הוצאה על אוכל היום:</span>' +
            '<span class="font-headline-sm text-headline-sm text-primary font-bold">' + UI.nis(t.cost) + '</span>' +
            (gl.budget ? '<span class="font-label-macro text-label-macro text-on-surface-variant">/ ' + UI.nis(gl.budget) + '</span>' : '') + '</div>' +
          '<span class="font-label-macro text-label-macro font-normal ' + (remB !== null && remB < 0 ? 'text-secondary' : 'text-on-surface-variant') + '">' +
            (remB === null ? 'אפשר להגדיר תקציב יומי במסך "יעדים ופרופיל"'
              : remB >= 0 ? 'נותרו ' + UI.nis(remB) + ' מהתקציב היומי'
              : 'חריגה של ' + UI.nis(-remB) + ' מהתקציב היומי') +
          '</span>' +
        '</div>' +
      '</section>';

      // הצעות
      var sug = suggestions(p, gl, t, entries);
      html += '<section class="flex flex-col gap-space-sm">' +
        '<div class="flex items-center justify-between">' +
          '<div class="flex flex-col"><span class="font-headline-sm text-headline-sm text-on-surface font-bold">מה כדאי לאכול עכשיו?</span>' +
          '<span class="font-label-macro text-label-macro text-on-surface-variant font-normal">מותאם למטרה: ' + UI.GOALS[p.goal].label + '</span></div>' +
          '<a href="#/meals" class="text-primary font-label-badge text-label-badge flex items-center gap-0.5 min-h-[44px]">לכל הארוחות' + UI.icon('chevron_left', 'text-base') + '</a>' +
        '</div>' +
        '<div class="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">' + sug.map(suggestionCard).join('') + '</div>' +
      '</section>';

      // ארוחות היום
      html += '<section class="flex flex-col gap-space-sm">' +
        '<div class="flex items-center gap-2"><span class="font-headline-sm text-headline-sm text-on-surface font-bold">ארוחות שתועדו היום</span>' +
          '<span class="bg-surface-container-high text-on-surface-variant font-label-macro text-label-macro px-2 py-0.5 rounded-full">' + entries.length + '</span></div>' +
        (entries.length
          ? '<div class="flex flex-col gap-2.5">' + entries.slice().reverse().map(entryCard).join('') + '</div>'
          : '<div class="rounded-xl border border-dashed border-white/10 p-5 flex flex-col items-center gap-2 text-center">' +
              UI.icon('restaurant', 'text-3xl text-on-surface-variant') +
              '<span class="text-on-surface-variant">עוד לא תיעדת ארוחות היום.</span></div>') +
        '<a href="#/log" class="' + UI.BTN_PRIMARY + ' mt-1">' + UI.icon('add_circle', 'text-xl') + 'תיעוד ארוחה מהיר</a>' +
      '</section>';

      return html;
    },
    mount: function (root) {
      root.addEventListener('click', function (ev) {
        var del = ev.target.closest('[data-del]');
        if (del) {
          if (!confirm('למחוק את הארוחה מהיומן?')) return;
          Store.removeEntry(Nutrition.dateKey(), del.dataset.del);
          App.toast('הארוחה נמחקה');
          return App.render();
        }
        var add = ev.target.closest('[data-add]');
        if (add) {
          var m = MEALS.filter(function (x) { return x.id === add.dataset.add; })[0];
          if (!m) return;
          Nutrition.logMeal(m);
          App.toast('הארוחה נוספה ליומן ✓');
          App.render();
        }
      });
    }
  };
})();
