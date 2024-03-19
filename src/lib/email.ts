import { SESClient } from '@aws-sdk/client-ses';
import * as AWS from '@aws-sdk/client-ses';
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';
import SESTransport from 'nodemailer/lib/ses-transport';
import { logError } from './logger';
import { serverConfig } from './config';

export const allowedEmailProvider = ['ses'] as const;
export type AllowedEmailProvider = (typeof allowedEmailProvider)[number];

interface EmailErrorType {
  message: string;
  stack?: string;
}

class EmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailError';
    this.message = message;
  }

  static isEmailError(error: any): error is EmailError {
    return error instanceof EmailError;
  }
}

type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

interface EmailRenderOptions {
  /**
   * The plain text content of the email.
   */
  text?: string;

  /**
   * The HTML content of the email.
   */
  html?: string;
}

interface EmailBodyOptions extends EmailRenderOptions {
  /**
   * The email address that appears as the sender of the email.
   * Use a friendly name and a valid email address.
   *
   * Example: `John Doe <johndoe@example.com>`
   */
  from: string;

  /**
   * The recipient(s) of the email. Can be a single email address or an array of email addresses.
   */
  to: string | string[];

  /**
   * The email address that should be used for replies. If not provided, replies will go to the 'from' address.
   */
  replyTo?: string | string[];

  /**
   * The subject line of the email.
   */
  subject: string;

  /**
   * The email addresses to carbon copy.
   * The recipients will be visible to other recipients.
   */
  cc?: string[];

  /**
   * The email addresses to blind carbon copy.
   * The recipients will not be visible to other recipients. (i.e. in the `to` or `cc` fields)
   */
  bcc?: string[];

  /**
   * [NOT IMPLEMENTED] - Attachments are not implemented yet.
   */
  // attachments?: string[];

  /**
   * Additional headers to include in the email.
   */
  headers?: Record<string, string>;

  /**
   * Additional data to be passed to the email template.
   * This will be only for `postmark` provider.
   */
  metadata?: Record<string, any>;
}

export type SendEmailBody = RequireAtLeastOne<EmailRenderOptions> &
  EmailBodyOptions;

type SESProviderOptions = {
  provider: 'ses';
  ses: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    overrideEndpoint?: string;
  };
};

export type EmailProviderOptions = SESProviderOptions & {};

class Email {
  private provider: AllowedEmailProvider;
  private client: SESProvider;
  constructor(options: EmailProviderOptions) {
    this.provider = options.provider;
    if (this.provider === 'ses') {
      this.client = new SESProvider(options as SESProviderOptions);
    } else {
      throw new Error('Invalid email provider.');
    }
  }

  async send(options: SendEmailBody): Promise<SendEmailResponse> {
    return await this.client.sendEmail(options);
  }
}

type SendEmailResponse =
  | {
      data: {
        messageId: string;
      };
      error: null;
    }
  | {
      data: null;
      error: {
        message: string;
        stack?: string;
      };
    };

class SESProvider {
  private options: SESProviderOptions;
  private sesClient: SESClient;
  private client: SESClient | Transporter<SESTransport.SentMessageInfo>;

  constructor(options: SESProviderOptions) {
    this.options = {
      ...options,
      ses: {
        ...options?.ses,
        ...(!options?.ses?.overrideEndpoint &&
          serverConfig.isDev && {
            overrideEndpoint: serverConfig.ses.sesEndpointOverrideUrl,
          }),
      },
    };

    const { accessKeyId, secretAccessKey, region, overrideEndpoint } =
      this.options.ses;

    /**
     * `nodemailer` doesn't support SES overrides.
     * This function is a workaround to send emails using SES overrides.
     *
     * if `sesOverrideUrl` and in dev mode, it will send emails using `aws-sdk` instead of `nodemailer`.
     * otherwise, it will use `nodemailer` for production.
     */
    if (overrideEndpoint) {
      this.sesClient = new SESClient({
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        region,
        endpoint: overrideEndpoint,
      });

      this.client = this.sesClient;
    } else {
      this.sesClient = new SESClient({
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        region,
      });

      this.client = createTransport({
        SES: { ses: this.sesClient, aws: AWS },
      });
    }
  }

  async sendEmail(options: SendEmailBody): Promise<SendEmailResponse> {
    try {
      if (this.options.ses.overrideEndpoint) {
        return await this.sendSESEmail(options);
      } else {
        return await this.sendNodeMailerEmail(options);
      }
    } catch (error) {
      logError(error, (error as Error)?.stack);
      return {
        data: null,
        error: {
          message: (error as EmailErrorType)?.message,
          stack: (error as EmailErrorType)?.stack,
        },
      };
    }
  }

  async sendSESEmail(options: SendEmailBody): Promise<SendEmailResponse> {
    const { from, to, subject, text, html, replyTo } = options;

    try {
      const command = new AWS.SendEmailCommand({
        Source: from,
        Destination: {
          ToAddresses: Array.isArray(to) ? to : [to],
        },
        Message: {
          Subject: {
            Data: subject,
          },
          Body: {
            ...(text && {
              Text: {
                Data: text,
              },
            }),
            ...(html && {
              Html: {
                Data: html,
              },
            }),
          },
        },
        ...(replyTo && {
          ReplyToAddresses: Array.isArray(replyTo) ? replyTo : [replyTo],
        }),
      });

      const response = await this.sesClient.send(command);
      const messageId = response.MessageId;
      if (!messageId) {
        throw new EmailError('Message ID not found.');
      }

      return {
        data: {
          messageId,
        },
        error: null,
      };
    } catch (error) {
      logError(error, (error as Error)?.stack);
      return {
        data: null,
        error: {
          message: (error as EmailErrorType)?.message,
          stack: (error as EmailErrorType)?.stack,
        },
      };
    }
  }

  async sendNodeMailerEmail(
    options: SendEmailBody,
  ): Promise<SendEmailResponse> {
    const { from, to, subject, text, html, replyTo, headers } = options;

    try {
      if (!this.client || this.client instanceof SESClient) {
        throw new EmailError('Please initialize the nodemailer client.');
      }

      const info = await this.client.sendMail({
        from,
        to,
        subject,
        text,
        html,
        replyTo,
        headers,
      });

      if (info?.rejected?.length > 0) {
        throw new EmailError(`Email rejected for ${to}`);
      }

      return {
        data: {
          messageId: info.response,
        },
        error: null,
      };
    } catch (error) {
      logError(error, (error as Error)?.stack);
      return {
        data: null,
        error: {
          message: (error as EmailErrorType)?.message,
          stack: (error as EmailErrorType)?.stack,
        },
      };
    }
  }
}

export async function sendEmail(
  providerOptions: EmailProviderOptions,
  options: SendEmailBody,
): Promise<SendEmailResponse> {
  const email = new Email(providerOptions);
  return await email.send(options);
}
