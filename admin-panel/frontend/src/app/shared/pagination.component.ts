import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
      <div class="text-xs text-slate-400">
        Showing
        <span class="font-mono text-slate-200">{{ start() }}</span>
        -
        <span class="font-mono text-slate-200">{{ end() }}</span>
        of
        <span class="font-mono text-slate-200">{{ total }}</span>
      </div>

      <div class="flex items-center gap-2 justify-end">
        <div class="text-xs text-slate-400">Per page</div>
        <select
          class="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-sm"
          [value]="pageSize"
          (change)="onPageSizeChange($any($event.target).value)"
        >
          @for (s of pageSizes; track s) {
            <option [value]="s">{{ s }}</option>
          }
        </select>

        <button
          type="button"
          class="rounded-lg border border-slate-800 px-2 py-1 text-sm hover:bg-slate-900 disabled:opacity-50"
          [disabled]="page <= 1"
          (click)="setPage(page - 1)"
        >
          Prev
        </button>
        <div class="text-sm text-slate-300">
          <span class="font-mono">{{ page }}</span>/<span class="font-mono">{{ totalPages() }}</span>
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-800 px-2 py-1 text-sm hover:bg-slate-900 disabled:opacity-50"
          [disabled]="page >= totalPages()"
          (click)="setPage(page + 1)"
        >
          Next
        </button>
      </div>
    </div>
  `,
})
export class PaginationComponent {
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() pageSizes: number[] = [5, 10, 20, 50, 100];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  totalPages() {
    return Math.max(1, Math.ceil((this.total || 0) / Math.max(1, this.pageSize || 10)));
  }

  start() {
    if (!this.total) return 0;
    return (Math.max(1, this.page) - 1) * Math.max(1, this.pageSize) + 1;
  }

  end() {
    if (!this.total) return 0;
    return Math.min(this.total, Math.max(1, this.page) * Math.max(1, this.pageSize));
  }

  setPage(p: number) {
    const next = Math.min(this.totalPages(), Math.max(1, Number(p) || 1));
    this.pageChange.emit(next);
  }

  onPageSizeChange(raw: string) {
    const n = Number(raw);
    const next = this.pageSizes.includes(n) ? n : 10;
    this.pageSizeChange.emit(next);
    this.pageChange.emit(1);
  }
}


