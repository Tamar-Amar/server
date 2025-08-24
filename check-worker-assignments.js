const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadtay');

const WorkerAssignmentSchema = new mongoose.Schema({
  workerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'WorkerAfterNoon', 
    required: true 
  },
  classId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Class', 
    required: true 
  },
  projectCode: { 
    type: Number, 
    required: true 
  },
  roleName: { 
    type: String, 
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: false 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createDate: { 
    type: Date, 
    default: Date.now 
  },
  updateDate: { 
    type: Date, 
    default: Date.now 
  },
  updateBy: { 
    type: String, 
    required: true 
  },
  notes: { 
    type: String, 
    required: false 
  }
});

const WorkerAssignment = mongoose.model('WorkerAssignment', WorkerAssignmentSchema, 'worker-assignments-collections');

async function checkWorkerAssignments() {
  try {
    console.log('🔍 בודק נתוני שיוכי עובדים...');
    
    const allAssignments = await WorkerAssignment.find({});
    console.log(`📊 סה"כ רשומות בטבלה: ${allAssignments.length}`);
    
    const activeAssignments = await WorkerAssignment.find({ isActive: true });
    console.log(`✅ רשומות פעילות: ${activeAssignments.length}`);
    
    const inactiveAssignments = await WorkerAssignment.find({ isActive: false });
    console.log(`❌ רשומות לא פעילות: ${inactiveAssignments.length}`);
    
    if (activeAssignments.length > 0) {
      console.log('\n📋 דוגמאות של רשומות פעילות:');
      activeAssignments.slice(0, 5).forEach((assignment, index) => {
        console.log(`${index + 1}. ID: ${assignment._id}`);
        console.log(`   Worker ID: ${assignment.workerId}`);
        console.log(`   Class ID: ${assignment.classId}`);
        console.log(`   Project Code: ${assignment.projectCode}`);
        console.log(`   Role: ${assignment.roleName}`);
        console.log(`   Active: ${assignment.isActive}`);
        console.log('---');
      });
    }
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📚 קולקציות בבסיס הנתונים:');
    collections.forEach(col => {
      console.log(`- ${col.name}`);
    });
    
  } catch (error) {
    console.error('❌ שגיאה:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkWorkerAssignments();
