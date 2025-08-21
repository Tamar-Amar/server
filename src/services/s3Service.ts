import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getSignedUrlAWS } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();

// Cache ל-URLs חתומים
interface CachedUrl {
  url: string;
  expiresAt: number;
}

const urlCache = new Map<string, CachedUrl>();
const CACHE_DURATION = 3600000; // שעה אחת במילישניות

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


export const deleteFileFromS3 = async (key: string): Promise<void> => {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    })
  );
};


export const getSignedUrl = async (key: string): Promise<string> => {
  try {
    // בדוק אם יש URL ב-cache שעדיין תקף
    const cached = urlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    // אם אין ב-cache או שפג תוקף, צור URL חדש
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const url = await getSignedUrlAWS(s3Client, command, { expiresIn: 3600 }); // שעה אחת במקום 24 שעות

    // שמור ב-cache
    urlCache.set(key, {
      url,
      expiresAt: Date.now() + CACHE_DURATION
    });

    return url;
  } catch (error) {
    console.error('Error getting signed URL for key:', key, error);
    throw new Error(`Failed to get signed URL for key: ${key}`);
  }
};

export const getFileFromS3 = async (key: string): Promise<Buffer> => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('No file content received from S3');
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    const stream = response.Body as Readable;
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  } catch (error) {
    console.error('Error getting file from S3:', error);
    throw new Error(`Failed to get file from S3 for key: ${key}`);
  }
};
