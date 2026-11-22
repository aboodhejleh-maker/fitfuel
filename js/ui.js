/* FitFuel – עזרי תצוגה משותפים. */
var UI = (function () {
  var TYPES = {
    breakfast: { label: 'בוקר', icon: 'wb_twilight' },
    lunch: { label: 'צהריים', icon: 'sunny' },
    dinner: { label: 'ערב', icon: 'nights_stay' },
    snack: { label: 'נשנוש / אימון', icon: 'fitness_center' }
  };
  var GOALS = {
    bulk: { label: 'עלייה במסת שריר', short: 'מסה', icon: 'fitness_center' },
    cut: { label: 'ירידה באחוזי שומן', short: 'חיטוב', icon: 'local_fire_department' },
    maintain: { label: 'שמירה על המשקל', short: 'שמירה', icon: 'balance' }
  };

  var INPUT = 'w-full bg-surface-container-highest/60 text-on-surface rounded-xl px-3 py-3 font-body-lg text-body-lg outline-none border border-white/5 focus:border-primary/70 placeholder:text-on-surface-variant/50';
  var CARD = 'rounded-xl bg-surface-container p-3.5 shadow-md';
  var BTN_PRIMARY = 'w-full bg-primary text-on-primary rounded-full py-3.5 font-label-badge text-body-lg font-bold flex items-center justify-center gap-2 shadow-[0_8px_24px_-4px_rgba(16,185,129,0.35)] active:scale-95 transition-all';
  var BTN_GHOST = 'w-full bg-white/5 border border-white/10 text-on-surface rounded-full py-3 font-label-badge text-body-md font-bold flex items-center justify-center gap-2 active:scale-95 transition-all';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return Math.round(n || 0).toLocaleString('en-US'); }
  function nisText(n) {
    var v = Math.round((n || 0) * 10) / 10;
    return '₪' + (v % 1 === 0 ? v : v.toFixed(1));
  }
  function nis(n) { return '<span class="bidi" dir="ltr">' + nisText(n) + '</span>'; }
  function g(n) { return '<span class="bidi" dir="ltr">' + num(n) + 'g</span>'; }
  function icon(name, cls, fill) {
    return '<span class="material-symbols-outlined ' + (cls || '') + '"' +
      (fill ? ' style="font-variation-settings:\'FILL\' 1"' : '') + '>' + name + '</span>';
  }
  function pct(a, b) { return b > 0 ? Math.max(0, Math.min(100, Math.round((a / b) * 100))) : 0; }

  function chip(label, active, attrs) {
    return '<button type="button" ' + (attrs || '') + ' class="flex-shrink-0 px-3.5 min-h-[40px] rounded-full font-label-badge text-label-badge transition-all ' +
      (active ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container-high text-on-surface-variant') + '">' + label + '</button>';
  }

  function field(label, inner, hint) {
    return '<label class="flex flex-col gap-1.5"><span class="font-label-badge text-label-badge text-on-surface-variant">' + label + '</span>' +
      inner + (hint ? '<span class="font-label-macro text-label-macro text-on-surface-variant/70 font-normal">' + hint + '</span>' : '') + '</label>';
  }
  function numInput(name, value, attrs) {
    return '<input class="' + INPUT + '" type="number" inputmode="decimal" dir="ltr" name="' + name + '" value="' +
      (value == null ? '' : esc(value)) + '" ' + (attrs || '') + '/>';
  }

  // שדות פרופיל משותפים למסך ההרשמה ולמסך הפרופיל
  function profileFields(p) {
    p = p || {};
    var goalBtns = Object.keys(GOALS).map(function (k) {
      var on = p.goal === k;
      return '<button type="button" data-goal="' + k + '" class="goal-btn flex-1 flex flex-col items-center gap-1 rounded-xl px-2 py-3 min-h-[72px] border transition-all ' +
        (on ? 'bg-primary/15 border-primary text-primary' : 'bg-surface-container-high border-white/5 text-on-surface-variant') + '">' +
        icon(GOALS[k].icon, 'text-2xl') + '<span class="font-label-badge text-label-badge text-center leading-tight">' + GOALS[k].label + '</span></button>';
    }).join('');
    var sexBtns = [['male', 'זכר'], ['female', 'נקבה']].map(function (x) {
      return chip(x[1], p.sex === x[0], 'data-sex="' + x[0] + '"');
    }).join('');
    return '' +
      field('איך קוראים לך?', '<input class="' + INPUT + '" type="text" name="name" maxlength="20" autocomplete="given-name" value="' + esc(p.name || '') + '" placeholder="למשל: דניאל"/>') +
      '<div class="grid grid-cols-3 gap-2">' +
        field('גיל', numInput('age', p.age, 'min="16" max="80" placeholder="23"')) +
        field('גובה (ס״מ)', numInput('height', p.height, 'min="130" max="220" placeholder="178"')) +
        field('משקל (ק״ג)', numInput('weight', p.weight, 'min="35" max="200" step="0.1" placeholder="75"')) +
      '</div>' +
      '<div class="flex flex-col gap-1.5"><span class="font-label-badge text-label-badge text-on-surface-variant">מין (נדרש לחישוב הקלוריות)</span>' +
        '<div class="flex gap-2" data-group="sex">' + sexBtns + '</div></div>' +
      '<div class="flex flex-col gap-1.5"><span class="font-label-badge text-label-badge text-on-surface-variant">מטרת האימון</span>' +
        '<div class="flex gap-2" data-group="goal">' + goalBtns + '</div></div>';
  }

  // קורא ומאמת את שדות הפרופיל. מחזיר {profile} או {error}
  function readProfile(root, picked) {
    function v(n) { var el = root.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; }
    var p = {
      name: v('name'), age: parseFloat(v('age')), height: parseFloat(v('height')),
      weight: parseFloat(v('weight')), sex: picked.sex, goal: picked.goal
    };
    if (!p.name) return { error: 'חסר שם' };
    if (!(p.age >= 16 && p.age <= 80)) return { error: 'גיל צריך להיות בין 16 ל-80' };
    if (!(p.height >= 130 && p.height <= 220)) return { error: 'גובה צריך להיות בין 130 ל-220 ס״מ' };
    if (!(p.weight >= 35 && p.weight <= 200)) return { error: 'משקל צריך להיות בין 35 ל-200 ק״ג' };
    if (!p.sex) return { error: 'יש לבחור מין לצורך חישוב הקלוריות' };
    if (!p.goal) return { error: 'יש לבחור מטרת אימון' };
    return { profile: p };
  }

  function goalFields(gl) {
    gl = gl || {};
    return '<div class="grid grid-cols-2 gap-2">' +
        field('יעד קלוריות יומי', numInput('kcal', gl.kcal, 'min="1000" max="6000" step="10"')) +
        field('יעד חלבון יומי (גרם)', numInput('protein', gl.protein, 'min="30" max="400"')) +
      '</div>' +
      field('תקציב אוכל יומי (₪) – לא חובה', numInput('budget', gl.budget || '', 'min="0" max="500" placeholder="למשל: 45"'));
  }

  function readGoals(root) {
    function v(n) { return parseFloat(root.querySelector('[name="' + n + '"]').value); }
    var kcal = v('kcal'), protein = v('protein'), budget = v('budget');
    if (!(kcal >= 1000 && kcal <= 6000)) return { error: 'יעד הקלוריות צריך להיות בין 1,000 ל-6,000' };
    if (!(protein >= 30 && protein <= 400)) return { error: 'יעד החלבון צריך להיות בין 30 ל-400 גרם' };
    if (protein * 4 > kcal * 0.6) return { error: 'יעד החלבון גבוה מדי ביחס לקלוריות' };
    var goals = Nutrition.macrosFor(Math.round(kcal), Math.round(protein));
    goals.budget = budget > 0 ? Math.round(budget) : null;
    return { goals: goals };
  }

  // מחבר קבוצות כפתורי בחירה (מין / מטרה) לאובייקט picked
  function swap(el, on, onCls, offCls) {
    (on ? offCls : onCls).split(' ').forEach(function (c) { el.classList.remove(c); });
    (on ? onCls : offCls).split(' ').forEach(function (c) { el.classList.add(c); });
  }
  function bindPickers(root, picked) {
    var sex = root.querySelectorAll('[data-sex]'), goal = root.querySelectorAll('[data-goal]');
    sex.forEach(function (b) {
      b.addEventListener('click', function () {
        picked.sex = b.dataset.sex;
        sex.forEach(function (x) {
          swap(x, x === b, 'bg-primary text-on-primary font-bold', 'bg-surface-container-high text-on-surface-variant');
        });
      });
    });
    goal.forEach(function (b) {
      b.addEventListener('click', function () {
        picked.goal = b.dataset.goal;
        goal.forEach(function (x) {
          swap(x, x === b, 'bg-primary/15 border-primary text-primary', 'bg-surface-container-high border-white/5 text-on-surface-variant');
        });
      });
    });
  }

  return {
    TYPES: TYPES, GOALS: GOALS, INPUT: INPUT, CARD: CARD, BTN_PRIMARY: BTN_PRIMARY, BTN_GHOST: BTN_GHOST,
    esc: esc, num: num, nis: nis, nisText: nisText, g: g, icon: icon, pct: pct, chip: chip,
    field: field, numInput: numInput,
    profileFields: profileFields, readProfile: readProfile, goalFields: goalFields, readGoals: readGoals,
    bindPickers: bindPickers
  };
})();
