import { randomUUID } from 'crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_IAM_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_S3_IAM_SECRET_KEY!,
  },
});

type S3Upload = {
  fileType: string;
  userInfo: string;
}

export const getUploadFileSignedURLFromS3 = async ({ fileType, userInfo }: S3Upload) => {
  try {
    const ex = fileType.split('/')[1];
    const Key = `${userInfo}/${randomUUID()}.${ex}`;
    const s3Params = {
      Bucket: process.env.AWS_S3_FILES_BUCKET,
      Key,
      ContentType: fileType,
    };
    const command = new PutObjectCommand(s3Params);
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    console.log('Generated signed URL:', uploadUrl);

    return { uploadUrl, key: Key };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

export const getDownloadFileSignedURLFromS3 = async ({ key }: { key: string }) => {
  const s3Params = {
    Bucket: process.env.AWS_S3_FILES_BUCKET,
    Key: key,
  };
  const command = new GetObjectCommand(s3Params);
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
export const deleteFileFromS3 = async ({ key }: { key: string }) => {
  try {
    const s3Params = {
      Bucket: process.env.AWS_S3_FILES_BUCKET,
      Key: key,
    };
    const command = new DeleteObjectCommand(s3Params);
    await s3Client.send(command);

    console.log('File deleted successfully from S3:', key);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw error;
  }
};
