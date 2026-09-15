const WINDOW_MS = 15 * 60_000;
const EMAIL_IP_LIMIT = 10;
const IP_LIMIT = 100;

interface Counter {
  count: number;
  expiresAt: number;
}

export class LoginLimiter {
  private readonly counters = new Map<string, Counter>();
  private readonly maxEntries: number;

  constructor(options: { maxEntries?: number } = {}) {
    this.maxEntries = options.maxEntries ?? 2048;
  }

  isLimited(email: string, ip: string, now = Date.now()): boolean {
    this.prune(now);
    return this.count(`email:${email}|ip:${ip}`, now) >= EMAIL_IP_LIMIT
      || this.count(`ip:${ip}`, now) >= IP_LIMIT;
  }

  recordFailure(email: string, ip: string, now = Date.now()): void {
    this.prune(now);
    this.increment(`email:${email}|ip:${ip}`, now);
    this.increment(`ip:${ip}`, now);
    this.enforceBound();
  }

  recordSuccess(email: string, ip: string): void {
    this.counters.delete(`email:${email}|ip:${ip}`);
  }

  entryCount(): number {
    return this.counters.size;
  }

  private count(key: string, now: number): number {
    const counter = this.counters.get(key);
    if (!counter || counter.expiresAt <= now) return 0;
    return counter.count;
  }

  private increment(key: string, now: number): void {
    const current = this.counters.get(key);
    if (!current || current.expiresAt <= now) {
      this.counters.set(key, { count: 1, expiresAt: now + WINDOW_MS });
      return;
    }
    current.count += 1;
  }

  private prune(now: number): void {
    for (const [key, counter] of this.counters) {
      if (counter.expiresAt <= now) this.counters.delete(key);
    }
  }

  private enforceBound(): void {
    while (this.counters.size > this.maxEntries) {
      const oldest = this.counters.keys().next().value as string | undefined;
      if (!oldest) break;
      this.counters.delete(oldest);
    }
  }
}
