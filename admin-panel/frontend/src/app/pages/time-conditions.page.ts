import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { OptionsService } from '../core/options.service';
import { PaginationComponent } from '../shared/pagination.component';
import { ToastService } from '../shared/toast.service';

type Dest = { type: 'transfer' | 'ivr' | 'queue'; target: string };
type TimeCondition = {
  name: string;
  extensionNumber: string;
  days: number[];
  startHour: number;
  endHour: number;
  onMatch: Dest;
  onElse: Dest;
};

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">Time Conditions</div>
        <div class="text-sm text-slate-300">Creates dialplan entries in <span class="font-mono">dialplan/default/99_time_conditions.xml</span></div>
      </div>
      <div class="flex gap-2">
        <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="load()">Refresh</button>
        <button class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" (click)="openCreate()">New</button>
      </div>
    </div>

    @if (error()) {
      <div class="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200 mb-4">{{ error() }}</div>
    }

    <div class="mb-3">
      <input
        class="w-full rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Search time conditions..."
        [value]="search()"
        (input)="search.set($any($event.target).value); page.set(1)"
      />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
      <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800 text-xs text-slate-400">
        <div class="col-span-4">Name</div>
        <div class="col-span-2">Ext</div>
        <div class="col-span-3">When</div>
        <div class="col-span-3 text-right">Actions</div>
      </div>
      @for (t of paged(); track t.name) {
        <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-900/60 items-center">
          <div class="col-span-4 font-mono text-sm">{{ t.name }}</div>
          <div class="col-span-2 font-mono text-sm">{{ t.extensionNumber }}</div>
          <div class="col-span-3 text-xs text-slate-300">
            {{ t.days.join(',') }} | {{ t.startHour }}-{{ t.endHour }}
          </div>
          <div class="col-span-3 flex justify-end gap-2">
            <button class="rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900" (click)="edit(t)">Edit</button>
            <button class="rounded-lg border border-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-950/30" (click)="remove(t)">Delete</button>
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
            <div class="font-semibold">{{ editingName() ? 'Edit' : 'New' }} Time Condition</div>
            <button class="text-slate-400 hover:text-white" (click)="close()">✕</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Name</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono" formControlName="name" [readonly]="!!editingName()" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Extension Number</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono" formControlName="extensionNumber" />
            </label>

            <div class="sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">Days (Mon=1 ... Sun=7)</div>
              <div class="flex flex-wrap gap-3 text-sm">
                @for (d of [1,2,3,4,5,6,7]; track d) {
                  <label class="flex items-center gap-2">
                    <input type="checkbox" class="accent-indigo-600" [checked]="days().includes(d)" (change)="toggleDay(d, $any($event.target).checked)" />
                    <span>{{ d }}</span>
                  </label>
                }
              </div>
            </div>

            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Start hour (0-23)</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono" formControlName="startHour" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">End hour (0-23)</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono" formControlName="endHour" />
            </label>

            <div class="sm:col-span-2 mt-2 grid grid-cols-12 gap-2 items-center">
              <div class="col-span-12 text-sm font-medium">On Match</div>
              <select class="col-span-4 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm" formControlName="onMatchType">
                <option value="transfer">Transfer</option>
                <option value="ivr">IVR</option>
                <option value="queue">Queue</option>
              </select>
              @if (form.controls.onMatchType.value === 'transfer') {
                <select
                  class="col-span-8 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm font-mono"
                  [value]="form.controls.onMatchTarget.value"
                  (change)="form.controls.onMatchTarget.setValue($any($event.target).value)"
                >
                  @for (e of (options()?.extensions ?? []); track e.id) {
                    <option [value]="e.id + ' XML default'">{{ e.label }}</option>
                  }
                </select>
              } @else if (form.controls.onMatchType.value === 'queue') {
                <select
                  class="col-span-8 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm font-mono"
                  [value]="form.controls.onMatchTarget.value"
                  (change)="form.controls.onMatchTarget.setValue($any($event.target).value)"
                >
                  @for (q of (options()?.queues ?? []); track q.name) {
                    <option [value]="q.name">{{ q.name }}</option>
                  }
                </select>
              } @else {
                <select
                  class="col-span-8 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm font-mono"
                  [value]="form.controls.onMatchTarget.value"
                  (change)="form.controls.onMatchTarget.setValue($any($event.target).value)"
                >
                  @for (m of (options()?.ivrs ?? []); track m.name) {
                    <option [value]="m.name">{{ m.name }}</option>
                  }
                </select>
              }

              <div class="col-span-12 text-sm font-medium mt-2">On Else</div>
              <select class="col-span-4 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm" formControlName="onElseType">
                <option value="transfer">Transfer</option>
                <option value="ivr">IVR</option>
                <option value="queue">Queue</option>
              </select>
              @if (form.controls.onElseType.value === 'transfer') {
                <select
                  class="col-span-8 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm font-mono"
                  [value]="form.controls.onElseTarget.value"
                  (change)="form.controls.onElseTarget.setValue($any($event.target).value)"
                >
                  @for (e of (options()?.extensions ?? []); track e.id) {
                    <option [value]="e.id + ' XML default'">{{ e.label }}</option>
                  }
                </select>
              } @else if (form.controls.onElseType.value === 'queue') {
                <select
                  class="col-span-8 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm font-mono"
                  [value]="form.controls.onElseTarget.value"
                  (change)="form.controls.onElseTarget.setValue($any($event.target).value)"
                >
                  @for (q of (options()?.queues ?? []); track q.name) {
                    <option [value]="q.name">{{ q.name }}</option>
                  }
                </select>
              } @else {
                <select
                  class="col-span-8 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-sm font-mono"
                  [value]="form.controls.onElseTarget.value"
                  (change)="form.controls.onElseTarget.setValue($any($event.target).value)"
                >
                  @for (m of (options()?.ivrs ?? []); track m.name) {
                    <option [value]="m.name">{{ m.name }}</option>
                  }
                </select>
              }
            </div>

            <div class="sm:col-span-2 flex justify-end gap-2 mt-3">
              <button type="button" class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="close()">Cancel</button>
              <button type="submit" [disabled]="form.invalid || saving()" class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                {{ saving() ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class TimeConditionsPage {
  items = signal<TimeCondition[]>([]);
  etag = signal<string | null>(null);
  error = signal<string | null>(null);
  saving = signal(false);
  modalOpen = signal(false);
  editingName = signal<string | null>(null);
  days = signal<number[]>([1, 2, 3, 4, 5]);
  search = signal('');
  page = signal(1);
  pageSize = signal(10);
  options = computed(() => this.opts.options());

  form = new FormGroup({
    name: new FormControl('tc_business_hours', { nonNullable: true, validators: [Validators.required] }),
    extensionNumber: new FormControl('6000', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\\d+$/)] }),
    startHour: new FormControl('9', { nonNullable: true, validators: [Validators.required] }),
    endHour: new FormControl('17', { nonNullable: true, validators: [Validators.required] }),
    onMatchType: new FormControl<'transfer' | 'ivr' | 'queue'>('ivr', { nonNullable: true }),
    onMatchTarget: new FormControl('main_ivr', { nonNullable: true, validators: [Validators.required] }),
    onElseType: new FormControl<'transfer' | 'ivr' | 'queue'>('transfer', { nonNullable: true }),
    onElseTarget: new FormControl('5000 XML default', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(
    private readonly http: HttpClient,
    private readonly opts: OptionsService,
    private readonly toast: ToastService,
  ) {
    this.opts.refresh();
    this.load();

    // When switching destination types, reset targets to valid defaults (prevents saving invalid configs).
    this.form.controls.onMatchType.valueChanges.subscribe((t) => {
      this.form.controls.onMatchTarget.setValue(this.defaultTargetForType(t));
    });
    this.form.controls.onElseType.valueChanges.subscribe((t) => {
      this.form.controls.onElseTarget.setValue(this.defaultTargetForType(t));
    });
  }

  private defaultTargetForType(type: 'transfer' | 'ivr' | 'queue') {
    const o = this.options();
    if (type === 'transfer') {
      const first = o?.extensions?.[0];
      return first ? `${first.id} XML default` : '1001 XML default';
    }
    if (type === 'queue') {
      const first = o?.queues?.[0];
      return first ? first.name : 'queue1@default';
    }
    const first = o?.ivrs?.[0];
    return first ? first.name : 'main_ivr';
  }

  filtered() {
    const s = this.search().trim().toLowerCase();
    if (!s) return this.items();
    return this.items().filter((t) => {
      return (
        t.name.toLowerCase().includes(s) ||
        t.extensionNumber.toLowerCase().includes(s) ||
        `${t.startHour}-${t.endHour}`.includes(s) ||
        (t.onMatch?.target ?? '').toLowerCase().includes(s) ||
        (t.onElse?.target ?? '').toLowerCase().includes(s)
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
    this.http.get<{ etag: string; items: TimeCondition[] }>(`${API_BASE_URL}/pbx/time-conditions`).subscribe({
      next: (res) => {
        this.etag.set(res.etag);
        this.items.set(res.items);
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to load time conditions'),
    });
  }

  toggleDay(d: number, checked: boolean) {
    const set = new Set(this.days());
    if (checked) set.add(d);
    else set.delete(d);
    this.days.set([...set].sort((a, b) => a - b));
  }

  openCreate() {
    this.editingName.set(null);
    this.days.set([1, 2, 3, 4, 5]);
    this.form.reset({
      name: 'tc_business_hours',
      extensionNumber: '6000',
      startHour: '9',
      endHour: '17',
      onMatchType: 'ivr',
      onMatchTarget: 'main_ivr',
      onElseType: 'transfer',
      onElseTarget: '5000 XML default',
    });
    this.modalOpen.set(true);
  }

  edit(t: TimeCondition) {
    this.editingName.set(t.name);
    this.days.set(t.days ?? [1, 2, 3, 4, 5]);
    this.form.reset({
      name: t.name,
      extensionNumber: t.extensionNumber,
      startHour: String(t.startHour),
      endHour: String(t.endHour),
      onMatchType: t.onMatch.type,
      onMatchTarget: t.onMatch.target,
      onElseType: t.onElse.type,
      onElseTarget: t.onElse.target,
    });
    this.modalOpen.set(true);
  }

  close() {
    this.modalOpen.set(false);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    this.http.post(`${API_BASE_URL}/pbx/time-conditions`, {
      name: v.name,
      extensionNumber: v.extensionNumber,
      days: this.days(),
      startHour: Number(v.startHour),
      endHour: Number(v.endHour),
      onMatch: { type: v.onMatchType, target: v.onMatchTarget } as Dest,
      onElse: { type: v.onElseType, target: v.onElseTarget } as Dest,
      etag: this.etag(),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success('Time condition saved');
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to save time condition');
        this.saving.set(false);
      }
    });
  }

  remove(t: TimeCondition) {
    if (!confirm(`Delete time condition ${t.name}?`)) return;
    this.http.delete(`${API_BASE_URL}/pbx/time-conditions/${encodeURIComponent(t.name)}?etag=${encodeURIComponent(this.etag() ?? '')}`).subscribe({
      next: () => {
        this.toast.success('Time condition deleted');
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to delete time condition'),
    });
  }
}


