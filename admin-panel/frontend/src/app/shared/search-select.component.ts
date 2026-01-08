import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  signal,
} from '@angular/core';

export type SearchSelectItem = {
  value: string;
  label: string;
  group?: string;
  keywords?: string; // additional search text
};

@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <button
        type="button"
        class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-sm disabled:opacity-50"
        [class.font-mono]="mono"
        [disabled]="disabled"
        (click)="toggle()"
      >
        <span class="block truncate">
          {{ selectedLabel() || placeholder }}
        </span>
      </button>

      @if (open()) {
        <div class="absolute z-50 mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 shadow-xl">
          <div class="p-2 border-b border-slate-800">
            <input
              class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              [placeholder]="searchPlaceholder"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
              (keydown.escape)="close()"
            />
          </div>

          <div class="max-h-72 overflow-auto p-1">
            @if (allowCustom && customCandidate()) {
              <button
                type="button"
                class="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-slate-900"
                (click)="select(customCandidate()!)"
              >
                Use: <span class="font-mono">{{ customCandidate() }}</span>
              </button>
              <div class="my-1 border-t border-slate-900/60"></div>
            }

            @if (filteredGroups().length === 0) {
              <div class="px-3 py-2 text-sm text-slate-400">{{ emptyText }}</div>
            } @else {
              @for (g of filteredGroups(); track g.name) {
                @if (g.name) {
                  <div class="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-slate-400">
                    {{ g.name }}
                  </div>
                }
                @for (it of g.items; track it.value) {
                  <button
                    type="button"
                    class="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-slate-900"
                    [class.bg-slate-900/60]="it.value === value"
                    [class.font-mono]="mono"
                    (click)="select(it.value)"
                  >
                    <div class="truncate">{{ it.label }}</div>
                    @if (showValue && it.label !== it.value) {
                      <div class="truncate text-[11px] text-slate-400 font-mono">{{ it.value }}</div>
                    }
                  </button>
                }
              }
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class SearchSelectComponent {
  @Input() items: SearchSelectItem[] = [];
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();

  @Input() placeholder = 'Select...';
  @Input() searchPlaceholder = 'Type to search...';
  @Input() emptyText = 'No matches';
  @Input() allowCustom = false;
  @Input() disabled = false;
  @Input() mono = false;
  @Input() showValue = false;

  open = signal(false);
  query = signal('');

  selectedLabel = computed(() => {
    const v = this.value;
    const found = this.items.find((x) => x.value === v);
    return found?.label ?? (v || '');
  });

  private normalizedQuery = computed(() => this.query().trim().toLowerCase());

  filtered = computed(() => {
    const q = this.normalizedQuery();
    if (!q) return this.items;
    return this.items.filter((it) => {
      const hay = `${it.label} ${it.value} ${it.keywords ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  });

  filteredGroups = computed(() => {
    const groups = new Map<string, SearchSelectItem[]>();
    for (const it of this.filtered()) {
      const g = it.group ?? '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(it);
    }
    return [...groups.entries()].map(([name, items]) => ({ name, items }));
  });

  customCandidate = computed(() => {
    if (!this.allowCustom) return '';
    const q = this.normalizedQuery();
    if (!q) return '';
    const raw = this.query().trim();
    if (!raw) return '';
    const exists = this.items.some((x) => x.value === raw);
    return exists ? '' : raw;
  });

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle() {
    if (this.disabled) return;
    this.open.set(!this.open());
    if (this.open()) this.query.set('');
  }

  close() {
    this.open.set(false);
    this.query.set('');
  }

  select(v: string) {
    this.valueChange.emit(v);
    this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.open()) return;
    const target = ev.target as Node | null;
    if (!target) return;
    if (!this.host.nativeElement.contains(target)) this.close();
  }
}


