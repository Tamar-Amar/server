import { Request, RequestHandler, Response } from "express";
import { sendEmail } from "../utils/emailService";
import { generateAttendancePdfBuffer } from "../utils/generatePdf";
import Operator from "../models/Operator";
import Class from "../models/Class";
import { Types } from "mongoose";
import { generateEmailHtml } from "../utils/emailTemplates";
import EmailLog from "../models/EmailLog";
import nodemailer from "nodemailer";

export const sendEmailController = async (req: Request, res: Response): Promise<void> => {
  const { to, subject, text, html } = req.body;
  const cc = "btrcrs25@gmail.com";
  
  if (!to || !subject || !text) {
    res.status(400).json({ error: "חסרים שדות חובה" });
    return;
  }

  try {
    await sendEmail(to, subject, text, html, undefined, { cc });
    res.status(200).json({ message: "המייל נשלח בהצלחה" });
  } catch (error) {
    console.error("❌ שגיאה בשליחת מייל:", error);
    res.status(500).json({ error: "שליחת המייל נכשלה" });
  }
};


export const sendPdfController = async (req: Request, res: Response): Promise<void> => {
  const { month, operatorId, to } = req.body;

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


export const sendMultipleEmailsController = async (req: Request, res: Response) => {
  const { operatorIds, month, type, subject, text } = req.body;
  const results: { operatorId: string; email: string; success: boolean; error?: string }[] = [];

  for (const operatorId of operatorIds) {
    try {
      const operator = await Operator.findById(operatorId);
      if (!operator) throw new Error("Operator not found");

      const to = operator.email;

      if (!to) throw new Error("לא נמצאה כתובת מייל");
      if (!operator.weeklySchedule) throw new Error("מערכת שבועית לא נמצאה");



      if (type === "pdf") {
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

        const pdfBuffer = await generateAttendancePdfBuffer(month, cleanedOperator);

        await sendEmail(
          to,
          `דו"ח נוכחות לחודש ${month}`,
          "מצורף דוח נוכחות לחודש עבור המפעיל. ראו פרטים בגוף ההודעה.",
          generateEmailHtml(month, operator), 
          [
            { filename: `דוח_${month}.pdf`, content: pdfBuffer }
          ],
          { cc: "btrcrs25@gmail.com" }
        );
      }

      if (type === "text") {
        await sendEmail(to, subject, text, undefined, undefined, { cc: "btrcrs25@gmail.com" });
      }


      results.push({ operatorId, email: to, success: true });
    } catch (error: any) {
      results.push({ operatorId, email: "", success: false, error: error.message });
    }
  }

  await EmailLog.create({
    date: new Date(),
    operatorIds,
    subject,
    message: type === 'text' ? text : undefined,
    month: type === 'pdf' ? month : undefined,
    type,
    results,
  });

  res.status(200).json({ message: "שליחת מיילים הושלמה", results });
};

const operatorVerificationCodes: Record<string, { code: string; expiresAt: number }> = {};

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (name.length < 2) return "****@" + domain;
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1] + "@" + domain;
}


export const sendVerificationCodeToOperator: RequestHandler = async (req, res) => {
  const { operatorId } = req.params;

  try {
    const operator = await Operator.findById(operatorId);
    if (!operator) {
      res.status(404).json({ error: "Operator not found" });
      return;
    }

    const email = operator.email;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 1000 * 60 * 5;

    operatorVerificationCodes[operatorId] = { code, expiresAt };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"צעירון חוגים" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "קוד אימות לדיווח פעילות",
      html: `<div dir="rtl">קוד האימות שלך הוא:<br/><h2>${code}</h2></div>`,
    });

    const maskedEmail = maskEmail(email);
    res.json({ message: "קוד נשלח למייל", maskedEmail }); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "שליחת הקוד נכשלה" });
  }
};

export const verifyOperatorCodeHandler: RequestHandler = (req, res) => {
  const { operatorId, code } = req.body;

  const entry = operatorVerificationCodes[operatorId];
  if (!entry) {
    res.json({ valid: false });
    return;
  }

  if (Date.now() > entry.expiresAt) {
    res.json({ valid: false });
    return;
  }

  const isValid = entry.code === code;
  res.json({ valid: isValid });
};