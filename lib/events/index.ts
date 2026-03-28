// Public API for the Event Bus module.
//
// Usage in API routes:
//   import { bus } from '@/lib/events';
//   void bus.publish('contact.created', { actorId, entityType: 'contact', ... });

export { bus } from './registry';
export type { EventName, DomainEventPayload, EventHandler } from './types';
