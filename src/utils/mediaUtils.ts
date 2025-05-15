import { S3 } from 'aws-sdk';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Configure AWS S3 client
const s3Client = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

interface SignedURLParams {
  clinicName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  userId: string;
}

/**
 * Generates a signed URL for securely uploading media to S3
 */
export const generateSignedUploadURL = async ({
  clinicName,
  fileName,
  fileType,
  fileSize,
  userId
}: SignedURLParams): Promise<string> => {
  // Validate file type
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'application/pdf'
  ];
  
  if (!allowedMimeTypes.includes(fileType)) {
    throw new Error('File type not allowed. Only JPEG, PNG, WebP images and PDF documents are permitted.');
  }
  
  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (fileSize > maxSize) {
    throw new Error('File too large. Maximum file size is 10MB.');
  }
  
  // Generate a sanitized file path
  const sanitizedClinicName = clinicName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const extension = fileName.split('.').pop();
  const key = `clinic-assets/${sanitizedClinicName}/${uniqueId}-${Date.now()}.${extension}`;
  
  // Set up parameters for signed URL
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: fileType,
    Expires: 60 * 15, // 15 minutes
    ServerSideEncryption: 'AES256', // Encrypt files at rest
    Metadata: {
      'uploader-id': userId,
      'clinic-id': sanitizedClinicName,
      'upload-timestamp': new Date().toISOString()
    }
  };
  
  try {
    // Generate signed URL
    const signedUrl = await s3Client.getSignedUrlPromise('putObject', params);
    
    // Log the upload attempt for audit
    console.log(`Upload initiated by ${userId} for clinic ${clinicName}: ${key}`);
    
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate upload URL. Please try again later.');
  }
};

/**
 * Generates a signed URL for viewing media that expires after a specified time
 */
export const generateSignedViewURL = async (key: string, expiresInSeconds: number = 3600): Promise<string> => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Expires: expiresInSeconds
  };
  
  try {
    const signedUrl = await s3Client.getSignedUrlPromise('getObject', params);
    return signedUrl;
  } catch (error) {
    console.error('Error generating view URL:', error);
    throw new Error('Failed to generate media view URL.');
  }
};

/**
 * Converts images to WebP format for optimal delivery
 */
export const optimizeImage = async (imageBuffer: Buffer, quality: number = 80): Promise<Buffer> => {
  // This would typically use a library like Sharp to convert images to WebP
  // Since we're in a restricted environment, we'd implement this differently in production
  
  // For now, this is just a placeholder that returns the original buffer
  return imageBuffer;
};