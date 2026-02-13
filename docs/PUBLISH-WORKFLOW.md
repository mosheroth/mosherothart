# פרסום ציור חדש — אתר + אינסטגרם

סקריפט להוספת ציור לאתר ולפרסום לאינסטגרם (כולל לינק לעמוד הציור).

---

## 0. הגדרת פרסום לאינסטגרם (פעם אחת)

כדי שהסקריפט יוכל לפרסם לאינסטגרם:

1. **חשבון אינסטגרם** — חייב להיות Creator או Business (מחובר לדף פייסבוק).
2. **אפליקציה ב־Meta for Developers** — צור אפליקציה ב־[developers.facebook.com](https://developers.facebook.com), הוסף "Instagram Graph API", והפעל "Content Publishing".
3. **Token** — קבל Access Token עם ההרשאה `instagram_content_publish` (או `instagram_business_content_publish` עם Instagram Login).
4. **מזהה חשבון** — קבל את ה־Instagram User ID (מספר) של החשבון שלך (דרך Graph API או כלי בדיקה).

הגדר משתני סביבה (לא להעלות ל־Git):

```bash
export INSTAGRAM_ACCESS_TOKEN="הטוקן_שלך"
export INSTAGRAM_ACCOUNT_ID="מזהה_ה_ig_user_שלך"
```

או צור קובץ `.env.local` בשורש הפרויקט (והוסף `.env.local` ל־`.gitignore`) והסקריפט יכול לקרוא ממנו אם תוסיף טעינה (אופציונלי).

### איפה להשיג את ה־API Token

**דרישות מוקדמות:** חשבון אינסטגרם מסוג Creator או Business, מחובר לדף פייסבוק.

1. **כניסה ל־Meta for Developers**  
   גלוש ל־[https://developers.facebook.com](https://developers.facebook.com) והתחבר עם פייסבוק.

2. **יצירת אפליקציה**  
   "My Apps" → "Create App" → "Other" → "Consumer" (או "Business" אם מופיע).  
   תן שם לאפליקציה (למשל "Art Publish") ולחץ Create.

3. **הוספת Instagram API**  
   בלוח האפליקציה: "Add Products" → מצא "Instagram" → "Set Up" על **Instagram Graph API** (לא Basic Display).  
   בחר "Content Publishing" והפעל לפי ההנחיות.

4. **קבלת Token (דרך Graph API Explorer)**  
   - גלוש ל־[https://developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)  
   - למעלה: בחר את האפליקציה שיצרת.  
   - "User or Page" → "Get User Access Token" (או "Get Page Access Token").  
   - ב־Permissions סמן: `instagram_basic`, `pages_show_list`, `instagram_content_publish`.  
   - "Generate Access Token" — יתבקש לאשר את האפליקציה ולחבר את האינסטגרם.  
   - אחרי האישור יופיע **Access Token**. העתק אותו — זהו `INSTAGRAM_ACCESS_TOKEN`.  
   - **חשוב:** טוקן רגיל פג תוקף אחרי זמן קצר. לקבלת Long-Lived Token: ב־Tools → Access Token Tool יש אפשרות להמיר ל־60 יום.  
   - **אם מפרסמים דרך דף פייסבוק:** לפעמים יש להשתמש ב־Page Access Token (משלב 5) במקום User Token.

5. **קבלת מזהה החשבון (INSTAGRAM_ACCOUNT_ID)**  
   - ב־Graph API Explorer השאר את אותו Token.  
   - בשדה ה־API בחר:  
     `me/accounts`  
   - "Submit" — יופיעו הדפים שלך. לכל דף יש `id` ו־`access_token`.  
   - בחר את הדף שמחובר לאינסטגרם שלך, והעתק את ה־`id` של הדף.  
   - עכשיו בקנה:  
     `{page-id}?fields=instagram_business_account`  
     (החלף `{page-id}` ב־ID של הדף).  
   - "Submit" — בשדה `instagram_business_account.id` יופיע המספר של חשבון האינסטגרם.  
   - זהו **INSTAGRAM_ACCOUNT_ID**.

6. **הגדרה במחשב**  
   ```bash
   export INSTAGRAM_ACCESS_TOKEN="הטוקן_שלך"
   export INSTAGRAM_ACCOUNT_ID="המספר_של_חשבון_האינסטגרם"
   ```

אם משהו לא עובד (אישורים, PPA וכו') — בדוק ב־Meta for Developers תחת האפליקציה את הסטטוס של Instagram Product ו־App Review אם נדרש.

---

## 1. הוספת הציור לאתר (סקריפט)

מהשורש של הפרויקט:

```bash
node scripts/publish-artwork.mjs \
  --image ./path/to/your-image.png \
  --title-he "שם הציור בעברית" \
  --slug slug-for-url \
  --price "₪200" \
  --size "30 × 40 cm" \
  --medium "צבעי מים וגואש" \
  --body "תיאור קצר (אופציונלי)" \
  --subjects "stilllife,landscape"
```

**חובה:** `--image`, `--title-he`, `--price`, `--size`, `--medium`  
**אופציונלי:** `--slug` (אם לא נתון — נגזר מהכותרת), `--body`, `--subjects`

**נושאים אפשריים:**  
`sea`, `figure`, `landscape`, `stilllife`, `urban`, `hod-hasharon`, `yarkon`, `tel-aviv`

הסקריפט יוצר:
- העתקה של התמונה ל־`public/images/<slug>.<ext>`
- קובץ תוכן `src/content/artworks/<slug>.md`

ומדפיס את **כתובת העמוד** לאתר ואת **הטקסט המוצע** לקפשן באינסטגרם.

---

## 2. העלאה לאתר (Git + GitHub)

```bash
git add public/images/<slug>.* src/content/artworks/<slug>.md
git commit -m "Add artwork: <title-he>"
git push
```

אחרי ה־push, ה־deploy ב־GitHub Actions ירוץ והעמוד יהיה זמין ב:

**https://mosheroth.github.io/art/artwork/<slug>**

---

## 3. פרסום לאינסטגרם (סקריפט)

**אחרי שה־deploy הסתיים** (התמונה זמינה בכתובת האתר), הרץ:

```bash
export INSTAGRAM_ACCESS_TOKEN="..."
export INSTAGRAM_ACCOUNT_ID="..."
node scripts/publish-artwork.mjs --post-to-instagram --slug <slug>
```

הסקריפט ישלח לאינסטגרם:
- **תמונה:** מהכתובת הציבורית של התמונה באתר (`https://mosheroth.github.io/art/images/<slug>.png`)
- **קפשן:** כותרת, מחיר, גודל, מדיום, ולינק לעמוד הציור (`/art/artwork/<slug>`)

אם לא הגדרת Token ו־Account ID, הסקריפט יבקש להגדיר (ראה סעיף 0).

---

## סיכום

| שלב | פעולה |
|-----|--------|
| 1 | הרצת `node scripts/publish-artwork.mjs` עם פרטי הציור (--image, --title-he, וכו') |
| 2 | `git add` + `commit` + `push` — מחכים ל־deploy |
| 3 | הרצת `node scripts/publish-artwork.mjs --post-to-instagram --slug <slug>` לפרסום לאינסטגרם עם לינק לעמוד הציור |
