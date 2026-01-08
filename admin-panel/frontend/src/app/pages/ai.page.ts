import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';

type AiService = { id: string; name: string; socketUrl: string; enabled?: boolean };

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">AI</div>
        <div class="text-sm text-slate-300">AudioSocket / mod_audio_stream settings</div>
      </div>
      <button class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="load()">
        Refresh
      </button>
    </div>

    @if (error()) {
      <div class="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200 mb-4">
        {{ error() }}
      </div>
    }

    <div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-medium">AI services (multiple audio_stream_url endpoints)</div>
        <button type="button" class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white" (click)="openNewService()">
          New service
        </button>
      </div>
      <div class="text-[11px] text-slate-400 mb-3">
        Each service is a separate WebSocket endpoint (same format as <span class="font-mono">audio_stream_url</span>). Extensions can pick one; if none is picked, the default service is used.
      </div>

      @if (services().length === 0) {
        <div class="text-sm text-slate-300">No services configured yet.</div>
      } @else {
        <div class="rounded-xl border border-slate-800 overflow-hidden">
          <div class="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-950/30 text-xs text-slate-400">
            <div class="col-span-1 text-center">On</div>
            <div class="col-span-3">Name</div>
            <div class="col-span-6">audio_stream_url</div>
            <div class="col-span-2 text-right">Actions</div>
          </div>
          @for (s of services(); track s.id) {
            <div class="grid grid-cols-12 gap-2 px-3 py-2 border-t border-slate-800 items-center">
              <div class="col-span-1 text-center">
                <input type="checkbox" class="accent-indigo-600"
                       [checked]="s.enabled !== false"
                       (change)="toggleService(s, $any($event.target).checked)" />
              </div>
              <div class="col-span-3 text-sm text-slate-200 truncate">
                <span class="font-medium">{{ s.name }}</span>
                @if (defaultServiceId() === s.id) {
                  <span class="ml-2 text-[10px] rounded bg-emerald-900/40 text-emerald-200 px-2 py-0.5">DEFAULT</span>
                }
              </div>
              <div class="col-span-6 font-mono text-xs text-slate-300 truncate">{{ s.socketUrl }}</div>
              <div class="col-span-2 flex justify-end gap-2">
                <button type="button"
                        class="rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900"
                        (click)="setDefault(s)">
                  Default
                </button>
                <button type="button"
                        class="rounded-lg border border-slate-800 px-2 py-1 text-xs hover:bg-slate-900"
                        (click)="openEditService(s)">
                  Edit
                </button>
                <button type="button"
                        class="rounded-lg border border-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-950/30"
                        (click)="deleteService(s)">
                  Delete
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <div class="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
      <div class="text-sm font-medium mb-2">AI-enabled extensions</div>
      @if (aiExts().length === 0) {
        <div class="text-sm text-slate-300">None enabled yet.</div>
      } @else {
        <div class="space-y-2">
          @for (e of aiExts(); track e.id) {
            <div class="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
              <div class="font-mono">{{ e.id }}</div>
              <div class="text-sm text-slate-300 truncate">{{ e.callerIdName }}</div>
            </div>
          }
        </div>
      }
      <div class="text-[11px] text-slate-400 mt-3">
        When you call an AI-enabled extension, it will connect to the AI audio stream and keep the channel open.
      </div>
    </div>

    @if (serviceModalOpen()) {
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
        <div class="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="font-semibold">{{ serviceForm.controls.id.value ? 'Edit AI service' : 'New AI service' }}</div>
            <button class="text-slate-400 hover:text-white" (click)="closeServiceModal()">✕</button>
          </div>

          <form [formGroup]="serviceForm" (ngSubmit)="saveService()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="block sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">Name</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                     formControlName="name" placeholder="AI Provider #1" />
            </label>
            <label class="block sm:col-span-2">
              <div class="text-xs text-slate-300 mb-1">audio_stream_url</div>
              <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                     formControlName="socketUrl" placeholder="ws://HOST:9094" />
            </label>
            <label class="block sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" class="accent-indigo-600"
                     [checked]="serviceForm.controls.enabled.value"
                     (change)="serviceForm.controls.enabled.setValue($any($event.target).checked)" />
              <span class="text-sm text-slate-200">Enabled</span>
            </label>

            <div class="sm:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900" (click)="closeServiceModal()">
                Cancel
              </button>
              <button type="submit" [disabled]="serviceForm.invalid || savingService()"
                      class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                {{ savingService() ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
})
export class AiPage {
  error = signal<string | null>(null);
  aiExts = signal<Array<{ id: string; callerIdName: string; aiServiceId?: string | null }>>([]);

  services = signal<AiService[]>([]);
  defaultServiceId = signal<string | null>(null);
  serviceModalOpen = signal(false);
  savingService = signal(false);

  serviceForm = new FormGroup({
    id: new FormControl('', { nonNullable: true }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    socketUrl: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    enabled: new FormControl(true, { nonNullable: true }),
  });

  constructor(private readonly http: HttpClient) {
    this.load();
  }

  load() {
    this.error.set(null);
    this.http.get<Array<{ id: string; callerIdName: string }>>(`${API_BASE_URL}/pbx/ai/extensions`).subscribe({
      next: (res) => this.aiExts.set(res ?? []),
      error: () => this.aiExts.set([]),
    });

    this.http.get<{ etag: string; services: AiService[]; defaultAiServiceId: string | null }>(`${API_BASE_URL}/pbx/ai/services`).subscribe({
      next: (res) => {
        this.services.set(res.services ?? []);
        this.defaultServiceId.set(res.defaultAiServiceId ?? null);
      },
      error: () => {
        this.services.set([]);
        this.defaultServiceId.set(null);
      },
    });
  }

  openNewService() {
    this.serviceForm.reset({ id: '', name: '', socketUrl: '', enabled: true });
    this.serviceModalOpen.set(true);
  }

  openEditService(s: AiService) {
    this.serviceForm.reset({
      id: s.id,
      name: s.name,
      socketUrl: s.socketUrl,
      enabled: s.enabled !== false,
    });
    this.serviceModalOpen.set(true);
  }

  closeServiceModal() {
    this.serviceModalOpen.set(false);
  }

  saveService() {
    if (this.serviceForm.invalid) return;
    this.savingService.set(true);
    const v = this.serviceForm.getRawValue();
    const body = {
      id: v.id || undefined,
      name: v.name,
      socketUrl: v.socketUrl,
      enabled: v.enabled,
    };
    this.http.post(`${API_BASE_URL}/pbx/ai/services`, body).subscribe({
      next: () => {
        this.savingService.set(false);
        this.serviceModalOpen.set(false);
        this.load();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to save AI service');
        this.savingService.set(false);
      },
    });
  }

  deleteService(s: AiService) {
    if (!confirm(`Delete AI service "${s.name}"?`)) return;
    this.http.delete(`${API_BASE_URL}/pbx/ai/services/${encodeURIComponent(s.id)}`).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to delete AI service'),
    });
  }

  setDefault(s: AiService) {
    this.http.post(`${API_BASE_URL}/pbx/ai/services/${encodeURIComponent(s.id)}/default`, {}).subscribe({
      next: () => this.load(),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to set default AI service'),
    });
  }

  toggleService(s: AiService, on: boolean) {
    this.http
      .post(`${API_BASE_URL}/pbx/ai/services`, { id: s.id, name: s.name, socketUrl: s.socketUrl, enabled: on })
      .subscribe({
        next: () => this.load(),
        error: (err) => this.error.set(err?.error?.message ?? 'Failed to update AI service'),
      });
  }
}


