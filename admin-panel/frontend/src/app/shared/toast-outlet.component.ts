import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-toast-outlet',
  template: `
    <div class="fixed right-4 top-4 z-[1000] w-[min(420px,calc(100vw-2rem))] space-y-2">
      @for (t of toasts(); track t.id) {
        <div
          class="rounded-xl border px-3 py-2 shadow-lg backdrop-blur bg-slate-950/80"
          [class.border-emerald-800]="t.type === 'success'"
          [class.border-red-900]="t.type === 'error'"
          [class.border-slate-800]="t.type === 'info'"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="text-sm"
                 [class.text-emerald-200]="t.type === 'success'"
                 [class.text-red-200]="t.type === 'error'"
                 [class.text-slate-200]="t.type === 'info'">
              {{ t.message }}
            </div>
            <button class="text-slate-400 hover:text-white" (click)="dismiss(t.id)">✕</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastOutletComponent {
  private readonly toastSvc = inject(ToastService);
  toasts = computed(() => this.toastSvc.toasts());
  dismiss(id: string) {
    this.toastSvc.dismiss(id);
  }
}


