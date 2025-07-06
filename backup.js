#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('💾 יצירת גיבוי למערכת Leadtay\n');

const BACKUP_DIR = path.join(__dirname, 'backups');
const BACKUP_RETENTION_DAYS = 30; 

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `leadtay-backup-${timestamp}.json`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  console.log(`📦 יצירת גיבוי: ${backupFileName}`);

  const configBackup = {
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    environment: process.env.NODE_ENV || 'development',
    database: process.env.MONGODB_URI ? 'configured' : 'not-configured',
    email: process.env.EMAIL_USER ? 'configured' : 'not-configured'
  };

  fs.writeFileSync(backupPath, JSON.stringify(configBackup, null, 2));
  
  console.log(`✅ גיבוי נוצר בהצלחה: ${backupPath}`);
  
  cleanupOldBackups();
  
  return backupPath;
}

function cleanupOldBackups() {
  console.log('🧹 ניקוי גיבויים ישנים...');
  
  const files = fs.readdirSync(BACKUP_DIR);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);
  
  let deletedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`🗑️  נמחק גיבוי ישן: ${file}`);
    }
  });
  
  if (deletedCount > 0) {
    console.log(`✅ נמחקו ${deletedCount} גיבויים ישנים`);
  } else {
    console.log('ℹ️  אין גיבויים ישנים למחיקה');
  }
}

function showBackupStats() {
  console.log('\n📊 סטטיסטיקות גיבוי:');
  
  const files = fs.readdirSync(BACKUP_DIR);
  const backupFiles = files.filter(file => file.startsWith('leadtay-backup-'));
  
  console.log(`📁 מספר גיבויים: ${backupFiles.length}`);
  
  if (backupFiles.length > 0) {
    const totalSize = backupFiles.reduce((size, file) => {
      const filePath = path.join(BACKUP_DIR, file);
      return size + fs.statSync(filePath).size;
    }, 0);
    
    console.log(`💾 גודל כולל: ${(totalSize / 1024).toFixed(2)} KB`);
    
    const oldestBackup = backupFiles.sort()[0];
    const newestBackup = backupFiles.sort().pop();
    
    console.log(`📅 גיבוי ישן ביותר: ${oldestBackup}`);
    console.log(`📅 גיבוי חדש ביותר: ${newestBackup}`);
  }
}

function restoreBackup(backupFile) {
  console.log(`🔄 שחזור גיבוי: ${backupFile}`);
  
  const backupPath = path.join(BACKUP_DIR, backupFile);
  
  if (!fs.existsSync(backupPath)) {
    console.log('❌ קובץ הגיבוי לא נמצא');
    return false;
  }
  
  try {
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log('✅ גיבוי נטען בהצלחה');
    console.log('📋 פרטי הגיבוי:', backupData);
    return true;
  } catch (error) {
    console.log('❌ שגיאה בטעינת הגיבוי:', error.message);
    return false;
  }
}

function createDatabaseBackup() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.log('⚠️  MONGODB_URI לא מוגדר - דילוג על גיבוי מסד נתונים');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbBackupFileName = `leadtay-db-backup-${timestamp}`;
  const dbBackupPath = path.join(BACKUP_DIR, dbBackupFileName);
  
  console.log('🗄️  יצירת גיבוי מסד נתונים...');
  
  exec('which mongodump', (error) => {
    if (error) {
      console.log('⚠️  mongodump לא נמצא - דילוג על גיבוי מסד נתונים');
      return;
    }
    
    const command = `mongodump --uri="${mongoUri}" --out="${dbBackupPath}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ שגיאה בגיבוי מסד נתונים:', error.message);
        return;
      }
      
      console.log('✅ גיבוי מסד נתונים נוצר בהצלחה');
    });
  });
}
ד
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'create':
      createBackup();
      break;
      
    case 'restore':
      const backupFile = args[1];
      if (!backupFile) {
        console.log('❌ יש לציין שם קובץ גיבוי');
        process.exit(1);
      }
      restoreBackup(backupFile);
      break;
      
    case 'stats':
      showBackupStats();
      break;
      
    case 'cleanup':
      cleanupOldBackups();
      break;
      
    case 'db-backup':
      createDatabaseBackup();
      break;
      
    default:
      console.log('💾 כלי גיבוי למערכת Leadtay\n');
      console.log('שימוש:');
      console.log('  node backup.js create          - יצירת גיבוי');
      console.log('  node backup.js restore <file>  - שחזור גיבוי');
      console.log('  node backup.js stats           - הצגת סטטיסטיקות');
      console.log('  node backup.js cleanup         - ניקוי גיבויים ישנים');
      console.log('  node backup.js db-backup       - גיבוי מסד נתונים');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createBackup,
  restoreBackup,
  showBackupStats,
  cleanupOldBackups,
  createDatabaseBackup
}; 