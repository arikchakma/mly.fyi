import { logError } from './logger';
import { sesClient } from './ses';
import {
  CustomMailFromStatus,
  GetIdentityDkimAttributesCommand,
  GetIdentityMailFromDomainAttributesCommand,
  SetIdentityMailFromDomainCommand,
  VerificationStatus,
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

export async function getMailFromDomainVerificationStatus(
  domain: string,
): Promise<CustomMailFromStatus> {
  try {
    const command = new GetIdentityMailFromDomainAttributesCommand({
      Identities: [domain],
    });

    const result = await sesClient.send(command);
    const status =
      result?.MailFromDomainAttributes?.[domain]?.MailFromDomainStatus;
    if (!status) {
      throw new Error('Mail from domain status not found');
    }

    return status;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return 'Failed';
  }
}

export async function getDomainDkimVerificationStatus(
  domain: string,
): Promise<VerificationStatus> {
  try {
    const command = new GetIdentityDkimAttributesCommand({
      Identities: [domain],
    });

    const result = await sesClient.send(command);
    const status = result?.DkimAttributes?.[domain]?.DkimVerificationStatus;
    if (!status) {
      throw new Error('DKIM verification status not found');
    }

    return status;
  } catch (error) {
    logError(error, (error as Error)?.stack);
    return 'Failed';
  }
}
