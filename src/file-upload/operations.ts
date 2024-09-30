import { HttpError } from 'wasp/server';
import { getUploadFileSignedURLFromS3, getDownloadFileSignedURLFromS3, deleteFileFromS3 } from './s3Utils';
import { type SharedFile, type User, type File } from 'wasp/entities';
import { type CreateFile, type GetAllFilesByUser, type GetDownloadFileSignedURL } from 'wasp/server/operations';

// Declare the type for sharing files with multiple users
type ShareFileWithUsers = {
  fileKey: string;
  emails: string[]; // Array of emails
};

type FileDescription = {
  fileType: string;
  name: string;
};

// Create file
export const createFile: CreateFile<FileDescription, File> = async ({ fileType, name }, context) => {
  try {
    if (!context.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const userInfo = context.user.id;
    const { uploadUrl, key } = await getUploadFileSignedURLFromS3({ fileType, userInfo });

    console.log('Signed URL and key:', { uploadUrl, key });

    const fileRecord = await context.entities.File.create({
      data: {
        name,
        key,
        uploadUrl,
        type: fileType,
        user: { connect: { id: context.user.id } },
      },
    });

    console.log('File record created:', fileRecord);

    return fileRecord;
  } catch (error) {
    console.error('Error in createFile:', error);
    throw error;
  }
};

// Get all files by user
export const getAllFilesByUser: GetAllFilesByUser<void, File[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  return context.entities.File.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
    include: {
      sharedWith: {
        include: {
          sharedWith: true
        }
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

// Get signed URL for file download
export const getDownloadFileSignedURL: GetDownloadFileSignedURL<{ key: string }, string> = async (
  { key },
  _context
) => {
  return await getDownloadFileSignedURLFromS3({ key });
};

// Share file with multiple users
export const shareFileWithUsers = async (
  { fileKey, emails }: ShareFileWithUsers, 
  context: any
): Promise<SharedFile[]> => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const file = await context.entities.File.findUnique({
    where: { key: fileKey },
    include: { user: true },
  });

  if (!file || file.userId !== context.user.id) {
    throw new HttpError(404, "File not found or not authorized");
  }

  const sharedFiles = [];

  for (const email of emails) {
    const user = await context.entities.User.findUnique({ where: { email } });
    
    if (user) {
      const sharedFile = await context.entities.SharedFile.create({
        data: {
          file: { connect: { id: file.id } },
          sharedWith: { connect: { id: user.id } },
        },
      });
      sharedFiles.push(sharedFile);
    }
  }

  return sharedFiles;
};

// Delete file
export const deleteFile = async ({ fileId }: { fileId: string }, context: any) => {
  if (!context.user) {
    throw new HttpError(401, 'Unauthorized');
  }

  console.log(`Attempting to delete file with id: ${fileId} by user: ${context.user.id}`);

  // Find the file using its key
  const file = await context.entities.File.findUnique({
    where: { key: fileId },
    include: { user: true },
  });

  if (!file) {
    console.log(`File with key: ${fileId} not found`);
    console.log(`Database records:`, await context.entities.File.findMany()); // Log all file records for debugging
    throw new HttpError(404, 'File not found');
  }

  if (file.userId !== context.user.id) {
    console.log(`User: ${context.user.id} not authorized to delete file with key: ${fileId}`);
    throw new HttpError(403, 'Not authorized');
  }

  try {
    // Delete the file record from the database
    await context.entities.File.delete({
      where: { key: fileId },
    });

    // Delete the file from S3
    await deleteFileFromS3({ key: fileId });

    console.log(`File with key: ${fileId} deleted successfully`);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};
