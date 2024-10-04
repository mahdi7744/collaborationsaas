// src/server/sendEmail.ts
import { emailSender } from 'wasp/server/email';
import { type SendNewsletter } from 'wasp/server/jobs';
import { type Email } from 'wasp/server/email/core/types';
import { type User } from 'wasp/entities';

// Initialize the email object
const emailToSend: Email = {
  to: '',
  subject: 'Files Shared with You',
  text: '', // This will be set later
  html: '', // This will be set later
};

// Function to send email notifications for shared files

// Function to send email notifications for shared files
export const checkAndQueueSharedFileEmails: SendNewsletter<{ emails: string[], sharedFiles: { name: string; senderEmail: string; }[] }, void> = async (args, context) => {
  const { emails, sharedFiles } = args;

  // Loop through all provided email addresses, regardless of registration
  await Promise.allSettled(
    emails.map(async (email) => {
      try {
        // Construct email content
        emailToSend.to = email;
        emailToSend.text = `Files have been shared with you: ${sharedFiles.map(file => file.name).join(', ')}.`;
        emailToSend.html = `
          <p>The following files have been shared with you:</p>
          <ul>
            ${sharedFiles.map(file => `<li>${file.name} (shared by: ${file.senderEmail})</li>`).join('')}
          </ul>
          <p>Access the files through the following link: <a href="http://localhost:3000/file-upload">View Shared Files</a></p>
        `;
        
        // Send the email
        await emailSender.send(emailToSend);
        console.log(`Email sent to ${email}`);
      } catch (error) {
        console.error('Error sending email to user: ', email, error);
      }
    })
  );
};