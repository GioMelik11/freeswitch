import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { OptionsService } from '../core/options.service';
import { SearchSelectComponent, SearchSelectItem } from '../shared/search-select.component';
import { PaginationComponent } from '../shared/pagination.component';
import { ToastService } from '../shared/toast.service';

type Extension = {
  id: string;
  filePath: string;
  password: string;
  userContext: string;
  callerIdName: string;
  callerIdNumber: string;
  callgroup?: string;
  outgoingSound?: string;
  outboundTrunk?: string;
  forwardMobile?: string;
};

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchSelectComponent, PaginationComponent],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">Extensions</div>
        <div class="text-sm text-slate-300">Manages <span class="font-mono">directory/default/*.xml</span></div>
      </div>
      <div class="flex gap-2">
        <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="load()">
          Refresh
        </button>
        <button class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" (click)="openCreate()">
          New extension
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
        placeholder="Search extensions..."
        [value]="search()"
        (input)="search.set($any($event.target).value); page.set(1)"
      />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
      <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800 text-xs text-slate-400">
        <div class="col-span-2">Ext</div>
        <div class="col-span-4">Caller ID Name</div>
        <div class="col-span-2">Caller ID #</div>
        <div class="col-span-1">SIP AI</div>
        <div class="col-span-3 text-right">Actions</div>
      </div>
      @for (e of paged(); track e.id) {
        <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-900/60 items-center">
          <div class="col-span-2 font-mono">{{ e.id }}</div>
          <div class="col-span-4">{{ e.callerIdName }}</div>
          <div class="col-span-2 font-mono">{{ e.callerIdNumber }}</div>
          <div class="col-span-1">
            <span
              class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]"
              [class.border-emerald-800]="sipAiEnabled(e.id)"
              [class.text-emerald-200]="sipAiEnabled(e.id)"
              [class.border-slate-800]="!sipAiEnabled(e.id)"
              [class.text-slate-300]="!sipAiEnabled(e.id)"
              [title]="sipAiTooltip(e.id)"
            >
              {{ sipAiEnabled(e.id) ? 'ON' : 'OFF' }}
            </span>
          </div>
          <div class="col-span-3 flex justify-end gap-2">
            <span
              class="mr-2 self-center text-xs"
              [class.text-emerald-300]="isRegistered(e.id)"
              [class.text-slate-500]="!isRegistered(e.id)"
              [title]="regs()[e.id]?.raw ?? ''"
            >
              {{ isRegistered(e.id) ? 'REG' : 'OFF' }}
            </span>
            <button class="rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900" (click)="edit(e)">
              Edit
            </button>
            <button
              class="rounded-lg border border-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-950/30"
              (click)="remove(e)"
            >
              Delete
            </button>
          </div>
        </div>
      }
    </div>

    <app-pagination
      [total]="filtered().length"
      [page]="page()"
      [pageSize]="pageSize()"
      (pageChange)="page.set($event)"
      (pageSizeChange)="pageSize.set($event)"
    />

    @if (modalOpen()) {
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
        <div class="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="font-semibold">{{ editingId() ? 'Edit extension' : 'New extension' }}</div>
            <button class="text-slate-400 hover:text-white" (click)="close()">✕</button>
          </div>
          @if (editingId()) {
            <div class="mb-3 text-xs text-slate-300">
              Status: <span class="font-mono">{{ isRegistered(editingId()!) ? 'REGISTERED' : 'OFFLINE' }}</span>
              <button
                class="ml-2 rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900"
                type="button"
                (click)="loadRegs()"
              >
                Refresh status
              </button>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Extension</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="id" [readonly]="!!editingId()" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Password</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="password" />
            </label>
            <label class="block sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">Caller ID Name</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                     formControlName="callerIdName" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Caller ID Number</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="callerIdNumber" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">User Context</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                     formControlName="userContext" />
            </label>
            <!-- Queue assignment is managed from Queues page -->

            <div class="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900/20 p-3">
              <div class="text-xs text-slate-300 mb-2">Outgoing media override (optional)</div>
              <label class="block">
                <div class="text-[11px] text-slate-400 mb-1">Outgoing sound (ringback)</div>
                <app-search-select
                  [items]="soundItemsWithInherit()"
                  [value]="form.controls.outgoingSound.value"
                  (valueChange)="form.controls.outgoingSound.setValue($event)"
                  placeholder="(inherit trunk default)"
                  [allowCustom]="true"
                  [mono]="true"
                  [showValue]="true"
                />
              </label>
              <div class="mt-3">
                <div class="text-[11px] text-slate-400 mb-1">Outbound trunk (gateway)</div>
                <app-search-select
                  [items]="trunkItems()"
                  [value]="form.controls.outboundTrunk.value"
                  (valueChange)="form.controls.outboundTrunk.setValue($event)"
                  [allowCustom]="false"
                  [mono]="true"
                  [showValue]="true"
                  placeholder="{{ defaultTrunkLabel() }}"
                />
                <div class="text-[11px] text-slate-400 mt-1">
                  If empty, this extension uses the PBX default trunk.
                </div>
              </div>
            </div>

            <div class="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900/20 p-3">
              <div class="text-xs text-slate-300 mb-2">Incoming call routing (this extension)</div>
              <div class="text-sm text-slate-200">
                SIP AI:
                <span class="ml-2 font-mono" [class.text-emerald-300]="sipAiEnabled(form.controls.id.value)" [class.text-slate-400]="!sipAiEnabled(form.controls.id.value)">
                  {{ sipAiEnabled(form.controls.id.value) ? 'ENABLED' : 'DISABLED' }}
                </span>
              </div>
              <div class="text-[11px] text-slate-400 mt-2">
                Configure SIP AI extensions from the <span class="font-medium">SIP AI</span> page.
              </div>

              <div class="mt-3">
                <div class="text-[11px] text-slate-400 mb-1">If not answered → forward to mobile (optional)</div>
                <input
                  class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                  formControlName="forwardMobile"
                  placeholder="+9955XXXXXXX"
                />
              </div>
            </div>

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
export class ExtensionsPage {
  items = signal<Extension[]>([]);
  error = signal<string | null>(null);
  saving = signal(false);
  regs = signal<Record<string, { raw: string }>>({});
  sipAi = signal<any>(null);
  search = signal('');
  page = signal(1);
  pageSize = signal(10);

  modalOpen = signal(false);
  editingId = signal<string | null>(null);
  private editingQueueValue: string | undefined;

  options = computed(() => this.opts.options());

  sipAiEnabled(id: string) {
    const cfg = this.sipAi();
    const agents = cfg?.agents ?? [];
    return agents.some((a: any) => a && a.enabled !== false && a.source === 'pbx' && String(a.extension) === id);
  }

  sipAiTooltip(id: string) {
    const cfg = this.sipAi();
    const agents = cfg?.agents ?? [];
    const a = agents.find((x: any) => x && x.enabled !== false && x.source === 'pbx' && String(x.extension) === id);
    if (!a) return 'SIP AI disabled';
    const url = String(a.geminiSocketUrl ?? '').trim();
    return url ? `SIP AI enabled (${url})` : 'SIP AI enabled (echo mode)';
  }

  soundItems = computed((): SearchSelectItem[] => {
    const o = this.options();
    const all = o?.sounds?.all ?? [];
    // Add an explicit empty option at the top via selector placeholder; keep items non-empty.
    return all.map((s: any) => ({
      value: s.playPath,
      label: s.relPath,
      group: (s.relPath || '').startsWith('music/') ? 'Music' : 'Sounds',
      keywords: s.fsPath,
    }));
  });

  soundItemsWithInherit = computed((): SearchSelectItem[] => {
    return [{ value: '', label: '(inherit trunk default)' }, ...this.soundItems()];
  });

  defaultTrunkLabel = computed(() => {
    const o = this.options();
    const name = String(o?.defaultTrunkName ?? '').trim();
    return name ? `(default: ${name})` : '(default trunk)';
  });

  trunkItems = computed((): SearchSelectItem[] => {
    const o = this.options();
    const list = o?.trunks ?? [];
    const items: SearchSelectItem[] = [{ value: '', label: '(use default trunk)', group: 'Trunks' }];
    for (const t of list) {
      if (!t?.name) continue;
      const label = t.isDefault ? `${t.name} (default)` : t.name;
      items.push({ value: t.name, label, group: 'Trunks' });
    }
    return items;
  });

  form = new FormGroup({
    id: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d+$/)] }),
    password: new FormControl('$${default_password}', { nonNullable: true, validators: [Validators.required] }),
    userContext: new FormControl('default', { nonNullable: true, validators: [Validators.required] }),
    callerIdName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    callerIdNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    callgroup: new FormControl('', { nonNullable: true }),
    outgoingSound: new FormControl('', { nonNullable: true }),
    outboundTrunk: new FormControl('', { nonNullable: true }),
    forwardMobile: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly http: HttpClient,
    private readonly opts: OptionsService,
    private readonly toast: ToastService,
  ) {
    this.opts.refresh();
    this.load();
    this.loadRegs();
    this.loadSipAi();
  }

  filtered() {
    const s = this.search().trim().toLowerCase();
    if (!s) return this.items();
    return this.items().filter((e) => {
      const aiFlag = this.sipAiEnabled(e.id) ? 'sip ai on enabled' : 'sip ai off disabled';
      const aiUrl = String(this.sipAi().geminiSocketUrl ?? '').toLowerCase();
      return (
        e.id.includes(s) ||
        e.callerIdName.toLowerCase().includes(s) ||
        e.callerIdNumber.toLowerCase().includes(s) ||
        (e.callgroup ?? '').toLowerCase().includes(s) ||
        aiFlag.includes(s) ||
        aiUrl.includes(s)
      );
    });
  }

  paged() {
    const list = this.filtered();
    const size = Math.max(1, Number(this.pageSize()) || 10);
    const totalPages = Math.max(1, Math.ceil(list.length / size));
    const p = Math.min(totalPages, Math.max(1, Number(this.page()) || 1));
    if (p !== this.page()) this.page.set(p);
    const start = (p - 1) * size;
    return list.slice(start, start + size);
  }

  load() {
    this.error.set(null);
    this.http.get<Extension[]>(`${API_BASE_URL}/pbx/extensions`).subscribe({
      next: (res) => this.items.set(res),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to load extensions'),
    });
  }

  loadSipAi() {
    this.http.get<any>(`${API_BASE_URL}/pbx/sip-ai`).subscribe({
      next: (res) => this.sipAi.set(res ?? null),
      error: () => this.sipAi.set(null),
    });
  }

  loadRegs() {
    this.http.get<Record<string, { raw: string }>>(`${API_BASE_URL}/pbx/status/extensions`).subscribe({
      next: (res) => this.regs.set(res ?? {}),
      error: () => this.regs.set({}),
    });
  }

  isRegistered(id: string) {
    return Boolean(this.regs()[id]);
  }

  openCreate() {
    this.editingId.set(null);
    this.editingQueueValue = undefined;
    this.form.reset({
      id: '',
      password: '$${default_password}',
      userContext: 'default',
      callerIdName: '',
      callerIdNumber: '',
      callgroup: '',
      outgoingSound: '',
      outboundTrunk: '',
      forwardMobile: '',
    });
    this.modalOpen.set(true);
  }

  edit(e: Extension) {
    this.editingId.set(e.id);
    this.editingQueueValue = e.callgroup ?? undefined;
    this.form.reset({
      id: e.id,
      password: e.password,
      userContext: e.userContext,
      callerIdName: e.callerIdName,
      callerIdNumber: e.callerIdNumber,
      callgroup: e.callgroup ?? '',
      outgoingSound: e.outgoingSound ?? '',
      outboundTrunk: e.outboundTrunk ?? '',
      forwardMobile: e.forwardMobile ?? '',
    });
    this.modalOpen.set(true);
  }

  close() {
    this.modalOpen.set(false);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body = {
      id: v.id,
      password: v.password,
      userContext: v.userContext,
      callerIdName: v.callerIdName,
      callerIdNumber: v.callerIdNumber,
      callgroup: this.editingId() ? this.editingQueueValue : (v.callgroup || undefined),
      outgoingSound: v.outgoingSound || undefined,
      outboundTrunk: v.outboundTrunk || undefined,
      forwardMobile: v.forwardMobile || undefined,
    };
    this.http.post(`${API_BASE_URL}/pbx/extensions`, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success('Extension saved');
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to save extension');
        this.saving.set(false);
      },
    });
  }

  remove(e: Extension) {
    if (!confirm(`Delete extension ${e.id}?`)) return;
    this.http.delete(`${API_BASE_URL}/pbx/extensions/${e.id}`).subscribe({
      next: () => {
        this.toast.success('Extension deleted');
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to delete extension'),
    });
  }
}


