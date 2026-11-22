"""FitFuel – שרת Flask: מגיש את צד הלקוח ומספק API מעל שכבת הנתונים (db.py)."""
import json
import math
import os
import re
from datetime import timedelta
from functools import wraps

from flask import Flask, g, jsonify, request, send_from_directory, session

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from db import StoreError, SupabaseStore, get_store

ROOT = os.path.dirname(os.path.abspath(__file__))
GOALS = ("bulk", "cut", "maintain")
MEAL_TYPES = ("breakfast", "lunch", "dinner", "snack")

store = get_store()

app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get("SECRET_KEY")
if not app.secret_key:
    if isinstance(store, SupabaseStore):
        raise RuntimeError("חובה להגדיר SECRET_KEY כשעובדים מול Supabase")
    app.secret_key = "dev-only-not-secret"
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=bool(os.environ.get("RAILWAY_ENVIRONMENT")),
    PERMANENT_SESSION_LIFETIME=timedelta(days=30),
    MAX_CONTENT_LENGTH=64 * 1024,
)


# ------------------------------------------------------------ מאגר ארוחות ומזונות

def js_round(x):
    """עיגול כמו Math.round ב-JavaScript (חצי תמיד כלפי מעלה)."""
    return math.floor(x + 0.5)


def load_seed():
    """קורא את data/seed.json וגוזר לכל ארוחה קלוריות (מהמאקרו) ועלות (מסכום המצרכים)."""
    with open(os.path.join(ROOT, "data", "seed.json"), encoding="utf-8") as fh:
        seed = json.load(fh)
    meals = []
    for i, raw in enumerate(seed["meals"]):
        d = dict(raw)
        p, c, f = d.pop("p"), d.pop("c"), d.pop("f")
        meals.append({
            "id": d.pop("id"), "name": d.pop("name"), "prep_minutes": d.pop("time"),
            "protein": p, "carbs": c, "fat": f,
            "kcal": js_round((4 * p + 4 * c + 9 * f) / 5) * 5,
            "cost": js_round(sum(ing["cost"] for ing in d["ingredients"]) * 10) / 10,
            "details": d, "sort_order": i,
        })
    foods = [{
        "name": f["n"], "kcal": f["kcal"], "protein": f["p"], "carbs": f["c"], "fat": f["f"],
        "unit_label": (f.get("unit") or {}).get("l"), "unit_grams": (f.get("unit") or {}).get("g"),
    } for f in seed["foods"]]
    return meals, foods


def meal_out(r):
    return dict(r["details"], id=r["id"], name=r["name"], time=r["prep_minutes"], cost=r["cost"],
                kcal=r["kcal"], p=r["protein"], c=r["carbs"], f=r["fat"])


def food_out(r):
    out = {"n": r["name"], "kcal": r["kcal"], "p": r["protein"], "c": r["carbs"], "f": r["fat"]}
    if r.get("unit_label"):
        out["unit"] = {"l": r["unit_label"], "g": r["unit_grams"]}
    return out


if os.path.exists(os.path.join(ROOT, "data", "seed.json")):
    store.seed_catalog(*load_seed())


# ------------------------------------------------------------------- עזרים

class BadRequest(Exception):
    pass


@app.errorhandler(BadRequest)
@app.errorhandler(StoreError)
def handle_bad_request(e):
    return jsonify(error=str(e)), 400


def body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise BadRequest("בקשה לא תקינה")
    return data


def number(data, key, lo, hi, label, required=True, integer=False):
    v = data.get(key)
    if v is None or v == "":
        if required:
            raise BadRequest("חסר ערך: " + label)
        return None
    if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not lo <= v <= hi:
        raise BadRequest(f"{label}: ערך לא תקין")
    return int(round(v)) if integer else v


def text(data, key, max_len, label, required=True):
    v = data.get(key)
    if v is None or v == "":
        if required:
            raise BadRequest("חסר ערך: " + label)
        return None
    if not isinstance(v, str) or len(v) > max_len:
        raise BadRequest(f"{label}: ערך לא תקין")
    return v.strip()


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        uid = session.get("uid")
        user = store.get_user(uid) if uid else None
        if not user:
            session.clear()
            return jsonify(error="נדרשת התחברות"), 401
        g.uid, g.user = uid, user
        return fn(*args, **kwargs)
    return wrapper


def start_session(uid):
    session.clear()
    session["uid"] = uid
    session.permanent = True


# ----------------------------------------------------------------- צד לקוח

@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/css/<path:name>")
def css(name):
    return send_from_directory(os.path.join(ROOT, "css"), name)


@app.get("/js/<path:name>")
def js(name):
    return send_from_directory(os.path.join(ROOT, "js"), name)


@app.after_request
def no_cache(resp):
    resp.headers["Cache-Control"] = "no-store"
    return resp


# -------------------------------------------------------------- הרשמה וכניסה

def credentials():
    data = body()
    email = (text(data, "email", 254, "אימייל") or "").lower()
    password = data.get("password")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise BadRequest("כתובת האימייל לא תקינה")
    if not isinstance(password, str) or not 8 <= len(password) <= 72:
        raise BadRequest("הסיסמה צריכה להיות באורך 8 עד 72 תווים")
    return email, password


@app.post("/api/auth/register")
def register():
    email, password = credentials()
    start_session(store.create_user(email, password))
    return jsonify(ok=True)


