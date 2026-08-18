import { Injectable } from '@nestjs/common';

@Injectable()
export class MatchCommandQueue {
  private readonly tails = new Map<string, Promise<unknown>>();

  enqueue<T>(matchId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(matchId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    this.tails.set(matchId, next);
    return next;
  }
}
