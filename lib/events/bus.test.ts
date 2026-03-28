import { describe, it, expect, vi } from 'vitest';
import { EventBus } from './bus';
import type { DomainEventPayload } from './types';

const payload: DomainEventPayload = {
  actorId:     'user_1',
  entityType:  'contact',
  entityId:    'abc-123',
  entityLabel: 'Jane Smith',
  action:      'created',
  data:        { id: 'abc-123' },
};

describe('EventBus', () => {
  it('calls a named handler when its event is published', async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('contact.created', handler);
    await bus.publish('contact.created', payload);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith('contact.created', payload);
  });

  it('does not call a named handler for a different event', async () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('contact.updated', handler);
    await bus.publish('contact.created', payload);

    expect(handler).not.toHaveBeenCalled();
  });

  it('calls onAny handlers for every event', async () => {
    const bus = new EventBus();
    const wildcard = vi.fn();

    bus.onAny(wildcard);
    await bus.publish('contact.created', payload);
    await bus.publish('task.deleted', { ...payload, entityType: 'task' });

    expect(wildcard).toHaveBeenCalledTimes(2);
  });

  it('calls both wildcard and named handlers when both match', async () => {
    const bus = new EventBus();
    const wildcard = vi.fn();
    const named    = vi.fn();

    bus.onAny(wildcard);
    bus.on('invoice.status_changed', named);
    await bus.publish('invoice.status_changed', { ...payload, entityType: 'invoice' });

    expect(wildcard).toHaveBeenCalledOnce();
    expect(named).toHaveBeenCalledOnce();
  });

  it('catches handler errors without rejecting publish', async () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    bus.on('contact.created', async () => {
      throw new Error('Handler failure');
    });

    await expect(bus.publish('contact.created', payload)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EventBus]'),
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });

  it('runs all handlers even when one throws', async () => {
    const bus = new EventBus();
    const failing  = vi.fn().mockRejectedValue(new Error('boom'));
    const succeeds = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    bus.on('contact.created', failing);
    bus.on('contact.created', succeeds);
    await bus.publish('contact.created', payload);

    expect(succeeds).toHaveBeenCalledOnce();
  });

  it('supports multiple handlers for the same event', async () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();

    bus.on('task.completed', h1);
    bus.on('task.completed', h2);
    await bus.publish('task.completed', { ...payload, entityType: 'task' });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('resolves after all handlers have settled', async () => {
    const bus = new EventBus();
    const order: string[] = [];

    bus.on('contact.created', async () => {
      await new Promise(r => setTimeout(r, 10));
      order.push('first');
    });
    bus.on('contact.created', () => {
      order.push('second');
    });

    await bus.publish('contact.created', payload);

    expect(order).toContain('first');
    expect(order).toContain('second');
  });
});
