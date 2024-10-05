import { HttpError } from 'wasp/server';
import { getUploadFileSignedURLFromS3, getDownloadFileSignedURLFromS3, deleteFileFromS3 } from './s3Utils';
import { type SharedFile, type User, type File } from 'wasp/entities';
import { type CreateFile, type GetAllFilesByUser, type GetDownloadFileSignedURL } from 'wasp/server/operations';
import { checkAndQueueSharedFileEmails } from '../server/sendEmail';

// Declare the type for sharing files with multiple users
type ShareFileWithUsers = {
  fileKey: string;
  emails: string[]; // Array of emails
};

type FileDescription = {
  fileType: string;
  name: string;
  size: number; // Add size here
};

// Create file
export const createFile: CreateFile<FileDescription, File> = async ({ fileType, name, size }, context) => {
  try {
    if (!context.user) {
      throw new HttpError(401, "Unauthorized");
    }

    const userInfo = context.user.id;
    const { uploadUrl, key } = await getUploadFileSignedURLFromS3({ fileType, userInfo });

    console.log('Signed URL and key:', { uploadUrl, key });

    // Create file record in database, including size
    const fileRecord = await context.entities.File.create({
      data: {
        name,
        key,
        uploadUrl,
        type: fileType,
        size, // Save the file size in the database
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

// Share file with multiple users (merged version)
export const shareFileWithUsers = async (
  { fileKey, emails }: ShareFileWithUsers, 
  context: any
): Promise<{ name: string; senderEmail: string }[]> => { // Keep the return type as in the first snippet
  if (!context.user) {
    console.error("Unauthorized access attempt."); // Log unauthorized access
    throw new HttpError(401, "Unauthorized");
  }

  // Fetch the file based on the provided fileKey
  const file = await context.entities.File.findUnique({
    where: { key: fileKey },
    include: { user: true },
  });

  // Check if the file exists and if the user has permission to share it
  if (!file || file.userId !== context.user.id) {
    console.error(`File not found or unauthorized access. FileKey: ${fileKey}, UserId: ${context.user.id}`); // Log issue
    throw new HttpError(404, "File not found or not authorized");
  }

  // Initialize an array to hold the shared file details (for email notifications) and SharedFile records
  const sharedFiles: { name: string; senderEmail: string }[] = [];  

  // Iterate over the list of email addresses
  for (const email of emails) {
    console.log(`Processing email: ${email}`); // Log current email being processed

    // Fetch the user associated with the email
    const user = await context.entities.User.findUnique({ where: { email } });
    
    if (user) {
      console.log(`User found: ${user.id} for email: ${email}`); // Log found user

      // Create a shared file entry for registered users
      await context.entities.SharedFile.create({
        data: {
          file: { connect: { id: file.id } },
          sharedWith: { connect: { id: user.id } },
          permissions: 'read', // Set default permissions
          sharedBy: { connect: { id: context.user.id } }, // Connect the user sharing the file
        },
      });
      
      // Push the shared file details for registered user
      sharedFiles.push({
        name: file.name,
        senderEmail: context.user.email,
      });
    } else {
      console.warn(`User not found for email: ${email}. Proceeding to share with non-registered user.`); // Log if the user does not exist

      // Queue email notifications for non-registered users but skip creating SharedFile entry
      sharedFiles.push({
        name: file.name,
        senderEmail: context.user.email, // Use the current user's email for the sender
      });
    }
  }

  // After creating shared files, send notification emails for both registered and non-registered users
  if (sharedFiles.length > 0) {
    console.log('Sending email notifications for the following shared files:', sharedFiles); // Log the shared files details
    await checkAndQueueSharedFileEmails(
      { emails, sharedFiles }, // Pass the emails and sharedFiles info
      context
    );
  } else {
    console.log('No shared files to send emails for.'); // Log if no files to send
  }

  return sharedFiles; // Return the shared file details for both registered and non-registered users
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
