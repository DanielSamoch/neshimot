# 🔔 הגדרת Push Notifications אמיתי — Neshimot

זה מה שצריך כדי שתזכורות יעבדו **גם כשהאפליקציה/דפדפן סגורים לגמרי**.

---

## למה זה לא עובד "סתם ככה"?

Web Notification רגיל (מה שהיה קודם) עובד רק כל עוד הדף פתוח בדפדפן.
**Web Push** הוא טכנולוגיה אחרת — שולחת התראה דרך שרתי Google/Apple/Mozilla
גם כשהאתר סגור לגמרי, בדיוק כמו אפליקציה native.

---

## שלב 1 — צור VAPID Keys (חינמי, חד פעמי)

VAPID = המפתחות שמזהים את האפליקציה שלך מול שרתי הדחיפה.

### דרך Terminal (אם יש לך Node.js מותקן):
```bash
npx web-push generate-vapid-keys
```

תקבל פלט כזה:
```
Public Key:
BNxxxxx... (מפתח ארוך)

Private Key:
xxxx... (מפתח קצר יותר)
```

### דרך אתר (בלי Terminal):
כנס ל-**[vapidkeys.com](https://vapidkeys.com)** → לחץ "Generate" → תקבל את שני המפתחות.

---

## שלב 2 — עדכן את הקוד

פתח `index.html` וחפש:
```javascript
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY';
```

החלף ב-Public Key שקיבלת.

---

## שלב 3 — הוסף משתני סביבה ב-Vercel

```bash
vercel env add VAPID_PUBLIC_KEY
# הדבק את ה-Public Key

vercel env add VAPID_PRIVATE_KEY
# הדבק את ה-Private Key

vercel env add CRON_SECRET
# כתוב כל מחרוזת אקראית ארוכה, למשל: neshimot-cron-7x9k2m

vercel env add SUPABASE_URL
# https://gjbgbabjqtziwkrlxldp.supabase.co

vercel env add SUPABASE_SERVICE_KEY
# מ-Supabase Settings > API > service_role key (הסודי!)
```

או דרך **Vercel Dashboard → Settings → Environment Variables** אם אין Terminal.

---

## שלב 4 — הרץ SQL ב-Supabase

```sql
alter table public.profiles add column if not exists push_subscription text;
alter table public.profiles add column if not exists reminder_enabled boolean default false;
```

---

## שלב 5 — העלה הכל ל-GitHub

קבצים חדשים שצריך להעלות:
- `index.html` (מעודכן)
- `sw.js` (מעודכן)
- `vercel.json` (חדש — מגדיר את ה-cron)
- `api/send-reminders.js` (חדש)
- `api/save-subscription.js` (חדש)
- `package.json` (מעודכן)

---

## איך זה עובד מאחורי הקלעים

1. משתמש מפעיל "תזכורת יומית" בהגדרות → הדפדפן מבקש הרשאה
2. נוצר **Push Subscription** ייחודי למכשיר שלו → נשמר ב-Supabase
3. **Vercel Cron** רץ כל שעה בדיוק (`0 * * * *`) → קורא ל-`/api/send-reminders`
4. הפונקציה בודקת איזה משתמשים ביקשו תזכורת בשעה הזו
5. שולחת Push דרך שרתי Google/Apple לכל מי שמתאים
6. ה-Service Worker (`sw.js`) שבמכשיר המשתמש מקבל את ה-push ומציג notification — **גם אם האפליקציה סגורה לגמרי**

---

## בדיקה

אחרי שהגדרת הכל:
1. הפעל תזכורת בהגדרות → אשר הרשאה בדפדפן
2. בדוק ב-Supabase Table Editor → `profiles` → ודא ש-`push_subscription` לא ריק
3. המתן לשעה שבחרת (או שנה זמנית לשעה הקרובה לבדיקה)
4. סגור את האפליקציה לגמרי
5. אמורה להגיע התראה גם כשהדפדפן סגור

---

## עלות

✅ Web Push — חינמי לגמרי, אין הגבלת כמות
✅ Vercel Cron — חינמי בתוכנית Hobby (עד פעם בשעה)
✅ Supabase — כלול בתוכנית החינמית

**אין עלות נוספת על מה שכבר משלם היום.**
