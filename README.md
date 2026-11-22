# FitFuel – תזונה לסטודנטים שמתאמנים

אפליקציית ווב בעברית: הרשמה, פרופיל ויעדים, מאגר ארוחות זולות ומהירות עם סינון, תיעוד ארוחות ודשבורד יומי.

| שכבה | טכנולוגיה | קבצים |
| --- | --- | --- |
| צד לקוח | HTML + CSS + JavaScript (עיצוב מ-Stitch) | `index.html`, `css/`, `js/` |
| צד שרת | Python + Flask | `app.py` |
| נתונים ואימות | Supabase (PostgreSQL + Auth) | `db.py`, `supabase/schema.sql`, `data/seed.json` |
| אירוח | Railway | `Procfile`, `requirements.txt` |

## הרצה מקומית

בלי הגדרות Supabase השרת שומר הכול בקובץ `local.db` (SQLite), כך שאפשר לפתח בלי חשבון.

```bash
python -m venv .venv
```

```bash
.venv/Scripts/python -m pip install -r requirements.txt
```

```bash
.venv/Scripts/python app.py
```

ואז לפתוח את http://localhost:5000

## חיבור ל-Supabase

1. ליצור פרויקט ב-supabase.com.
2. ב-SQL Editor להריץ את `supabase/schema.sql`.
3. להעתיק את `.env.example` ל-`.env` ולמלא `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (מפתח service_role) ו-`SECRET_KEY`.
4. להפעיל את השרת. בהפעלה הראשונה מאגר הארוחות והמזונות נטען מ-`data/seed.json`.

## העלאה ל-Railway

1. להעלות את התיקייה ל-GitHub וליצור ב-Railway פרויקט מהריפו.
2. ב-Variables להגדיר את שלושת המשתנים מ-`.env.example`.
3. Railway מריץ את הפקודה שב-`Procfile` ונותן כתובת ציבורית.

## API

| נתיב | תיאור |
| --- | --- |
| `POST /api/auth/register`, `/login`, `/logout` | הרשמה, כניסה ויציאה |
| `GET /api/state` | פרופיל, יעדים, יומן, מועדפים ומאגר הארוחות והמזונות |
| `PUT /api/profile` | שמירת פרופיל ו/או יעדים |
| `POST /api/log`, `DELETE /api/log/<id>` | הוספה ומחיקה של רשומה ביומן |
| `PUT /api/favorites/<meal_id>` | סימון ארוחה כמועדפת |
| `DELETE /api/account/data` | מחיקת הפרופיל והיומן |
| `GET /api/meals?goal=&max_time=&max_cost=` | סינון ארוחות לפי מטרה, זמן ותקציב |

הערכים התזונתיים והמחירים הם הערכות בלבד ואינם ייעוץ רפואי.
