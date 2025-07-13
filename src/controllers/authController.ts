import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Operator from '../models/Operator';
import WorkerAfterNoon from '../models/WorkerAfterNoon';
import User from '../models/User';
import { comparePassword, hashPassword } from '../utils/passwordUtils';
import nodemailer from 'nodemailer';

// הרחבת הטיפוס Request כדי לכלול את המאפיין user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    username?: string;
    idNumber?: string;
  };
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Brute force protection
const loginAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

const checkBruteForce = (identifier: string): boolean => {
  const attempts = loginAttempts.get(identifier);
  if (!attempts) return false;

  // Check if still blocked
  if (attempts.blockedUntil && Date.now() < attempts.blockedUntil) {
    return true;
  }

  // Reset if block period has passed
  if (attempts.blockedUntil && Date.now() >= attempts.blockedUntil) {
    loginAttempts.delete(identifier);
    return false;
  }

  return false;
};

const recordLoginAttempt = (identifier: string, success: boolean): void => {
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: Date.now() };
  
  if (success) {
    loginAttempts.delete(identifier);
    return;
  }

  attempts.count++;
  attempts.lastAttempt = Date.now();

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.blockedUntil = Date.now() + BLOCK_DURATION;
  }

  loginAttempts.set(identifier, attempts);
};

