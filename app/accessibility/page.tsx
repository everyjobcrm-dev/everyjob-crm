import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/legal-page";
import { LEGAL_UPDATED_LABEL, OPERATOR } from "@/lib/legal";

export const metadata: Metadata = { title: "הצהרת נגישות" };

export default function AccessibilityPage() {
  return (
    <LegalPage title="הצהרת נגישות">
      <section>
        <p>
          {OPERATOR.name} רואה חשיבות במתן שירות שוויוני לכל המשתמשים, כולל אנשים עם מוגבלות, ופועלת להנגשת המערכת
          בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ&quot;ח-1998, ולתקנות הנגישות לשירות. היעד הוא עמידה בתקן
          הישראלי ת&quot;י 5568, המבוסס על הנחיות WCAG ברמה AA.
        </p>
      </section>

      <section>
        <h2>מה עשינו</h2>
        <ul>
          <li>המערכת בנויה בעברית ומימין לשמאל, עם הגדרת שפה וכיוון לקוראי מסך.</li>
          <li>מבנה כותרות היררכי, תוויות לשדות טפסים והודעות שגיאה בטקסט.</li>
          <li>אפשר לנווט במערכת באמצעות המקלדת בלבד, עם סימון פוקוס נראה.</li>
          <li>ניגודיות צבעים שנבדקה לטקסט, ומידע שאינו מועבר באמצעות צבע בלבד.</li>
          <li>תצוגה מותאמת לטלפון, לטאבלט ולמחשב, ותמיכה בהגדלת טקסט בדפדפן.</li>
        </ul>
      </section>

      <section>
        <h2>מגבלות ידועות</h2>
        <p>
          המערכת נמצאת בתהליך הנגשה מתמשך. ייתכן שחלקים מסוימים, כמו טבלאות נתונים מורכבות וקובצי Excel שהמערכת
          מפיקה, עדיין אינם נגישים במלואם. אם נתקלת בקושי, נשמח לעזור ולספק את המידע בדרך חלופית.
        </p>
      </section>

      <section>
        <h2>פנייה בנושא נגישות</h2>
        <p>
          {OPERATOR.accessibilityCoordinator}, דוא&quot;ל:{" "}
          <a className="underline" href={`mailto:${OPERATOR.accessibilityEmail}`} dir="ltr">{OPERATOR.accessibilityEmail}</a>.
          כדי שנוכל לטפל בפנייה, נשמח לקבל תיאור של הבעיה, הדף שבו נתקלת בה, והדפדפן או הטכנולוגיה המסייעת שבהם
          השתמשת.
        </p>
      </section>

      <section>
        <p className="text-sm text-muted">ההצהרה עודכנה בתאריך {LEGAL_UPDATED_LABEL}.</p>
      </section>
    </LegalPage>
  );
}
