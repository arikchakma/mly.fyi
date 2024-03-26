import { db } from '@/db';
import { emailLogEvents, emailLogs } from '@/db/schema';
import { newId } from '@/lib/new-id';
import { eq } from 'drizzle-orm';

export async function handleSendEvent(
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
    type: 'sent',
    rawResponse: JSON.stringify(details),
    timestamp: new Date(timestamp),
  });

  await db
    .update(emailLogs)
    .set({
      sendAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(emailLogs.id, emailLog.id));
}

export async function handleDeliveryEvent(
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
    type: 'delivered',
    rawResponse: JSON.stringify(details),
    timestamp: new Date(timestamp),
  });

  await db
    .update(emailLogs)
    .set({
      status: 'delivered',
      updatedAt: new Date(),
    })
    .where(eq(emailLogs.id, emailLog.id));
}

export async function handleHardBounceEvent(
  status: 'bounced' | 'soft_bounced',
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
    type: status,
    rawResponse: JSON.stringify(details),
    timestamp: new Date(timestamp),
  });

  await db
    .update(emailLogs)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(emailLogs.id, emailLog.id));
}

export async function handleComplaintEvent(
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
    type: 'complained',
    rawResponse: JSON.stringify(details),
    timestamp: new Date(timestamp),
  });

  await db
    .update(emailLogs)
    .set({
      status: 'complained',
      updatedAt: new Date(),
    })
    .where(eq(emailLogs.id, emailLog.id));
}

export async function handleOpenEvent(
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
    type: 'opened',
    ...(details?.userAgent
      ? {
          userAgent: details.userAgent,
        }
      : {}),
    ...(details?.ipAddress
      ? {
          ipAddress: details.ipAddress,
        }
      : {}),
    rawResponse: JSON.stringify(details),
    timestamp: new Date(timestamp),
  });

  await db
    .update(emailLogs)
    .set({
      status: 'opened',
      updatedAt: new Date(),
    })
    .where(eq(emailLogs.id, emailLog.id));
}

export async function handleClickEvent(
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
    type: 'clicked',
    ...(details?.userAgent
      ? {
          userAgent: details.userAgent,
        }
      : {}),
    ...(details?.ipAddress
      ? {
          ipAddress: details.ipAddress,
        }
      : {}),
    ...(details?.link
      ? {
          link: details.link,
        }
      : {}),
    rawResponse: JSON.stringify(details),
    timestamp: new Date(timestamp),
  });

  await db
    .update(emailLogs)
    .set({
      status: 'clicked',
      updatedAt: new Date(),
    })
    .where(eq(emailLogs.id, emailLog.id));
}
