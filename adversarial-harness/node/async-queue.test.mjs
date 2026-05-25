/**
 * AsyncSerialQueue concurrency simulation — mirrors tests/proxy/stdin-serial-queue.test.ts
 */
import { describe, it, expect } from 'vitest';
import { AsyncSerialQueue } from '../../src/utils/async-serial-queue.js';

describe('Adversarial harness: AsyncSerialQueue', () => {
  it('serializes concurrent enqueue so shared state is not raced', async () => {
    const queue = new AsyncSerialQueue();
    const order = [];
    let shared = null;

    const task = (id) =>
      queue.enqueue(async () => {
        order.push(`start:${id}`);
        shared = id;
        await new Promise((r) => setTimeout(r, 25));
        order.push(`end:${shared}`);
      });

    await Promise.all([task('a'), task('b'), task('c')]);

    expect(order).toEqual([
      'start:a',
      'end:a',
      'start:b',
      'end:b',
      'start:c',
      'end:c',
    ]);
  });

  it('propagates errors without breaking the queue tail', async () => {
    const queue = new AsyncSerialQueue();
    await expect(
      queue.enqueue(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const v = await queue.enqueue(async () => 42);
    expect(v).toBe(42);
  });

  it('handles high concurrency stress (100 tasks)', async () => {
    const queue = new AsyncSerialQueue();
    let current = 0;
    let maxConcurrent = 0;
    let observed = 0;

    const tasks = Array.from({ length: 100 }, (_, i) =>
      queue.enqueue(async () => {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        await new Promise((r) => setTimeout(r, 1));
        current--;
        return i;
      }),
    );

    const results = await Promise.all(tasks);
    expect(results).toHaveLength(100);
    expect(maxConcurrent).toBe(1);
    expect(observed).toBe(0);
  });
});
