import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { ToastService } from '../shared/toast.service';

type TailResp = { now: number; items: Array<{ ts: number; text: string }> };

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">Console</div>
        <div class="text-sm text-slate-300">Run fs_cli (ESL) commands and view live events</div>
      </div>
    </div>

    <div class="flex gap-2 mb-3">
      <button
        class="rounded-lg border border-slate-800 px-3 py-2 text-sm"
        [class.bg-slate-800/50]="tab() === 'run'"
        (click)="tab.set('run')"
      >
        Commands
      </button>
      <button
        class="rounded-lg border border-slate-800 px-3 py-2 text-sm"
        [class.bg-slate-800/50]="tab() === 'live'"
        (click)="tab.set('live')"
      >
        Live
      </button>
    </div>

    @if (tab() === 'run') {
      <div class="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
        <div class="flex gap-2">
          <input
            class="flex-1 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Example: sofia status gateways"
            [(ngModel)]="command"
            (keydown.enter)="run()"
          />
          <button
            class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            [disabled]="running() || !command.trim()"
            (click)="run()"
          >
            {{ running() ? 'Running...' : 'Run' }}
          </button>
        </div>

        @if (history().length) {
          <div class="mt-3 text-xs text-slate-400">
            History:
            @for (h of history(); track h) {
              <button class="ml-2 rounded-md border border-slate-800 px-2 py-0.5 font-mono hover:bg-slate-900" (click)="use(h)">
                {{ h }}
              </button>
            }
          </div>
        }

        <div class="mt-4">
          <div class="text-xs text-slate-400 mb-1">Output</div>
          <pre class="h-[420px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200 whitespace-pre-wrap">{{ output() }}</pre>
        </div>
      </div>
    } @else {
      <div class="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
              (click)="clear()"
            >
              Clear
            </button>
            <button
              class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
              (click)="toggleLive()"
            >
              {{ live() ? 'Pause' : 'Resume' }}
            </button>
          </div>
          <input
            class="w-[min(420px,60vw)] rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Filter..."
            [(ngModel)]="filter"
          />
        </div>

        <div class="flex gap-2 mb-3">
          <input
            class="flex-1 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Send command (example: show channels)"
            [(ngModel)]="liveCmd"
            (keydown.enter)="runLiveCmd()"
          />
          <button
            class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            [disabled]="running() || !liveCmd.trim()"
            (click)="runLiveCmd()"
          >
            Send
          </button>
        </div>

        <pre class="h-[520px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200 whitespace-pre-wrap">{{ filteredLiveText() }}</pre>
      </div>
    }
  `,
})
export class ConsolePage {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  tab = signal<'run' | 'live'>('run');
  running = signal(false);

  command = '';
  output = signal('');
  history = signal<string[]>([]);

  live = signal(true);
  filter = '';
  liveCmd = '';
  tail = signal<Array<{ ts: number; text: string }>>([]);
  private since = 0;

  filteredLiveText = computed(() => {
    const q = (this.filter || '').trim().toLowerCase();
    const lines = this.tail();
    const texts = q
      ? lines.filter((x) => x.text.toLowerCase().includes(q))
      : lines;
    return texts.map((x) => `[${new Date(x.ts).toLocaleTimeString()}] ${x.text}`).join('\n\n');
  });

  constructor() {
    const t = setInterval(() => this.poll(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(t));
  }

  use(cmd: string) {
    this.command = cmd;
  }

  private pushHistory(cmd: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const next = [trimmed, ...this.history().filter((x) => x !== trimmed)].slice(0, 8);
    this.history.set(next);
  }

  run() {
    const cmd = this.command.trim();
    if (!cmd) return;
    this.running.set(true);
    this.output.set('');
    this.pushHistory(cmd);
    this.http.post<{ ok: boolean; output: string }>(`${API_BASE_URL}/pbx/console/run`, { command: cmd }).subscribe({
      next: (res) => {
        this.running.set(false);
        this.output.set(res?.output ?? '');
      },
      error: (err) => {
        this.running.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to run command');
      },
    });
  }

  runLiveCmd() {
    const cmd = this.liveCmd.trim();
    if (!cmd) return;
    this.liveCmd = '';
    this.running.set(true);
    this.http.post<{ ok: boolean; output: string }>(`${API_BASE_URL}/pbx/console/run`, { command: cmd }).subscribe({
      next: (res) => {
        this.running.set(false);
        // Append command output into the live stream as a block.
        const now = Date.now();
        const block = `> ${cmd}\n${(res?.output ?? '').trim()}`;
        this.tail.set([...this.tail(), { ts: now, text: block }].slice(-2000));
      },
      error: (err) => {
        this.running.set(false);
        this.toast.error(err?.error?.message ?? 'Failed to send command');
      },
    });
  }

  clear() {
    this.tail.set([]);
    this.since = 0;
  }

  toggleLive() {
    this.live.set(!this.live());
  }

  private poll() {
    if (this.tab() !== 'live') return;
    if (!this.live()) return;
    const params = new HttpParams()
      .set('since', String(this.since || 0))
      .set('limit', '250');
    this.http.get<TailResp>(`${API_BASE_URL}/pbx/console/tail`, { params }).subscribe({
      next: (res) => {
        const items = res?.items ?? [];
        if (!items.length) return;
        this.since = res.now ?? Date.now();
        this.tail.set([...this.tail(), ...items].slice(-2000));
      },
      error: () => {
        // avoid noisy toasts; user can see it isn't updating
      },
    });
  }
}


