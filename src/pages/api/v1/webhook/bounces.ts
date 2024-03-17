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

export interface BouncesResponse {
  status: 'ok';
}

export type BouncesBody = SesNotificationType;

export interface BouncesRequest extends RouteParams<BouncesBody> {}

async function validate(params: BouncesRequest) {
  return params;
}

async function handle({ body }: BouncesRequest) {
  if (
    (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) ||
    (body.Type === 'UnsubscribeConfirmation' && body.UnsubscribeURL)
  ) {
    await handleSubscriptionConfirmation(body);
  } else if (body.Type === 'Notification' && body.Message) {
    await handleNotification(body);
  }
  return json<BouncesResponse>({ status: 'ok' });
}

export const POST: APIRoute = handler(
  handle satisfies HandleRoute<BouncesRequest>,
  validate satisfies ValidateRoute<BouncesRequest>,
);
