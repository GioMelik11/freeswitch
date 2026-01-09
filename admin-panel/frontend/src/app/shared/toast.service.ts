import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';
export type Toast = { id: string; type: ToastType; message: string };

@Injectable({ providedIn: 'root' })
export class ToastService {
    toasts = signal<Toast[]>([]);

    success(message: string) {
        this.push('success', message);
    }

    error(message: string) {
        this.push('error', message);
    }

    info(message: string) {
        this.push('info', message);
    }

    dismiss(id: string) {
        this.toasts.set(this.toasts().filter((t) => t.id !== id));
    }

    private push(type: ToastType, message: string) {
        const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const toast: Toast = { id, type, message };
        this.toasts.set([toast, ...this.toasts()].slice(0, 5));
        setTimeout(() => this.dismiss(id), 4500);
    }
}


