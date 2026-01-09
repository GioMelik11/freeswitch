import { Component, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { API_BASE_URL } from '../core/api';
import { finalize } from 'rxjs/operators';
import { timeout } from 'rxjs/operators';
import { ToastOutletComponent } from '../shared/toast-outlet.component';
import { ToastService } from '../shared/toast.service';

@Component({
  standalone: true,
  imports: [RouterModule, ToastOutletComponent],
  template: `
    <div class="min-h-screen">
      <app-toast-outlet />
      <div class="border-b border-slate-800 bg-slate-950/40">
        <div class="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div class="font-semibold">FreeSWITCH Admin</div>
          <div class="flex items-center gap-3 text-sm text-slate-300">
            @if (user()) {
              <div class="hidden sm:block">
                {{ user()!.username }} <span class="text-slate-500">({{ user()!.role }})</span>
              </div>
            }
            <button
              class="rounded-lg bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:opacity-60"
              [disabled]="reloading()"
              (click)="reloadFs()"
              title="Runs reloadxml + sofia rescan"
            >
              {{ reloading() ? 'Reloading...' : 'Reload FreeSWITCH' }}
            </button>
            <button
              class="rounded-lg border border-slate-800 px-3 py-1 hover:bg-slate-900"
              (click)="logout()"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      @if (confirmReloadOpen()) {
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5">
            <div class="flex items-center justify-between mb-2">
              <div class="font-semibold">Reload FreeSWITCH</div>
              <button class="text-slate-400 hover:text-white" (click)="cancelReload()">✕</button>
            </div>
            <div class="text-sm text-slate-300">
              This will run <span class="font-mono">reloadxml</span> + <span class="font-mono">sofia rescan</span>.
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <button
                class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
                (click)="cancelReload()"
                [disabled]="reloading()"
              >
                Cancel
              </button>
              <button
                class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                (click)="confirmReload()"
                [disabled]="reloading()"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      }

      <div class="mx-auto max-w-6xl px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <nav class="md:col-span-3">
          <div class="rounded-2xl border border-slate-800 bg-slate-900/30 p-3">
            <a
              routerLink="/app/pbx/extensions"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >Extensions</a
            >
            <a
              routerLink="/app/pbx/queues"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >Queues</a
            >
            <a
              routerLink="/app/pbx/ivrs"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >IVR</a
            >
            <a
              routerLink="/app/pbx/time-conditions"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >Time Conditions</a
            >
            <a
              routerLink="/app/sounds"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >Sounds</a
            >
            <a
              routerLink="/app/ai"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >AI</a
            >
            <a
              routerLink="/app/nat"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >NAT</a
            >
            <a
              routerLink="/app/settings/sip"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >SIP Settings</a
            >
            <a
              routerLink="/app/settings/advanced"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >Advanced Settings</a
            >
            <a
              routerLink="/app/pbx/trunks"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >Trunks</a
            >
            <a
              routerLink="/app/console"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >Console</a
            >
            <a
              routerLink="/app/files"
              routerLinkActive="bg-slate-800/50 text-white"
              class="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800/30"
              >Config Files</a
            >
          </div>
        </nav>

        <main class="md:col-span-9">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  user = computed(() => this.auth.user());
  reloading = signal(false);
  confirmReloadOpen = signal(false);

  constructor(
    private readonly auth: AuthService,
    private readonly http: HttpClient,
    private readonly toast: ToastService,
  ) { }

  reloadFs() {
    this.confirmReloadOpen.set(true);
  }

  cancelReload() {
    this.confirmReloadOpen.set(false);
  }

  confirmReload() {
    this.confirmReloadOpen.set(false);
    this.reloading.set(true);
    this.http
      .post(`${API_BASE_URL}/pbx/freeswitch/reload`, {})
      .pipe(
        timeout(10000),
        finalize(() => this.reloading.set(false)),
      )
      .subscribe({
        next: (res: any) => {
          const ok = Boolean(res?.ok);
          if (!ok) {
            this.toast.error('Reload finished with errors. Check the response in Network/Logs.');
          } else {
            this.toast.success('FreeSWITCH reload done.');
          }
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? err?.message ?? 'Failed to reload FreeSWITCH');
        },
      });
  }

  logout() {
    this.auth.clear();
    location.href = '/login';
  }
}


