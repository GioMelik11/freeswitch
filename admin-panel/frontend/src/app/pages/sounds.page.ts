import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../core/api';
import { OptionsService, SoundItem } from '../core/options.service';
import { SearchSelectComponent, SearchSelectItem } from '../shared/search-select.component';
import { PaginationComponent } from '../shared/pagination.component';

@Component({
  standalone: true,
  imports: [CommonModule, SearchSelectComponent, PaginationComponent],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">Sounds</div>
        <div class="text-sm text-slate-300">Manage music files and MOH sources</div>
      </div>
      <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="refresh()">
        Refresh
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div class="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4 space-y-3">
        <div class="text-sm font-medium">Upload</div>
        <label class="block">
          <div class="text-xs text-slate-300 mb-1">Target folder (inside <span class="font-mono">/usr/share/freeswitch/sounds</span>)</div>
          <app-search-select
            [items]="folderItems()"
            [value]="targetDir()"
            (valueChange)="targetDir.set($event)"
            placeholder="music or music/myfolder"
            [allowCustom]="true"
            [mono]="true"
          />
        </label>
        <div class="flex gap-2">
          <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm" type="button" (click)="targetDir.set('music')">Music</button>
          <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm" type="button" (click)="mkdir()">Create folder</button>
        </div>
        <input type="file" accept=".wav,audio/wav" (change)="onFile($event)" class="block w-full text-sm text-slate-300" />
        <button class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                [disabled]="!file() || uploading()" (click)="upload()">
          {{ uploading() ? 'Uploading...' : 'Upload .wav' }}
        </button>
        @if (msg()) { <div class="text-xs text-slate-300">{{ msg() }}</div> }
      </div>

      <div class="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
        <div class="p-3 border-b border-slate-800 flex gap-2 items-center">
          <input class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                 placeholder="Search sounds..." [value]="search()" (input)="search.set($any($event.target).value); page.set(1)" />
          <select class="rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-2 text-sm"
                  [value]="view()" (change)="view.set($any($event.target).value); page.set(1)">
            <option value="all">All</option>
            <option value="moh">MOH</option>
          </select>
        </div>
        <div class="max-h-[70vh] overflow-auto">
          @if (view() === 'all') {
            @for (s of pagedAll(); track s.relPath) {
              <div class="px-4 py-3 border-b border-slate-900/60">
                <div class="font-mono text-sm">{{ s.relPath }}</div>
                <div class="text-xs text-slate-400 font-mono">{{ s.fsPath }}</div>
              </div>
            }
          } @else {
            @for (m of pagedMoh(); track m) {
              <div class="px-4 py-3 border-b border-slate-900/60">
                <div class="font-mono text-sm">{{ m }}</div>
                <div class="text-xs text-slate-400">Use this value in Queue MOH / other MOH fields</div>
              </div>
            }
          }
        </div>
        <div class="p-3 border-t border-slate-800">
          <app-pagination
            [total]="view()==='all' ? filteredAll().length : filteredMoh().length"
            [page]="page()"
            [pageSize]="pageSize()"
            (pageChange)="page.set($event)"
            (pageSizeChange)="pageSize.set($event)"
          />
        </div>
      </div>
    </div>
  `,
})
export class SoundsPage {
  search = signal('');
  view = signal<'all' | 'moh'>('all');
  page = signal(1);
  pageSize = signal(10);
  targetDir = signal<string>('music');
  file = signal<File | null>(null);
  uploading = signal(false);
  msg = signal<string | null>(null);

  sounds = computed(() => this.opts.options()?.sounds ?? { all: [], ivr: [], music: [] });
  mohClasses = computed(() => this.opts.options()?.mohClasses ?? ['local_stream://moh']);

  allFolders = computed(() => {
    const set = new Set<string>();
    for (const s of this.sounds().all) {
      const parts = (s.relPath || '').split('/');
      parts.pop();
      const dir = parts.join('/');
      if (dir) set.add(dir);
    }
    set.add('music');
    return [...set].sort((a, b) => a.localeCompare(b));
  });

  folderItems = computed((): SearchSelectItem[] => {
    return this.allFolders().map((d) => ({ value: d, label: d }));
  });

  filteredAll = computed(() => {
    const list: SoundItem[] = this.sounds().all;
    const q = this.search().trim().toLowerCase();
    if (!q) return list;
    return list.filter((x) => x.relPath.toLowerCase().includes(q) || x.fsPath.toLowerCase().includes(q));
  });

  filteredMoh = computed(() => {
    const list = this.mohClasses();
    const q = this.search().trim().toLowerCase();
    if (!q) return list;
    return list.filter((x) => x.toLowerCase().includes(q));
  });

  pagedAll() {
    const list = this.filteredAll();
    const size = Math.max(1, Number(this.pageSize()) || 10);
    const totalPages = Math.max(1, Math.ceil(list.length / size));
    const p = Math.min(totalPages, Math.max(1, Number(this.page()) || 1));
    if (p !== this.page()) this.page.set(p);
    const start = (p - 1) * size;
    return list.slice(start, start + size);
  }

  pagedMoh() {
    const list = this.filteredMoh();
    const size = Math.max(1, Number(this.pageSize()) || 10);
    const totalPages = Math.max(1, Math.ceil(list.length / size));
    const p = Math.min(totalPages, Math.max(1, Number(this.page()) || 1));
    if (p !== this.page()) this.page.set(p);
    const start = (p - 1) * size;
    return list.slice(start, start + size);
  }

  constructor(
    private readonly http: HttpClient,
    private readonly opts: OptionsService,
  ) {
    this.opts.refresh();
  }

  refresh() {
    this.opts.refresh();
  }

  onFile(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.file.set(f);
    this.msg.set(null);
  }

  upload() {
    const f = this.file();
    if (!f) return;
    const dir = (this.targetDir() || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!dir || !(dir === 'music' || dir.startsWith('music/'))) {
      this.msg.set('Folder must be inside "music/" (e.g. music or music/myfolder)');
      return;
    }
    const category = 'music';

    this.uploading.set(true);
    this.msg.set(null);
    const fd = new FormData();
    fd.append('file', f);
    const qs = `category=${encodeURIComponent(category)}&dir=${encodeURIComponent(dir || category)}`;
    this.http.post(`${API_BASE_URL}/pbx/sounds/upload?${qs}`, fd).subscribe({
      next: () => {
        this.msg.set('Uploaded');
        this.file.set(null);
        this.opts.refresh();
        this.uploading.set(false);
      },
      error: (err) => {
        this.msg.set(err?.error?.message ?? 'Upload failed');
        this.uploading.set(false);
      },
    });
  }

  mkdir() {
    const dir = (this.targetDir() || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!dir) return;
    if (!(dir === 'music' || dir.startsWith('music/'))) {
      this.msg.set('Folder must be inside "music/" (e.g. music or music/myfolder)');
      return;
    }
    this.msg.set(null);
    this.http.post(`${API_BASE_URL}/pbx/sounds/mkdir?dir=${encodeURIComponent(dir)}`, {}).subscribe({
      next: () => this.msg.set('Folder ready'),
      error: (err) => this.msg.set(err?.error?.message ?? 'Failed to create folder'),
    });
  }
}


