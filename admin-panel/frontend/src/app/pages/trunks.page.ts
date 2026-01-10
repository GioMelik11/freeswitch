import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { OptionsService } from '../core/options.service';
import { SearchSelectComponent, SearchSelectItem } from '../shared/search-select.component';
import { PaginationComponent } from '../shared/pagination.component';
import { ToastService } from '../shared/toast.service';

type Trunk = {
  name: string;
  filePath: string;
  register: boolean;
  isDefault?: boolean;
  username?: string;
  password?: string;
  realm?: string;
  proxy?: string;
  fromUser?: string;
  fromDomain?: string;
  extension?: string;
  transport?: string;
  inboundDestination?: { type: string; target?: string };
  outgoingDefault?: { type: string; sound?: string; ivr?: string };
  prefixRules?: Array<{ enabled?: boolean; prefix: string; prepend?: string; description?: string }>;
};

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchSelectComponent, PaginationComponent],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">Trunks</div>
        <div class="text-sm text-slate-300">Manages <span class="font-mono">sip_profiles/external/*.xml</span></div>
      </div>
      <div class="flex gap-2">
        <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="load()">
          Refresh
        </button>
        <button class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" (click)="openCreate()">
          New trunk
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
        placeholder="Search trunks..."
        [value]="search()"
        (input)="search.set($any($event.target).value); page.set(1)"
      />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
      <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800 text-xs text-slate-400">
        <div class="col-span-4">Name</div>
        <div class="col-span-3">Proxy/Realm</div>
        <div class="col-span-2">Username</div>
        <div class="col-span-1 text-center">Reg</div>
        <div class="col-span-2 text-right">Actions</div>
      </div>
      @for (t of paged(); track t.name) {
        <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-900/60 items-center">
          <div class="col-span-4 font-mono text-sm flex items-center gap-2">
            <span>{{ t.name }}</span>
            @if (t.isDefault) {
              <span class="rounded-md border border-amber-800/60 bg-amber-950/20 px-2 py-0.5 text-[11px] text-amber-200">DEFAULT</span>
            }
          </div>
          <div class="col-span-3 font-mono text-xs text-slate-300">{{ t.proxy ?? t.realm ?? '-' }}</div>
          <div class="col-span-2 font-mono text-xs text-slate-300 truncate">{{ t.username ?? '-' }}</div>
          <div class="col-span-1 text-center">
            <span
              class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]"
              [class.border-emerald-800]="statusFor(t.name) === 'REGED'"
              [class.text-emerald-200]="statusFor(t.name) === 'REGED'"
              [class.bg-emerald-950/20]="statusFor(t.name) === 'REGED'"
              [class.border-amber-800]="statusFor(t.name) === 'TRYING'"
              [class.text-amber-200]="statusFor(t.name) === 'TRYING'"
              [class.bg-amber-950/20]="statusFor(t.name) === 'TRYING'"
              [class.border-red-900/60]="statusFor(t.name) === 'FAIL_WAIT' || statusFor(t.name) === 'DOWN'"
              [class.text-red-200]="statusFor(t.name) === 'FAIL_WAIT' || statusFor(t.name) === 'DOWN'"
              [class.bg-red-950/20]="statusFor(t.name) === 'FAIL_WAIT' || statusFor(t.name) === 'DOWN'"
              [class.border-slate-800]="statusFor(t.name) === 'NOREG' || statusFor(t.name) === 'UNREGED' || statusFor(t.name) === 'UNKNOWN'"
              [class.text-slate-300]="statusFor(t.name) === 'NOREG' || statusFor(t.name) === 'UNREGED' || statusFor(t.name) === 'UNKNOWN'"
              [class.bg-slate-950/20]="statusFor(t.name) === 'NOREG' || statusFor(t.name) === 'UNREGED' || statusFor(t.name) === 'UNKNOWN'"
              [title]="statuses()[t.name]?.raw ?? ''"
            >
              <span class="h-1.5 w-1.5 rounded-full"
                    [class.bg-emerald-400]="statusFor(t.name) === 'REGED'"
                    [class.bg-amber-400]="statusFor(t.name) === 'TRYING'"
                    [class.bg-red-400]="statusFor(t.name) === 'FAIL_WAIT' || statusFor(t.name) === 'DOWN'"
                    [class.bg-slate-500]="statusFor(t.name) === 'NOREG' || statusFor(t.name) === 'UNREGED' || statusFor(t.name) === 'UNKNOWN'"></span>
              {{ statusFor(t.name) }}
            </span>
          </div>
          <div class="col-span-2 flex justify-end gap-2">
            @if (!t.isDefault) {
              <button
                class="rounded-lg border border-slate-800 bg-slate-950/20 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900/60"
                (click)="makeDefault(t)"
                title="Make default trunk"
              >
                Set default
              </button>
            }
            <button class="rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900" (click)="edit(t)">
              Edit
            </button>
            <button
              class="rounded-lg border border-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-950/30"
              (click)="removeFromList(t)"
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
        <div class="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="font-semibold">{{ editingName() ? 'Edit trunk' : 'New trunk' }}</div>
            <button class="text-slate-400 hover:text-white" (click)="close()">✕</button>
          </div>
          @if (editingName()) {
            <div class="mb-3 text-xs text-slate-300">
              Status: <span class="font-mono">{{ statusFor(editingName()!) }}</span>
              <button class="ml-2 rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900" type="button" (click)="loadStatuses()">
                Refresh status
              </button>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2 flex gap-2 -mt-1 mb-1">
              <button type="button"
                      class="rounded-lg border border-slate-800 px-3 py-1 text-sm"
                      [class.bg-slate-800/50]="tab()==='current'"
                      (click)="tab.set('current')">
                Current
              </button>
              <button type="button"
                      class="rounded-lg border border-slate-800 px-3 py-1 text-sm"
                      [class.bg-slate-800/50]="tab()==='prefixes'"
                      (click)="tab.set('prefixes')">
                Prefix rules
              </button>
            </div>

            @if (tab() === 'prefixes') {
              <div class="sm:col-span-2 rounded-xl border border-slate-800 bg-slate-900/20 p-3">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-sm font-medium">Outbound prefix rules</div>
                  <button type="button" class="rounded-lg border border-slate-800 px-3 py-1 text-xs hover:bg-slate-900" (click)="addPrefixRule()">
                    Add rule
                  </button>
                </div>
                <div class="text-xs text-slate-400 mb-3">
                  If the user dials <span class="font-mono">PREFIX + NUMBER</span>, FreeSWITCH strips the prefix and dials <span class="font-mono">PREPEND + NUMBER</span> via this trunk.
                </div>

                @if (prefixRules().length === 0) {
                  <div class="text-sm text-slate-300">No rules yet.</div>
                } @else {
                  <div class="grid grid-cols-12 gap-2 text-xs text-slate-400 px-2">
                    <div class="col-span-2">On</div>
                    <div class="col-span-3">Prefix</div>
                    <div class="col-span-3">Prepend</div>
                    <div class="col-span-3">Description</div>
                    <div class="col-span-1 text-right">Del</div>
                  </div>
                  <div class="mt-2 space-y-2">
                    @for (r of prefixRules(); track $index) {
                      <div class="grid grid-cols-12 gap-2 items-center px-2">
                        <div class="col-span-2">
                          <input type="checkbox" class="accent-indigo-600"
                                 [checked]="r.enabled !== false"
                                 (change)="setPrefixRule($index, { enabled: $any($event.target).checked })" />
                        </div>
                        <input class="col-span-3 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 font-mono text-xs"
                               [value]="r.prefix"
                               (input)="setPrefixRule($index, { prefix: $any($event.target).value })"
                               placeholder="9" />
                        <input class="col-span-3 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 font-mono text-xs"
                               [value]="r.prepend ?? ''"
                               (input)="setPrefixRule($index, { prepend: $any($event.target).value })"
                               placeholder="" />
                        <input class="col-span-3 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-xs"
                               [value]="r.description ?? ''"
                               (input)="setPrefixRule($index, { description: $any($event.target).value })"
                               placeholder="International" />
                        <div class="col-span-1 flex justify-end">
                          <button type="button" class="text-slate-300 hover:text-white" (click)="removePrefixRule($index)">✕</button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            } @else {
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Name</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="name" [readonly]="!!editingName()" />
            </label>
            <label class="block flex items-end gap-2">
              <input type="checkbox" class="accent-indigo-600" [checked]="form.controls.register.value"
                     (change)="form.controls.register.setValue($any($event.target).checked)" />
              <span class="text-sm text-slate-200">Register trunk</span>
            </label>

            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Proxy</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="proxy" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Realm</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="realm" />
            </label>

            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Username</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="username" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Password</div>
              <input type="password" class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="password" />
            </label>

            <label class="block">
              <div class="text-xs text-slate-300 mb-1">From User</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="fromUser" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">From Domain</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="fromDomain" />
            </label>

            <label class="block">
              <div class="text-xs text-slate-300 mb-1">DID/Extension (optional)</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="extension" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Transport</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="transport" />
            </label>

            <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div class="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
                <div class="text-xs text-slate-300 mb-2">Inbound calls on this trunk →</div>
                <div class="grid grid-cols-2 gap-2">
                  <select class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                          formControlName="inboundType">
                    <option value="">Do nothing</option>
                    <option value="terminate">Terminate</option>
                    <option value="extension">Extension</option>
                    <option value="queue">Queue</option>
                    <option value="ivr">IVR</option>
                    <option value="timeCondition">Time condition</option>
                  </select>

                  @if (!form.controls.inboundType.value || form.controls.inboundType.value === 'terminate') {
                    <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-400"
                           value="-" readonly />
                  } @else {
                    <app-search-select
                      [items]="inboundTargetItems()"
                      [value]="form.controls.inboundTarget.value"
                      (valueChange)="form.controls.inboundTarget.setValue($event)"
                      placeholder="Select..."
                      [allowCustom]="false"
                      [mono]="true"
                    />
                  }
                </div>
                <div class="text-[11px] text-slate-400 mt-2">
                  This is applied by generated dialplan in <span class="font-mono">dialplan/public/*.xml</span>.
                </div>
              </div>

              <div class="rounded-xl border border-slate-800 bg-slate-900/20 p-3">
                <div class="text-xs text-slate-300 mb-2">Default outgoing music (ringback)</div>
                <app-search-select
                  [items]="soundItemsWithNone()"
                  [value]="form.controls.outgoingSound.value"
                  (valueChange)="form.controls.outgoingSound.setValue($event)"
                  placeholder="None"
                  [allowCustom]="true"
                  [mono]="true"
                  [showValue]="true"
                />
                <div class="text-[11px] text-slate-400 mt-2">
                  Extensions can override this (per-extension setting).
                </div>
              </div>
            </div>
            }

            <div class="sm:col-span-2 flex justify-between gap-2 mt-2">
              <button type="button"
                      class="rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-200 hover:bg-red-950/30"
                      [disabled]="!editingName() || saving()"
                      (click)="remove()">
                Delete
              </button>
              <div class="flex gap-2">
                <button type="button" class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="close()">
                  Cancel
                </button>
                <button type="submit" [disabled]="form.invalid || saving()"
                        class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {{ saving() ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class TrunksPage {
  items = signal<Trunk[]>([]);
  error = signal<string | null>(null);
  saving = signal(false);
  statuses = signal<Record<string, { status: string; raw: string }>>({});
  search = signal('');
  page = signal(1);
  pageSize = signal(10);

  modalOpen = signal(false);
  editingName = signal<string | null>(null);
  tab = signal<'current' | 'prefixes'>('current');
  prefixRules = signal<Array<{ enabled?: boolean; prefix: string; prepend?: string; description?: string }>>([]);
  options = computed(() => this.opts.options());
  inboundTypeSig = signal<string>('');

  soundItems = computed((): SearchSelectItem[] => {
    const o = this.options();
    const all = o?.sounds?.all ?? [];
    return all.map((s: any) => ({
      value: s.playPath, // prefer relative path
      label: s.relPath,
      group: (s.relPath || '').startsWith('music/') ? 'Music' : 'Sounds',
      keywords: s.fsPath,
    }));
  });

  soundItemsWithNone = computed((): SearchSelectItem[] => {
    return [{ value: '', label: 'None' }, ...this.soundItems()];
  });

  inboundTargetItems = computed((): SearchSelectItem[] => {
    const o = this.options();
    const t = this.inboundTypeSig();
    if (!o || !t) return [];
    if (t === 'extension') {
      return (o.extensions ?? []).map((e: any) => ({ value: e.id, label: e.label, group: 'Extensions' }));
    }
    if (t === 'queue') {
      return (o.queues ?? []).map((q: any) => ({ value: q.name, label: q.name, group: 'Queues' }));
    }
    if (t === 'ivr') {
      return (o.ivrs ?? []).map((m: any) => ({ value: m.name, label: m.name, group: 'IVR' }));
    }
    if (t === 'timeCondition') {
      return (o.timeConditions ?? []).map((x: any) => ({
        value: x.extensionNumber,
        label: `${x.extensionNumber} - ${x.name}`,
        group: 'Time conditions',
      }));
    }
    return [];
  });

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)] }),
    register: new FormControl(true, { nonNullable: true }),
    proxy: new FormControl('', { nonNullable: true }),
    realm: new FormControl('', { nonNullable: true }),
    username: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
    fromUser: new FormControl('', { nonNullable: true }),
    fromDomain: new FormControl('', { nonNullable: true }),
    extension: new FormControl('', { nonNullable: true }),
    transport: new FormControl('udp', { nonNullable: true }),
    inboundType: new FormControl('', { nonNullable: true }),
    inboundTarget: new FormControl('', { nonNullable: true }),
    outgoingSound: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly http: HttpClient,
    private readonly opts: OptionsService,
    private readonly toast: ToastService,
  ) {
    this.opts.refresh();
    this.load();
    this.loadStatuses();

    this.form.controls.inboundType.valueChanges.subscribe((t) => {
      const type = String(t ?? '');
      this.inboundTypeSig.set(type);

      // Only auto-reset target when user is actively editing (avoid overwriting data during form.reset).
      if (!this.modalOpen()) return;
      const next = this.defaultInboundTarget(type);
      this.form.controls.inboundTarget.setValue(next);
    });

    // Initialize signal so computed lists work on first render/edit.
    this.inboundTypeSig.set(this.form.controls.inboundType.value ?? '');
  }

  private defaultInboundTarget(type: string) {
    const o = this.options();
    if (!type || type === 'terminate') return '';
    if (type === 'extension') return String(o?.extensions?.[0]?.id ?? '1001');
    if (type === 'queue') return String(o?.queues?.[0]?.name ?? 'queue1@default');
    if (type === 'ivr') return String(o?.ivrs?.[0]?.name ?? 'main_ivr');
    if (type === 'timeCondition') return String(o?.timeConditions?.[0]?.extensionNumber ?? '6000');
    return '';
  }

  filtered() {
    const s = this.search().trim().toLowerCase();
    if (!s) return this.items();
    return this.items().filter((t) => {
      return (
        t.name.toLowerCase().includes(s) ||
        (t.proxy ?? '').toLowerCase().includes(s) ||
        (t.realm ?? '').toLowerCase().includes(s) ||
        (t.username ?? '').toLowerCase().includes(s) ||
        this.statusFor(t.name).toLowerCase().includes(s)
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
    this.http.get<Trunk[]>(`${API_BASE_URL}/pbx/trunks`).subscribe({
      next: (res) => this.items.set(res),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to load trunks'),
    });
  }

  loadStatuses() {
    this.http.get<Record<string, { status: string; raw: string }>>(`${API_BASE_URL}/pbx/status/gateways`).subscribe({
      next: (res) => {
        const inMap = res ?? {};
        // Be resilient: backend/freeSWITCH may key as "external::gw" or just "gw". Normalize to plain name too.
        const out: Record<string, { status: string; raw: string }> = {};
        for (const [k, v] of Object.entries(inMap)) {
          out[k] = v as any;
          const plain = k.includes('::') ? k.split('::').pop()! : k;
          out[plain] = v as any;
        }
        this.statuses.set(out);
      },
      error: () => this.statuses.set({}),
    });
  }

  statusFor(name: string) {
    return this.statuses()[name]?.status ?? 'UNKNOWN';
  }

  openCreate() {
    this.editingName.set(null);
    this.tab.set('current');
    this.prefixRules.set([{ enabled: true, prefix: '9', prepend: '', description: 'Default' }]);
    this.form.reset({
      name: '',
      register: true,
      proxy: '',
      realm: '',
      username: '',
      password: '',
      fromUser: '',
      fromDomain: '',
      extension: '',
      transport: 'udp',
      inboundType: '',
      inboundTarget: '',
      outgoingSound: '',
    });
    this.modalOpen.set(true);
  }

  edit(t: Trunk) {
    this.editingName.set(t.name);
    this.tab.set('current');
    this.prefixRules.set((t.prefixRules ?? []).map((x) => ({ ...x })));
    const inType = t.inboundDestination?.type ?? '';
    const inTarget = t.inboundDestination?.target ?? '';
    this.form.reset({
      name: t.name,
      register: t.register,
      proxy: t.proxy ?? '',
      realm: t.realm ?? '',
      username: t.username ?? '',
      password: t.password ?? '',
      fromUser: t.fromUser ?? '',
      fromDomain: t.fromDomain ?? '',
      extension: t.extension ?? '',
      transport: t.transport ?? 'udp',
      inboundType: inType,
      inboundTarget: inTarget,
      outgoingSound: t.outgoingDefault?.type === 'sound' ? (t.outgoingDefault?.sound ?? '') : '',
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
    const inboundDestination =
      v.inboundType
        ? { type: v.inboundType, target: v.inboundType === 'terminate' ? undefined : (v.inboundTarget || undefined) }
        : undefined;
    const outgoingDefault = v.outgoingSound ? { type: 'sound', sound: v.outgoingSound || undefined } : undefined;
    const body = {
      name: v.name,
      register: v.register,
      proxy: v.proxy || undefined,
      realm: v.realm || undefined,
      username: v.username || undefined,
      password: v.password || undefined,
      fromUser: v.fromUser || undefined,
      fromDomain: v.fromDomain || undefined,
      extension: v.extension || undefined,
      transport: v.transport || undefined,
      inboundDestination,
      outgoingDefault,
      prefixRules: this.prefixRules(),
    };
    this.http.post(`${API_BASE_URL}/pbx/trunks`, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success('Trunk saved');
        this.load();
        this.loadStatuses();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to save trunk');
        this.saving.set(false);
      },
    });
  }

  makeDefault(t: Trunk) {
    if (t.isDefault) return;
    if (!confirm(`Make trunk ${t.name} the default for outbound calls?`)) return;
    this.http.post(`${API_BASE_URL}/pbx/trunks/${encodeURIComponent(t.name)}/default`, {}).subscribe({
      next: () => {
        this.toast.success('Default trunk updated');
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to set default trunk'),
    });
  }

  addPrefixRule() {
    this.prefixRules.set([...this.prefixRules(), { enabled: true, prefix: '', prepend: '', description: '' }]);
  }

  removePrefixRule(i: number) {
    const next = [...this.prefixRules()];
    next.splice(i, 1);
    this.prefixRules.set(next);
  }

  setPrefixRule(
    i: number,
    patch: Partial<{ enabled?: boolean; prefix: string; prepend?: string; description?: string }>,
  ) {
    const next = [...this.prefixRules()];
    next[i] = { ...next[i], ...patch } as any;
    this.prefixRules.set(next);
  }

  remove() {
    const name = this.editingName();
    if (!name) return;
    if (!confirm(`Delete trunk ${name}?`)) return;
    this.saving.set(true);
    this.http.delete(`${API_BASE_URL}/pbx/trunks/${name}`).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success('Trunk deleted');
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to delete trunk');
        this.saving.set(false);
      },
    });
  }

  removeFromList(t: Trunk) {
    if (!confirm(`Delete trunk ${t.name}?`)) return;
    this.http.delete(`${API_BASE_URL}/pbx/trunks/${encodeURIComponent(t.name)}`).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to delete trunk'),
    });
  }
}


