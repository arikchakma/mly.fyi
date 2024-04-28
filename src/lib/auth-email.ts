import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as AWS from '@aws-sdk/client-ses';
import { createTransport } from 'nodemailer';
import { serverConfig } from './config';
import { logError, logInfo, logWarning } from './logger';

// ERROR: `__dirname` is not defined in ES module scope
// https://iamwebwiz.medium.com/how-to-fix-dirname-is-not-defined-in-es-module-scope-34d94a86694d
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedDevEmails = [
  'arikchangma@gmail.com',
  'hello@arikko.dev',
  'hello@shoutly.club',
];
function shouldSendEmail(email: string) {
  return (
    !serverConfig.isDev ||
    allowedDevEmails.includes(email) ||
    (serverConfig.isDev && serverConfig.ses.sesEndpointOverrideUrl)
  );
}

export async function sendVerificationEmail(
  toAddress: string,
  verificationCode: string,
) {
  const templatePath = path.join(
    __dirname,
    '../../src/templates/email-verification.html',
  );
  const emailTemplate = await fs.readFile(templatePath, 'utf8');

  const emailSubject = 'Verify your email address';
  const emailBody = emailTemplate.replace(
    new RegExp('{{verificationLink}}', 'g'),
    `${serverConfig.appUrl}/verify-account/${verificationCode}`,
  );

  return sendSystemEmail(toAddress, emailSubject, emailBody);
}

export async function sendForgotPasswordEmail(
  toAddress: string,
  resetCode: string,
) {
  const templatePath = path.join(
    __dirname,
    '../../src/templates/email-forgot-password.html',
  );
  const emailTemplate = await fs.readFile(templatePath, 'utf8');

  const emailSubject = 'Reset your password';
  const emailBody = emailTemplate.replace(
    new RegExp('{{resetPasswordLink}}', 'g'),
    `${serverConfig.appUrl}/reset-password/${resetCode}`,
  );

  return sendSystemEmail(toAddress, emailSubject, emailBody);
}

export async function sendSystemEmail(
  toAddress: string,
  subject: string,
  body: string,
) {
  if (!shouldSendEmail(toAddress)) {
    logWarning(
      `Email not sent to ${toAddress} because it's not allowed in dev mode.`,
    );
    return false;
  }

  if (!serverConfig.ses.accessKeyId || !serverConfig.ses.secretAccessKey) {
    if (!serverConfig.isDev) {
      throw new Error('AWS SES credentials not found');
    }

    logWarning('AWS SES credentials not found. Skipping sending email.');
  }

  try {
    const sesClient = new AWS.SESClient({
      region: serverConfig.ses.region,
      credentials: {
        accessKeyId: serverConfig.ses.accessKeyId,
        secretAccessKey: serverConfig.ses.secretAccessKey,
      },
    });
    const transport = createTransport({
      SES: { ses: sesClient, aws: AWS },
    });

    await transport.sendMail({
      from: serverConfig.ses.fromEmail,
      to: toAddress,
      subject,
      html: body,
    });

    logInfo(`Email sent to ${toAddress}`);
    return true;
  } catch (error) {
    logError(error, (error as any)?.stack);
    return false;
  }
}
