import { Request, Response } from "express";
import { sendEmail } from "../utils/emailService";
import { generateAttendancePdfBuffer } from "../utils/generatePdf";
import Operator from "../models/Operator";
import Class from "../models/Class";
import { Types } from "mongoose";

export const sendEmailController = async (req: Request, res: Response): Promise<void> => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject || !text) {
    res.status(400).json({ error: "חסרים שדות חובה" });
    return;
  }

  try {
    await sendEmail(to, subject, text, html);
    res.status(200).json({ message: "המייל נשלח בהצלחה" });
  } catch (error) {
    console.error("❌ שגיאה בשליחת מייל:", error);
    res.status(500).json({ error: "שליחת המייל נכשלה" });
  }
};


export const sendPdfController = async (req: Request, res: Response): Promise<void> => {
  const { month, operatorId, to } = req.body;
  console.log("Received data:", req.body);

  if (!month || !operatorId || !to) {
    console.error("Missing required fields:", { month, operatorId, to });
    res.status(400).json({ error: "Missing month, operatorId or recipient email" });
    return;
  }

  try {
    const operator = await Operator.findById(operatorId);
    
    if (!operator) {
      res.status(404).json({ error: "Operator not found" });
      return;
    }

    console.log("Operator found:", operator);

    const classIds = operator.weeklySchedule.flatMap((d) => d.classes);
    const allClasses = await Class.find({ _id: { $in: classIds } });

    const classMap = new Map<string, string>(
      allClasses.map((cls) => [(cls._id as Types.ObjectId).toString(), cls.uniqueSymbol])
    );

    const cleanedOperator = {
      ...operator.toObject(),
      weeklySchedule: operator.weeklySchedule.map((day) => ({
        day: day.day,
        classes: day.classes.map((clsId) => classMap.get(clsId.toString()) || "❓"),
      })),
    };

    console.log("Cleaned operator data:", cleanedOperator);
    const pdfBuffer = await generateAttendancePdfBuffer(month, cleanedOperator);

    await sendEmail(
      to,
      `דו"ח נוכחות לחודש ${month}`,
      "מצורף דוח נוכחות לחודש עבור המפעיל. ראו פרטים בגוף ההודעה.",
  
      `
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
        <p>בברכה,<br>צעירון- חוגים</p>
      </div>
      `,
    
      [
        {
          filename: `דוח_${month}.pdf`,
          content: pdfBuffer,
        },
      ],
    
      {
        cc: "btrcrs25@gmail.com"
      }
    );
    

    res.status(200).json({ message: "📧 Email sent with PDF" });
  } catch (error) {
    console.error("❌ Failed to send PDF email:", error);
    res.status(500).json({ error: "Failed to generate or send PDF" });
  }
};
