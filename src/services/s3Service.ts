import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getSignedUrlAWS } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  },
  requestHandler: {
    abortSignal: undefined,
    connectionTimeout: 30000, // 30 seconds
    socketTimeout: 60000 // 60 seconds
  },
  maxAttempts: 3
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'your-bucket-name';

// העלאת קובץ ל-S3
export const uploadFileToS3 = async (
  buffer: Buffer,
  originalname: string,
  mimetype: string
): Promise<string> => {
  const key = `${crypto.randomUUID()}-${originalname}`;

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimetype
      })
    );

    return key;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
};

// מחיקת קובץ מ-S3
export const deleteFileFromS3 = async (key: string): Promise<void> => {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })
  );
};

// קבלת URL חתום לצפייה בקובץ
export const getSignedUrl = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  return getSignedUrlAWS(s3Client, command, { expiresIn: 86400 }); // URL תקף ל-24 שעות
};
