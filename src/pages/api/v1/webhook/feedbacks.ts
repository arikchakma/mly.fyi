import type { APIRoute } from 'astro';
import {
  handler,
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
} from '@/lib/handler';
import { json } from '@/lib/response';
import {
  handleNotification,
  handleSubscriptionConfirmation,
  type SesNotificationType,
} from '@/lib/notification';
import { logInfo } from '@/lib/logger';

export interface FeedbacksResponse {
  status: 'ok';
}

export type FeedbacksBody = SesNotificationType;

export interface FeedbacksRequest extends RouteParams<FeedbacksBody> {}

async function validate(params: FeedbacksRequest) {
  return params;
}

async function handle({ body }: FeedbacksRequest) {
  console.log('Handling feedbacks', body);
  if (
    (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) ||
    (body.Type === 'UnsubscribeConfirmation' && body.UnsubscribeURL)
  ) {
    await handleSubscriptionConfirmation(body);
  } else if (body.Type === 'Notification' && body.Message) {
    logInfo('Not yet implemented', body);
  }
  return json<FeedbacksResponse>({ status: 'ok' });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<FeedbacksRequest>,
  validate satisfies ValidateRoute<FeedbacksRequest>,
);
