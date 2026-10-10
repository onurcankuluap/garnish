import { IDEMPOTENCY_WINDOW_SECONDS, type CreateResult, type LeadRecord, type LeadStore, type NotificationStatus } from "./types";

/**
 * In-memory LeadStore for tests and local mock mode. Not durable: data lives
 * only as long as the process.
 */
export class MemoryLeadStore implements LeadStore {
  readonly leads = new Map<string, LeadRecord>();
  private readonly keys = new Map<string, { id: string; expires: number }>();

  /** Set to make every call throw, to simulate a storage outage. */
  failWith: Error | null = null;

  constructor(private readonly now: () => number = Date.now) {}

  private check() {
    if (this.failWith) throw this.failWith;
  }

  async create(lead: LeadRecord): Promise<CreateResult> {
    this.check();
    const t = this.now();
    const existing = this.keys.get(lead.idempotencyKey);
    if (existing && existing.expires > t) {
      return { status: "duplicate", lead: structuredClone(this.leads.get(existing.id) ?? null) };
    }
    this.keys.set(lead.idempotencyKey, { id: lead.id, expires: t + IDEMPOTENCY_WINDOW_SECONDS * 1000 });
    this.leads.set(lead.id, structuredClone(lead));
    return { status: "created", lead: structuredClone(lead) };
  }

  async get(id: string) {
    this.check();
    const l = this.leads.get(id);
    return l ? structuredClone(l) : null;
  }

  async updateNotification(id: string, notification: NotificationStatus) {
    this.check();
    const l = this.leads.get(id);
    if (!l) throw new Error("lead_not_found");
    l.notification = { ...notification };
  }

  async list(limit: number) {
    this.check();
    return Array.from(this.leads.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((l) => structuredClone(l));
  }
}
