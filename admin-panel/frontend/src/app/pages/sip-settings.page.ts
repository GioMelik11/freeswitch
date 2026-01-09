import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_BASE_URL } from '../core/api';
import { ToastService } from '../shared/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="flex items-center justify-between mb-4">
      <div>
        <div class="text-lg font-semibold">SIP Settings</div>
        <div class="text-sm text-slate-300">Sofia SIP profile vars (writes to <span class="font-mono">vars.xml</span>)</div>
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

    <div class="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
      <div class="text-sm font-medium mb-2">Ports</div>
      <div class="text-[11px] text-slate-400 mb-4">
        These map to <span class="font-mono">sip_profiles/internal.xml</span> and <span class="font-mono">sip_profiles/external.xml</span>.
        After saving, click <span class="font-medium">Reload FreeSWITCH</span> in the top bar.
      </div>

      <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="block">
          <div class="text-xs text-slate-300 mb-1">internal_sip_port</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="internalSipPort" placeholder="5060" />
        </label>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">external_sip_port</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="externalSipPort" placeholder="5080" />
        </label>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">internal_tls_port</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="internalTlsPort" placeholder="5061" />
        </label>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">external_tls_port</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="externalTlsPort" placeholder="5081" />
        </label>

        <div class="sm:col-span-2 mt-2 text-sm font-medium">Security</div>

        <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
            <div class="text-xs text-slate-300 mb-2">Internal profile</div>
            <label class="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" class="accent-indigo-600"
                     [checked]="form.controls.internalSslEnable.value"
                     (change)="form.controls.internalSslEnable.setValue($any($event.target).checked)" />
              internal_ssl_enable (TLS)
            </label>
            <label class="mt-2 flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" class="accent-indigo-600"
                     [checked]="form.controls.internalAuthCalls.value"
                     (change)="form.controls.internalAuthCalls.setValue($any($event.target).checked)" />
              internal_auth_calls
            </label>
          </div>

          <div class="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
            <div class="text-xs text-slate-300 mb-2">External profile</div>
            <label class="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" class="accent-indigo-600"
                     [checked]="form.controls.externalSslEnable.value"
                     (change)="form.controls.externalSslEnable.setValue($any($event.target).checked)" />
              external_ssl_enable (TLS)
            </label>
            <label class="mt-2 flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" class="accent-indigo-600"
                     [checked]="form.controls.externalAuthCalls.value"
                     (change)="form.controls.externalAuthCalls.setValue($any($event.target).checked)" />
              external_auth_calls
            </label>
          </div>
        </div>

        <div class="sm:col-span-2 flex justify-end gap-2 mt-2">
          <button
            type="button"
            class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
            (click)="restore()"
            [disabled]="saving()"
          >
            Default
          </button>
          <button
            type="submit"
            class="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            [disabled]="form.invalid || saving()"
          >
            {{ saving() ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class SipSettingsPage {
  error = signal<string | null>(null);
  saving = signal(false);
  private loaded = signal<any | null>(null);

  form = new FormGroup({
    internalSipPort: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    externalSipPort: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    internalTlsPort: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    externalTlsPort: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    internalSslEnable: new FormControl(false, { nonNullable: true }),
    externalSslEnable: new FormControl(false, { nonNullable: true }),
    internalAuthCalls: new FormControl(false, { nonNullable: true }),
    externalAuthCalls: new FormControl(false, { nonNullable: true }),
    etag: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastService,
  ) {
    this.load();
  }

  load() {
    this.error.set(null);
    this.http.get<any>(`${API_BASE_URL}/pbx/settings/sip`).subscribe({
      next: (res) => {
        const snapshot = {
          internalSipPort: res.internalSipPort ?? '',
          externalSipPort: res.externalSipPort ?? '',
          internalTlsPort: res.internalTlsPort ?? '',
          externalTlsPort: res.externalTlsPort ?? '',
          internalSslEnable: Boolean(res.internalSslEnable),
          externalSslEnable: Boolean(res.externalSslEnable),
          internalAuthCalls: Boolean(res.internalAuthCalls),
          externalAuthCalls: Boolean(res.externalAuthCalls),
          etag: res.etag ?? '',
        };
        this.loaded.set(snapshot);
        this.form.reset(snapshot);
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to load SIP settings'),
    });
  }

  restore() {
    const cur = this.loaded();
    if (!cur) return this.load();
    this.form.reset({ ...cur });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    const body = {
      internalSipPort: this.form.controls.internalSipPort.value,
      externalSipPort: this.form.controls.externalSipPort.value,
      internalTlsPort: this.form.controls.internalTlsPort.value,
      externalTlsPort: this.form.controls.externalTlsPort.value,
      internalSslEnable: this.form.controls.internalSslEnable.value,
      externalSslEnable: this.form.controls.externalSslEnable.value,
      internalAuthCalls: this.form.controls.internalAuthCalls.value,
      externalAuthCalls: this.form.controls.externalAuthCalls.value,
      etag: this.form.controls.etag.value || undefined,
    };
    this.http.post<{ ok: true; etag: string }>(`${API_BASE_URL}/pbx/settings/sip`, body).subscribe({
      next: (res) => {
        const snapshot = {
          internalSipPort: this.form.controls.internalSipPort.value,
          externalSipPort: this.form.controls.externalSipPort.value,
          internalTlsPort: this.form.controls.internalTlsPort.value,
          externalTlsPort: this.form.controls.externalTlsPort.value,
          internalSslEnable: this.form.controls.internalSslEnable.value,
          externalSslEnable: this.form.controls.externalSslEnable.value,
          internalAuthCalls: this.form.controls.internalAuthCalls.value,
          externalAuthCalls: this.form.controls.externalAuthCalls.value,
          etag: res.etag ?? this.form.controls.etag.value,
        };
        this.loaded.set(snapshot);
        this.form.controls.etag.setValue(snapshot.etag);
        this.toast.success('SIP settings saved (vars.xml updated)');
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to save SIP settings');
        this.saving.set(false);
        this.load();
      },
    });
  }
}


