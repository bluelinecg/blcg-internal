// EventBus — synchronous, in-process pub/sub for domain events.
//
// Designed for Next.js App Router on Vercel (serverless):
//   - No persistent state across requests; instantiated fresh per module import.
//   - All handler errors are caught internally and logged — they never propagate.
//   - publish() awaits all handlers via Promise.allSettled before resolving.
//
// Usage:
//   bus.onAny(auditHandler);                          // wildcard — fires for every event
//   bus.on('task.status_changed', automationsHandler); // named — fires for that event only
//   void bus.publish('task.status_changed', payload);  // fire-and-forget at call site

import type { EventName, DomainEventPayload, EventHandler } from './types';

export class EventBus {
  private readonly namedHandlers = new Map<EventName, EventHandler[]>();
  private wildcardHandlers: EventHandler[] = [];

  /** Register a handler that fires only when `event` is published. */
  on(event: EventName, handler: EventHandler): void {
    const existing = this.namedHandlers.get(event) ?? [];
    this.namedHandlers.set(event, [...existing, handler]);
  }

  /** Register a handler that fires for every published event. */
  onAny(handler: EventHandler): void {
    this.wildcardHandlers = [...this.wildcardHandlers, handler];
  }

  /**
   * Publish an event to all registered handlers (wildcard first, then named).
   * Uses Promise.allSettled — every handler runs regardless of other failures.
   * Handler errors are caught and logged; they never cause publish() to reject.
   */
  async publish(event: EventName, payload: DomainEventPayload): Promise<void> {
    const named = this.namedHandlers.get(event) ?? [];
    const all   = [...this.wildcardHandlers, ...named];

    await Promise.allSettled(
      all.map(handler =>
        Promise.resolve(handler(event, payload)).catch((err: unknown) => {
          console.error(`[EventBus] Handler error for "${event}":`, err);
        }),
      ),
    );
  }
}
