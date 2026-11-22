/* FitFuel – נתב, כותרת, ניווט תחתון והודעות. */
var App = (function () {
  var root = document.getElementById('app');
  var hdr = document.getElementById('hdr');
  var nav = document.getElementById('nav');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  var lastRoute = null;

  function parse() {
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    return { name: parts[0] || 'dashboard', arg: parts[1] ? decodeURIComponent(parts[1]) : null };
  }

  function header(view) {
    var inner;
    if (view.back) {
      inner = '<div class="flex items-center gap-2">' +
        '<button type="button" id="back-btn" aria-label="חזרה" class="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-on-surface active:bg-white/10">' +
        UI.icon('arrow_forward', 'text-2xl') + '</button>' +
        '<span class="font-headline-sm text-headline-sm text-on-surface">' + UI.esc(view.title || '') + '</span></div>';
    } else {
      inner = '<div class="flex items-center gap-2.5">' +
        '<div class="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">' + UI.icon('bolt', 'text-2xl', true) + '</div>' +
        '<div class="flex flex-col"><span class="font-headline-sm text-headline-sm text-primary tracking-tight leading-tight" dir="ltr">FitFuel</span>' +
        '<span class="font-label-macro text-label-macro text-on-surface-variant font-normal">תזונת סטודנט חכמה</span></div></div>';
    }
    var streak = Store.profile ? Nutrition.streak() : 0;
    var pill = streak > 0
      ? '<div class="flex items-center gap-1 bg-surface-container-high/80 px-2.5 py-1 rounded-full" title="ימי תיעוד רצופים">' +
        '<span class="font-label-macro text-label-macro text-secondary">' + streak + (streak === 1 ? ' יום' : ' ימים') + '</span><span class="text-xs">🔥</span></div>'
      : '';
    hdr.innerHTML = '<div class="h-16 px-margin max-w-md mx-auto flex items-center justify-between">' + inner + pill + '</div>';
    var back = document.getElementById('back-btn');
    if (back) back.addEventListener('click', function () {
      if (navCount > 0) history.back(); else go('#/dashboard');
    });
  }
  var navCount = 0; // כמה מעברים נעשו בתוך האפליקציה (כדי ש"חזרה" לא תצא ממנה)

  function render() {
    var r = parse();
    if (!Store.user) r = { name: 'auth', arg: null };
    else if (!Store.profile || !Store.goals) r = { name: 'onboarding', arg: null };
    else if (r.name === 'onboarding' || r.name === 'auth' || !Views[r.name]) r = { name: 'dashboard', arg: null };

    var view = Views[r.name];
    var key = r.name + '/' + (r.arg || '');
    var isNew = key !== lastRoute;
    lastRoute = key;

    header(view);
    var box = document.createElement('div');
    box.className = 'flex flex-col gap-space-md';
    box.innerHTML = view.render(r.arg, isNew);
    root.innerHTML = '';
    root.appendChild(box);
    if (view.mount) view.mount(box, r.arg);

    nav.hidden = !view.nav;
    nav.querySelectorAll('.nav-item').forEach(function (a) {
      a.classList.toggle('active', a.dataset.nav === r.name);
    });
    if (isNew) window.scrollTo(0, 0);
  }

  function go(hash) {
    if (location.hash === hash) render(); else location.hash = hash;
  }

  function toast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  window.addEventListener('hashchange', function () { navCount++; if (ready) render(); });

  // המסך הראשון מוצג רק אחרי שמצב המשתמש נטען מהשרת
  var ready = false;
  root.innerHTML = '<p class="text-center text-on-surface-variant mt-16">טוען…</p>';
  Store.init().then(function () { ready = true; render(); }, function () {
    root.innerHTML = '<div class="text-center mt-16 flex flex-col gap-3"><p class="text-on-surface">לא הצלחנו להתחבר לשרת.</p>' +
      '<button type="button" onclick="location.reload()" class="' + UI.BTN_GHOST + '">ניסיון נוסף</button></div>';
  });

  return { render: render, go: go, toast: toast };
})();
