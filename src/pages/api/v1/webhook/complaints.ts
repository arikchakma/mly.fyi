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
} from '@/lib/sns';

export interface ComplaintsResponse {
  status: 'ok';
}

export type ComplaintsBody = SesNotificationType;

export interface ComplaintsRequest extends RouteParams<ComplaintsBody> {}

async function validate(params: ComplaintsRequest) {
  return params;
}

async function handle({ body }: ComplaintsRequest) {
  if (
    (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) ||
    (body.Type === 'UnsubscribeConfirmation' && body.UnsubscribeURL)
  ) {
    await handleSubscriptionConfirmation(body);
  } else if (body.Type === 'Notification' && body.Message) {
    await handleNotification(body);
  }
  return json<ComplaintsResponse>({ status: 'ok' });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<ComplaintsRequest>,
  validate satisfies ValidateRoute<ComplaintsRequest>,
);
