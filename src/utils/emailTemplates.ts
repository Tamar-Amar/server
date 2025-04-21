interface OperatorData {
    firstName: string;
    lastName: string;
  }
  
  export const generateEmailHtml = (month: string, operator: OperatorData): string => {
    return `
    <div dir="rtl" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6;">
      <p>שלום רב,</p>
      <p>
        מצורף <strong>דוח נוכחות לחודש ${month}</strong> עבור המפעיל
        <strong>${operator.firstName} ${operator.lastName}</strong>.
      </p>
      <p>
        נא לסמן בטבלה <strong>האם בוצע</strong> / לציין <strong>סיבה אחרת</strong>.
      </p>
      <p>
        <span style="color: red; font-weight: bold;">חובה</span> למלא את שורת
        <strong>סה"כ הפעלות</strong> בתחתית המסמך ולחתום.
      </p>
      <p>
        לאחר המילוי, יש להחזיר את הטופס למייל:
        <a href="mailto:btrcrs25@gmail.com">btrcrs25@gmail.com</a>
      </p>
      <p>בברכה,<br>חוגים צעירון</p>
    </div>
    `;
  };