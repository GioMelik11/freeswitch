import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../core/api';
import { PaginationComponent } from '../shared/pagination.component';

type TreeNode =
  | { type: 'file'; name: string; path: string }
  | { type: 'dir'; name: string; path: string; children: TreeNode[] };

@Component({
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">Config Files</div>
        <div class="text-sm text-slate-300">Browse and edit FreeSWITCH config files (with backups)</div>
      </div>
      <div class="flex gap-2">
        <button
          class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
          (click)="createNew()"
        >
          New file
        </button>
        <button
          class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
          (click)="loadTree()"
        >
          Refresh tree
        </button>
      </div>
    </div>

    @if (error()) {
      <div class="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200 mb-4">
        {{ error() }}
      </div>
    }

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div class="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-800 text-sm font-medium">Files</div>
        <div class="p-2 border-b border-slate-800">
          <input
            class="w-full rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search files..."
            [value]="search()"
            (input)="search.set($any($event.target).value); page.set(1)"
          />
        </div>
        <div class="p-2 max-h-[70vh] overflow-auto text-sm">
          @if (search().trim()) {
            @for (f of pagedFiles(); track f.path) {
              <button
                class="block w-full text-left rounded-lg px-2 py-1 hover:bg-slate-800/40"
                [class.bg-slate-800/50]="selectedPath() === f.path"
                (click)="open(f.path)"
              >
                <div class="font-mono text-sm truncate">{{ f.name }}</div>
                <div class="font-mono text-[11px] text-slate-400 truncate">{{ f.path }}</div>
              </button>
            }
            <app-pagination
              [total]="filteredFiles().length"
              [page]="page()"
              [pageSize]="pageSize()"
              (pageChange)="page.set($event)"
              (pageSizeChange)="pageSize.set($event)"
            />
          } @else {
            @for (n of filteredTree(); track n.path) {
              <div class="mb-2">
                <ng-container [ngTemplateOutlet]="nodeTpl" [ngTemplateOutletContext]="{ $implicit: n, depth: 0 }" />
              </div>
            }
          }
        </div>
      </div>

      <div class="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <div class="text-sm">
            <div class="font-medium">Editor</div>
            <div class="text-xs text-slate-400 font-mono">{{ selectedPath() ?? 'Select a file' }}</div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900 disabled:opacity-50"
              [disabled]="!selectedPath() || loadingFile()"
              (click)="reloadFile()"
            >
              Reload
            </button>
            <button
              class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              [disabled]="!dirty() || saving()"
              (click)="save()"
            >
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>

        <div class="p-3">
          <textarea
            class="w-full h-[65vh] rounded-xl border border-slate-800 bg-slate-950/40 p-3 font-mono text-xs leading-5 outline-none focus:ring-2 focus:ring-indigo-500"
            [value]="content()"
            (input)="onInput($any($event.target).value)"
            [disabled]="!selectedPath() || loadingFile()"
            spellcheck="false"
          ></textarea>
          <div class="mt-2 flex items-center justify-between text-xs text-slate-400">
            <div>
              @if (dirty()) { <span class="text-amber-300">Unsaved changes</span> } @else { <span>Saved</span> }
            </div>
            <div class="font-mono">etag: {{ etag() ?? '-' }}</div>
          </div>
        </div>
      </div>
    </div>

    <ng-template #nodeTpl let-node let-depth="depth">
      <div class="select-none">
        @if (node.type === 'dir') {
          <div class="text-slate-200 font-medium" [style.paddingLeft.px]="depth * 12">
            {{ node.name }}
          </div>
          @for (c of node.children; track c.path) {
            <ng-container [ngTemplateOutlet]="nodeTpl" [ngTemplateOutletContext]="{ $implicit: c, depth: depth + 1 }" />
          }
        } @else {
          <button
            class="block w-full text-left rounded-lg px-2 py-1 hover:bg-slate-800/40"
            [class.bg-slate-800/50]="selectedPath() === node.path"
            [style.marginLeft.px]="depth * 12"
            (click)="open(node.path)"
          >
            <span class="font-mono">{{ node.name }}</span>
          </button>
        }
      </div>
    </ng-template>
  `,
})
export class FilesPage {
  tree = signal<TreeNode[]>([]);
  selectedPath = signal<string | null>(null);
  content = signal<string>('');
  etag = signal<string | null>(null);
  dirty = signal(false);
  loadingFile = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  search = signal('');
  page = signal(1);
  pageSize = signal(10);

  constructor(private readonly http: HttpClient) {
    this.loadTree();
  }

  createNew() {
    if (this.dirty() && !confirm('You have unsaved changes. Discard them?')) return;
    const p = prompt(
      'New file path (relative to freeswitch config root)\nExample: dialplan/default/50_new.xml',
      'dialplan/default/50_new.xml',
    );
    if (!p) return;
    const path = p.trim().replace(/\\/g, '/');
    if (!/^[a-zA-Z0-9_./-]+$/.test(path) || !path.includes('.') || path.startsWith('/') || path.includes('..')) {
      alert('Invalid path');
      return;
    }

    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const template =
      ext === 'xml'
        ? `<?xml version="1.0" encoding="utf-8"?>\n<include>\n</include>\n`
        : '';

    this.error.set(null);
    this.saving.set(true);
    this.http
      .post<{ ok: true; etag: string }>(`${API_BASE_URL}/files/write`, {
        path,
        content: template,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.loadTree();
          this.selectedPath.set(path);
          this.reloadFile();
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to create file');
          this.saving.set(false);
        },
      });
  }

  filteredTree() {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.tree();
    const filterNode = (n: TreeNode): TreeNode | null => {
      if (n.type === 'file') {
        return n.path.toLowerCase().includes(q) || n.name.toLowerCase().includes(q) ? n : null;
      }
      const kids = n.children.map(filterNode).filter(Boolean) as TreeNode[];
      if (kids.length) return { ...n, children: kids };
      return n.path.toLowerCase().includes(q) || n.name.toLowerCase().includes(q) ? { ...n, children: [] } : null;
    };
    return this.tree().map(filterNode).filter(Boolean) as TreeNode[];
  }

  private flattenFiles(nodes: TreeNode[]): Array<{ name: string; path: string }> {
    const out: Array<{ name: string; path: string }> = [];
    const walk = (arr: TreeNode[]) => {
      for (const n of arr) {
        if (n.type === 'file') out.push({ name: n.name, path: n.path });
        else walk(n.children ?? []);
      }
    };
    walk(nodes);
    return out;
  }

  filteredFiles() {
    const q = this.search().trim().toLowerCase();
    if (!q) return [];
    const all = this.flattenFiles(this.tree());
    return all.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
  }

  pagedFiles() {
    const list = this.filteredFiles();
    const size = Math.max(1, Number(this.pageSize()) || 10);
    const totalPages = Math.max(1, Math.ceil(list.length / size));
    const p = Math.min(totalPages, Math.max(1, Number(this.page()) || 1));
    if (p !== this.page()) this.page.set(p);
    const start = (p - 1) * size;
    return list.slice(start, start + size);
  }

  loadTree() {
    this.error.set(null);
    this.http.get<TreeNode[]>(`${API_BASE_URL}/files/tree`).subscribe({
      next: (res) => this.tree.set(res),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to load tree'),
    });
  }

  open(path: string) {
    if (this.dirty() && !confirm('You have unsaved changes. Discard them?')) return;
    this.selectedPath.set(path);
    this.reloadFile();
  }

  reloadFile() {
    const p = this.selectedPath();
    if (!p) return;
    this.loadingFile.set(true);
    this.error.set(null);
    const params = new HttpParams().set('path', p);
    this.http.get<{ path: string; content: string; etag: string }>(`${API_BASE_URL}/files/read`, { params }).subscribe({
      next: (res) => {
        this.content.set(res.content);
        this.etag.set(res.etag);
        this.dirty.set(false);
        this.loadingFile.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to read file');
        this.loadingFile.set(false);
      },
    });
  }

  onInput(v: string) {
    this.content.set(v);
    this.dirty.set(true);
  }

  save() {
    const p = this.selectedPath();
    if (!p) return;
    this.saving.set(true);
    this.error.set(null);
    this.http
      .post<{ ok: true; etag: string }>(`${API_BASE_URL}/files/write`, {
        path: p,
        content: this.content(),
        etag: this.etag(),
      })
      .subscribe({
        next: (res) => {
          this.etag.set(res.etag);
          this.dirty.set(false);
          this.saving.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Failed to save file');
          this.saving.set(false);
          this.reloadFile();
        },
      });
  }
}


