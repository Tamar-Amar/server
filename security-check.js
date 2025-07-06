#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔒 בדיקת אבטחה למערכת Leadtay\n');

// בדיקת קובץ .env
function checkEnvironmentVariables() {
  console.log('📋 בדיקת משתני סביבה...');
  
  const requiredVars = [
    'JWT_SECRET',
    'MONGODB_URI',
    'EMAIL_USER',
    'EMAIL_PASS',
    'ALLOWED_ORIGINS'
  ];

  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.log('❌ משתני סביבה חסרים:', missingVars.join(', '));
    return false;
  }

  // בדיקת חוזק JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret.length < 32) {
    console.log('⚠️  JWT_SECRET קצר מדי - מומלץ לפחות 32 תווים');
  } else {
    console.log('✅ JWT_SECRET תקין');
  }

  console.log('✅ כל משתני הסביבה הנדרשים קיימים');
  return true;
}

// בדיקת תלויות
function checkDependencies() {
  console.log('\n📦 בדיקת תלויות...');
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const securityPackages = [
    'helmet',
    'express-rate-limit',
    'express-validator',
    'express-slow-down',
    'bcryptjs'
  ];

  const missingPackages = [];
  
  securityPackages.forEach(pkg => {
    if (!packageJson.dependencies[pkg] && !packageJson.devDependencies[pkg]) {
      missingPackages.push(pkg);
    }
  });

  if (missingPackages.length > 0) {
    console.log('❌ חבילות אבטחה חסרות:', missingPackages.join(', '));
    return false;
  }

  console.log('✅ כל חבילות האבטחה מותקנות');
  return true;
}

// בדיקת קובצי middleware
function checkSecurityMiddleware() {
  console.log('\n🛡️  בדיקת middleware אבטחה...');
  
  const securityFile = path.join(__dirname, 'src', 'middleware', 'security.ts');
  
  if (!fs.existsSync(securityFile)) {
    console.log('❌ קובץ security.ts לא נמצא');
    return false;
  }

  const content = fs.readFileSync(securityFile, 'utf8');
  
  const requiredFeatures = [
    'helmet',
    'rateLimit',
    'express-validator',
    'sanitizeInput',
    'securityHeaders'
  ];

  const missingFeatures = [];
  
  requiredFeatures.forEach(feature => {
    if (!content.includes(feature)) {
      missingFeatures.push(feature);
    }
  });

  if (missingFeatures.length > 0) {
    console.log('❌ תכונות אבטחה חסרות:', missingFeatures.join(', '));
    return false;
  }

  console.log('✅ middleware אבטחה תקין');
  return true;
}

// בדיקת הגדרות CORS
function checkCORS() {
  console.log('\n🌐 בדיקת הגדרות CORS...');
  
  const serverFile = path.join(__dirname, 'src', 'server.ts');
  
  if (!fs.existsSync(serverFile)) {
    console.log('❌ קובץ server.ts לא נמצא');
    return false;
  }

  const content = fs.readFileSync(serverFile, 'utf8');
  
  if (!content.includes('cors') || !content.includes('ALLOWED_ORIGINS')) {
    console.log('❌ הגדרות CORS לא נמצאו');
    return false;
  }

  console.log('✅ הגדרות CORS תקינות');
  return true;
}

// בדיקת הצפנת סיסמאות
function checkPasswordHashing() {
  console.log('\n🔐 בדיקת הצפנת סיסמאות...');
  
  const passwordUtils = path.join(__dirname, 'src', 'utils', 'passwordUtils.ts');
  
  if (!fs.existsSync(passwordUtils)) {
    console.log('❌ קובץ passwordUtils.ts לא נמצא');
    return false;
  }

  const content = fs.readFileSync(passwordUtils, 'utf8');
  
  if (!content.includes('bcrypt') || !content.includes('hash')) {
    console.log('❌ הצפנת סיסמאות לא נמצאה');
    return false;
  }

  console.log('✅ הצפנת סיסמאות תקינה');
  return true;
}

