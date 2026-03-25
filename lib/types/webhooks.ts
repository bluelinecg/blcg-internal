// TypeScript types for the webhook system.
// WebhookEndpoint — a registered destination URL.
// WebhookDelivery  — a single delivery attempt log entry.

export type WebhookEventType =
  | 'contact.created'
  | 'contact.updated'
  | 'organization.created'
  | 'task.created'
  | 'task.status_changed'
  | 'proposal.status_changed'
  | 'pipeline.item_stage_changed';

export interface WebhookEndpoint {
  id:          string;
  url:         string;
  description: string | undefined;
  secret:      string;
  events:      WebhookEventType[];
  isActive:    boolean;
  createdAt:   string;
  updatedAt:   string;
}

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed';

export interface WebhookDelivery {
  id:            string;
  endpointId:    string;
  eventType:     WebhookEventType;
  payload:       Record<string, unknown>;
  status:        WebhookDeliveryStatus;
  httpStatus:    number | undefined;
  responseBody:  string | undefined;
  attemptNumber: number;
  attemptedAt:   string;
}

/** Shape sent in POST body when creating an endpoint. */
export interface WebhookEndpointInput {
  url:         string;
  description: string | undefined;
  events:      WebhookEventType[];
}

/** Shape of the event payload sent to external endpoints. */
export interface WebhookEventPayload {
  event:     WebhookEventType;
  timestamp: string;
  data:      Record<string, unknown>;
}
