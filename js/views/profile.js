/* מסך יעדים ופרופיל: עריכת פרטים, עריכת יעדים, חישוב מחדש ואיפוס. */
(function () {
  var picked = {};

  function derived(gl) {
    return 'פחמימות: ' + UI.g(gl.carbs) + ' · שומן: ' + UI.g(gl.fat) + ' (מחושבים מהקלוריות ומהחלבון)';
  }

  Views.profile = {
    nav: true,
    render: function () {
      var p = Store.profile, gl = Store.goals;
      picked = { sex: p.sex, goal: p.goal };
      var week = Nutrition.weekDaysLogged(), streak = Nutrition.streak();
      return '<section class="flex flex-col gap-1 mt-1">' +
          '<h1 class="font-headline-lg text-headline-lg text-on-surface">יעדים ופרופיל</h1>' +
          '<p class="text-on-surface-variant">המטרה שלך: <b class="text-primary">' + UI.GOALS[p.goal].label + '</b></p>' +
        '</section>' +
        '<section class="grid grid-cols-2 gap-2">' +
          '<div class="' + UI.CARD + ' flex flex-col"><span class="font-label-macro text-label-macro text-on-surface-variant">ימי תיעוד השבוע</span><span class="font-metric-large-mobile text-metric-large-mobile text-primary"><span dir="ltr">' + week + '/4</span></span></div>' +
          '<div class="' + UI.CARD + ' flex flex-col"><span class="font-label-macro text-label-macro text-on-surface-variant">רצף ימים</span><span class="font-metric-large-mobile text-metric-large-mobile text-secondary">' + streak + ' 🔥</span></div>' +
        '</section>' +
        '<form id="pf-form" class="flex flex-col gap-space-md" novalidate>' +
          '<section class="' + UI.CARD + ' flex flex-col gap-4">' +
            '<h2 class="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">' + UI.icon('person', 'text-primary text-xl') + 'פרטים אישיים</h2>' +
            UI.profileFields(p) +
          '</section>' +
          '<section class="' + UI.CARD + ' flex flex-col gap-4">' +
            '<h2 class="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">' + UI.icon('flag', 'text-primary text-xl') + 'יעדים תזונתיים</h2>' +
            UI.goalFields(gl) +
            '<p id="pf-derived" class="font-label-macro text-label-macro text-on-surface-variant font-normal">' + derived(gl) + '</p>' +
            '<button type="button" id="pf-recalc" class="' + UI.BTN_GHOST + '">' + UI.icon('calculate', 'text-xl text-primary') + 'חשב יעדים מומלצים לפי הפרטים</button>' +
          '</section>' +
          '<button type="submit" class="' + UI.BTN_PRIMARY + '">' + UI.icon('save', 'text-xl') + 'שמירת שינויים</button>' +
        '</form>' +
        '<section class="' + UI.CARD + ' flex flex-col gap-2">' +
          '<p class="font-label-badge text-label-badge text-on-surface-variant font-normal leading-relaxed">' +
            UI.icon('info', 'text-base align-middle ml-1') +
            'האפליקציה נותנת הערכות כלליות בלבד. היא אינה ייעוץ תזונתי רפואי ואינה תחליף לדיאטן מוסמך. הערכים התזונתיים והמחירים במאגר הם הערכות.</p>' +
          '<button type="button" id="pf-reset" class="self-start text-error font-label-badge text-label-badge min-h-[44px] flex items-center gap-1">' + UI.icon('delete', 'text-lg') + 'מחיקת כל הנתונים מהחשבון</button>' +
        '</section>' +
        '<section class="' + UI.CARD + ' flex flex-col gap-3">' +
          '<p class="font-label-badge text-label-badge text-on-surface-variant font-normal">מחוברים כ-<span dir="ltr">' + UI.esc(Store.user) + '</span></p>' +
          '<button type="button" id="pf-logout" class="' + UI.BTN_GHOST + '">' + UI.icon('logout', 'text-xl') + 'התנתקות</button>' +
        '</section>';
    },
    mount: function (root) {
      UI.bindPickers(root, picked);

      root.querySelector('#pf-recalc').addEventListener('click', function () {
        var r = UI.readProfile(root, picked);
        if (r.error) return App.toast(r.error, true);
        var s = Nutrition.suggestGoals(r.profile);
        root.querySelector('[name="kcal"]').value = s.kcal;
        root.querySelector('[name="protein"]').value = s.protein;
        root.querySelector('#pf-derived').innerHTML = derived(s);
        App.toast('היעדים חושבו מחדש. לחצו "שמירה" כדי לעדכן');
      });

      root.querySelector('#pf-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var rp = UI.readProfile(root, picked);
        if (rp.error) return App.toast(rp.error, true);
        var rg = UI.readGoals(root);
        if (rg.error) return App.toast(rg.error, true);
        Store.setProfile(rp.profile);
        Store.setGoals(rg.goals);
        Views.meals.resetFilters();
        App.toast('השינויים נשמרו ✓');
        App.render();
      });

      root.querySelector('#pf-logout').addEventListener('click', function () {
        Store.logout().then(function () { Views.meals.resetFilters(); App.go('#/dashboard'); },
          function (e) { App.toast(e.message, true); });
      });

      root.querySelector('#pf-reset').addEventListener('click', function () {
        if (!confirm('למחוק את הפרופיל, היעדים וכל יומן הארוחות? אי אפשר לבטל את הפעולה.')) return;
        Store.reset();
        Views.meals.resetFilters();
        App.go('#/dashboard');
      });
    }
  };
})();
