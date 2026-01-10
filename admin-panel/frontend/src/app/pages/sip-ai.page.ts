import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { OptionsService } from '../core/options.service';
import { SearchSelectComponent, SearchSelectItem } from '../shared/search-select.component';
import { ToastService } from '../shared/toast.service';

type SipAiConfig = { geminiSocketUrl: string; extensions: string[] };

@Component({
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, SearchSelectComponent],
    template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">SIP AI</div>
        <div class="text-sm text-slate-300">Controls <span class="font-mono">sip-rtp-go</span> (registered extensions)</div>
      </div>
      <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="load()">
        Refresh
      </button>
    </div>

    @if (error()) {
      <div class="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200 mb-4">
        {{ error() }}
      </div>
    }

    <div class="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
      <div class="text-sm font-medium mb-2">Gemini socket URL</div>
      <div class="text-[11px] text-slate-400 mb-2">
        Example: <span class="font-mono">wss://...</span> (stored in <span class="font-mono">/data/sip-ai.json</span>)
      </div>
      <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-3">
        <input
          class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
          placeholder="wss://your-gemini-endpoint"
          formControlName="geminiSocketUrl"
        />
        <div class="flex justify-end gap-2">
          <button type="submit" [disabled]="saving()"
                  class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {{ saving() ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>

    <div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-medium">AI extensions (SIP registrations)</div>
        <button type="button" class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" (click)="openAdd()">
          Add extension
        </button>
      </div>

      @if (config().extensions.length === 0) {
        <div class="text-sm text-slate-300">No extensions enabled yet.</div>
      } @else {
        <div class="space-y-2">
          @for (id of config().extensions; track id) {
            <div class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
              <div class="font-mono">{{ id }}</div>
              <button type="button"
                      class="rounded-lg border border-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-950/30"
                      (click)="remove(id)">
                Remove
              </button>
            </div>
          }
        </div>
      }
    </div>

    @if (addOpen()) {
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
        <div class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="font-semibold">Add SIP AI extension</div>
            <button class="text-slate-400 hover:text-white" (click)="closeAdd()">✕</button>
          </div>
          <div class="text-[11px] text-slate-400 mb-3">
            Choose an existing extension. Calls to it will be answered by <span class="font-mono">sip-rtp-go</span>.
          </div>

          <label class="block">
            <div class="text-xs text-slate-300 mb-1">Extension</div>
            <app-search-select
              [items]="extensionItems()"
              [value]="addExtId()"
              (valueChange)="addExtId.set($event)"
              placeholder="Select extension..."
              [allowCustom]="false"
              [mono]="true"
              [showValue]="true"
            />
          </label>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button"
                    class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
                    (click)="closeAdd()">
              Cancel
            </button>
            <button type="button"
                    [disabled]="!addExtId()"
                    class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    (click)="confirmAdd()">
              Add
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class SipAiPage {
    error = signal<string | null>(null);
    saving = signal(false);
    addOpen = signal(false);
    addExtId = signal('');

    config = signal<SipAiConfig>({ geminiSocketUrl: '', extensions: [] });

    form = new FormGroup({
        geminiSocketUrl: new FormControl('', { nonNullable: true, validators: [Validators.pattern(/^$|^wss?:\/\//i)] }),
    });

    extensionItems = computed((): SearchSelectItem[] => {
        const o = this.opts.options();
        const list = o?.extensions ?? [];
        return list.map((e) => ({ value: e.id, label: e.label, group: 'Extensions' }));
    });

    constructor(
        private readonly http: HttpClient,
        private readonly opts: OptionsService,
        private readonly toast: ToastService,
    ) {
        this.opts.refresh();
        this.load();
    }

    load() {
        this.error.set(null);
        this.http.get<SipAiConfig>(`${API_BASE_URL}/pbx/sip-ai`).subscribe({
            next: (res) => {
                const cfg = res ?? { geminiSocketUrl: '', extensions: [] };
                this.config.set({ geminiSocketUrl: cfg.geminiSocketUrl ?? '', extensions: cfg.extensions ?? [] });
                this.form.controls.geminiSocketUrl.setValue(this.config().geminiSocketUrl);
            },
            error: (err) => this.error.set(err?.error?.message ?? 'Failed to load SIP AI settings'),
        });
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);
        const v = this.form.getRawValue();
        this.http.post(`${API_BASE_URL}/pbx/sip-ai`, { geminiSocketUrl: v.geminiSocketUrl, extensions: this.config().extensions }).subscribe({
            next: (res: any) => {
                const cfg = res?.config ?? this.config();
                this.config.set({ geminiSocketUrl: cfg.geminiSocketUrl ?? '', extensions: cfg.extensions ?? [] });
                this.toast.success('SIP AI saved');
                this.saving.set(false);
            },
            error: (err) => {
                this.error.set(err?.error?.message ?? 'Failed to save SIP AI settings');
                this.saving.set(false);
            },
        });
    }

    openAdd() {
        this.addExtId.set('');
        this.addOpen.set(true);
    }

    closeAdd() {
        this.addOpen.set(false);
    }

    confirmAdd() {
        const id = String(this.addExtId() ?? '').trim();
        if (!id) return;
        const next = [...new Set([...this.config().extensions, id])].sort((a, b) => Number(a) - Number(b));
        this.config.set({ ...this.config(), extensions: next });
        this.addOpen.set(false);
        this.save();
    }

    remove(id: string) {
        const next = this.config().extensions.filter((x) => x !== id);
        this.config.set({ ...this.config(), extensions: next });
        this.save();
    }
}


