-- FitFuel – סכמת מסד הנתונים ב-Supabase (PostgreSQL).
-- הרצה: Supabase Dashboard → SQL Editor → להדביק ולהריץ פעם אחת.
-- מאגר הארוחות והמזונות נטען אוטומטית מ-data/seed.json בהפעלה הראשונה של השרת.

-- משתמשים: ההרשמה והסיסמאות מנוהלות ב-Supabase Auth (auth.users); כאן הפרופיל והיעדים.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  sex text check (sex in ('male', 'female')),
  age integer,
  height_cm real,
  weight_kg real,
  goal text check (goal in ('bulk', 'cut', 'maintain')),
  calorie_target integer,
  protein_target integer,
  carbs_target integer,
  fat_target integer,
  daily_budget integer
);

-- מזונות בסיסיים: ערכים ל-100 גרם, ויחידת הגשה נוחה (לא חובה).
create table if not exists foods (
  id bigint generated always as identity primary key,
  name text not null,
  kcal real, protein real, carbs real, fat real,
  unit_label text,
  unit_grams real
);

-- ארוחות מומלצות. details: מצרכים, שלבי הכנה, מטרות מתאימות, אייקון וטיפ.
create table if not exists meals (
  id text primary key,
  name text not null,
  prep_minutes integer,
  cost real,
  kcal real, protein real, carbs real, fat real,
  details jsonb not null default '{}',
  sort_order integer
);

-- יומן אכילה: כל רשומה שומרת את הערכים כפי שהיו בזמן התיעוד.
create table if not exists daily_logs (
  id text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  log_date date not null,
  log_time text,
  meal_type text,
  name text not null,
  meal_id text,
  source text,
  kcal real, protein real, carbs real, fat real, cost real,
  created_at timestamptz not null default now()
);
create index if not exists daily_logs_user on daily_logs (user_id, log_date);

create table if not exists favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  meal_id text not null,
  primary key (user_id, meal_id)
);

-- RLS פעיל בלי policies: רק השרת (מפתח service_role) ניגש לטבלאות, והמפתח הציבורי חסום.
alter table profiles enable row level security;
alter table foods enable row level security;
alter table meals enable row level security;
alter table daily_logs enable row level security;
alter table favorites enable row level security;
