import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { OptionsService } from '../core/options.service';
import { SearchSelectComponent, SearchSelectItem } from '../shared/search-select.component';
import { PaginationComponent } from '../shared/pagination.component';

type IvrEntry = { digits: string; type: 'transfer' | 'queue' | 'ivr' | 'app'; target: string };
type IvrMenu = {
  name: string;
  greetLong?: string;
  greetShort?: string;
  invalidSound?: string;
  exitSound?: string;
  timeout?: string;
  interDigitTimeout?: string;
  maxFailures?: string;
  maxTimeouts?: string;
  digitLen?: string;
  entries: IvrEntry[];
};

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchSelectComponent, PaginationComponent],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">IVR</div>
        <div class="text-sm text-slate-300">Manages <span class="font-mono">autoload_configs/ivr.conf.xml</span></div>
      </div>
      <div class="flex gap-2">
        <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="load()">
          Refresh
        </button>
        <button class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" (click)="openCreate()">
          New IVR
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
        placeholder="Search IVRs..."
        [value]="search()"
        (input)="search.set($any($event.target).value); page.set(1)"
      />
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
      <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800 text-xs text-slate-400">
        <div class="col-span-5">Menu</div>
        <div class="col-span-5">Greet</div>
        <div class="col-span-2 text-right">Actions</div>
      </div>
      @for (m of paged(); track m.name) {
        <div class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-900/60 items-center">
          <div class="col-span-5 font-mono text-sm">{{ m.name }}</div>
          <div class="col-span-5 font-mono text-xs text-slate-300 truncate">{{ m.greetLong ?? '-' }}</div>
          <div class="col-span-2 flex justify-end gap-2">
            <button class="rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900" (click)="edit(m)">
              Edit
            </button>
            <button
              class="rounded-lg border border-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-950/30"
              (click)="remove(m)"
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
        <div class="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="font-semibold">{{ editingName() ? 'Edit IVR' : 'New IVR' }}</div>
            <button class="text-slate-400 hover:text-white" (click)="close()">✕</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Menu name</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="name" [readonly]="!!editingName()" />
            </label>
            <label class="block">
              <div class="text-xs text-slate-300 mb-1">Digit length</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono"
                     formControlName="digitLen" />
            </label>
            <label class="block sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">Greet sound (long)</div>
              <app-search-select
                [items]="soundItems()"
                [value]="form.controls.greetLong.value"
                (valueChange)="form.controls.greetLong.setValue($event)"
                placeholder="Select sound..."
                [allowCustom]="true"
                [mono]="true"
                [showValue]="true"
              />
            </label>
            <label class="block sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">Invalid sound</div>
              <app-search-select
                [items]="soundItems()"
                [value]="form.controls.invalidSound.value"
                (valueChange)="form.controls.invalidSound.setValue($event)"
                placeholder="Select sound..."
                [allowCustom]="true"
                [mono]="true"
                [showValue]="true"
              />
            </label>
            <label class="block sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">Exit sound</div>
              <app-search-select
                [items]="soundItems()"
                [value]="form.controls.exitSound.value"
                (valueChange)="form.controls.exitSound.setValue($event)"
                placeholder="Select sound..."
                [allowCustom]="true"
                [mono]="true"
                [showValue]="true"
              />
            </label>
            <div class="sm:col-span-2 text-[11px] text-slate-400 -mt-1">
              Tip: start typing to search in <span class="font-mono">/usr/share/freeswitch/sounds</span>.
            </div>

            <div class="sm:col-span-2 mt-2">
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm font-medium">DTMF Entries</div>
                <button type="button" class="rounded-lg border border-slate-800 px-3 py-1 text-xs hover:bg-slate-900" (click)="addEntry()">
                  Add entry
                </button>
              </div>

              <div class="space-y-2">
                @for (ctrl of entryControls(); track $index) {
                  <div class="grid grid-cols-12 gap-2 items-center">
                    <input class="col-span-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 font-mono text-xs"
                           [formControl]="ctrl.controls.digits" placeholder="1" />
                    <select class="col-span-3 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-xs"
                            [formControl]="ctrl.controls.type">
                      <option value="transfer">Transfer</option>
                      <option value="queue">Queue</option>
                      <option value="ivr">IVR (submenu)</option>
                      <option value="app">Raw app</option>
                    </select>
                    @if (ctrl.controls.type.value === 'transfer') {
                      <select
                        class="col-span-6 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-xs font-mono"
                        [value]="ctrl.controls.target.value"
                        (change)="ctrl.controls.target.setValue($any($event.target).value)"
                      >
                        @for (e of (options()?.extensions ?? []); track e.id) {
                          <option [value]="e.id + ' XML default'">{{ e.label }}</option>
                        }
                      </select>
                    } @else if (ctrl.controls.type.value === 'queue') {
                      <select
                        class="col-span-6 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-xs font-mono"
                        [value]="ctrl.controls.target.value"
                        (change)="ctrl.controls.target.setValue($any($event.target).value)"
                      >
                        @for (q of (options()?.queues ?? []); track q.name) {
                          <option [value]="q.name">{{ q.name }}</option>
                        }
                      </select>
                    } @else if (ctrl.controls.type.value === 'ivr') {
                      <select
                        class="col-span-6 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-xs font-mono"
                        [value]="ctrl.controls.target.value"
                        (change)="ctrl.controls.target.setValue($any($event.target).value)"
                      >
                        @for (m of (options()?.ivrs ?? []); track m.name) {
                          <option [value]="m.name">{{ m.name }}</option>
                        }
                      </select>
                    } @else {
                      <input
                        class="col-span-6 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 font-mono text-xs"
                        [formControl]="ctrl.controls.target"
                        placeholder="menu-exec-app transfer 2000 XML default"
                      />
                    }
                    <button type="button" class="col-span-1 text-slate-300 hover:text-white" (click)="removeEntry($index)">✕</button>
                  </div>
                }
              </div>
              <div class="text-xs text-slate-400 mt-2">
                - **Transfer** target example: <span class="font-mono">2000 XML default</span><br />
                - **Queue** target example: <span class="font-mono">queue1&#64;default</span><br />
                - **IVR** target example: <span class="font-mono">demo_ivr_submenu</span>
              </div>
            </div>

            <div class="sm:col-span-2 flex justify-end gap-2 mt-3">
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
export class IvrsPage {
  menus = signal<IvrMenu[]>([]);
  etag = signal<string | null>(null);
  error = signal<string | null>(null);
  saving = signal(false);
  modalOpen = signal(false);
  editingName = signal<string | null>(null);
  search = signal('');
  page = signal(1);
  pageSize = signal(10);
  options = computed(() => this.opts.options());

  soundItems = computed((): SearchSelectItem[] => {
    const o = this.options();
    const all = o?.sounds?.all ?? [];
    return all.map((s: any) => ({
      value: s.playPath,
      label: s.relPath,
      group: (s.relPath || '').startsWith('music/') ? 'Music' : 'Sounds',
      keywords: s.fsPath,
    }));
  });

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)] }),
    greetLong: new FormControl('ivr/incoming.wav', { nonNullable: true }),
    invalidSound: new FormControl('ivr/ivr-that_was_an_invalid_entry.wav', { nonNullable: true }),
    exitSound: new FormControl('ivr/ivr-thank_you_for_calling.wav', { nonNullable: true }),
    digitLen: new FormControl('1', { nonNullable: true }),
    entries: new FormArray<FormGroup<any>>([]),
  });

  constructor(
    private readonly http: HttpClient,
    private readonly opts: OptionsService,
  ) {
    this.opts.refresh();
    this.load();
  }

  filtered() {
    const s = this.search().trim().toLowerCase();
    if (!s) return this.menus();
    return this.menus().filter((m) => {
      return (
        m.name.toLowerCase().includes(s) ||
        (m.greetLong ?? '').toLowerCase().includes(s) ||
        (m.entries ?? []).some((e) => (e.digits + ' ' + e.type + ' ' + e.target).toLowerCase().includes(s))
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

  entryControls() {
    return (this.form.controls.entries as any).controls as Array<FormGroup<{
      digits: FormControl<string>;
      type: FormControl<'transfer' | 'queue' | 'ivr' | 'app'>;
      target: FormControl<string>;
    }>>;
  }

  load() {
    this.error.set(null);
    this.http.get<{ etag: string; menus: IvrMenu[] }>(`${API_BASE_URL}/pbx/ivrs`).subscribe({
      next: (res) => {
        this.etag.set(res.etag);
        this.menus.set(res.menus);
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to load IVRs'),
    });
  }

  openCreate() {
    this.editingName.set(null);
    this.form.controls.name.setValue('');
    this.form.controls.greetLong.setValue('ivr/incoming.wav');
    this.form.controls.invalidSound.setValue('ivr/ivr-that_was_an_invalid_entry.wav');
    this.form.controls.exitSound.setValue('ivr/ivr-thank_you_for_calling.wav');
    this.form.controls.digitLen.setValue('1');
    this.clearEntries();
    this.addEntry();
    this.modalOpen.set(true);
  }

  edit(m: IvrMenu) {
    this.editingName.set(m.name);
    this.form.controls.name.setValue(m.name);
    this.form.controls.greetLong.setValue(m.greetLong ?? '');
    this.form.controls.invalidSound.setValue(m.invalidSound ?? '');
    this.form.controls.exitSound.setValue(m.exitSound ?? '');
    this.form.controls.digitLen.setValue(m.digitLen ?? '1');
    this.clearEntries();
    for (const e of m.entries ?? []) {
      this.pushEntry(e.digits, e.type, e.target);
    }
    if ((m.entries ?? []).length === 0) this.addEntry();
    this.modalOpen.set(true);
  }

  close() {
    this.modalOpen.set(false);
  }

  addEntry() {
    this.pushEntry('', 'transfer', '');
  }

  private pushEntry(digits: string, type: any, target: string) {
    (this.form.controls.entries as any).push(
      new FormGroup({
        digits: new FormControl(digits, { nonNullable: true, validators: [Validators.required] }),
        type: new FormControl(type, { nonNullable: true }),
        target: new FormControl(target, { nonNullable: true, validators: [Validators.required] }),
      }),
    );
  }

  removeEntry(i: number) {
    (this.form.controls.entries as any).removeAt(i);
  }

  private clearEntries() {
    while ((this.form.controls.entries as any).length) {
      (this.form.controls.entries as any).removeAt(0);
    }
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    const v: any = this.form.getRawValue();
    this.http
      .post(`${API_BASE_URL}/pbx/ivrs`, {
        name: v.name,
        greetLong: v.greetLong || undefined,
        invalidSound: v.invalidSound || undefined,
        exitSound: v.exitSound || undefined,
        digitLen: v.digitLen || undefined,
        entries: v.entries,
        etag: this.etag(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.modalOpen.set(false);
          this.load();
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to save IVR');
          this.saving.set(false);
        },
      });
  }

  remove(m: IvrMenu) {
    if (!confirm(`Delete IVR menu ${m.name}?`)) return;
    this.http.delete(`${API_BASE_URL}/pbx/ivrs/${encodeURIComponent(m.name)}?etag=${encodeURIComponent(this.etag() ?? '')}`).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to delete IVR'),
    });
  }
}


