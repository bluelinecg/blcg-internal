// Webhook delivery utility.
// Queries active endpoints subscribed to the event, signs the payload with
// HMAC-SHA256, and POSTs to each URL. Logs each attempt to webhook_deliveries.
//
// Call as: void dispatchWebhookEvent('contact.created', { ...contactData })
// Fire-and-forget — does not block the API response.

import { createHmac } from 'crypto';
import { listActiveEndpointsForEvent, createWebhookDelivery } from '@/lib/db/webhooks';
import type { WebhookEventType, WebhookEventPayload } from '@/lib/types/webhooks';

const DELIVERY_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BODY_LENGTH = 1_000;

/** Signs a raw JSON string with HMAC-SHA256 using the endpoint secret. */
function sign(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

/**
 * Dispatches a webhook event to all active subscribed endpoints.
 * Call fire-and-forget: `void dispatchWebhookEvent(type, data)`.
 */
export async function dispatchWebhookEvent(
  eventType: WebhookEventType,
  data:      Record<string, unknown>,
): Promise<void> {
  const { data: endpoints, error } = await listActiveEndpointsForEvent(eventType);
  if (error || !endpoints || endpoints.length === 0) return;

  const payload: WebhookEventPayload = {
    event:     eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);

  await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const signature = sign(endpoint.secret, body);
      let httpStatus: number | null   = null;
      let responseBody: string | null = null;
      let status: 'success' | 'failed' = 'failed';

      try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type':    'application/json',
            'X-BLCG-Event':    eventType,
            'X-BLCG-Signature': signature,
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        httpStatus   = res.status;
        const rawBody = await res.text().catch(() => '');
        responseBody = rawBody.slice(0, MAX_RESPONSE_BODY_LENGTH) || null;
        status       = res.ok ? 'success' : 'failed';
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        responseBody  = message.slice(0, MAX_RESPONSE_BODY_LENGTH);
        status        = 'failed';
      }

      await createWebhookDelivery(
        endpoint.id,
        eventType,
        payload,
        status,
        httpStatus,
        responseBody,
      );
    }),
  );
}
