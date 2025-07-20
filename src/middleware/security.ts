import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

// Rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.',
    he: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    message: 'יותר מדי בקשות. נסה שוב בעוד 15 דקות.',
    he: 'יותר מדי בקשות. נסה שוב בעוד 15 דקות.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // חשוב ל-Render - לזהות נכון כתובות IP
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Slow down for repeated requests - תיקון האזהרה
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: () => 500, // begin adding 500ms of delay per request above 50
  // חשוב ל-Render - לזהות נכון כתובות IP
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  frameguard: {
    action: 'deny'
  }
});

// Input validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'נתונים לא תקינים',
      errors: errors.array()
    });
  }
  next();
};

// Login validation
export const validateLogin = [
  body('username').trim().isLength({ min: 1 }).withMessage('שם משתמש הוא שדה חובה'),
  body('password').isLength({ min: 1 }).withMessage('סיסמה היא שדה חובה'),
  validateInput
];

// User creation validation
export const validateUserCreation = [
  body('username').trim().isLength({ min: 3 }).withMessage('שם משתמש חייב להיות לפחות 3 תווים'),
  body('password').isLength({ min: 6 }).withMessage('סיסמה חייבת להיות לפחות 6 תווים'),
  body('email').isEmail().withMessage('כתובת אימייל לא תקינה'),
  body('role').isIn(['system_admin', 'manager_project', 'operator', 'worker', 'payroll', 'coordinator']).withMessage('תפקיד לא תקין'),
  validateInput
];

// Password reset validation
export const validatePasswordReset = [
  body('email').isEmail().withMessage('כתובת אימייל לא תקינה'),
  validateInput
];

// New password validation
export const validateNewPassword = [
  body('password').isLength({ min: 6 }).withMessage('סיסמה חייבת להיות לפחות 6 תווים'),
  body('token').isLength({ min: 1 }).withMessage('טוקן הוא שדה חובה'),
  validateInput
];

// Sanitize user input
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove potential XSS vectors
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  
  next();
};

// Prevent parameter pollution
export const preventParameterPollution = (req: Request, res: Response, next: NextFunction) => {
  // Ensure arrays are not polluted
  for (const key in req.query) {
    if (Array.isArray(req.query[key]) && req.query[key]!.length > 1) {
      req.query[key] = req.query[key]![0];
    }
  }
  next();
};

// Log security events
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id || 'anonymous'
    };

    // Log security events
    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
      console.warn('SECURITY EVENT:', logData);
    }
  });

  next();
}; 