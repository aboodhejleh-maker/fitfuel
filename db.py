"""FitFuel – שכבת הנתונים.

שני מימושים עם אותו ממשק:
  SupabaseStore – סביבת הייצור: Supabase Auth + PostgreSQL (הטבלאות ב-supabase/schema.sql).
  LocalStore    – פיתוח מקומי בלי חשבון Supabase: קובץ SQLite עם אותן טבלאות.

get_store() בוחר ב-Supabase כש-SUPABASE_URL ו-SUPABASE_SERVICE_KEY מוגדרים.
"""
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager

from werkzeug.security import check_password_hash, generate_password_hash

PROFILE_COLS = ("name", "sex", "age", "height_cm", "weight_kg", "goal", "calorie_target",
                "protein_target", "carbs_target", "fat_target", "daily_budget")
LOG_COLS = ("id", "log_date", "log_time", "meal_type", "name", "meal_id", "source",
            "kcal", "protein", "carbs", "fat", "cost")
MEAL_COLS = ("id", "name", "prep_minutes", "cost", "kcal", "protein", "carbs", "fat", "details", "sort_order")
FOOD_COLS = ("name", "kcal", "protein", "carbs", "fat", "unit_label", "unit_grams")


class StoreError(Exception):
    """שגיאה שאפשר להציג למשתמש."""


def _only(row, cols):
    return {c: row.get(c) for c in cols}


# ---------------------------------------------------------------- SQLite מקומי

LOCAL_SCHEMA = """
create table if not exists profiles (
  id text primary key, email text unique not null, password_hash text not null,
  name text, sex text, age integer, height_cm real, weight_kg real, goal text,
  calorie_target integer, protein_target integer, carbs_target integer, fat_target integer, daily_budget integer
);
create table if not exists foods (
  id integer primary key autoincrement, name text not null,
  kcal real, protein real, carbs real, fat real, unit_label text, unit_grams real
);
create table if not exists meals (
  id text primary key, name text not null, prep_minutes integer, cost real,
  kcal real, protein real, carbs real, fat real, details text, sort_order integer
);
create table if not exists daily_logs (
  id text primary key, user_id text not null references profiles(id) on delete cascade,
  log_date text not null, log_time text, meal_type text, name text not null, meal_id text, source text,
  kcal real, protein real, carbs real, fat real, cost real, created_at text default current_timestamp
);
create index if not exists daily_logs_user on daily_logs(user_id, log_date);
create table if not exists favorites (
  user_id text not null references profiles(id) on delete cascade, meal_id text not null,
  primary key (user_id, meal_id)
);
"""


class LocalStore:
    def __init__(self, path):
        self.path = path
        with self._db() as db:
            db.executescript(LOCAL_SCHEMA)

    @contextmanager
    def _db(self):
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        con.execute("pragma foreign_keys = on")
        try:
            with con:
                yield con
        finally:
            con.close()

    def _all(self, sql, args=()):
        with self._db() as db:
            return [dict(r) for r in db.execute(sql, args)]

    def _run(self, sql, args=()):
        with self._db() as db:
            db.execute(sql, args)

    def create_user(self, email, password):
        uid = str(uuid.uuid4())
        try:
            self._run("insert into profiles (id, email, password_hash) values (?, ?, ?)",
                      (uid, email, generate_password_hash(password)))
        except sqlite3.IntegrityError:
            raise StoreError("כבר קיים חשבון עם האימייל הזה")
        return uid

    def authenticate(self, email, password):
        rows = self._all("select id, password_hash from profiles where email = ?", (email,))
        if rows and check_password_hash(rows[0]["password_hash"], password):
            return rows[0]["id"]
        return None

    def get_user(self, uid):
        rows = self._all("select * from profiles where id = ?", (uid,))
        if not rows:
            return None
        rows[0].pop("password_hash")
        return rows[0]

    def save_profile(self, uid, fields):
        fields = {k: v for k, v in fields.items() if k in PROFILE_COLS}
        if fields:
            sets = ", ".join(f"{k} = ?" for k in fields)
            self._run(f"update profiles set {sets} where id = ?", (*fields.values(), uid))

    def get_logs(self, uid):
        return self._all("select * from daily_logs where user_id = ? order by log_date, created_at, rowid", (uid,))

    def add_log(self, uid, row):
        row = _only(row, LOG_COLS)
        cols = ", ".join(row)
        marks = ", ".join("?" for _ in row)
        try:
            self._run(f"insert into daily_logs (user_id, {cols}) values (?, {marks})", (uid, *row.values()))
        except sqlite3.IntegrityError:
            raise StoreError("הרשומה כבר קיימת")

    def delete_log(self, uid, log_id):
        self._run("delete from daily_logs where user_id = ? and id = ?", (uid, log_id))

    def get_favorites(self, uid):
        return [r["meal_id"] for r in self._all("select meal_id from favorites where user_id = ?", (uid,))]

    def set_favorite(self, uid, meal_id, on):
        if on:
            self._run("insert or ignore into favorites (user_id, meal_id) values (?, ?)", (uid, meal_id))
        else:
            self._run("delete from favorites where user_id = ? and meal_id = ?", (uid, meal_id))

    def reset_user(self, uid):
        with self._db() as db:
            db.execute("delete from daily_logs where user_id = ?", (uid,))
            db.execute("delete from favorites where user_id = ?", (uid,))
            db.execute(f"update profiles set {', '.join(c + ' = null' for c in PROFILE_COLS)} where id = ?", (uid,))

    def get_meals(self):
        rows = self._all("select * from meals order by sort_order")
        for r in rows:
            r["details"] = json.loads(r["details"] or "{}")
        return rows

    def get_foods(self):
        return self._all("select * from foods order by id")

    def seed_catalog(self, meals, foods):
        """ממלא את מאגר הארוחות והמזונות אם הוא ריק."""
        with self._db() as db:
            if db.execute("select 1 from meals limit 1").fetchone():
                return False
            for m in meals:
                m = dict(_only(m, MEAL_COLS), details=json.dumps(m["details"], ensure_ascii=False))
                db.execute(f"insert into meals ({', '.join(m)}) values ({', '.join('?' for _ in m)})", tuple(m.values()))
            for f in foods:
                f = _only(f, FOOD_COLS)
                db.execute(f"insert into foods ({', '.join(f)}) values ({', '.join('?' for _ in f)})", tuple(f.values()))
        return True


