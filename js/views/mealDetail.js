/* מסך פרטי ארוחה: ערכים תזונתיים, מצרכים, שלבי הכנה והוספה ליומן. */
(function () {
  function find(id) { return MEALS.filter(function (x) { return x.id === id; })[0]; }

  function stat(icon, color, value, label) {
    return '<div class="rounded-xl bg-surface-container p-3 flex flex-col items-center gap-1 text-center">' +
      UI.icon(icon, 'text-xl ' + color) +
      '<span class="font-headline-sm text-headline-sm text-on-surface">' + value + '</span>' +
      '<span class="font-label-macro text-label-macro text-on-surface-variant font-normal">' + label + '</span></div>';
  }

  function macroRow(label, grams, kcalShare, barCls, textCls) {
    return '<div class="flex flex-col gap-1"><div class="flex items-center justify-between">' +
      '<span class="font-label-badge text-label-badge ' + textCls + '">' + label + '</span>' +
      '<span class="font-label-badge text-label-badge text-on-surface">' + UI.g(grams) + ' <span class="text-on-surface-variant font-normal">· ' + kcalShare + '% מהקלוריות</span></span></div>' +
      '<div class="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden"><div class="' + barCls + ' h-2 rounded-full" style="width:' + kcalShare + '%"></div></div></div>';
  }

  Views.meal = {
    nav: false, back: true, title: 'פרטי ארוחה',
    render: function (id) {
      var m = find(id);
      if (!m) {
        return '<div class="flex flex-col items-center gap-3 py-12 text-center">' + UI.icon('error', 'text-4xl text-on-surface-variant') +
          '<span class="text-on-surface-variant">הארוחה לא נמצאה.</span><a href="#/meals" class="text-primary font-label-badge text-label-badge min-h-[44px] flex items-center">חזרה לארוחות</a></div>';
      }
      var fav = Store.isFavorite(m.id);
      var total = m.p * 4 + m.c * 4 + m.f * 9;
      var sp = Math.round((m.p * 4 / total) * 100), sc = Math.round((m.c * 4 / total) * 100), sf = 100 - sp - sc;
      var goals = m.goals.map(function (k) { return UI.GOALS[k].short; }).join(' · ');

      return '<section class="rounded-2xl bg-gradient-to-bl from-primary-container/30 via-surface-container-high to-surface-container p-4 flex flex-col gap-3 relative overflow-hidden mt-1">' +
          '<div class="flex items-start justify-between">' +
            '<div class="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">' + UI.icon(m.icon, 'text-4xl') + '</div>' +
            '<button type="button" id="fav-btn" aria-pressed="' + fav + '" aria-label="' + (fav ? 'הסרה מהמועדפים' : 'הוספה למועדפים') + '" class="w-11 h-11 rounded-full bg-black/20 flex items-center justify-center ' + (fav ? 'text-secondary' : 'text-on-surface') + '">' + UI.icon('favorite', 'text-2xl', fav) + '</button>' +
          '</div>' +
          '<span class="font-label-badge text-label-badge text-primary">' + UI.esc(m.note) + ' · מתאים ל: ' + goals + '</span>' +
          '<h1 class="font-headline-lg text-headline-lg text-on-surface leading-tight">' + UI.esc(m.name) + '</h1>' +
          '<p class="text-on-surface-variant">' + UI.esc(m.desc) + '</p>' +
        '</section>' +

        '<section class="grid grid-cols-3 gap-2">' +
          stat('schedule', 'text-on-surface-variant', m.time + ' דק׳', 'זמן הכנה') +
          stat('payments', 'text-primary', UI.nis(m.cost), 'למנה') +
          stat('fitness_center', 'text-secondary', UI.g(m.p), 'חלבון') +
        '</section>' +

        '<section class="' + UI.CARD + ' flex flex-col gap-3">' +
          '<div class="flex items-center justify-between"><h2 class="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">' + UI.icon('pie_chart', 'text-primary text-xl') + 'ערכים תזונתיים</h2>' +
            '<span class="font-label-macro text-label-macro text-on-surface-variant font-normal">למנה</span></div>' +
          '<div class="flex items-baseline gap-1.5"><span class="font-metric-large text-metric-large text-primary">' + UI.num(m.kcal) + '</span><span class="text-on-surface-variant">קק״ל</span></div>' +
          macroRow('חלבון', m.p, sp, 'bg-secondary', 'text-secondary') +
          macroRow('פחמימות', m.c, sc, 'bg-carb', 'text-carb') +
          macroRow('שומן', m.f, sf, 'bg-tertiary', 'text-tertiary') +
        '</section>' +

        '<section class="' + UI.CARD + ' flex flex-col gap-2">' +
          '<div class="flex items-center justify-between"><h2 class="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">' + UI.icon('shopping_basket', 'text-primary text-xl') + 'מצרכים</h2>' +
            '<span class="font-label-badge text-label-badge text-primary">סה״כ ' + UI.nis(m.cost) + '</span></div>' +
          m.ingredients.map(function (i) {
            return '<div class="flex items-center justify-between gap-2 py-2 border-t border-white/5">' +
              '<div class="flex flex-col"><span class="text-on-surface">' + UI.esc(i.n) + '</span>' +
              (i.note ? '<span class="font-label-macro text-label-macro text-on-surface-variant font-normal">' + UI.esc(i.note) + '</span>' : '') + '</div>' +
              '<span class="font-label-badge text-label-badge text-on-surface-variant flex-shrink-0">' + UI.nis(i.cost) + '</span></div>';
          }).join('') +
        '</section>' +

        '<section class="' + UI.CARD + ' flex flex-col gap-3">' +
          '<h2 class="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">' + UI.icon('skillet', 'text-primary text-xl') + 'איך מכינים</h2>' +
          m.steps.map(function (s, i) {
            return '<div class="flex gap-3"><div class="w-7 h-7 rounded-full bg-primary/15 text-primary font-label-badge text-label-badge font-bold flex items-center justify-center flex-shrink-0">' + (i + 1) + '</div>' +
              '<div class="flex flex-col gap-0.5"><div class="flex items-center gap-2"><span class="font-label-badge text-body-md text-on-surface font-bold">' + UI.esc(s.t) + '</span>' +
              (s.min ? '<span class="font-label-macro text-label-macro text-on-surface-variant font-normal">' + s.min + ' דק׳</span>' : '') + '</div>' +
              '<p class="text-on-surface-variant">' + UI.esc(s.d) + '</p></div></div>';
          }).join('') +
        '</section>' +

        (m.tip ? '<section class="rounded-xl bg-primary/10 border border-primary/20 p-3.5 flex gap-2.5">' + UI.icon('lightbulb', 'text-primary text-xl flex-shrink-0') +
          '<div class="flex flex-col"><span class="font-label-badge text-label-badge text-primary">טיפ לחיסכון</span><p class="text-on-surface">' + UI.esc(m.tip) + '</p></div></section>' : '') +

        '<p class="font-label-macro text-label-macro text-on-surface-variant/70 font-normal text-center">הערכים התזונתיים והמחירים הם הערכות.</p>' +

        '<div class="fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl pb-safe">' +
          '<div class="max-w-md mx-auto px-margin py-3"><button type="button" id="eat-btn" class="' + UI.BTN_PRIMARY + '">' + UI.icon('check_circle', 'text-xl') +
          'אכלתי את זה! הוסף ליומן (+' + UI.g(m.p) + ' חלבון)</button></div></div>';
    },
    mount: function (root, id) {
      var m = find(id);
      if (!m) return;
      root.querySelector('#fav-btn').addEventListener('click', function () {
        var on = Store.toggleFavorite(m.id);
        App.toast(on ? 'נוסף למועדפים' : 'הוסר מהמועדפים');
        App.render();
      });
      root.querySelector('#eat-btn').addEventListener('click', function () {
        Nutrition.logMeal(m);
        App.toast('הארוחה נוספה למעקב היומי ✓');
        App.go('#/dashboard');
      });
    }
  };
})();
