import '@/lib/server-only';

import { db } from '@/db';
import { emailLogEvents, emailLogs, projectStats } from '@/db/schema';
import { newId } from '@/lib/new-id';
import { and, eq } from 'drizzle-orm';
import { DateTime } from 'luxon';
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
      projectId: true,
    },
  });

  if (!emailLog) {
    return false;
  }

  const alreadyExists = await db.query.emailLogEvents.findFirst({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.emailLogId, emailLog.id),
        operators.eq(fields.email, recipient),
        operators.eq(fields.type, type),
      );
    },
    columns: {
      id: true,
    },
  });

  const newEmailLogEventId = newId('emailLogEvent');
  await db.insert(emailLogEvents).values({
    id: newEmailLogEventId,
    projectId: emailLog.projectId,
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

  if (!alreadyExists) {
    const startOfToday = DateTime.now().startOf('day').toJSDate();
    await updateProjectStats(
      emailLog.projectId,
      startOfToday,
      type === 'soft-bounced' ? 'softBounced' : type,
    );
  }
}

export const handleSendEvent = handleEvent.bind(null, 'sent');
export const handleDeliveryEvent = handleEvent.bind(null, 'delivered');
export const handleHardBounceEvent = handleEvent.bind(null, 'bounced');
export const handleSoftBounceEvent = handleEvent.bind(null, 'soft-bounced');
export const handleComplaintEvent = handleEvent.bind(null, 'complained');
export const handleOpenEvent = handleEvent.bind(null, 'opened');
export const handleClickEvent = handleEvent.bind(null, 'clicked');
export const handleRejectEvent = handleEvent.bind(null, 'rejected');

export async function updateProjectStats(
  projectId: string,
  date: Date,
  type:
    | 'sending'
    | 'sent'
    | 'delivered'
    | 'bounced'
    | 'opened'
    | 'clicked'
    | 'complained'
    | 'softBounced'
    | 'rejected'
    | 'queued'
    | 'error',
) {
  const stats = await db.query.projectStats.findFirst({
    where(fields, operators) {
      return operators.and(
        operators.eq(fields.projectId, projectId),
        operators.eq(fields.date, date),
      );
    },
    columns: {
      id: true,
      [type]: true,
    },
  });

  if (stats) {
    await db
      .update(projectStats)
      .set({
        // @ts-ignore
        [type]: stats[type] + 1,
        updatedAt: new Date(),
      })
      // @ts-ignore
      .where(eq(projectStats.id, stats.id));
  } else {
    await db.insert(projectStats).values({
      id: newId('projectStats'),
      projectId,
      date,
      [type]: 1,
      updatedAt: new Date(),
    });
  }
}
