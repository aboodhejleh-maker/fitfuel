/* FitFuel – חישובי יעדים, סיכומים ותאריכים. */
var Nutrition = (function () {
  var GOAL_RULES = {
    bulk: { kcal: 300, protein: 2.0 },
    cut: { kcal: -400, protein: 2.2 },
    maintain: { kcal: 0, protein: 1.6 }
  };
  var ACTIVITY = 1.55; // מתאמן 3-5 פעמים בשבוע

  function dateKey(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function nowTime() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function defaultType() {
    var h = new Date().getHours();
    if (h < 11) return 'breakfast';
    if (h < 16) return 'lunch';
    return 'dinner';
  }

  // שומן = 25% מהקלוריות, פחמימות = היתרה
  function macrosFor(kcal, protein) {
    var fat = Math.round((kcal * 0.25) / 9);
    var carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { kcal: kcal, protein: protein, carbs: carbs, fat: fat };
  }

  // Mifflin-St Jeor
  function suggestGoals(p) {
    var rule = GOAL_RULES[p.goal] || GOAL_RULES.maintain;
    var bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'female' ? -161 : 5);
    var kcal = Math.round((bmr * ACTIVITY + rule.kcal) / 50) * 50;
    var protein = Math.round((p.weight * rule.protein) / 5) * 5;
    return macrosFor(kcal, protein);
  }

  function totals(entries) {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0, cost: 0 };
    entries.forEach(function (e) {
      t.kcal += e.kcal || 0;
      t.protein += e.protein || 0;
      t.carbs += e.carbs || 0;
      t.fat += e.fat || 0;
      t.cost += e.cost || 0;
    });
    return t;
  }

  // כמה ימים תועדו השבוע (השבוע מתחיל ביום ראשון)
  function weekDaysLogged() {
    var d = new Date(), count = 0, n = d.getDay();
    for (var i = 0; i <= n; i++) {
      var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
      if (Store.entries(dateKey(x)).length) count++;
    }
    return count;
  }

  // רצף ימים רצופים עם תיעוד (יום נוכחי ריק לא שובר את הרצף)
  function streak() {
    var d = new Date(), count = 0;
    for (var i = 0; i < 366; i++) {
      var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
      if (Store.entries(dateKey(x)).length) count++;
      else if (i > 0) break;
    }
    return count;
  }

  function entryFromMeal(meal, type) {
    return {
      time: nowTime(), type: type || defaultType(), name: meal.name, mealId: meal.id, source: 'meal',
      kcal: meal.kcal, protein: meal.p, carbs: meal.c, fat: meal.f, cost: meal.cost
    };
  }

  function logMeal(meal, type) {
    return Store.addEntry(dateKey(), entryFromMeal(meal, type));
  }

  return {
    dateKey: dateKey, nowTime: nowTime, defaultType: defaultType,
    macrosFor: macrosFor, suggestGoals: suggestGoals, totals: totals,
    weekDaysLogged: weekDaysLogged, streak: streak,
    entryFromMeal: entryFromMeal, logMeal: logMeal
  };
})();
