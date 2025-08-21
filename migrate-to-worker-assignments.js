const mongoose = require('mongoose');
require('dotenv').config();

const ClassSchema = new mongoose.Schema({
  address: { type: String, required: false },
  street: { type: String, required: false },
  streetNumber: { type: String, required: false },
  projectCodes: { type: [Number], required: false },
  name: { type: String, required: true },
  education: { type: String, required: true },
  gender: { type: String, enum: ['בנים', 'בנות'], required: true },
  uniqueSymbol: { type: String, required: true, unique: true },
  chosenStore: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: false },
  institutionName: { type: String, required: true },
  institutionCode: { type: String, required: true },
  regularOperatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: false }, 
  type: { type: String, enum: ['כיתה', 'גן'], required: true },
  hasAfternoonCare: { type: Boolean, default: false },
  monthlyBudget: { type: Number, required: false },
  childresAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }, 
  AfternoonOpenDate: { type: Date , required: false},
  description: { type: String, required: false },  
  workers: [{
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerAfterNoon' },
    roleName: { type: String },
    project: { type: Number }
  }],
  coordinatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coordinator', required: false },
});

const WorkerAfterNoonSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  id: { type: String, unique: true },
  modelCode: { type: String },
  projectCodes: { type: [Number] },
  createDate: { type: Date, default: Date.now },
  updateDate: { type: Date, default: Date.now },
  updateBy: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String },
  phone: { type: String },
  email: { type: String },
  isActive: { type: Boolean, default: true },
  notes: { type: String },
  roleName: { type: String },
  is101: { type: Boolean, default: false },
  lastLogin: { type: Date },
});

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

const Class = mongoose.model('Class', ClassSchema, 'classes-collections');
const WorkerAfterNoon = mongoose.model('WorkerAfterNoon', WorkerAfterNoonSchema, 'workers-after-noon-collections');
const WorkerAssignment = mongoose.model('WorkerAssignment', WorkerAssignmentSchema, 'worker-assignments-collections');

async function migrateToWorkerAssignments() {
  try {
    console.log('מתחיל מיגרציה למבנה חיבורים חדש...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✓ התחבר למסד הנתונים');
    
    const classesWithWorkers = await Class.find({
      'workers.0': { $exists: true },
      'workers.0.workerId': { $exists: true }
    }).populate('workers.workerId');
    
    console.log(`נמצאו ${classesWithWorkers.length} כיתות עם עובדים`);
    
    let totalAssignments = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const classDoc of classesWithWorkers) {
      try {
        console.log(`\nמעבד כיתה: ${classDoc.name} (${classDoc.uniqueSymbol})`);
        
        for (const worker of classDoc.workers) {
          if (worker.workerId) {
            try {
              const existingAssignment = await WorkerAssignment.findOne({
                workerId: worker.workerId,
                classId: classDoc._id,
                projectCode: worker.project || 4
              });
              
              if (existingAssignment) {
                console.log(`  - ⚠️ חיבור כבר קיים לעובד: ${worker.workerId}`);
                continue;
              }
              
              const workerDoc = await WorkerAfterNoon.findById(worker.workerId);
              if (!workerDoc) {
                console.log(`  - ⚠️ עובד לא נמצא: ${worker.workerId}`);
                continue;
              }
              
              let startDate, endDate;
              
              if (worker.project === 4) {
                startDate = new Date('2025-07-01'); // 1 ביולי 2025
                endDate = new Date('2025-07-31');   // 31 ביולי 2025
              } else {
                startDate = workerDoc.startDate || new Date();
                endDate = workerDoc.endDate;
              }
              
              const assignment = new WorkerAssignment({
                workerId: worker.workerId,
                classId: classDoc._id,
                projectCode: worker.project || 4,
                roleName: worker.roleName || workerDoc.roleName || 'לא נבחר',
                startDate: startDate,
                endDate: endDate,
                isActive: true,
                createDate: new Date(),
                updateDate: new Date(),
                updateBy: 'מיגרציה',
                notes: `נוצר במיגרציה - עובד בכיתה ${classDoc.name} בפרויקט ${worker.project || 4}`
              });
              
              await assignment.save();
              
              console.log(`  - ✓ נוצר חיבור: ${workerDoc.firstName} ${workerDoc.lastName} - ${assignment.roleName} בפרויקט ${assignment.projectCode}`);
              successCount++;
              
            } catch (workerError) {
              console.error(`  - ❌ שגיאה בעיבוד עובד ${worker.workerId}:`, workerError.message);
              errorCount++;
            }
          }
          totalAssignments++;
        }
        
      } catch (classError) {
        console.error(`❌ שגיאה בעיבוד כיתה ${classDoc.name}:`, classError.message);
        errorCount++;
      }
    }
    
    console.log('\n=== סיכום מיגרציה ===');
    console.log(`סך הכל חיבורים שנבדקו: ${totalAssignments}`);
    console.log(`חיבורים שנוצרו בהצלחה: ${successCount}`);
    console.log(`שגיאות: ${errorCount}`);
    console.log('========================');
    
    const totalAssignmentsInDB = await WorkerAssignment.countDocuments();
    console.log(`\nסך הכל חיבורים במסד הנתונים: ${totalAssignmentsInDB}`);
    
    if (successCount > 0) {
      console.log('\n✅ מיגרציה הושלמה בהצלחה!');
      console.log('\nהערות חשובות:');
      console.log('1. הנתונים הישנים עדיין קיימים במסד הנתונים');
      console.log('2. מומלץ לבדוק את הנתונים החדשים לפני מחיקת הישנים');
      console.log('3. יש לעדכן את הקוד להשתמש במבנה החדש');
    } else {
      console.log('\n⚠️ לא נוצרו חיבורים חדשים');
    }
    
  } catch (error) {
    console.error('❌ שגיאה במיגרציה:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✓ התנתק ממסד הנתונים');
  }
}

migrateToWorkerAssignments();
