const mongoose = require('mongoose');
require('dotenv').config();

// חיבור למסד הנתונים
mongoose.connect(process.env.MONGO_URI , {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// הגדרת המודלים
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
    project: { type: Number },
    roleName: { type: String }
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

const Class = mongoose.model('Class', ClassSchema, 'classes-collections');
const WorkerAfterNoon = mongoose.model('WorkerAfterNoon', WorkerAfterNoonSchema, 'workers-after-noon-collections');

async function updateClassesRoleName() {
  try {
    console.log('מתחיל עדכון מבנה עובדים בכיתות...');
    
    // מציאת כל הכיתות שיש להן עובדים
    const classesWithWorkers = await Class.find({
      'workers.0': { $exists: true },
      'workers.0.workerId': { $exists: true }
    }).populate('workers.workerId');
    
    console.log(`נמצאו ${classesWithWorkers.length} כיתות עם עובדים`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const classDoc of classesWithWorkers) {
      try {
        // יצירת מערך עובדים חדש עם המבנה הנכון
        const updatedWorkers = [];
        
        for (const worker of classDoc.workers) {
          if (worker.workerId) {
            // מציאת העובד במסד הנתונים
            const workerDoc = await WorkerAfterNoon.findById(worker.workerId);
            
            if (workerDoc) {
              const newWorkerEntry = {
                workerId: worker.workerId,
                project: worker.project || 4, // ברירת מחדל לפרויקט 4
                roleName: workerDoc.roleName || 'לא נבחר'
              };
              
              updatedWorkers.push(newWorkerEntry);
              
              console.log(`  - עובד: ${workerDoc.firstName} ${workerDoc.lastName} - תפקיד: ${newWorkerEntry.roleName}`);
            } else {
              console.log(`  - ⚠️ עובד לא נמצא: ${worker.workerId}`);
            }
          }
        }
        
        // עדכון הכיתה עם המבנה החדש
        await Class.findByIdAndUpdate(classDoc._id, {
          $set: { workers: updatedWorkers }
        });
        
        console.log(`✓ עדכון כיתה: ${classDoc.name} (${classDoc.uniqueSymbol}) - ${updatedWorkers.length} עובדים`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ שגיאה בעדכון כיתה ${classDoc.name} (${classDoc.uniqueSymbol}):`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n=== סיכום עדכון ===');
    console.log(`כיתות שעודכנו בהצלחה: ${updatedCount}`);
    console.log(`כיתות עם שגיאות: ${errorCount}`);
    console.log(`סה"כ כיתות שנבדקו: ${classesWithWorkers.length}`);
    
  } catch (error) {
    console.error('שגיאה כללית:', error);
  } finally {
    mongoose.connection.close();
    console.log('החיבור למסד הנתונים נסגר');
  }
}

// הרצת הסקריפט
updateClassesRoleName();
