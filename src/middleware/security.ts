import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.',
    he: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});


export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: {
    message: 'יותר מדי בקשות. נסה שוב בעוד 15 דקות.',
    he: 'יותר מדי בקשות. נסה שוב בעוד 15 דקות.'
  },
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, 
  delayAfter: 50, 
  delayMs: () => 500, 
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
});

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

export const validateLogin = [
  body('username').trim().isLength({ min: 1 }).withMessage('שם משתמש הוא שדה חובה'),
  body('password').isLength({ min: 1 }).withMessage('סיסמה היא שדה חובה'),
  validateInput
];

export const validateUserCreation = [
  body('username').trim().isLength({ min: 3 }).withMessage('שם משתמש חייב להיות לפחות 3 תווים'),
  body('password').isLength({ min: 6 }).withMessage('סיסמה חייבת להיות לפחות 6 תווים'),
  body('email').isEmail().withMessage('כתובת אימייל לא תקינה'),
  body('role').isIn(['system_admin', 'manager_project', 'operator', 'worker', 'payroll', 'coordinator']).withMessage('תפקיד לא תקין'),
  validateInput
];

export const validatePasswordReset = [
  body('email').isEmail().withMessage('כתובת אימייל לא תקינה'),
  validateInput
];

export const validateNewPassword = [
  body('password').isLength({ min: 6 }).withMessage('סיסמה חייבת להיות לפחות 6 תווים'),
  body('token').isLength({ min: 1 }).withMessage('טוקן הוא שדה חובה'),
  validateInput
];

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
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


export const preventParameterPollution = (req: Request, res: Response, next: NextFunction) => {
  for (const key in req.query) {
    if (Array.isArray(req.query[key]) && req.query[key]!.length > 1) {
      req.query[key] = req.query[key]![0];
    }
  }
  next();
};


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

    if (res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 429) {
      console.warn('SECURITY EVENT:', logData);
    }
  });

  next();
}; 