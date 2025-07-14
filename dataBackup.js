#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('ts-node/register');
const User = require('./src/models/User').default;
const WorkerAfterNoon = require('./src/models/WorkerAfterNoon').default;
const Document = require('./src/models/Document').default;
const Class = require('./src/models/Class').default;
const Operator = require('./src/models/Operator').default;
const Activity = require('./src/models/Activity').default;

const BACKUP_BASE_DIR = path.join(__dirname, 'data-backups');

if (!fs.existsSync(BACKUP_BASE_DIR)) {
  fs.mkdirSync(BACKUP_BASE_DIR, { recursive: true });
}

function getBackupDir() {
  const timestamp = new Date().toISOString().split('T')[0]; 
  const backupDir = path.join(BACKUP_BASE_DIR, timestamp);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  return backupDir;
}

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined');
    }
    
    await mongoose.connect(mongoUri);
  } catch (error) {
    console.error('Error in connectToDatabase:', error.message);
    process.exit(1);
  }
}

async function backupWorkersAfterNoon() {
  try {    
    const workers = await WorkerAfterNoon.find({}).lean();
    
    const backupData = {
      timestamp: new Date().toISOString(),
      count: workers.length,
      data: workers
    };
    
    const backupDir = getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `workers-afternoon-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));    
    return { fileName, count: workers.length };
  } catch (error) {
    console.error('Error in backupWorkersAfterNoon:', error.message);
    return null;
  }
}

async function backupDocuments() {
  try {    
    const documents = await Document.find({}).lean();
    
    const backupData = {
      timestamp: new Date().toISOString(),
      count: documents.length,
      data: documents
    };
    
    const backupDir = getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `documents-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));    
    return { fileName, count: documents.length };
  } catch (error) {
    console.error('Error in backupDocuments:', error.message);
    return null;
  }
}

async function backupClasses() {
  try {
    const classes = await Class.find({}).lean();
    
    const backupData = {
      timestamp: new Date().toISOString(),
      count: classes.length,
      data: classes
    };
    
    const backupDir = getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `classes-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    
    return { fileName, count: classes.length };
  } catch (error) {
    console.error('Error in backupClasses:', error.message);
    return null;
  }
}

async function backupUsers() {
  try {
    const users = await User.find({}).lean();
    
    const backupData = {
      timestamp: new Date().toISOString(),
      count: users.length,
      data: users
    };
    
    const backupDir = getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `users-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));    
    return { fileName, count: users.length };
  } catch (error) {
    console.error('Error in backupUsers:', error.message);
    return null;
  }
}

async function backupOperators() {
  try {
    const operators = await Operator.find({}).lean();
    
    const backupData = {
      timestamp: new Date().toISOString(),
      count: operators.length,
      data: operators
    };
    
    const backupDir = getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `operators-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    return { fileName, count: operators.length };
  } catch (error) {
    console.error('Error in backupOperators:', error.message);
    return null;
  }
}

async function backupActivities() {
  try {
    const activities = await Activity.find({}).lean();
    
    const backupData = {
      timestamp: new Date().toISOString(),
      count: activities.length,
      data: activities
    };

    const backupDir = getBackupDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `activities-${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    return { fileName, count: activities.length };
  } catch (error) {
    console.error('Error in backupActivities:', error.message);
    return null;
  }
}

async function createCompleteBackup() {
  try {    
    const results = {
      workers: await backupWorkersAfterNoon(),
      documents: await backupDocuments(),
      classes: await backupClasses(),
      users: await backupUsers(),
      operators: await backupOperators(),
      activities: await backupActivities()
    };
    
    let totalRecords = 0;
    Object.entries(results).forEach(([key, result]) => {
      if (result) {
        totalRecords += result.count;
      } else {
        console.log(`${key}: Error`);
      }
    });
        
    const backupDir = getBackupDir();

    const summaryData = {
      timestamp: new Date().toISOString(),
      summary: results,
      totalRecords
    };
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const summaryFileName = `backup-summary-${timestamp}.json`;
    const summaryPath = path.join(backupDir, summaryFileName);
    
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));    
  } catch (error) {
    console.error('Error in createCompleteBackup:', error.message);
  } finally {
    await mongoose.disconnect();    
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'backup':
      await connectToDatabase();
      await createCompleteBackup();
      break;
      
    default:
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createCompleteBackup,
}; 