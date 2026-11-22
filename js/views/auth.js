/* מסך כניסה והרשמה (אימייל וסיסמה). */
(function () {
  var st = { mode: 'login', busy: false };

  Views.auth = {
    nav: false,
    render: function () {
      var reg = st.mode === 'register';
      return '<section class="flex flex-col gap-2 mt-1">' +
          '<span class="self-start bg-primary/15 text-primary font-label-badge text-label-badge px-2.5 py-1 rounded-full flex items-center gap-1">' + UI.icon('bolt', 'text-sm', true) + 'תזונת סטודנט חכמה ופשוטה</span>' +
          '<h1 class="font-display-hero-mobile text-display-hero-mobile text-on-surface">' + (reg ? 'יצירת חשבון' : 'כניסה לחשבון') + '</h1>' +
          '<p class="text-on-surface-variant">ארוחות בריאות, זולות ומהירות, ומעקב יומי אחרי קלוריות וחלבון.</p>' +
        '</section>' +
        '<form id="auth-form" class="' + UI.CARD + ' flex flex-col gap-4" novalidate>' +
          UI.field('אימייל', '<input class="' + UI.INPUT + '" type="email" name="email" dir="ltr" autocomplete="email" maxlength="254" placeholder="name@example.com"/>') +
          UI.field('סיסמה', '<input class="' + UI.INPUT + '" type="password" name="password" dir="ltr" maxlength="72" autocomplete="' + (reg ? 'new-password' : 'current-password') + '"/>',
            reg ? 'לפחות 8 תווים' : '') +
          '<button type="submit" class="' + UI.BTN_PRIMARY + '">' + UI.icon(reg ? 'person_add' : 'login', 'text-xl') + (reg ? 'הרשמה' : 'כניסה') + '</button>' +
          '<button type="button" id="auth-switch" class="' + UI.BTN_GHOST + '">' + (reg ? 'כבר יש לי חשבון' : 'אין לי חשבון עדיין – הרשמה') + '</button>' +
        '</form>';
    },
    mount: function (root) {
      root.querySelector('#auth-switch').addEventListener('click', function () {
        st.mode = st.mode === 'login' ? 'register' : 'login';
        App.render();
      });
      root.querySelector('#auth-form').addEventListener('submit', function (e) {
        e.preventDefault();
        if (st.busy) return;
        var email = root.querySelector('[name="email"]').value.trim();
        var password = root.querySelector('[name="password"]').value;
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return App.toast('כתובת האימייל לא תקינה', true);
        if (password.length < 8) return App.toast('הסיסמה צריכה להכיל לפחות 8 תווים', true);
        st.busy = true;
        Store[st.mode](email, password).then(function () {
          st = { mode: 'login', busy: false };
          App.go('#/dashboard');
        }, function (err) {
          st.busy = false;
          App.toast(err.message, true);
        });
      });
    }
  };
})();
