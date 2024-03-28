import '@/lib/server-only';

import { db } from '@/db';
import { emailLogEvents, emailLogs } from '@/db/schema';
import { newId } from '@/lib/new-id';
import { eq } from 'drizzle-orm';
import type { AllowedEmailLogStatus } from '../db/types';

async function handleEvent(
  type: AllowedEmailLogStatus,
  messageId: string,
  recipient: string,
  timestamp: string,
  details: any = {},
) {
  const emailLog = await db.query.emailLogs.findFirst({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.messageId, messageId),
        operators.eq(fields.to, recipient),
      );
    },
    columns: {
      id: true,
      sendAt: true,
    },
  });

  if (!emailLog) {
    return false;
  }

  const newEmailLogEventId = newId('emailLogEvent');
  await db.insert(emailLogEvents).values({
    id: newEmailLogEventId,
    emailLogId: emailLog.id,
    email: recipient,
    type,
    ...(details?.userAgent ? { userAgent: details.userAgent } : {}),
    ...(details?.ipAddress ? { ipAddress: details.ipAddress } : {}),
    ...(details?.link ? { link: details.link } : {}),
    rawResponse: JSON.stringify(details),
    timestamp: new Date(timestamp),
  });

  await db
    .update(emailLogs)
    .set({
      status: type,
      ...(type === 'sent' && !emailLog?.sendAt
        ? { sendAt: new Date(timestamp) }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(emailLogs.id, emailLog.id));
}

export const handleSendEvent = handleEvent.bind(null, 'sent');
export const handleDeliveryEvent = handleEvent.bind(null, 'delivered');
export const handleHardBounceEvent = handleEvent.bind(null, 'bounced');
export const handleSoftBounceEvent = handleEvent.bind(null, 'soft-bounced');
export const handleComplaintEvent = handleEvent.bind(null, 'complained');
export const handleOpenEvent = handleEvent.bind(null, 'opened');
export const handleClickEvent = handleEvent.bind(null, 'clicked');
export const handleRejectEvent = handleEvent.bind(null, 'rejected');
