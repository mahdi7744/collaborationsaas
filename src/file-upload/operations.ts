import { HttpError } from 'wasp/server';
import { getUploadFileSignedURLFromS3, getDownloadFileSignedURLFromS3 } from './s3Utils';
import { type SharedFile, type User, type File } from 'wasp/entities';
import { type CreateFile, type GetAllFilesByUser, type GetDownloadFileSignedURL } from 'wasp/server/operations';
//import { getUploadFileSignedURLFromGCS, getDownloadFileSignedURLFromGCS } from './s3Utils';

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
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const userInfo = context.user.id;
  const { uploadUrl, key } = await getUploadFileSignedURLFromS3({ fileType, userInfo });

  return await context.entities.File.create({
    data: {
      name,
      key,
      uploadUrl,
      type: fileType,
      user: { connect: { id: context.user.id } },
    },
  });
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
/*export const deleteFile = async ({ fileKey }: { fileKey: string }, context: any): Promise<void> => {
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

  await context.entities.File.delete({
    where: { key: fileKey },
  });
};*/
// Mocked Delete File function for frontend testing
export const deleteFile = async ({ fileKey }: { fileKey: string }, context: any): Promise<void> => {
  // Simulate user authentication check
  if (!context.user) {
    throw new Error("Unauthorized: User not authenticated.");
  }

  // Mock the file lookup (pretend we found the file)
  const mockFile = {
    key: fileKey,
    userId: context.user.id, // Assuming the file belongs to the user
  };

  // Check if the file belongs to the user (mock logic)
  if (!mockFile || mockFile.userId !== context.user.id) {
    throw new Error("File not found or not authorized.");
  }

  // Simulate deletion by logging to the console
  console.log(`File with key ${fileKey} would be deleted.`);

  // Instead of deleting from the database, mock a success response
  return Promise.resolve(); // Simulating successful deletion
};


