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
    return true;
  } catch (error) {
    console.error(`שגיאה במחיקת קובץ מ-S3: ${s3Key}`, error.message);
    return false;
  }
}

async function cleanupUndefinedTags() {
  try {
    
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


    if (documentsToDelete.length === 0) {
      return;
    }

    // מחק את הקבצים מ-S3
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

    const deleteResult = await Document.deleteMany({
      $or: [
        { tag: { $exists: false } },
        { tag: null },
        { tag: 'undefined' },
        { tag: '' },
        { tag: { $regex: /^\s*$/ } }
      ]
    });
    
  } catch (error) {
    console.error('שגיאה בניקוי המסמכים:', error);
  } finally {
    mongoose.connection.close();
  }
}

// הרץ את הסקריפט
cleanupUndefinedTags(); 