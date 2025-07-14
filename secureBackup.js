#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

require('dotenv').config();

console.log('🔒 יצירת גיבוי מאובטח למערכת Leadtay\n');

const BACKUP_BASE_DIR = path.join(__dirname, 'data-backups');

function getBackupDir() {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backupDir = path.join(BACKUP_BASE_DIR, timestamp);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  return backupDir;
}

function encryptBackup(backupDir) {
  console.log('🔐 הצפנת הגיבוי...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const encryptedFileName = `secure-backup-${timestamp}.tar.gz`;
  const encryptedPath = path.join(BACKUP_BASE_DIR, encryptedFileName);
  
  // יצירת ארכיון מוצפן
  const command = `tar -czf "${encryptedPath}" -C "${backupDir}" .`;
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ שגיאה בהצפנת הגיבוי:', error.message);
        reject(error);
        return;
      }
      
      console.log(`✅ הגיבוי הוצפן: ${encryptedFileName}`);
      resolve(encryptedPath);
    });
  });
}

function uploadToCloud(encryptedPath) {
  const cloudProvider = process.env.CLOUD_PROVIDER || 'local';
  
  switch (cloudProvider) {
    case 'aws':
      return uploadToAWS(encryptedPath);
    case 'gcp':
      return uploadToGCP(encryptedPath);
    case 'azure':
      return uploadToAzure(encryptedPath);
    default:
      return uploadToLocal(encryptedPath);
  }
}

function uploadToLocal(encryptedPath) {
  const secureDir = path.join(__dirname, 'secure-backups');
  
  if (!fs.existsSync(secureDir)) {
    fs.mkdirSync(secureDir, { recursive: true });
  }
  
  const fileName = path.basename(encryptedPath);
  const destination = path.join(secureDir, fileName);
  
  fs.copyFileSync(encryptedPath, destination);
  console.log(`✅ הגיבוי נשמר במיקום מאובטח: ${destination}`);
  
  // מחיקת הקובץ המקורי
  fs.unlinkSync(encryptedPath);
  
  return destination;
}

function uploadToAWS(encryptedPath) {
  console.log('☁️  העלאה ל-AWS S3...');
  
  const bucketName = process.env.AWS_BUCKET_NAME;
  const fileName = path.basename(encryptedPath);
  
  const command = `aws s3 cp "${encryptedPath}" "s3://${bucketName}/backups/${fileName}"`;
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ שגיאה בהעלאה ל-AWS:', error.message);
        reject(error);
        return;
      }
      
      console.log(`✅ הגיבוי הועלה ל-AWS S3: s3://${bucketName}/backups/${fileName}`);
      
      // מחיקת הקובץ המקורי
      fs.unlinkSync(encryptedPath);
      
      resolve(`s3://${bucketName}/backups/${fileName}`);
    });
  });
}

function uploadToGCP(encryptedPath) {
  console.log('☁️  העלאה ל-Google Cloud Storage...');
  
  const bucketName = process.env.GCP_BUCKET_NAME;
  const fileName = path.basename(encryptedPath);
  
  const command = `gsutil cp "${encryptedPath}" "gs://${bucketName}/backups/${fileName}"`;
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ שגיאה בהעלאה ל-GCP:', error.message);
        reject(error);
        return;
      }
      
      console.log(`✅ הגיבוי הועלה ל-GCP: gs://${bucketName}/backups/${fileName}`);
      
      // מחיקת הקובץ המקורי
      fs.unlinkSync(encryptedPath);
      
      resolve(`gs://${bucketName}/backups/${fileName}`);
    });
  });
}

function uploadToAzure(encryptedPath) {
  console.log('☁️  העלאה ל-Azure Blob Storage...');
  
  const containerName = process.env.AZURE_CONTAINER_NAME;
  const fileName = path.basename(encryptedPath);
  
  const command = `az storage blob upload --account-name "${process.env.AZURE_STORAGE_ACCOUNT}" --container-name "${containerName}" --name "backups/${fileName}" --file "${encryptedPath}"`;
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ שגיאה בהעלאה ל-Azure:', error.message);
        reject(error);
        return;
      }
      
      console.log(`✅ הגיבוי הועלה ל-Azure: ${containerName}/backups/${fileName}`);
      
      // מחיקת הקובץ המקורי
      fs.unlinkSync(encryptedPath);
      
      resolve(`${containerName}/backups/${fileName}`);
    });
  });
}

