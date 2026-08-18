describe('match command queue isolation', () => {
  it('runs commands for the same match in order', async () => {
    const queue = new MatchCommandQueue();
    const order: number[] = [];
    const first = queue.enqueue('match-a', async () => {
      await delay(25);
      order.push(1);
    });
    const second = queue.enqueue('match-a', async () => {
      order.push(2);
    });
    await Promise.all([first, second]);
    expect(order).toEqual([1, 2]);
  });

  it('does not block a different match', async () => {
    const queue = new MatchCommandQueue();
    const order: string[] = [];
    const a = queue.enqueue('match-a', async () => {
      await delay(40);
      order.push('a');
    });
    const b = queue.enqueue('match-b', async () => {
      order.push('b');
    });
    await Promise.all([a, b]);
    expect(order[0]).toBe('b');
    expect(order).toEqual(['b', 'a']);
  });
});

class MatchCommandQueue {
  private readonly tails = new Map<string, Promise<unknown>>();

  enqueue<T>(matchId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(matchId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    this.tails.set(matchId, next);
    return next;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
