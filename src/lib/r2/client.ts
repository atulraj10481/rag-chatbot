import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'rag-chatbot-docs';

export const isR2Configured = () => {
  return Boolean(endpoint && accessKeyId && secretAccessKey);
};

export const getR2Client = () => {
  if (!isR2Configured()) {
    return null;
  }
  return new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
};

export async function uploadToR2(key: string, body: Buffer, contentType: string = 'application/pdf'): Promise<string> {
  const client = getR2Client();
  if (!client) {
    console.warn('R2 is not configured, skipping object storage upload');
    return key;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const publicUrl = process.env.R2_PUBLIC_URL;
  return publicUrl ? `${publicUrl}/${key}` : key;
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  if (!client) return;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}
