import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Operator from '../models/Operator';
import Worker from '../models/Worker';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


export const logAuth = async (req: Request, res: Response): Promise<void> => {
  const { id, password } = req.body;
  try {
    const isAdmin = id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD;
    const isManager = id === process.env.MANAGER_ID && password === process.env.MANAGER_PASSWORD;

    if (isAdmin) {
      const adminToken = jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '20d' });
      res.status(200).json({ message: 'כניסה מוצלחת', token: adminToken, role: 'admin' });
      return;
    }

    if (isManager) {
      const managerToken = jwt.sign({ id, role: 'manager' }, process.env.JWT_SECRET as string, { expiresIn: '20d' });
      res.status(200).json({ message: 'כניסה מוצלחת', token: managerToken, role: 'manager' });
      return;
    }

    const operator = await Operator.findOne({ id });

    if (!operator) {
      res.status(404).json({ message: 'מפעיל לא נמצא' });
      return;
    }

    if (operator.password !== password) {
      res.status(401).json({ message: 'סיסמה שגויה' });
      return;
    }

    if(operator.isActive=== false){
      res.status(401).json({ message: 'המפעיל לא פעיל' });
      return;
    }

    const token = jwt.sign({ id: operator._id, role: 'operator' }, process.env.JWT_SECRET as string, { expiresIn: '20d' });
    res.status(200).json({ message: 'כניסה מוצלחת', token, role: 'operator' });
  } 
  
  catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};
  

const workerVerificationCodes: Record<string, { code: string; expiresAt: number }> = {};

export const workerLogin = async (req: Request, res: Response): Promise<void> => {
  console.log('workerLogin');
  try {
    const { idNumber } = req.body;
    console.log('idNumber', idNumber);
    
    const worker = await Worker.findOne({ id: idNumber });
    console.log('worker', worker);
    
    if (!worker) {
      res.status(404).json({ message: 'עובד לא נמצא' });
      return;
    }

    if (!worker.isActive) {
      res.status(401).json({ message: 'חשבון העובד אינו פעיל' });
      return;
    }

    if (!worker.email) {
      res.status(400).json({ message: 'לא נמצאה כתובת מייל לעובד' });
      return;
    }

    const email = worker.email;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 1000 * 60 * 5;

    workerVerificationCodes[idNumber] = { code, expiresAt };

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: worker.email,
      subject: 'קוד אימות להתחברות',
      html: `
        <div dir="rtl">
          <h2>שלום ${worker.firstName},</h2>
          <p>קוד האימות שלך להתחברות הוא:</p>
          <h1 style="color: #1976d2;">${code}</h1>
          <p>הקוד תקף ל-10 דקות.</p>
          <p>אם לא ביקשת קוד אימות, אנא התעלם מהודעה זו.</p>
        </div>
      `
    });

    res.json({ 
      message: 'קוד אימות נשלח למייל',
      email: worker.email.replace(/(.{2})(.*)(?=@)/, (_, start, rest) => start + '*'.repeat(rest.length))
    });
  } catch (error) {
    console.error('Error in worker login:', error);
    res.status(500).json({ message: 'שגיאת שרת' });
  }
};

export const verifyWorkerCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idNumber, code } = req.body;
    console.log('idNumber', idNumber);
    console.log('code', code);
    
    const worker = await Worker.findOne({ id: idNumber });
    
    if (!worker) {
      res.status(404).json({ message: 'עובד לא נמצא' });
      return;
    }

    const entry = workerVerificationCodes[idNumber];
    if (!entry) {
      res.json({ valid: false });
      return;
    }
  
    if (Date.now() > entry.expiresAt) {
      res.json({ valid: false });
      return;
    }
    console.log('worker', process.env.JWT_SECRET);

    const token = jwt.sign(
      { 
        id: worker._id,
        role: 'worker',
        idNumber: worker.id
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    console.log('token', token);

    res.json({
      message: 'התחברות בוצעה בהצלחה',
      token,
      worker: {
        id: worker.id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        email: worker.email
      }
    });
  } catch (error) {
    console.error('Error in code verification:', error);
    res.status(500).json({ message: 'שגיאת שרת' });
  }
};

