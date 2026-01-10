import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { OptionsService } from '../core/options.service';
import { SearchSelectComponent, SearchSelectItem } from '../shared/search-select.component';
import { ToastService } from '../shared/toast.service';

type SipAiDefaults = {
  sipServerAddr: string;
  sipDomain: string;
  sipContactHost: string;
  sdpIP: string;
  sipListenAddr: string;
  sipPass: string;
  registerExpires: number;
};

type SipAiAgent = {
  id: string;
  source: 'pbx' | 'external';
  extension?: string;
  sipUser?: string;
  sipPass?: string;
  sipServerAddr?: string;
  sipDomain?: string;
  geminiSocketUrl?: string;
  enabled?: boolean;
};

type SipAiConfig = { defaults: SipAiDefaults; agents: SipAiAgent[] };

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

    <div class="mb-4 flex gap-2">
      <button class="rounded-lg border px-3 py-2 text-sm"
              [class.border-slate-700]="tab() === 'defaults'" [class.bg-slate-900/40]="tab() === 'defaults'"
              [class.border-slate-800]="tab() !== 'defaults'"
              (click)="tab.set('defaults')">
        Defaults
      </button>
      <button class="rounded-lg border px-3 py-2 text-sm"
              [class.border-slate-700]="tab() === 'agents'" [class.bg-slate-900/40]="tab() === 'agents'"
              [class.border-slate-800]="tab() !== 'agents'"
              (click)="tab.set('agents')">
        Agents
      </button>
    </div>

    @if (tab() === 'defaults') {
      <div class="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
        <div class="text-sm font-medium mb-2">PBX defaults (used by “PBX” agents)</div>
        <div class="text-[11px] text-slate-400 mb-3">
          These replace the old <span class="font-mono">SIP_*</span> environment variables.
        </div>

        <form [formGroup]="defaultsForm" (ngSubmit)="saveDefaults()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="block">
            <div class="text-xs text-slate-300 mb-1">SIP server addr</div>
            <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                   formControlName="sipServerAddr" placeholder="auto:5060" />
          </label>
          <label class="block">
            <div class="text-xs text-slate-300 mb-1">SIP domain</div>
            <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                   formControlName="sipDomain" placeholder="auto" />
          </label>
          <label class="block">
            <div class="text-xs text-slate-300 mb-1">Contact host</div>
            <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                   formControlName="sipContactHost" placeholder="auto" />
          </label>
          <label class="block">
            <div class="text-xs text-slate-300 mb-1">SDP IP</div>
            <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                   formControlName="sdpIP" placeholder="auto" />
          </label>
          <label class="block">
            <div class="text-xs text-slate-300 mb-1">Listen addr</div>
            <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                   formControlName="sipListenAddr" placeholder="0.0.0.0:5090" />
          </label>
          <label class="block">
            <div class="text-xs text-slate-300 mb-1">Register expires</div>
            <input type="number" min="0"
                   class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                   formControlName="registerExpires" />
            <div class="text-[11px] text-slate-400 mt-1">0 = no limit (we still refresh registrations periodically)</div>
          </label>
          <label class="block sm:col-span-2">
            <div class="text-xs text-slate-300 mb-1">Default SIP password (PBX)</div>
            <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                   formControlName="sipPass" />
          </label>

          <div class="sm:col-span-2 flex justify-end">
            <button type="submit" [disabled]="saving() || defaultsForm.invalid"
                    class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
              {{ saving() ? 'Saving...' : 'Save defaults' }}
            </button>
          </div>
        </form>
      </div>
    } @else {
      <div class="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm font-medium">SIP AI agents</div>
          <button type="button" class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" (click)="openNewAgent()">
            Add agent
          </button>
        </div>

        @if (config().agents.length === 0) {
          <div class="text-sm text-slate-300">No agents configured yet.</div>
        } @else {
          <div class="rounded-xl border border-slate-800 overflow-hidden">
            <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-950/30 text-xs text-slate-400">
              <div class="col-span-1 text-center">On</div>
              <div class="col-span-3">Type</div>
              <div class="col-span-4">SIP user</div>
              <div class="col-span-3">Gemini URL</div>
              <div class="col-span-1 text-right">Actions</div>
            </div>
            @for (a of config().agents; track a.id) {
              <div class="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-800 items-center">
                <div class="col-span-1 text-center">
                  <input
                    type="checkbox"
                    class="accent-indigo-600"
                    [checked]="a.enabled !== false"
                    (change)="toggleAgentEnabled(a, $any($event.target).checked)"
                  />
                </div>
                <div class="col-span-3 text-sm text-slate-200">
                  {{ a.source === 'pbx' ? 'PBX' : 'External' }}
                </div>
                <div class="col-span-4 font-mono text-xs text-slate-300 truncate">
                  {{ a.source === 'pbx' ? a.extension : a.sipUser }}
                </div>
                <div class="col-span-3 font-mono text-xs text-slate-300 truncate">
                  {{ a.geminiSocketUrl || '(echo mode)' }}
                </div>
                <div class="col-span-1 flex justify-end gap-2">
                  <button type="button"
                          class="rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900"
                          (click)="editAgent(a)">
                    Edit
                  </button>
                  <button type="button"
                          class="rounded-lg border border-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-950/30"
                          (click)="deleteAgent(a)">
                    Del
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    }

    @if (agentModalOpen()) {
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
        <div class="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="font-semibold">{{ editingAgentId() ? 'Edit agent' : 'New agent' }}</div>
            <button class="text-slate-400 hover:text-white" (click)="closeAgentModal()">✕</button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">Source</div>
              <select class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                      [value]="agentSource()"
                      (change)="agentSource.set($any($event.target).value)">
                <option value="pbx">Our PBX (choose extension)</option>
                <option value="external">Other (manual SIP registration)</option>
              </select>
            </label>

            @if (agentSource() === 'pbx') {
              <label class="block sm:col-span-2">
                <div class="text-xs text-slate-300 mb-1">Extension</div>
                <app-search-select
                  [items]="extensionItems()"
                  [value]="agentExtension()"
                  (valueChange)="agentExtension.set($event)"
                  placeholder="Select extension..."
                  [allowCustom]="false"
                  [mono]="true"
                  [showValue]="true"
                />
              </label>
            } @else {
              <label class="block">
                <div class="text-xs text-slate-300 mb-1">SIP server addr</div>
                <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                       [value]="agentSipServerAddr()" (input)="agentSipServerAddr.set($any($event.target).value)" />
              </label>
              <label class="block">
                <div class="text-xs text-slate-300 mb-1">SIP domain</div>
                <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                       [value]="agentSipDomain()" (input)="agentSipDomain.set($any($event.target).value)" />
              </label>
              <label class="block">
                <div class="text-xs text-slate-300 mb-1">SIP user</div>
                <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                       [value]="agentSipUser()" (input)="agentSipUser.set($any($event.target).value)" />
              </label>
              <label class="block">
                <div class="text-xs text-slate-300 mb-1">SIP password</div>
                <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                       [value]="agentSipPass()" (input)="agentSipPass.set($any($event.target).value)" />
              </label>
            }

            <label class="block sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">Gemini socket URL (optional)</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 font-mono text-sm"
                     placeholder="wss://... (empty = echo)"
                     [value]="agentGeminiUrl()" (input)="agentGeminiUrl.set($any($event.target).value)" />
            </label>

            <label class="block sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" class="accent-indigo-600"
                     [checked]="agentEnabled()"
                     (change)="agentEnabled.set($any($event.target).checked)" />
              <span class="text-sm text-slate-200">Enabled</span>
            </label>
          </div>

          <div class="mt-4 flex justify-end gap-2">
            <button type="button"
                    class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
                    (click)="closeAgentModal()">
              Cancel
            </button>
            <button type="button"
                    class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                    [disabled]="saving()"
                    (click)="saveAgent()">
              Save
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
  tab = signal<'defaults' | 'agents'>('agents');

  agentModalOpen = signal(false);
  editingAgentId = signal<string | null>(null);

  agentSource = signal<'pbx' | 'external'>('pbx');
  agentExtension = signal('');
  agentSipUser = signal('');
  agentSipPass = signal('');
  agentSipServerAddr = signal('');
  agentSipDomain = signal('');
  agentGeminiUrl = signal('');
  agentEnabled = signal(true);

  config = signal<SipAiConfig>({
    defaults: {
      sipServerAddr: 'auto:5060',
      sipDomain: 'auto',
      sipContactHost: 'auto',
      sdpIP: 'auto',
      sipListenAddr: '0.0.0.0:5090',
      sipPass: '1234',
      // 0 = no limit
      registerExpires: 0,
    },
    agents: [],
  });

  defaultsForm = new FormGroup({
    sipServerAddr: new FormControl('auto:5060', { nonNullable: true, validators: [Validators.required] }),
    sipDomain: new FormControl('auto', { nonNullable: true, validators: [Validators.required] }),
    sipContactHost: new FormControl('auto', { nonNullable: true, validators: [Validators.required] }),
    sdpIP: new FormControl('auto', { nonNullable: true, validators: [Validators.required] }),
    sipListenAddr: new FormControl('0.0.0.0:5090', { nonNullable: true, validators: [Validators.required] }),
    sipPass: new FormControl('1234', { nonNullable: true, validators: [Validators.required] }),
    registerExpires: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
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
        const cfg = res ?? this.config();
        this.config.set({
          defaults: cfg.defaults ?? this.config().defaults,
          agents: cfg.agents ?? [],
        });
        const d = this.config().defaults;
        this.defaultsForm.reset({
          sipServerAddr: d.sipServerAddr,
          sipDomain: d.sipDomain,
          sipContactHost: d.sipContactHost,
          sdpIP: d.sdpIP,
          sipListenAddr: d.sipListenAddr,
          sipPass: d.sipPass,
          registerExpires: d.registerExpires,
        });
            },
            error: (err) => this.error.set(err?.error?.message ?? 'Failed to load SIP AI settings'),
        });
    }

  saveAll(next: SipAiConfig) {
    this.saving.set(true);
    this.http.post(`${API_BASE_URL}/pbx/sip-ai`, next).subscribe({
            next: (res: any) => {
        const cfg = (res?.config ?? next) as SipAiConfig;
        this.config.set(cfg);
        this.toast.success('SIP AI saved');
                this.saving.set(false);
            },
            error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to save SIP AI settings');
                this.saving.set(false);
            },
        });
    }

  saveDefaults() {
    if (this.defaultsForm.invalid) return;
    const v = this.defaultsForm.getRawValue();
    const next: SipAiConfig = {
      ...this.config(),
      defaults: {
        sipServerAddr: v.sipServerAddr,
        sipDomain: v.sipDomain,
        sipContactHost: v.sipContactHost,
        sdpIP: v.sdpIP,
        sipListenAddr: v.sipListenAddr,
        sipPass: v.sipPass,
        registerExpires: Number(v.registerExpires) || 300,
      },
    };
    this.saveAll(next);
    }

  openNewAgent() {
    this.editingAgentId.set(null);
    this.agentSource.set('pbx');
    this.agentExtension.set('');
    this.agentSipUser.set('');
    this.agentSipPass.set('');
    this.agentSipServerAddr.set(this.config().defaults.sipServerAddr);
    this.agentSipDomain.set(this.config().defaults.sipDomain);
    this.agentGeminiUrl.set('');
    this.agentEnabled.set(true);
    this.agentModalOpen.set(true);
    }

  editAgent(a: SipAiAgent) {
    this.editingAgentId.set(a.id);
    this.agentSource.set(a.source);
    this.agentExtension.set(String(a.extension ?? ''));
    this.agentSipUser.set(String(a.sipUser ?? ''));
    this.agentSipPass.set(String(a.sipPass ?? ''));
    this.agentSipServerAddr.set(String(a.sipServerAddr ?? this.config().defaults.sipServerAddr));
    this.agentSipDomain.set(String(a.sipDomain ?? this.config().defaults.sipDomain));
    this.agentGeminiUrl.set(String(a.geminiSocketUrl ?? ''));
    this.agentEnabled.set(a.enabled !== false);
    this.agentModalOpen.set(true);
    }

  closeAgentModal() {
    this.agentModalOpen.set(false);
  }

  saveAgent() {
    const source = this.agentSource();
    const geminiSocketUrl = this.agentGeminiUrl().trim();
    if (geminiSocketUrl && !/^wss?:\/\//i.test(geminiSocketUrl)) {
      this.error.set('Gemini socket URL must start with ws:// or wss://');
      return;
    }

    let nextAgent: SipAiAgent | null = null;
    if (source === 'pbx') {
      const ext = this.agentExtension().trim();
      if (!ext) return;
      nextAgent = {
        id: this.editingAgentId() ?? `pbx-${ext}`,
        source: 'pbx',
        extension: ext,
        geminiSocketUrl,
        enabled: this.agentEnabled(),
      };
    } else {
      const sipUser = this.agentSipUser().trim();
      const sipPass = this.agentSipPass().trim();
      const sipServerAddr = this.agentSipServerAddr().trim();
      const sipDomain = this.agentSipDomain().trim();
      if (!sipUser || !sipPass || !sipServerAddr || !sipDomain) return;
      nextAgent = {
        id: this.editingAgentId() ?? `ext-${sipUser}`,
        source: 'external',
        sipUser,
        sipPass,
        sipServerAddr,
        sipDomain,
        geminiSocketUrl,
        enabled: this.agentEnabled(),
      };
    }

    const list = [...this.config().agents.filter((x) => x.id !== nextAgent!.id), nextAgent!].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    this.agentModalOpen.set(false);
    this.saveAll({ ...this.config(), agents: list });
  }

  deleteAgent(a: SipAiAgent) {
    if (!confirm(`Delete agent "${a.id}"?`)) return;
    const list = this.config().agents.filter((x) => x.id !== a.id);
    this.saveAll({ ...this.config(), agents: list });
    }

  toggleAgentEnabled(a: SipAiAgent, on: boolean) {
    const list = this.config().agents.map((x) => (x.id === a.id ? { ...x, enabled: on } : x));
    this.saveAll({ ...this.config(), agents: list });
  }
}