function cleanupOldBackups() {
  console.log('🧹 ניקוי גיבויים ישנים...');
  
  const secureDir = path.join(__dirname, 'secure-backups');
  if (!fs.existsSync(secureDir)) {
    return;
  }
  
  const files = fs.readdirSync(secureDir);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 ימים
  
  let deletedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(secureDir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`🗑️  נמחק גיבוי ישן: ${file}`);
    }
  });
  
  if (deletedCount > 0) {
    console.log(`✅ נמחקו ${deletedCount} גיבויים ישנים`);
  }
}

async function createSecureBackup() {
  try {
    console.log('🚀 יצירת גיבוי מאובטח...\n');
    
    // יצירת גיבוי רגיל
    const { execSync } = require('child_process');
    execSync('npm run data-backup', { stdio: 'inherit' });
    
    // מציאת תיקיית הגיבוי האחרונה
    const backupDirs = fs.readdirSync(BACKUP_BASE_DIR)
      .filter(dir => fs.statSync(path.join(BACKUP_BASE_DIR, dir)).isDirectory())
      .sort()
      .reverse();
    
    if (backupDirs.length === 0) {
      throw new Error('לא נמצאו גיבויים');
    }
    
    const latestBackupDir = path.join(BACKUP_BASE_DIR, backupDirs[0]);
    console.log(`📁 תיקיית הגיבוי: ${latestBackupDir}`);
    
    // הצפנה והעלאה
    const encryptedPath = await encryptBackup(latestBackupDir);
    const uploadedPath = await uploadToCloud(encryptedPath);
    
    // ניקוי תיקיית הגיבוי המקורית
    fs.rmSync(latestBackupDir, { recursive: true, force: true });
    console.log('🗑️  תיקיית הגיבוי המקורית נמחקה');
    
    // ניקוי גיבויים ישנים
    cleanupOldBackups();
    
    console.log('\n✅ גיבוי מאובטח הושלם בהצלחה!');
    console.log(`📍 מיקום: ${uploadedPath}`);
    
  } catch (error) {
    console.error('❌ שגיאה בגיבוי מאובטח:', error.message);
  }
}

function showSecureBackupStats() {
  console.log('📊 סטטיסטיקות גיבוי מאובטח:\n');
  
  const secureDir = path.join(__dirname, 'secure-backups');
  
  if (!fs.existsSync(secureDir)) {
    console.log('📁 תיקיית הגיבוי המאובטח לא קיימת');
    return;
  }
  
  const files = fs.readdirSync(secureDir);
  const backupFiles = files.filter(file => file.startsWith('secure-backup-'));
  
  console.log(`📁 מספר גיבויים מאובטחים: ${backupFiles.length}`);
  
  if (backupFiles.length > 0) {
    const totalSize = backupFiles.reduce((size, file) => {
      const filePath = path.join(secureDir, file);
      return size + fs.statSync(filePath).size;
    }, 0);
    
    console.log(`💾 גודל כולל: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    const oldestBackup = backupFiles.sort()[0];
    const newestBackup = backupFiles.sort().pop();
    
    console.log(`📅 גיבוי ישן ביותר: ${oldestBackup}`);
    console.log(`📅 גיבוי חדש ביותר: ${newestBackup}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'create':
      createSecureBackup();
      break;
      
    case 'stats':
      showSecureBackupStats();
      break;
      
    default:
      console.log('🔒 כלי גיבוי מאובטח למערכת Leadtay\n');
      console.log('שימוש:');
      console.log('  node secureBackup.js create  - יצירת גיבוי מאובטח');
      console.log('  node secureBackup.js stats   - הצגת סטטיסטיקות');
      console.log('\nהגדרות נדרשות ב-.env:');
      console.log('  CLOUD_PROVIDER=local|aws|gcp|azure');
      console.log('  AWS_BUCKET_NAME=שם-הדלי (עבור AWS)');
      console.log('  GCP_BUCKET_NAME=שם-הדלי (עבור GCP)');
      console.log('  AZURE_STORAGE_ACCOUNT=שם-החשבון (עבור Azure)');
      console.log('  AZURE_CONTAINER_NAME=שם-הקונטיינר (עבור Azure)');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createSecureBackup,
  showSecureBackupStats
}; 