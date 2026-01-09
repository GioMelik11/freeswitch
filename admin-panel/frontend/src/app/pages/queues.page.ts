import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { OptionsService } from '../core/options.service';
import { SearchSelectComponent, SearchSelectItem } from '../shared/search-select.component';
import { PaginationComponent } from '../shared/pagination.component';
import { ToastService } from '../shared/toast.service';

type Queue = {
    name: string;
    strategy?: string;
    mohSound?: string;
    maxWaitTime?: string;
    discardAbandonedAfter?: string;
    extensionNumber?: string;
    timeoutDestination?: { type: string; target?: string };
};
type Agent = { name: string; contact: string };
type Tier = { queue: string; agent: string; level?: string; position?: string };

@Component({
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, SearchSelectComponent, PaginationComponent],
    template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">Queues</div>
        <div class="text-sm text-slate-300">Manages <span class="font-mono">autoload_configs/callcenter.conf.xml</span></div>
      </div>
      <div class="flex gap-2">
        <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="load()">
          Refresh
        </button>
        <button class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" (click)="openCreate()">
          New queue
        </button>
      </div>
    </div>

    @if (error()) {
      <div class="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200 mb-4">
        {{ error() }}
      </div>
    }

    <div class="mb-3">
      <input
        class="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Search queues..."
        [value]="search()"
        (input)="search.set($any($event.target).value); page.set(1)"
      />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
      <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800 text-xs text-slate-400">
        <div class="col-span-5">Queue</div>
        <div class="col-span-3">Strategy</div>
        <div class="col-span-2">Agents</div>
        <div class="col-span-2 text-right">Actions</div>
      </div>
      @for (q of pagedQueues(); track q.name) {
        <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-900/60 items-center">
          <div class="col-span-5 font-mono text-sm">{{ q.name }}</div>
          <div class="col-span-3 text-sm text-slate-200">{{ q.strategy ?? '-' }}</div>
          <div class="col-span-2 text-sm text-slate-200">{{ agentCount(q.name) }}</div>
          <div class="col-span-2 flex justify-end gap-2">
            <button class="rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900" (click)="edit(q)">
              Edit
            </button>
            <button
              class="rounded-lg border border-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-950/30"
              (click)="remove(q)"
            >
              Delete
            </button>
          </div>
        </div>
      }
    </div>

    <app-pagination
      [total]="filteredQueues().length"
      [page]="page()"
      [pageSize]="pageSize()"
      (pageChange)="page.set($event)"
      (pageSizeChange)="pageSize.set($event)"
    />

    @if (modalOpen()) {
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
        <div class="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="font-semibold">{{ editingFullName() ? 'Edit queue' : 'New queue' }}</div>
            <button class="text-slate-400 hover:text-white" (click)="close()">✕</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Queue name (without @domain)</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="name" [readonly]="!!editingFullName()" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Domain</div>
              <select class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                      formControlName="domain">
                @for (d of (options()?.domains ?? ['default']); track d) {
                  <option [value]="d">{{ d }}</option>
                }
              </select>
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Strategy</div>
              <select class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                      formControlName="strategy">
                @for (s of (options()?.strategies ?? ['ring-all']); track s) {
                  <option [value]="s">{{ s }}</option>
                }
              </select>
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">MOH Sound</div>
              <app-search-select
                [items]="mohItems()"
                [value]="form.controls.mohSound.value"
                (valueChange)="form.controls.mohSound.setValue($event)"
                placeholder="Select MOH..."
                [allowCustom]="true"
                [mono]="true"
                [showValue]="true"
              />
              <div class="text-[11px] text-slate-400 mt-1">
                Tip: Use <span class="font-mono">local_stream://moh</span> for playlist MOH, or choose a single music file.
              </div>
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Max Wait Time (sec, 0=unlimited)</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="maxWaitTime" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Discard Abandoned After (sec)</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="discardAbandonedAfter" />
            </label>

            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Queue Number (dial this to enter the queue)</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     placeholder="e.g. 2000"
                     formControlName="extensionNumber" />
            </label>

            <div class="block">
              <div class="text-xs text-slate-300 mb-1">After timeout</div>
              <div class="grid grid-cols-2 gap-2">
                <select class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                        formControlName="timeoutType">
                  <option value="">Do nothing</option>
                  <option value="terminate">Terminate</option>
                  <option value="extension">Go to extension</option>
                  <option value="queue">Go to queue</option>
                  <option value="ivr">Go to IVR</option>
                  <option value="timeCondition">Go to time condition</option>
                </select>

                @if (form.controls.timeoutType.value === 'terminate' || !form.controls.timeoutType.value) {
                  <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-400"
                         value="-" readonly />
                } @else {
                  <select class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                          formControlName="timeoutTarget">
                    <option value="">Select...</option>

                    @if (form.controls.timeoutType.value === 'extension') {
                      @for (e of (options()?.extensions ?? []); track e.id) {
                        <option [value]="e.id">{{ e.label }}</option>
                      }
                    }

                    @if (form.controls.timeoutType.value === 'queue') {
                      @for (q of (options()?.queues ?? []); track q.name) {
                        <option [value]="q.name">{{ q.name }}</option>
                      }
                    }

                    @if (form.controls.timeoutType.value === 'ivr') {
                      @for (m of (options()?.ivrs ?? []); track m.name) {
                        <option [value]="m.name">{{ m.name }}</option>
                      }
                    }

                    @if (form.controls.timeoutType.value === 'timeCondition') {
                      @for (t of (options()?.timeConditions ?? []); track t.extensionNumber) {
                        <option [value]="t.extensionNumber">{{ t.extensionNumber }} - {{ t.name }}</option>
                      }
                    }
                  </select>
                }
              </div>
              <div class="text-[11px] text-slate-400 mt-1">
                This is applied by generated dialplan + Lua after <span class="font-mono">callcenter</span> exits due to timeout/no-agents.
              </div>
            </div>
            <label class="block sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">Agents</div>
              <input
                class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search extensions..."
                [value]="agentSearch()"
                (input)="agentSearch.set($any($event.target).value)"
              />
              <div class="mt-2 max-h-40 overflow-auto rounded-lg border border-slate-800 bg-slate-900/30 p-2 space-y-1">
                @for (e of filteredExtensions(); track e.id) {
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      class="accent-indigo-600"
                      [checked]="selectedAgents().includes(e.id)"
                      (change)="toggleAgent(e.id, $any($event.target).checked)"
                    />
                    <span class="font-mono">{{ e.id }}</span>
                    <span class="text-slate-300 truncate">{{ e.label.replace(e.id + ' - ', '') }}</span>
                  </label>
                }
              </div>
            </label>

            <div class="sm:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="close()">
                Cancel
              </button>
              <button type="submit" [disabled]="form.invalid || saving()"
                      class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                {{ saving() ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class QueuesPage {
    queues = signal<Queue[]>([]);
    agents = signal<Agent[]>([]);
    tiers = signal<Tier[]>([]);
    etag = signal<string | null>(null);
    error = signal<string | null>(null);
    saving = signal(false);
    search = signal('');
    page = signal(1);
    pageSize = signal(10);

    modalOpen = signal(false);
    editingFullName = signal<string | null>(null);
    agentSearch = signal('');
    selectedAgents = signal<string[]>([]);

    options = computed(() => this.opts.options());

    mohItems = computed((): SearchSelectItem[] => {
        const o = this.options();
        const out: SearchSelectItem[] = [];
        for (const m of (o?.mohClasses ?? [])) {
            out.push({ value: m, label: m, group: 'MOH classes' });
        }
        for (const s of (o?.sounds?.music ?? [])) {
            out.push({ value: s.fsPath, label: s.relPath, group: 'Music files', keywords: s.fsPath });
        }
        return out;
    });

    form = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)] }),
        domain: new FormControl('default', { nonNullable: true, validators: [Validators.required] }),
        strategy: new FormControl('ring-all', { nonNullable: true }),
        mohSound: new FormControl('local_stream://moh', { nonNullable: true }),
        maxWaitTime: new FormControl('0', { nonNullable: true }),
        discardAbandonedAfter: new FormControl('60', { nonNullable: true }),
        extensionNumber: new FormControl('', { nonNullable: true }),
        timeoutType: new FormControl('', { nonNullable: true }),
        timeoutTarget: new FormControl('', { nonNullable: true }),
    });

    constructor(
        private readonly http: HttpClient,
        private readonly opts: OptionsService,
        private readonly toast: ToastService,
    ) {
        this.opts.refresh();
        this.load();

        this.form.controls.timeoutType.valueChanges.subscribe((t) => {
            this.form.controls.timeoutTarget.setValue(this.defaultTimeoutTarget(t));
        });
    }

    private defaultTimeoutTarget(type: string) {
        const o = this.options();
        if (!type || type === 'terminate') return '';
        if (type === 'extension') return String(o?.extensions?.[0]?.id ?? '1001');
        if (type === 'queue') return String(o?.queues?.[0]?.name ?? 'queue1@default');
        if (type === 'ivr') return String(o?.ivrs?.[0]?.name ?? 'main_ivr');
        if (type === 'timeCondition') return String(o?.timeConditions?.[0]?.extensionNumber ?? '6000');
        return '';
    }

    filteredQueues() {
        const q = this.queues();
        const s = this.search().trim().toLowerCase();
        if (!s) return q;
        return q.filter((x) => x.name.toLowerCase().includes(s));
    }

    pagedQueues() {
        const list = this.filteredQueues();
        const size = Math.max(1, Number(this.pageSize()) || 10);
        const totalPages = Math.max(1, Math.ceil(list.length / size));
        const p = Math.min(totalPages, Math.max(1, Number(this.page()) || 1));
        if (p !== this.page()) this.page.set(p);
        const start = (p - 1) * size;
        return list.slice(start, start + size);
    }

    filteredExtensions() {
        const o = this.options();
        const list = o?.extensions ?? [];
        const s = this.agentSearch().trim().toLowerCase();
        if (!s) return list;
        return list.filter((x) => x.label.toLowerCase().includes(s) || x.id.includes(s));
    }

    toggleAgent(ext: string, on: boolean) {
        const set = new Set(this.selectedAgents());
        if (on) set.add(ext);
        else set.delete(ext);
        this.selectedAgents.set([...set].sort((a, b) => Number(a) - Number(b)));
    }

    load() {
        this.error.set(null);
        this.http.get<{ etag: string; queues: Queue[]; agents: Agent[]; tiers: Tier[] }>(`${API_BASE_URL}/pbx/queues`).subscribe({
            next: (res) => {
                this.etag.set(res.etag);
                this.queues.set(res.queues);
                this.agents.set(res.agents);
                this.tiers.set(res.tiers);
            },
            error: (err) => this.error.set(err?.error?.message ?? 'Failed to load queues'),
        });
    }

    agentCount(queueName: string) {
        return this.tiers().filter((t) => t.queue === queueName).length;
    }

    openCreate() {
        this.editingFullName.set(null);
        this.form.reset({
            name: '',
            domain: 'default',
            strategy: 'ring-all',
            mohSound: 'local_stream://moh',
            maxWaitTime: '0',
            discardAbandonedAfter: '60',
            extensionNumber: '',
            timeoutType: '',
            timeoutTarget: '',
        });
        this.modalOpen.set(true);
        this.selectedAgents.set([]);
    }

    edit(q: Queue) {
        const [short, domain] = q.name.split('@');
        this.editingFullName.set(q.name);
        const tt = q.timeoutDestination?.type ?? '';
        const tg = q.timeoutDestination?.target ?? '';
        this.form.reset({
            name: short,
            domain: domain ?? 'default',
            strategy: q.strategy ?? 'ring-all',
            mohSound: q.mohSound ?? 'local_stream://moh',
            maxWaitTime: q.maxWaitTime ?? '0',
            discardAbandonedAfter: q.discardAbandonedAfter ?? '60',
            extensionNumber: q.extensionNumber ?? '',
            timeoutType: tt,
            timeoutTarget: tg,
        });
        this.modalOpen.set(true);
        this.selectedAgents.set(
            this.tiers()
                .filter((t) => t.queue === q.name)
                .map((t) => t.agent.split('@')[0]),
        );
    }

    close() {
        this.modalOpen.set(false);
    }

    save() {
        if (this.form.invalid) return;
        this.saving.set(true);
        this.error.set(null);
        const v = this.form.getRawValue();
        const agentExtensions = this.selectedAgents();
        const timeoutDestination =
            v.timeoutType
                ? { type: v.timeoutType, target: v.timeoutType === 'terminate' ? undefined : (v.timeoutTarget || undefined) }
                : undefined;
        this.http
            .post(`${API_BASE_URL}/pbx/queues`, {
                name: v.name,
                domain: v.domain,
                strategy: v.strategy || undefined,
                mohSound: v.mohSound || undefined,
                maxWaitTime: v.maxWaitTime || undefined,
                discardAbandonedAfter: v.discardAbandonedAfter || undefined,
                extensionNumber: v.extensionNumber || undefined,
                timeoutDestination,
                agentExtensions,
                etag: this.etag(),
            })
            .subscribe({
                next: (res: any) => {
                    this.etag.set(res.etag ?? this.etag());
                    this.saving.set(false);
                    this.modalOpen.set(false);
                    this.toast.success('Queue saved');
                    this.load();
                },
                error: (err) => {
                    this.error.set(err?.error?.message ?? 'Failed to save queue');
                    this.saving.set(false);
                },
            });
    }

    remove(q: Queue) {
        const [short, domain] = q.name.split('@');
        if (!confirm(`Delete queue ${q.name}?`)) return;
        this.http.delete(`${API_BASE_URL}/pbx/queues/${short}?domain=${encodeURIComponent(domain ?? 'default')}&etag=${encodeURIComponent(this.etag() ?? '')}`).subscribe({
            next: () => {
                this.toast.success('Queue deleted');
                this.load();
            },
            error: (err) => this.error.set(err?.error?.message ?? 'Failed to delete queue'),
        });
    }
}