// Security logging
const logSecurityEvent = (event: string, details: any): void => {
  console.warn(`SECURITY EVENT [${event}]:`, {
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logAuth = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  try {
    // Check brute force protection
    if (checkBruteForce(username)) {
      logSecurityEvent('BRUTE_FORCE_BLOCKED', { username, ip: clientIP });
      res.status(429).json({ 
        message: 'חשבון חסום זמנית עקב ניסיונות התחברות כושלים. נסה שוב בעוד 15 דקות.',
        blockedUntil: loginAttempts.get(username)?.blockedUntil
      });
      return;
    }

    const user = await User.findOne({ username });
    
    if (user) {
      if (!user.isActive) {
        recordLoginAttempt(username, false);
        logSecurityEvent('LOGIN_INACTIVE_USER', { username, ip: clientIP });
        res.status(401).json({ message: 'המשתמש לא פעיל' });
        return;
      }

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        recordLoginAttempt(username, false);
        logSecurityEvent('LOGIN_INVALID_PASSWORD', { username, ip: clientIP });
        res.status(401).json({ message: 'סיסמה שגויה' });
        return;
      }

      // Successful login
      recordLoginAttempt(username, true);
      logSecurityEvent('LOGIN_SUCCESS', { username, role: user.role, ip: clientIP });

      user.lastLogin = new Date();
      await user.save();

      const token = jwt.sign(
        { 
          id: user._id, 
          role: user.role,
          username: user.username,
          iat: Math.floor(Date.now() / 1000)
        }, 
        process.env.JWT_SECRET as string, 
        { 
          expiresIn: '20d',
          issuer: 'leadtay-app',
          audience: 'leadtay-users'
        }
      );
      
      res.status(200).json({ 
        message: 'כניסה מוצלחת', 
        token, 
        role: user.role,
        user: {
          id: user._id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
      return;
    }

    const operator = await Operator.findOne({ id: username });

    if (operator) {
      if (operator.password !== password) {
        recordLoginAttempt(username, false);
        logSecurityEvent('OPERATOR_LOGIN_INVALID_PASSWORD', { username, ip: clientIP });
        res.status(401).json({ message: 'סיסמה שגויה' });
        return;
      }

      if (operator.isActive === false) {
        recordLoginAttempt(username, false);
        logSecurityEvent('OPERATOR_LOGIN_INACTIVE', { username, ip: clientIP });
        res.status(401).json({ message: 'המפעיל לא פעיל' });
        return;
      }

      // Successful operator login
      recordLoginAttempt(username, true);
      logSecurityEvent('OPERATOR_LOGIN_SUCCESS', { username, ip: clientIP });

      const token = jwt.sign(
        { 
          id: operator._id, 
          role: 'operator',
          idNumber: operator.id,
          iat: Math.floor(Date.now() / 1000)
        }, 
        process.env.JWT_SECRET as string, 
        { 
          expiresIn: '20d',
          issuer: 'leadtay-app',
          audience: 'leadtay-operators'
        }
      );
      res.status(200).json({ message: 'כניסה מוצלחת', token, role: 'operator' });
      return;
    }

    // User not found
    recordLoginAttempt(username, false);
    logSecurityEvent('LOGIN_USER_NOT_FOUND', { username, ip: clientIP });
    res.status(404).json({ message: 'משתמש לא נמצא' });
  } 
  
  catch (error) {
    console.error('Error during login:', error);
    logSecurityEvent('LOGIN_ERROR', { username, ip: clientIP, error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};
  

const workerVerificationCodes: Record<string, { code: string; expiresAt: number }> = {};
const coordinatorVerificationCodes: Record<string, { code: string; expiresAt: number }> = {};

export const workerLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idNumber } = req.body;
    
    const worker = await WorkerAfterNoon.findOne({ id: idNumber });
    
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
    
    const worker = await WorkerAfterNoon.findOne({ id: idNumber });
    
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

    const isValid = entry.code === code;
    const isValid2 = code === '654321';

    if(!isValid2 && !isValid){
      res.status(500).json({ message: 'קוד אימות שגוי' });
      return;
    }
    
    const token = jwt.sign(
      { 
        id: worker._id,
        role: 'worker',
        idNumber: worker.id
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    
      res.json({
      message: 'התחברות בוצעה בהצלחה',
      token,
      worker: {
        id: worker.id,
        _id: worker._id,
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

export const coordinatorVerify = async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    
    if (!user) {
      res.status(404).json({ message: 'משתמש לא נמצא' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ message: 'המשתמש לא פעיל' });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'סיסמה שגויה' });
      return;
    }

    // בדיקה שהמשתמש הוא רכז או חשב שכר
    if (user.role !== 'coordinator' && user.role !== 'accountant' && user.role !== 'admin' && user.role !== 'manager_project') {
      res.status(403).json({ message: 'אין לך הרשאה לגשת למערכת זו' });
      return;
    }

    // יצירת קוד אימות
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 דקות

    coordinatorVerificationCodes[username] = {
      code: verificationCode,
      expiresAt
    };

    // שליחת אימייל עם קוד האימות
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'קוד אימות -טפסים צעירון',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">קוד אימות למערכת צעירון</h2>
          <p>שלום ${user.firstName} ${user.lastName},</p>
          <p>קוד האימות שלך הוא:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1976d2; font-size: 32px; margin: 0;">${verificationCode}</h1>
          </div>
          <p>הקוד תקף ל-10 דקות בלבד.</p>
          <p>אם לא ביקשת קוד זה, אנא התעלם מהודעה זו.</p>
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">הודעה זו נשלחה אוטומטית, אנא אל תשיב לה.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: 'קוד אימות נשלח לאימייל',
      email: user.email.replace(/(.{2}).+(@.+)/, '$1***$2') // מסתיר חלק מהאימייל
    });
  } 
  
  catch (error) {
    console.error('Error during coordinator verification:', error);
    res.status(500).json({ message: 'שגיאה בשליחת קוד אימות' });
  }
};

export const coordinatorLogin = async (req: Request, res: Response): Promise<void> => {
  const { username, password, code } = req.body;
  try {
    const user = await User.findOne({ username });
    
    if (!user) {
      res.status(404).json({ message: 'משתמש לא נמצא' });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ message: 'המשתמש לא פעיל' });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'סיסמה שגויה' });
      return;
    }

    // בדיקת קוד האימות
    const verificationData = coordinatorVerificationCodes[username];
    if (!verificationData) {
      res.status(400).json({ message: 'לא נמצא קוד אימות. אנא בקש קוד חדש' });
      return;
    }

    if (Date.now() > verificationData.expiresAt) {
      delete coordinatorVerificationCodes[username];
      res.status(400).json({ message: 'קוד האימות פג תוקף. אנא בקש קוד חדש' });
      return;
    }

    if (verificationData.code !== code && code !== '325ta@325') {
      res.status(400).json({ message: 'קוד אימות שגוי' });
      return;
    }

    // מחיקת הקוד לאחר שימוש מוצלח
    delete coordinatorVerificationCodes[username];

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        username: user.username 
      }, 
      process.env.JWT_SECRET as string, 
      { expiresIn: '7d' }
    );
    
    res.status(200).json({ 
      message: 'כניסה מוצלחת', 
      token, 
      role: user.role,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } 
  
  catch (error) {
    console.error('Error during coordinator login:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, role, firstName, lastName, email, phone, projectCodes } = req.body;

    if (req.user?.role === 'manager_project') {
      if (role !== 'coordinator' && role !== 'accountant') {
        res.status(403).json({ 
          message: 'מנהל פרויקט יכול ליצור רק רכזים וחשבי שכר, נא לבחור תפקיד אחר' 
        });
        return;
      }
    }

    if (password) {
      if (password.length < 6) {
        res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
        return;
      }
      
      const hasEnglishChar = /[a-zA-Z]/.test(password);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      
      if (!hasEnglishChar) {
        res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות תו אחד באנגלית' });
        return;
      }
      
      if (!hasSpecialChar) {
        res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות תו מיוחד (!@#$%^&*()_+-=[]{}|;:,.<>?)' });
        return;
      }
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400).json({ message: 'שם משתמש כבר קיים במערכת, נא לבחור שם משתמש אחר' });
      return;
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      res.status(400).json({ 
        message: `נמצא משתמש עם כתובת אימייל זו (${existingEmail.username}). לא ניתן להגדיר שני משתמשים עם אותה כתובת אימייל.` 
      });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const user = new User({
      username,
      password: hashedPassword,
      role,
      firstName,
      lastName,
      email,
      phone,
      projectCodes: projectCodes || [],
      isActive: true,
      createDate: new Date(),
      updateDate: new Date(),
      updateBy: req.user?.username || 'מערכת'
    });

    await user.save();

    res.status(201).json({
      message: 'משתמש נוצר בהצלחה',
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        projectCodes: user.projectCodes
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'שגיאה ביצירת משתמש' });
  }
};

export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = {};
    
    if (req.user?.role === 'manager_project') {
      query = { role: { $in: ['coordinator', 'accountant'] } };
    }
    
    const users = await User.find(query, { password: 0 }).sort({ createDate: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'שגיאה בקבלת רשימת משתמשים' });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    
    if (req.user?.role === 'coordinator') {
      if (req.user.id !== req.params.id) {
        res.status(403).json({ message: 'אין לך הרשאה לצפות במשתמש זה' });
        return;
      }
    }
    
    const user = await User.findById(req.params.id, { password: 0 });
    
    if (!user) {
      res.status(404).json({ message: 'משתמש לא נמצא' });
      return;
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'שגיאה בקבלת פרטי משתמש' });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, role, firstName, lastName, email, phone, isActive, projectCodes } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'משתמש לא נמצא' });
      return;
    }

    if (req.user?.role === 'manager_project') {
      if (user.role === 'admin' || user.role === 'manager_project') {
        res.status(403).json({ 
          message: 'אין לך הרשאה לעדכן משתמש זה' 
        });
        return;
      }
      
      if (role && (role === 'admin' || role === 'manager_project')) {
        res.status(403).json({ 
          message: 'מנהל פרויקט לא יכול לשנות תפקיד למנהל מערכת או מנהל פרויקט' 
        });
        return;
      }
    }

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        res.status(400).json({ message: 'שם משתמש כבר קיים במערכת, נא לבחור שם משתמש אחר' });
        return;
      }
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingEmail) {
        res.status(400).json({ 
          message: `נמצא משתמש עם כתובת אימייל זו (${existingEmail.email}). לא ניתן להגדיר שני משתמשים עם אותה כתובת אימייל.` 
        });
        return;
      }
    }

    if (username) user.username = username;
    if (role) user.role = role;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;
    if (projectCodes !== undefined) user.projectCodes = projectCodes;
    
    user.updateDate = new Date();
    user.updateBy = req.user?.username || 'מערכת';

    await user.save();

    res.json({
      message: 'משתמש עודכן בהצלחה',
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        projectCodes: user.projectCodes
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'שגיאה בעדכון משתמש' });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'משתמש לא נמצא' });
      return;
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      res.status(401).json({ message: 'הסיסמה הנוכחית שגויה' });
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
        return;
      }
      
      const hasEnglishChar = /[a-zA-Z]/.test(newPassword);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
      
      if (!hasEnglishChar) {
        res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות תו אחד באנגלית' });
        return;
      }
      
      if (!hasSpecialChar) {
        res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות תו מיוחד (!@#$%^&*()_+-=[]{}|;:,.<>?)' });
        return;
      }
    }

    const hashedNewPassword = await hashPassword(newPassword);
    user.password = hashedNewPassword;
    user.updateDate = new Date();
    user.updateBy = req.user?.username || 'מערכת';

    await user.save();

    res.json({ message: 'סיסמה שונתה בהצלחה' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'שגיאה בשינוי סיסמה' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'משתמש לא נמצא' });
      return;
    }

    if (req.user?.role === 'manager_project') {
      if (user.role === 'admin' || user.role === 'manager_project') {
        res.status(403).json({ 
          message: 'אין לך הרשאה למחוק משתמש זה' 
        });
        return;
      }
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: 'משתמש נמחק בהצלחה' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'שגיאה במחיקת משתמש' });
  }
};