# -------------------------------------------------------------------- Supabase

class SupabaseStore:
    """משתמש במפתח service_role (צד שרת בלבד). ה-RLS בטבלאות חוסם גישה ישירה עם המפתח הציבורי."""

    def __init__(self, url, service_key):
        from supabase import create_client
        self._create_client = create_client
        self.url, self.key = url, service_key
        self.db = create_client(url, service_key)

    def _t(self, name):
        return self.db.table(name)

    def create_user(self, email, password):
        try:
            res = self.db.auth.admin.create_user({"email": email, "password": password, "email_confirm": True})
        except Exception as e:  # ספריית supabase זורקת סוגי שגיאות שונים בין גרסאות
            if "already" in str(e).lower():
                raise StoreError("כבר קיים חשבון עם האימייל הזה")
            raise StoreError("ההרשמה נכשלה: " + str(e))
        uid = res.user.id
        self._t("profiles").insert({"id": uid, "email": email}).execute()
        return uid

    def authenticate(self, email, password):
        # לקוח נפרד, כדי שהתחברות משתמש לא תחליף את הרשאות ה-service_role של self.db
        try:
            res = self._create_client(self.url, self.key).auth.sign_in_with_password(
                {"email": email, "password": password})
        except Exception:
            return None
        return res.user.id if res.user else None

    def get_user(self, uid):
        rows = self._t("profiles").select("*").eq("id", uid).execute().data
        return rows[0] if rows else None

    def save_profile(self, uid, fields):
        fields = {k: v for k, v in fields.items() if k in PROFILE_COLS}
        if fields:
            self._t("profiles").update(fields).eq("id", uid).execute()

    def get_logs(self, uid):
        return (self._t("daily_logs").select("*").eq("user_id", uid)
                .order("log_date").order("created_at").limit(5000).execute().data)

    def add_log(self, uid, row):
        try:
            self._t("daily_logs").insert(dict(_only(row, LOG_COLS), user_id=uid)).execute()
        except Exception as e:
            if "duplicate" in str(e).lower():
                raise StoreError("הרשומה כבר קיימת")
            raise

    def delete_log(self, uid, log_id):
        self._t("daily_logs").delete().eq("user_id", uid).eq("id", log_id).execute()

    def get_favorites(self, uid):
        return [r["meal_id"] for r in self._t("favorites").select("meal_id").eq("user_id", uid).execute().data]

    def set_favorite(self, uid, meal_id, on):
        if on:
            self._t("favorites").upsert({"user_id": uid, "meal_id": meal_id}).execute()
        else:
            self._t("favorites").delete().eq("user_id", uid).eq("meal_id", meal_id).execute()

    def reset_user(self, uid):
        self._t("daily_logs").delete().eq("user_id", uid).execute()
        self._t("favorites").delete().eq("user_id", uid).execute()
        self._t("profiles").update({c: None for c in PROFILE_COLS}).eq("id", uid).execute()

    def get_meals(self):
        return self._t("meals").select("*").order("sort_order").execute().data

    def get_foods(self):
        return self._t("foods").select("*").order("id").execute().data

    def seed_catalog(self, meals, foods):
        if self._t("meals").select("id").limit(1).execute().data:
            return False
        self._t("meals").insert([_only(m, MEAL_COLS) for m in meals]).execute()
        self._t("foods").insert([_only(f, FOOD_COLS) for f in foods]).execute()
        return True


def get_store():
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if url and key:
        return SupabaseStore(url, key)
    here = os.path.dirname(os.path.abspath(__file__))
    return LocalStore(os.path.join(here, "local.db"))
