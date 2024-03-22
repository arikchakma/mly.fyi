import { logError } from './logger';
import { sesClient } from './ses';
import {
  SetIdentityMailFromDomainCommand,
  VerifyDomainDkimCommand,
  VerifyDomainIdentityCommand,
} from '@aws-sdk/client-ses';

export const VALID_DOMAIN_REGEX =
  /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/;

export function isValidDomain(domain: string): boolean {
  return VALID_DOMAIN_REGEX.test(domain);
}

export async function verifyDomainIdentity(domain: string): Promise<string> {
  try {
    const command = new VerifyDomainIdentityCommand({
      Domain: domain,
    });
    const result = await sesClient.send(command);
    return result.VerificationToken || '';
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return '';
  }
}

export async function verifyDomainDkim(domain: string): Promise<string[]> {
  try {
    const command = new VerifyDomainDkimCommand({
      Domain: domain,
    });
    const result = await sesClient.send(command);
    return result.DkimTokens || [];
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return [];
  }
}

export async function addMailFromDomain(
  domain: string,
  mailFromDomain: string,
): Promise<boolean> {
  try {
    const command = new SetIdentityMailFromDomainCommand({
      Identity: domain,
      MailFromDomain: mailFromDomain,
      BehaviorOnMXFailure: 'UseDefaultValue',
    });

    await sesClient.send(command);
    return true;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return false;
  }
}