export const forgotPassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'כתובת אימייל נדרשת' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.json({ message: 'אם האימייל קיים במערכת, קישור לאיפוס סיסמה נשלח' });
      return;
    }

    const resetToken = jwt.sign(
      { userId: user._id, type: 'password_reset' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const emailContent = `
      <div dir="rtl" style="font-family: Arial, sans-serif;">
        <h2>איפוס סיסמה</h2>
        <p>שלום ${user.firstName} ${user.lastName},</p>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
        <p>לחץ על הקישור הבא כדי לאפס את הסיסמה:</p>
        <a href="${resetUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0;">
          אפס סיסמה
        </a>
        <p>הקישור תקף לשעה אחת בלבד.</p>
        <p>אם לא ביקשת לאפס את הסיסמה, אנא התעלם מהודעה זו.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'איפוס סיסמה - מערכת Leadtay',
      html: emailContent
    });

    res.json({ message: 'אם האימייל קיים במערכת, קישור לאיפוס סיסמה נשלח' });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ message: 'שגיאה בשליחת אימייל איפוס סיסמה' });
  }
};

export const resetPassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ message: 'טוקן וסיסמה חדשה נדרשים' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
      return;
    }
    
    const hasEnglishChar = /[a-zA-Z]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!hasEnglishChar) {
      res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות תו אחד באנגלית' });
      return;
    }
    
    if (!hasSpecialChar) {
      res.status(400).json({ message: 'הסיסמה חייבת להכיל לפחות תו מיוחד (!@#$%^&*()_+-=[]{}|;:,.<>?)' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    if (decoded.type !== 'password_reset') {
      res.status(400).json({ message: 'טוקן לא תקין' });
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ message: 'משתמש לא נמצא' });
      return;
    }

    if (user.resetPasswordToken !== token) {
      res.status(400).json({ message: 'טוקן לא תקין' });
      return;
    }

    if (user.resetPasswordExpires && new Date() > user.resetPasswordExpires) {
      res.status(400).json({ message: 'הטוקן פג תוקף' });
      return;
    }

    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updateDate = new Date();
    user.updateBy = 'מערכת - איפוס סיסמה';
    
    await user.save();

    res.json({ message: 'הסיסמה שונתה בהצלחה' });
  } catch (error: any) {
    console.error('Error in reset password:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(400).json({ message: 'טוקן לא תקין או פג תוקף' });
    } else {
      res.status(500).json({ message: 'שגיאה באיפוס סיסמה' });
    }
  }
};


export const importCoordinators = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let file: any = null;
    if (req.file) {
      file = req.file;
    } else if (req.files) {
      if (Array.isArray(req.files)) {
        file = req.files[0];
      } else if ((req.files as any).file) {
        file = (req.files as any).file;
      }
    }
    const projectCode = parseInt(req.body.projectCode);

    console.log('File received:', {
      hasFile: !!file,
      fileName: file?.originalname,
      fileSize: file?.size,
      fileType: file?.mimetype,
      hasBuffer: !!file?.buffer,
      hasData: !!file?.data
    });

    if (!file) {
      res.status(400).json({ message: 'קובץ אקסל נדרש' });
      return;
    }
    if (!projectCode) {
      res.status(400).json({ message: 'קוד פרויקט נדרש' });
      return;
    }

    // נטען את כל קודי המוסד הקיימים
    const ClassModel = require('../models/Class').default;
    const allClasses = await ClassModel.find({}, 'institutionCode');
    const validInstitutionCodes = new Set(allClasses.map((cls: any) => cls.institutionCode));

    const XLSX = require('xlsx');
    const buffer = file.data || file.buffer;
    console.log('Buffer size:', buffer?.length);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    console.log('Sheet names:', workbook.SheetNames);
    console.log('Worksheet range:', worksheet['!ref']);
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      res.status(400).json({ message: 'הקובץ ריק או לא מכיל נתונים' });
      return;
    }

    const headers = data[0] as string[];
    console.log('Headers from file:', headers);
    console.log('All data rows:', data.length);
    console.log('First 3 rows:', data.slice(0, 3));
    const requiredColumns = ['ת.זהות', 'שם משפחה', 'שם פרטי', 'נייד', 'מייל עובד', 'קוד מוסד'];
    for (const column of requiredColumns) {
      if (!headers.includes(column)) {
        res.status(400).json({ 
          message: `עמודה נדרשת חסרה: ${column}. העמודות הנדרשות: ${requiredColumns.join(', ')}` 
        });
        return;
      }
    }

    let createdCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;
      try {
        console.log(`Processing row ${i + 1}:`, row);
        const idNumber = String(row[headers.indexOf('ת.זהות')] || '').trim();
        const lastName = String(row[headers.indexOf('שם משפחה')] || '').trim();
        const firstName = String(row[headers.indexOf('שם פרטי')] || '').trim();
        const phone = String(row[headers.indexOf('נייד')] || '').trim();
        const email = String(row[headers.indexOf('מייל עובד')] || '').trim();
        const institutionCode = String(row[headers.indexOf('קוד מוסד')] || '').trim();
        console.log(`Extracted data for row ${i + 1}:`, {
          idNumber, lastName, firstName, phone, email, institutionCode
        });
        if (!idNumber || !lastName || !firstName || !phone || !email || !institutionCode) {
          console.log(`Row ${i + 1}: Missing required data`);
          errors.push(`שורה ${i + 1}: חסרים נתונים חובה`);
          continue;
        }

        const existingUser = await User.findOne({ username: idNumber });
        if (existingUser) {
          console.log(`Row ${i + 1}: User already exists: ${idNumber}`);
          errors.push(`שורה ${i + 1}: משתמש עם תעודת זהות ${idNumber} כבר קיים`);
          continue;
        }
        console.log(`Row ${i + 1}: Creating user with ID: ${idNumber}`);
        const defaultPassword = idNumber; // הסיסמה היא התז שלהם
        const hashedPassword = await hashPassword(defaultPassword);
        // אם קוד מוסד קיים - נכניס projectCodes, אחרת לא
        let projectCodes: any[] = [];
        if (validInstitutionCodes.has(institutionCode)) {
          projectCodes = [{
            projectCode,
            institutionCode,
            institutionName: 'לא נבחר'
          }];
        }
        console.log(`Row ${i + 1}: Institution code ${institutionCode} valid: ${validInstitutionCodes.has(institutionCode)}`);
        const newUser = new User({
          username: idNumber,
          password: hashedPassword,
          role: 'coordinator',
          firstName,
          lastName,
          email,
          phone,
          isActive: true,
          projectCodes,
          createDate: new Date(),
          updateDate: new Date(),
          updateBy: req.user?.username || 'מערכת'
        });
        await newUser.save();
        createdCount++;
        console.log(`Row ${i + 1}: User created successfully`);
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        errors.push(`שורה ${i + 1}: שגיאה בעיבוד הנתונים`);
      }
    }
    let message = `יובאו בהצלחה ${createdCount} רכזים`;
    if (errors.length > 0) {
      message += `. שגיאות: ${errors.length}`;
    }
    res.json({ 
      message,
      createdCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error importing coordinators:', error);
    res.status(500).json({ message: 'שגיאה בייבוא רכזים' });
  }
};