@app.post("/api/auth/login")
def login():
    email, password = credentials()
    uid = store.authenticate(email, password)
    if not uid:
        return jsonify(error="אימייל או סיסמה שגויים"), 401
    start_session(uid)
    return jsonify(ok=True)


@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


# ------------------------------------------------------------- נתוני המשתמש

@app.get("/api/state")
@login_required
def state():
    u = g.user
    profile = goals = None
    if u.get("goal"):
        profile = {"name": u["name"], "sex": u["sex"], "age": u["age"], "height": u["height_cm"],
                   "weight": u["weight_kg"], "goal": u["goal"]}
    if u.get("calorie_target"):
        goals = {"kcal": u["calorie_target"], "protein": u["protein_target"], "carbs": u["carbs_target"],
                 "fat": u["fat_target"], "budget": u["daily_budget"]}
    log = {}
    for r in store.get_logs(g.uid):
        log.setdefault(r["log_date"], []).append({
            "id": r["id"], "time": r["log_time"], "type": r["meal_type"], "name": r["name"],
            "mealId": r["meal_id"], "source": r["source"], "kcal": r["kcal"], "protein": r["protein"],
            "carbs": r["carbs"], "fat": r["fat"], "cost": r["cost"],
        })
    return jsonify(email=u["email"], profile=profile, goals=goals, log=log,
                   favorites=store.get_favorites(g.uid),
                   meals=[meal_out(m) for m in store.get_meals()],
                   foods=[food_out(f) for f in store.get_foods()])


@app.put("/api/profile")
@login_required
def save_profile():
    data, fields = body(), {}
    p, gl = data.get("profile"), data.get("goals")
    if isinstance(p, dict):
        if p.get("sex") not in ("male", "female") or p.get("goal") not in GOALS:
            raise BadRequest("פרופיל לא תקין")
        fields.update(
            name=text(p, "name", 20, "שם"), sex=p["sex"], goal=p["goal"],
            age=number(p, "age", 16, 80, "גיל", integer=True),
            height_cm=number(p, "height", 130, 220, "גובה"),
            weight_kg=number(p, "weight", 35, 200, "משקל"),
        )
    if isinstance(gl, dict):
        fields.update(
            calorie_target=number(gl, "kcal", 1000, 6000, "יעד קלוריות", integer=True),
            protein_target=number(gl, "protein", 30, 400, "יעד חלבון", integer=True),
            carbs_target=number(gl, "carbs", 0, 1500, "פחמימות", integer=True),
            fat_target=number(gl, "fat", 0, 700, "שומן", integer=True),
            daily_budget=number(gl, "budget", 1, 500, "תקציב", required=False, integer=True),
        )
    if not fields:
        raise BadRequest("אין מה לשמור")
    store.save_profile(g.uid, fields)
    return jsonify(ok=True)


@app.post("/api/log")
@login_required
def add_log():
    data = body()
    e = data.get("entry")
    date = data.get("date")
    if not isinstance(e, dict) or not isinstance(date, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        raise BadRequest("רשומה לא תקינה")
    if e.get("type") not in MEAL_TYPES:
        raise BadRequest("סוג ארוחה לא תקין")
    log_time = text(e, "time", 5, "שעה", required=False)
    if log_time and not re.fullmatch(r"\d{2}:\d{2}", log_time):
        raise BadRequest("שעה לא תקינה")
    store.add_log(g.uid, {
        "id": text(e, "id", 40, "מזהה"), "log_date": date, "log_time": log_time, "meal_type": e["type"],
        "name": text(e, "name", 120, "שם הארוחה"),
        "meal_id": text(e, "mealId", 60, "ארוחה", required=False),
        "source": text(e, "source", 20, "מקור", required=False),
        "kcal": number(e, "kcal", 0, 20000, "קלוריות"),
        "protein": number(e, "protein", 0, 2000, "חלבון", required=False) or 0,
        "carbs": number(e, "carbs", 0, 5000, "פחמימות", required=False) or 0,
        "fat": number(e, "fat", 0, 2000, "שומן", required=False) or 0,
        "cost": number(e, "cost", 0, 5000, "עלות", required=False) or 0,
    })
    return jsonify(ok=True)


@app.delete("/api/log/<log_id>")
@login_required
def delete_log(log_id):
    store.delete_log(g.uid, log_id)
    return jsonify(ok=True)


@app.put("/api/favorites/<meal_id>")
@login_required
def set_favorite(meal_id):
    if len(meal_id) > 60:
        raise BadRequest("ארוחה לא תקינה")
    store.set_favorite(g.uid, meal_id, bool(body().get("on")))
    return jsonify(ok=True)


@app.delete("/api/account/data")
@login_required
def reset_data():
    store.reset_user(g.uid)
    return jsonify(ok=True)


# --------------------------------------------------------- סינון ארוחות בשרת

@app.get("/api/meals")
def meals():
    """מאגר הארוחות עם סינון: ?goal=bulk|cut|maintain&max_time=דקות&max_cost=ש"ח"""
    goal = request.args.get("goal")
    max_time = request.args.get("max_time", type=float)
    max_cost = request.args.get("max_cost", type=float)
    out = []
    for m in map(meal_out, store.get_meals()):
        if goal and goal not in m.get("goals", []):
            continue
        if max_time and m["time"] > max_time:
            continue
        if max_cost and m["cost"] > max_cost:
            continue
        out.append(m)
    return jsonify(meals=out)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5000)), debug=bool(os.environ.get("FLASK_DEBUG")))
