# 🔒 מדריך אבטחה - מערכת Leadtay

## סקירה כללית

מסמך זה מתאר את אמצעי האבטחה המיושמים במערכת Leadtay ואת ההנחיות לפרסום בטוח.

## שכבות אבטחה

### 1. אבטחת רשת
- **CORS**: הגבלת גישה רק לדומיינים מורשים
- **Rate Limiting**: הגבלת מספר בקשות לכל IP
- **Helmet**: הגדרת headers אבטחה
- **HTTPS**: חובה בסביבת ייצור

### 2. אבטחת אימות
- **JWT Tokens**: עם חתימה דיגיטלית
- **Brute Force Protection**: חסימת חשבונות לאחר ניסיונות כושלים
- **Password Hashing**: הצפנה עם bcrypt
- **Session Management**: ניהול סשנים בטוח

### 3. אבטחת נתונים
- **Input Validation**: וולידציה של כל הקלט
- **SQL Injection Protection**: שימוש ב-Mongoose
- **XSS Protection**: סינון קלט משתמשים
- **Data Encryption**: הצפנת נתונים רגישים

### 4. לוגים וניטור
- **Security Logging**: תיעוד אירועי אבטחה
- **Audit Trail**: מעקב אחר פעולות משתמשים
- **Error Handling**: טיפול בטוח בשגיאות

## בדיקות אבטחה

### הרצת בדיקת אבטחה
```bash
npm run security-check
```

### בדיקת תלויות
```bash
npm run audit
```

## הגדרות סביבה

### משתנים נדרשים
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRES_IN=20d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Database
MONGODB_URI=mongodb://localhost:27017/leadtay

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### הנחיות ל-JWT_SECRET
- לפחות 32 תווים
- שילוב של אותיות, מספרים ותווים מיוחדים
- לא לשתף בקוד או ב-Git
- לשנות באופן קבוע

## פרוטוקולי אבטחה

### התחברות
1. **Rate Limiting**: 5 ניסיונות ב-15 דקות
2. **Brute Force Protection**: חסימה זמנית לאחר 5 כישלונות
3. **Password Requirements**: לפחות 6 תווים
4. **Session Timeout**: 20 ימים

### הרשאות משתמשים
- **System Admin**: גישה מלאה
- **Project Manager**: ניהול רכזים וחשבי שכר
- **Operator**: גישה מוגבלת לנתונים
- **Worker**: גישה לנתונים אישיים בלבד
- **Payroll**: גישה לנתוני שכר
- **Coordinator**: ניהול כיתות ועובדים

### ניהול קבצים
- **Upload Validation**: בדיקת סוג וגודל קבצים
- **Virus Scanning**: סריקת קבצים לפני שמירה
- **Access Control**: הרשאות גישה לקבצים

## בדיקות לפני פרסום

### ✅ רשימת בדיקות
- [ ] הרצת `npm run security-check`
- [ ] בדיקת `npm run audit`
- [ ] הגדרת HTTPS בסביבת ייצור
- [ ] בדיקת הרשאות קבצים
- [ ] יצירת גיבוי נתונים
- [ ] בדיקת לוגים
- [ ] בדיקת CORS
- [ ] בדיקת Rate Limiting

### 🔍 בדיקות ידניות
1. **SQL Injection**: ניסיון הזרקת קוד SQL
2. **XSS**: ניסיון הזרקת JavaScript
3. **CSRF**: ניסיון התקפת CSRF
4. **Authentication Bypass**: ניסיון לעקוף אימות
5. **File Upload**: ניסיון העלאת קבצים מסוכנים

## תחזוקת אבטחה

### פעולות יומיות
- בדיקת לוגי אבטחה
- ניטור ניסיונות התחברות כושלים
- בדיקת שימוש במשאבים

### פעולות שבועיות
- עדכון תלויות
- בדיקת הרשאות
- גיבוי נתונים

### פעולות חודשיות
- שינוי JWT_SECRET
- בדיקת אבטחה מקיפה
- עדכון תעודות SSL

## תגובה לאירועי אבטחה

### זיהוי אירוע
1. ניטור לוגי אבטחה
2. זיהוי פעילות חשודה
3. תיעוד האירוע

### תגובה מיידית
1. חסימת IP חשוד
2. שינוי סיסמאות
3. בדיקת נתונים

### חקירה
1. איסוף ראיות
2. זיהוי מקור ההתקפה
3. תיקון נקודות תורפה

### מניעה
1. עדכון אמצעי אבטחה
2. הדרכת משתמשים
3. שיפור ניטור

## קשר עם צוות האבטחה

### דיווח בעיות
- דיווח מיידי על אירועי אבטחה
- תיעוד מפורט של הבעיה
- שמירת ראיות

### עדכונים
- עדכון על שינויים באבטחה
- דיווח על עדכוני תלויות
- שיתוף לקחים

## משאבים נוספים

### כלי אבטחה
- [OWASP ZAP](https://owasp.org/www-project-zap/)
- [Burp Suite](https://portswigger.net/burp)
- [Nmap](https://nmap.org/)

### מדריכים
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practices-security.html)

### קהילה
- [OWASP Israel](https://owasp.org/www-chapter-israel/)
- [Node.js Security WG](https://github.com/nodejs/security-wg)

---

**חשוב**: אבטחה היא תהליך מתמשך. יש לעדכן ולשפר את אמצעי האבטחה באופן קבוע. 