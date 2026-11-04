import {
  OrderResultStatus,
  purchase,
  showLoginPrompt,
  showShareSheet,
  showToast,
} from '@devvit/web/client';
import { GAME_NAME } from '../shared/brand.ts';
import { COIN_PACK_SKU, PRODUCTS, type AbilityKey, type Sku } from '../shared/products.ts';
import type {
  ClaimCoinsResponse,
  InitResponse,
  InventoryResponse,
  LeaderboardResponse,
  Period,
  RunStartResponse,
  SubmitRequest,
  SubmitResponse,
  UseExtraResponse,
} from '../shared/api.ts';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const requestJson = async <T>(
  url: string,
  init?: RequestInit,
  retries = 2
): Promise<T | null> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return (await res.json()) as T;
      if (res.status < 500) return null;
    } catch (error) {
      console.warn(`Request to ${url} failed`, error);
    }
    if (attempt < retries) await wait(500 * (attempt + 1) ** 2);
  }
  return null;
};

class PlatformBridge {
  private profile: InitResponse | null = null;
  private sessionBest = 0;
  private extras: Record<string, number> = {};
  private banked = 0;
  private pendingStart: Promise<RunStartResponse | null> | null = null;
  private currentRunId: string | null = null;

  get bestScore(): number {
    return Math.max(this.profile?.best ?? 0, this.sessionBest);
  }
  get username(): string | null {
    return this.profile?.username ?? null;
  }
  get subreddit(): string {
    return this.profile?.subreddit ?? '';
  }

  async load(): Promise<void> {
    this.profile = await requestJson<InitResponse>('/api/init');
    this.extras = { ...(this.profile?.extras ?? {}) };
    this.banked = this.profile?.bankedCoins ?? 0;
  }

  get canBuy(): boolean {
    return !!this.profile?.loggedIn && !!this.currentRunId;
  }

  get loggedIn(): boolean {
    return !!this.profile?.loggedIn;
  }

  async runKnown(timeoutMs = 1500): Promise<boolean> {
    if (this.currentRunId) return true;
    const pending = this.pendingStart;
    if (!pending) return false;
    await Promise.race([pending.catch(() => null), wait(timeoutMs)]);
    return !!this.currentRunId;
  }

  extraCount(ability: AbilityKey): number {
    return this.extras[ability] ?? 0;
  }

  useExtra(ability: AbilityKey): void {
    this.extras[ability] = Math.max(0, (this.extras[ability] ?? 0) - 1);
    void requestJson<UseExtraResponse>('/api/inventory/use', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ability }),
    });
  }

  private async fetchInventory(): Promise<InventoryResponse | null> {
    const inv = await requestJson<InventoryResponse>('/api/inventory', undefined, 0);
    if (inv) {
      this.extras = { ...inv.extras };
      this.banked = inv.bankedCoins;
    }
    return inv;
  }

  async claimCoins(): Promise<number> {
    const res = await requestJson<ClaimCoinsResponse>('/api/inventory/claim-coins', { method: 'POST' });
    this.banked = 0;
    return res?.coins ?? 0;
  }

  async checkout(sku: Sku): Promise<{ ok: boolean; cancelled?: boolean; message: string }> {
    try {
      const effect = PRODUCTS[sku].effect;
      if ((effect.type === 'extra' || sku === COIN_PACK_SKU) && !this.currentRunId) {
        return { ok: false, message: 'The game is still starting - please try again in a moment.' };
      }
      const before = (await this.fetchInventory()) ?? { extras: { ...this.extras }, bankedCoins: this.banked };
      const result = await purchase(sku, {
        buyerId: this.profile?.userId ?? '',
        runId: this.currentRunId ?? '',
      });
      if (result.status === OrderResultStatus.STATUS_CANCELLED) {
        return { ok: false, cancelled: true, message: 'Purchase cancelled.' };
      }
      if (result.status !== OrderResultStatus.STATUS_SUCCESS) {
        return { ok: false, message: result.errorMessage ?? 'The purchase failed. You were not charged.' };
      }
      for (let i = 0; i < 10; i++) {
        const inv = await this.fetchInventory();
        if (inv) {
          const done =
            effect.type === 'extra'
              ? (inv.extras[effect.ability] ?? 0) > (before.extras[effect.ability] ?? 0)
              : inv.bankedCoins >= before.bankedCoins + effect.amount;
          if (done) return { ok: true, message: 'Done!' };
        }
        await wait(1000);
      }
      return {
        ok: false,
        message: 'Payment received - delivery is still being processed. Reopen the game in a moment.',
      };
    } catch (error) {
      console.error('Purchase failed', error);
      return { ok: false, message: 'Checkout is not available right now. Please try again later.' };
    }
  }

  runStarted(): void {
    this.currentRunId = null;
    this.pendingStart = requestJson<RunStartResponse>('/api/run/start', {
      method: 'POST',
    }).then((res) => {
      this.currentRunId = res?.runId ?? null;
      return res;
    });
  }

  noteScore(score: number): void {
    this.sessionBest = Math.max(this.sessionBest, score);
  }

  async submitRun(
    result: Omit<SubmitRequest, 'runId'>
  ): Promise<SubmitResponse | null> {
    const start = await this.pendingStart;
    this.pendingStart = null;
    if (!start) return null;
    if (start.runId === null) {
      return {
        type: 'run-submit',
        saved: false,
        reason: start.reason === 'logged-out' ? 'logged-out' : 'rate-limited',
        isNewBest: false,
        best: this.bestScore,
        rank: null,
        dailyRank: null,
        dailyBest: 0,
      };
    }
    const body: SubmitRequest = { runId: start.runId, ...result };
    const res = await requestJson<SubmitResponse>('/api/run/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res?.saved && this.profile) this.profile.best = res.best;
    return res;
  }

  async leaderboard(period: Period): Promise<LeaderboardResponse | null> {
    return requestJson<LeaderboardResponse>(
      `/api/leaderboard?period=${period}&limit=10`
    );
  }

  async share(score: number, wave: number): Promise<void> {
    const where = this.subreddit ? ` in r/${this.subreddit}` : '';
    const text = `I survived until Wave ${wave} with ${score.toLocaleString()} points in ${GAME_NAME}${where}. Can you beat me?`;
    try {
      await showShareSheet({ title: GAME_NAME, text });
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        showToast('Result copied to clipboard');
      } catch {
        showToast('Sharing is not available here');
      }
    }
  }

  promptLogin(): void {
    showLoginPrompt();
  }
}

export const Platform = new PlatformBridge();