// בדיקת JWT
function checkJWT() {
  console.log('\n🎫 בדיקת JWT...');
  
  const authController = path.join(__dirname, 'src', 'controllers', 'authController.ts');
  
  if (!fs.existsSync(authController)) {
    console.log('❌ קובץ authController.ts לא נמצא');
    return false;
  }

  const content = fs.readFileSync(authController, 'utf8');
  
  if (!content.includes('jwt.sign') || !content.includes('JWT_SECRET')) {
    console.log('❌ הגדרות JWT לא נמצאו');
    return false;
  }

  console.log('✅ הגדרות JWT תקינות');
  return true;
}

// בדיקת לוגים
function checkLogging() {
  console.log('\n📝 בדיקת מערכת לוגים...');
  
  const serverFile = path.join(__dirname, 'src', 'server.ts');
  
  if (!fs.existsSync(serverFile)) {
    console.log('❌ קובץ server.ts לא נמצא');
    return false;
  }

  const content = fs.readFileSync(serverFile, 'utf8');
  
  if (!content.includes('securityLogger')) {
    console.log('❌ לוגים אבטחה לא נמצאו');
    return false;
  }

  console.log('✅ מערכת לוגים תקינה');
  return true;
}

// בדיקת HTTPS (בסביבת ייצור)
function checkHTTPS() {
  console.log('\n🔒 בדיקת HTTPS...');
  
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  בסביבת ייצור - וודא שהשרת רץ על HTTPS');
  } else {
    console.log('ℹ️  בסביבת פיתוח - HTTPS לא נדרש');
  }
  
  return true;
}

// בדיקת גיבוי
function checkBackup() {
  console.log('\n💾 בדיקת גיבוי...');
  
  const backupDir = path.join(__dirname, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    console.log('⚠️  תיקיית גיבוי לא קיימת - מומלץ ליצור');
  } else {
    console.log('✅ תיקיית גיבוי קיימת');
  }
  
  return true;
}

// בדיקת הרשאות קבצים
function checkFilePermissions() {
  console.log('\n📁 בדיקת הרשאות קבצים...');
  
  const sensitiveFiles = [
    '.env',
    'package.json',
    'package-lock.json'
  ];

  let allGood = true;
  
  sensitiveFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const mode = stats.mode.toString(8);
      
      if (mode.endsWith('666') || mode.endsWith('777')) {
        console.log(`⚠️  הרשאות פתוחות מדי לקובץ: ${file}`);
        allGood = false;
      }
    }
  });

  if (allGood) {
    console.log('✅ הרשאות קבצים תקינות');
  }
  
  return allGood;
}

// בדיקה כללית
function runSecurityCheck() {
  const checks = [
    checkEnvironmentVariables,
    checkDependencies,
    checkSecurityMiddleware,
    checkCORS,
    checkPasswordHashing,
    checkJWT,
    checkLogging,
    checkHTTPS,
    checkBackup,
    checkFilePermissions
  ];

  let passedChecks = 0;
  let totalChecks = checks.length;

  checks.forEach(check => {
    if (check()) {
      passedChecks++;
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`📊 תוצאות בדיקת אבטחה: ${passedChecks}/${totalChecks}`);
  
  if (passedChecks === totalChecks) {
    console.log('🎉 מערכת האבטחה תקינה!');
  } else {
    console.log('⚠️  יש לתקן בעיות אבטחה לפני פרסום');
  }
  
  console.log('='.repeat(50));
}

// הרצת הבדיקה
if (require.main === module) {
  runSecurityCheck();
}

module.exports = {
  runSecurityCheck,
  checkEnvironmentVariables,
  checkDependencies,
  checkSecurityMiddleware,
  checkCORS,
  checkPasswordHashing,
  checkJWT,
  checkLogging,
  checkHTTPS,
  checkBackup,
  checkFilePermissions
}; 