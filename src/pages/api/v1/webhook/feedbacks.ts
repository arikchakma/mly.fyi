import {
  type HandleRoute,
  type RouteParams,
  type ValidateRoute,
  handler,
} from '@/lib/handler';
import { logInfo } from '@/lib/logger';
import {
  type SesNotificationType,
  handleEmailFeedbacks,
  handleSubscriptionConfirmation,
} from '@/lib/notification';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { json, jsonWithRateLimit } from '@/lib/response';
import { isValidJSON } from '@/utils/json';
import type { APIRoute } from 'astro';

export interface FeedbacksResponse {
  status: 'ok';
}

export type FeedbacksBody = SesNotificationType;

export interface FeedbacksRequest extends RouteParams<FeedbacksBody> {}

async function validate(params: FeedbacksRequest) {
  return params;
}

async function handle({ body, context }: FeedbacksRequest) {
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

  return jsonWithRateLimit(json<FeedbacksResponse>({ status: 'ok' }), context);
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<FeedbacksRequest>,
  validate satisfies ValidateRoute<FeedbacksRequest>,
  [
    // Rate limit to 20 requests per second
    rateLimitMiddleware({
      requests: 20,
      timeWindow: 1,
    }),
  ],
);
