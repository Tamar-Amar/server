const mongoose = require('mongoose');
const AWS = require('aws-sdk');
require('dotenv').config();

// הגדרת AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// חיבור למסד הנתונים
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/leadtay', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// סכמת המסמך
const DocumentSchema = new mongoose.Schema({
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: true },
  tag: { type: String },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  size: { type: Number, required: true },
  s3Key: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true },
  isTemporary: { type: Boolean, default: false },
  status: { type: String, default: 'ממתין' },
  expiryDate: { type: Date },
  comments: { type: String },
});

const Document = mongoose.model('Document', DocumentSchema, 'documents-collections');

// פונקציה למחיקת קובץ מ-S3
async function deleteFileFromS3(s3Key) {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: s3Key
    };
    
    await s3.deleteObject(params).promise();
    console.log(`נמחק מ-S3: ${s3Key}`);
    return true;
  } catch (error) {
    console.error(`שגיאה במחיקת קובץ מ-S3: ${s3Key}`, error.message);
    return false;
  }
}

async function cleanupUndefinedTags() {
  try {
    console.log('מתחיל ניקוי מסמכים עם תג undefined...');
    
    // מצא מסמכים עם תג undefined או ריק
    const documentsToDelete = await Document.find({
      $or: [
        { tag: { $exists: false } },
        { tag: null },
        { tag: 'undefined' },
        { tag: '' },
        { tag: { $regex: /^\s*$/ } } // תגים עם רווחים בלבד
      ]
    });

    console.log(`נמצאו ${documentsToDelete.length} מסמכים עם תג undefined`);

    if (documentsToDelete.length === 0) {
      console.log('אין מסמכים עם תג undefined לניקוי');
      return;
    }

    // הצג פרטי המסמכים שיימחקו
    console.log('\nמסמכים שיימחקו:');
    documentsToDelete.forEach((doc, index) => {
      console.log(`${index + 1}. ID: ${doc._id}, File: ${doc.fileName}, Tag: "${doc.tag}", S3 Key: ${doc.s3Key}`);
    });

    // מחק את הקבצים מ-S3
    console.log('\nמתחיל מחיקת קבצים מ-S3...');
    let s3DeleteSuccess = 0;
    let s3DeleteFailed = 0;

    for (const doc of documentsToDelete) {
      const success = await deleteFileFromS3(doc.s3Key);
      if (success) {
        s3DeleteSuccess++;
      } else {
        s3DeleteFailed++;
      }
    }

    console.log(`\nמחיקת S3 הושלמה: ${s3DeleteSuccess} הצליחו, ${s3DeleteFailed} נכשלו`);

    // מחק את המסמכים מהמסד נתונים
    console.log('\nמתחיל מחיקת רשומות מהמסד נתונים...');
    const deleteResult = await Document.deleteMany({
      $or: [
        { tag: { $exists: false } },
        { tag: null },
        { tag: 'undefined' },
        { tag: '' },
        { tag: { $regex: /^\s*$/ } }
      ]
    });

    console.log(`\nניקוי הושלם בהצלחה!`);
    console.log(`- נמחקו ${deleteResult.deletedCount} רשומות מהמסד נתונים`);
    console.log(`- נמחקו ${s3DeleteSuccess} קבצים מ-S3`);
    if (s3DeleteFailed > 0) {
      console.log(`- ${s3DeleteFailed} קבצים מ-S3 לא נמחקו (ייתכן שכבר לא קיימים)`);
    }
    
  } catch (error) {
    console.error('שגיאה בניקוי המסמכים:', error);
  } finally {
    mongoose.connection.close();
    console.log('החיבור למסד הנתונים נסגר');
  }
}

// הרץ את הסקריפט
cleanupUndefinedTags(); 