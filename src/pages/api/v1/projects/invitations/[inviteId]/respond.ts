import { db } from '@/db';
import { projectMembers } from '@/db/schema';
import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { HttpError } from '@/lib/http-error';
import { json } from '@/lib/response';
import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import Joi from 'joi';

export interface RespondProjectMemberInviteResponse {
  status: 'ok';
}

export type RespondProjectMemberInviteBody = {
  action: 'accept' | 'reject';
};

export interface RespondProjectMemberInviteRequest
  extends RouteParams<
    RespondProjectMemberInviteBody,
    any,
    {
      inviteId: string;
    }
  > {}

async function validate(params: RespondProjectMemberInviteRequest) {
  const paramSchema = Joi.object({
    inviteId: Joi.string().required(),
  });

  const { error: paramError } = paramSchema.validate(params.context.params, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (paramError) {
    throw paramError;
  }

  const bodySchema = Joi.object({
    action: Joi.string().valid('accept', 'reject').required(),
  });

  const { error: bodyError } = bodySchema.validate(params.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (bodyError) {
    throw bodyError;
  }

  return params;
}

async function handle(params: RespondProjectMemberInviteRequest) {
  const { inviteId } = params.context.params;
  const { currentUser } = params.context.locals;

  const invitedMember = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.id, inviteId)),
  });

  if (!invitedMember) {
    throw new HttpError('not_found', 'Invite not found');
  }

  if (
    invitedMember.invitedEmail !== currentUser?.email ||
    (invitedMember?.userId && invitedMember.userId !== currentUser?.id)
  ) {
    throw new HttpError('forbidden', 'Invited email or user does not match');
  }

  if (invitedMember.status !== 'invited') {
    throw new HttpError('forbidden', 'Invite has already been responded');
  }

  const { action } = params.body;

  await db
    .update(projectMembers)
    .set({
      status: action === 'accept' ? 'joined' : 'rejected',
      userId: currentUser?.id,
    })
    .where(eq(projectMembers.id, inviteId));

  return json<RespondProjectMemberInviteResponse>({
    status: 'ok',
  });
}

export const PATCH: APIRoute = handler(
  handle satisfies HandleRoute<RespondProjectMemberInviteRequest>,
  validate satisfies ValidateRoute<RespondProjectMemberInviteRequest>,
  {
    isProtected: true,
  },
);
