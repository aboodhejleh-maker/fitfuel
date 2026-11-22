/* מסך הרשמה: שלב 1 – פרופיל, שלב 2 – יעדים תזונתיים. */
(function () {
  var st = { step: 1, profile: null, picked: {} };

  function dots() {
    return '<div class="flex items-center gap-1.5">' + [1, 2].map(function (i) {
      return '<span class="h-1.5 rounded-full transition-all ' + (i === st.step ? 'w-8 bg-primary' : 'w-4 bg-surface-container-highest') + '"></span>';
    }).join('') + '<span class="font-label-macro text-label-macro text-on-surface-variant mr-1">שלב ' + st.step + ' מתוך 2</span></div>';
  }

  function step1() {
    var p = st.profile || {};
    p.sex = st.picked.sex; p.goal = st.picked.goal;
    return '<section class="flex flex-col gap-2 mt-1">' +
        '<span class="self-start bg-primary/15 text-primary font-label-badge text-label-badge px-2.5 py-1 rounded-full flex items-center gap-1">' + UI.icon('bolt', 'text-sm', true) + 'תזונת סטודנט חכמה ופשוטה</span>' +
        '<h1 class="font-display-hero-mobile text-display-hero-mobile text-on-surface">ברוכים הבאים 🚀</h1>' +
        '<p class="text-on-surface-variant">ארוחות בריאות, זולות ומהירות, ומעקב יומי אחרי קלוריות וחלבון. מתחילים בכמה פרטים בסיסיים.</p>' +
        dots() +
      '</section>' +
      '<form id="ob-form" class="' + UI.CARD + ' flex flex-col gap-4" novalidate>' + UI.profileFields(p) +
        '<button type="submit" class="' + UI.BTN_PRIMARY + '">המשך ליעדים' + UI.icon('arrow_back', 'text-xl') + '</button>' +
      '</form>' +
      '<p class="font-label-macro text-label-macro text-on-surface-variant/70 font-normal text-center">מחוברים כ-<span dir="ltr">' + UI.esc(Store.user) + '</span></p>' +
      '<button type="button" id="ob-logout" class="self-center text-on-surface-variant font-label-badge text-label-badge min-h-[44px] underline">התנתקות</button>';
  }

  function step2() {
    var s = Nutrition.suggestGoals(st.profile);
    return '<section class="flex flex-col gap-2 mt-1">' +
        '<h1 class="font-headline-lg text-headline-lg text-on-surface">היעדים היומיים שלך 🎯</h1>' +
        '<p class="text-on-surface-variant">חישבנו הצעה לפי הפרטים שלך והמטרה: <b class="text-primary">' + UI.GOALS[st.profile.goal].label + '</b>. אפשר לשנות כל ערך.</p>' +
        dots() +
      '</section>' +
      '<form id="goal-form" class="' + UI.CARD + ' flex flex-col gap-4" novalidate>' +
        '<div class="grid grid-cols-2 gap-2">' +
          '<div class="bg-surface-container-high rounded-xl p-3 flex flex-col"><span class="font-label-macro text-label-macro text-on-surface-variant">קלוריות מוצעות</span><span class="font-metric-large-mobile text-metric-large-mobile text-primary">' + UI.num(s.kcal) + '</span></div>' +
          '<div class="bg-surface-container-high rounded-xl p-3 flex flex-col"><span class="font-label-macro text-label-macro text-on-surface-variant">חלבון מוצע</span><span class="font-metric-large-mobile text-metric-large-mobile text-secondary">' + UI.g(s.protein) + '</span></div>' +
        '</div>' +
        UI.goalFields(s) +
        '<p class="font-label-macro text-label-macro text-on-surface-variant/70 font-normal">ההצעה היא הערכה כללית (נוסחת Mifflin-St Jeor) ואינה תחליף לייעוץ של דיאטן מוסמך.</p>' +
        '<button type="submit" class="' + UI.BTN_PRIMARY + '">' + UI.icon('check_circle', 'text-xl') + 'סיום והתחלת מעקב</button>' +
        '<button type="button" id="ob-back" class="' + UI.BTN_GHOST + '">חזרה לפרטים</button>' +
      '</form>';
  }

  Views.onboarding = {
    nav: false,
    render: function () { return st.step === 1 ? step1() : step2(); },
    mount: function (root) {
      if (st.step === 1) {
        UI.bindPickers(root, st.picked);
        root.querySelector('#ob-logout').addEventListener('click', function () {
          Store.logout().then(App.render, function (e) { App.toast(e.message, true); });
        });
        root.querySelector('#ob-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var r = UI.readProfile(root, st.picked);
          if (r.error) return App.toast(r.error, true);
          st.profile = r.profile; st.step = 2;
          App.render(); window.scrollTo(0, 0);
        });
      } else {
        root.querySelector('#ob-back').addEventListener('click', function () { st.step = 1; App.render(); });
        root.querySelector('#goal-form').addEventListener('submit', function (e) {
          e.preventDefault();
          var r = UI.readGoals(root);
          if (r.error) return App.toast(r.error, true);
          Store.setProfile(st.profile);
          Store.setGoals(r.goals);
          st = { step: 1, profile: null, picked: {} };
          App.toast('הפרופיל נשמר. בהצלחה! 💪');
          App.go('#/dashboard');
        });
      }
    }
  };
})();
