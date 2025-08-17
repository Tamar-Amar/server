const mongoose = require('mongoose');
require('dotenv').config();

// הגדרת המודלים
const ClassSchema = new mongoose.Schema({
  workers: [{
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerAfterNoon' },
    roleName: { type: String },
    project: { type: Number }
  }],
  name: { type: String },
  uniqueSymbol: { type: String }
});

const WorkerAssignmentSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerAfterNoon' },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  projectCode: { type: Number },
  roleName: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean }
});

const Class = mongoose.model('Class', ClassSchema, 'classes-collections');
const WorkerAssignment = mongoose.model('WorkerAssignment', WorkerAssignmentSchema, 'worker-assignments-collections');

async function verifyMigration() {
  try {
    console.log('מתחיל בדיקת מיגרציה...');
    
    // חיבור למסד הנתונים
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✓ התחבר למסד הנתונים');
    
    // ספירת חיבורים במבנה החדש
    const totalAssignments = await WorkerAssignment.countDocuments();
    const activeAssignments = await WorkerAssignment.countDocuments({ isActive: true });
    
    console.log(`\n=== סטטיסטיקות חיבורים ===`);
    console.log(`סך הכל חיבורים: ${totalAssignments}`);
    console.log(`חיבורים פעילים: ${activeAssignments}`);
    
    // בדיקת חיבורים לפי פרויקט
    const projectStats = await WorkerAssignment.aggregate([
      {
        $group: {
          _id: '$projectCode',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: ['$isActive', 1, 0] }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    console.log('\n=== חיבורים לפי פרויקט ===');
    projectStats.forEach(stat => {
      console.log(`פרויקט ${stat._id}: ${stat.count} חיבורים (${stat.activeCount} פעילים)`);
    });
    
    // בדיקת חיבורים לפי תפקיד
    const roleStats = await WorkerAssignment.aggregate([
      {
        $group: {
          _id: '$roleName',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log('\n=== חיבורים לפי תפקיד ===');
    roleStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} חיבורים`);
    });
    
    // בדיקת כיתות עם הכי הרבה עובדים
    const topClasses = await WorkerAssignment.aggregate([
      {
        $group: {
          _id: '$classId',
          workerCount: { $sum: 1 }
        }
      },
      {
        $sort: { workerCount: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    console.log('\n=== 10 הכיתות עם הכי הרבה עובדים ===');
    for (const classStat of topClasses) {
      const classDoc = await Class.findById(classStat._id);
      console.log(`${classDoc?.name || 'לא ידוע'} (${classDoc?.uniqueSymbol || 'לא ידוע'}): ${classStat.workerCount} עובדים`);
    }
    
    // השוואה עם המבנה הישן
    const classesWithWorkers = await Class.find({
      'workers.0': { $exists: true }
    });
    
    let oldStructureCount = 0;
    classesWithWorkers.forEach(cls => {
      oldStructureCount += cls.workers.length;
    });
    
    console.log('\n=== השוואה עם המבנה הישן ===');
    console.log(`חיבורים במבנה הישן: ${oldStructureCount}`);
    console.log(`חיבורים במבנה החדש: ${totalAssignments}`);
    
    if (totalAssignments >= oldStructureCount) {
      console.log('✅ המיגרציה הצליחה - כל החיבורים הועברו');
    } else {
      console.log('⚠️ ייתכן שחלק מהחיבורים לא הועברו');
    }
    
    // בדיקת חיבורים כפולים
    const duplicateAssignments = await WorkerAssignment.aggregate([
      {
        $group: {
          _id: {
            workerId: '$workerId',
            classId: '$classId',
            projectCode: '$projectCode'
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);
    
    if (duplicateAssignments.length > 0) {
      console.log('\n⚠️ נמצאו חיבורים כפולים:');
      duplicateAssignments.forEach(dup => {
        console.log(`עובד: ${dup._id.workerId}, כיתה: ${dup._id.classId}, פרויקט: ${dup._id.projectCode} - ${dup.count} פעמים`);
      });
    } else {
      console.log('\n✅ לא נמצאו חיבורים כפולים');
    }
    
    console.log('\n✅ בדיקת המיגרציה הושלמה');
    
  } catch (error) {
    console.error('❌ שגיאה בבדיקת המיגרציה:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✓ התנתק ממסד הנתונים');
  }
}

// הרצת הבדיקה
verifyMigration();
