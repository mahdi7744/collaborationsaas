// src/server/sendEmail.ts
import { emailSender } from 'wasp/server/email';
import { type SendNewsletter } from 'wasp/server/jobs';
import { type Email } from 'wasp/server/email/core/types';
import { type User } from 'wasp/entities';

const emailToSend: Email = {
  to: '',
  subject: 'Files Shared with You',
  text: '', // This will be set later
  html: '', // This will be set later
};

// This function queues emails for users when files are shared
export const checkAndQueueSharedFileEmails: SendNewsletter<{ emails: string[], sharedFiles: string[] }, void> = async (args, context) => {
  const { emails, sharedFiles } = args;

  const users = await context.entities.User.findMany({
    where: {
      email: {
        in: emails,
      },
    },
  }) as User[];

  if (users.length === 0) {
    console.log('No users found to share files with.');
    return;
  }

  await Promise.allSettled(
    users.map(async (user) => {
      if (user.email) {
        try {
          emailToSend.to = user.email;
          emailToSend.text = `The following files have been shared with you: ${sharedFiles.join(', ')}`;
          emailToSend.html = `<p>The following files have been shared with you:</p><ul>${sharedFiles.map(file => `<li>${file}</li>`).join('')}</ul>`;
          
          await emailSender.send(emailToSend);
          console.log(`Email sent to ${user.email}`);
        } catch (error) {
          console.error('Error sending email to user: ', user.id, error);
        }
      }
    })
  );
};
