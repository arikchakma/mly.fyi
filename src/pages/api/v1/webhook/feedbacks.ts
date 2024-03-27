import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import {
  handleEmailFeedbacks,
  handleSubscriptionConfirmation,
  type SesNotificationType,
} from '@/lib/notification';
import { logInfo } from '@/lib/logger';
import { isValidJSON } from '@/utils/json';

export interface FeedbacksResponse {
  status: 'ok';
}

export type FeedbacksBody = SesNotificationType;

export interface FeedbacksRequest extends RouteParams<FeedbacksBody> {}

async function validate(params: FeedbacksRequest) {
  return params;
}

async function handle({ body }: FeedbacksRequest) {
  if (
    (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) ||
    (body.Type === 'UnsubscribeConfirmation' && body.UnsubscribeURL)
  ) {
    await handleSubscriptionConfirmation(body);
  } else if (body.Type === 'Notification' && body.Message) {
    if (isValidJSON(body.Message)) {
      await handleEmailFeedbacks(body);
    } else {
      logInfo('Invalid JSON in SES notification', body);
    }
  }

  return json<FeedbacksResponse>({ status: 'ok' });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<FeedbacksRequest>,
  validate satisfies ValidateRoute<FeedbacksRequest>,
);
