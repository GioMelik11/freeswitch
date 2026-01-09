import { Component, computed, signal } from '@angular/core';
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
        <div class="text-lg font-semibold">NAT</div>
        <div class="text-sm text-slate-300">External SIP/RTP IP (writes to <span class="font-mono">vars.xml</span>)</div>
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
      <div class="text-lg font-semibold mb-3">NAT Settings</div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="rounded-xl border border-slate-800 bg-slate-950/20 p-4 mb-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div>
              <div class="text-sm font-medium">External Address</div>
              <div class="text-[11px] text-slate-400">
                This sets both <span class="font-mono">external_sip_ip</span> and <span class="font-mono">external_rtp_ip</span>.
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900 disabled:opacity-50"
              (click)="detect()"
              [disabled]="detecting() || saving()"
            >
              {{ detecting() ? 'Detecting...' : 'Detect Network Settings' }}
            </button>
          </div>

          <input
            class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
            formControlName="externalAddress"
            placeholder="188.93.89.135"
          />
          <div class="mt-2 text-[11px] text-slate-400">
            You can also use <span class="font-mono">auto</span> / <span class="font-mono">auto-nat</span> or reset to
            <span class="font-mono">{{ localIpVar }}</span>.
          </div>
        </div>

        <div class="rounded-xl border border-slate-800 bg-slate-950/20 p-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div>
              <div class="text-sm font-medium">Local Networks</div>
              <div class="text-[11px] text-slate-400">
                If empty, <span class="font-medium">everything is allowed</span>. If you add networks, only listed CIDRs are allowed.
              </div>
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
              (click)="addLocalNetwork()"
              [disabled]="saving()"
            >
              Add Local Network Field
            </button>
          </div>

          @if (localRows().length === 0) {
            <div class="text-sm text-slate-300">No local networks set. All IPs are allowed.</div>
          } @else {
            <div class="space-y-2">
              @for (r of localRows(); track r.id) {
                <div class="grid grid-cols-12 gap-2 items-center">
                  <input
                    class="col-span-8 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                    placeholder="172.17.100.0"
                    [value]="r.ip"
                    (input)="setRowIp(r.id, $any($event.target).value)"
                  />
                  <div class="col-span-1 text-center text-slate-400">/</div>
                  <input
                    class="col-span-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                    placeholder="24"
                    [value]="r.mask"
                    (input)="setRowMask(r.id, $any($event.target).value)"
                  />
                  <button
                    type="button"
                    class="col-span-1 rounded-lg border border-red-900/60 px-2 py-2 text-xs text-red-200 hover:bg-red-950/30"
                    title="Remove"
                    (click)="removeLocalNetwork(r.id)"
                  >
                    ✕
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button
            type="button"
            class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
            (click)="restore()"
            [disabled]="saving()"
          >
            Restore
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
            (click)="setDefaults()"
            [disabled]="saving()"
            [title]="'Sets external_*_ip back to ' + localIpVar"
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
export class NatPage {
  localIpVar = '$${local_ip_v4}';
  error = signal<string | null>(null);
  saving = signal(false);
  detecting = signal(false);
  private loaded = signal<{ externalRtpIp: string; externalSipIp: string; etag: string } | null>(null);
  private loadedAclEtag = signal<string>('');
  private loadedLocalNetworks = signal<string[]>([]);

  private idSeq = 1;
  localRows = signal<Array<{ id: number; ip: string; mask: string }>>([]);

  externalEqual = computed(() => {
    const a = (this.form.controls.externalRtpIp.value ?? '').trim();
    const b = (this.form.controls.externalSipIp.value ?? '').trim();
    return a && a === b;
  });

  form = new FormGroup({
    externalAddress: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    externalRtpIp: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    externalSipIp: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    etag: new FormControl('', { nonNullable: true }),
    aclEtag: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastService,
  ) {
    this.load();
  }

  load() {
    this.error.set(null);
    this.http.get<any>(`${API_BASE_URL}/pbx/nat`).subscribe({
      next: (res) => {
        const snapshot = {
          externalRtpIp: res.externalRtpIp ?? '',
          externalSipIp: res.externalSipIp ?? '',
          etag: res.etag ?? '',
        };
        this.loaded.set(snapshot);
        this.loadedAclEtag.set(res.aclEtag ?? '');
        this.loadedLocalNetworks.set((res.localNetworks ?? []) as string[]);
        this.localRows.set(cidrsToRows(res.localNetworks ?? []));
        const ext = snapshot.externalSipIp || snapshot.externalRtpIp || '';
        this.form.reset({
          ...snapshot,
          externalAddress: ext,
          aclEtag: res.aclEtag ?? '',
        });
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load NAT settings');
      },
    });
  }

  setDefaults() {
    // "As before": default to local IP vars.
    const v = '$${local_ip_v4}';
    this.form.controls.externalRtpIp.setValue(v);
    this.form.controls.externalSipIp.setValue(v);
    this.form.controls.externalAddress.setValue(v);
    this.form.controls.externalRtpIp.markAsDirty();
    this.form.controls.externalSipIp.markAsDirty();
    this.form.controls.externalAddress.markAsDirty();
    this.form.updateValueAndValidity();
  }

  restore() {
    const cur = this.loaded();
    if (!cur) return this.load();
    this.form.reset({
      ...cur,
      externalAddress: cur.externalSipIp || cur.externalRtpIp || '',
      aclEtag: this.loadedAclEtag(),
    });
    this.localRows.set(cidrsToRows(this.loadedLocalNetworks()));
  }

  addLocalNetwork() {
    this.localRows.set([...this.localRows(), { id: this.idSeq++, ip: '', mask: '32' }]);
  }
  removeLocalNetwork(id: number) {
    this.localRows.set(this.localRows().filter((x) => x.id !== id));
  }
  setRowIp(id: number, ip: string) {
    this.localRows.set(this.localRows().map((r) => (r.id === id ? { ...r, ip } : r)));
  }
  setRowMask(id: number, mask: string) {
    this.localRows.set(this.localRows().map((r) => (r.id === id ? { ...r, mask } : r)));
  }

  private syncExternalToBoth() {
    const v = String(this.form.controls.externalAddress.value ?? '').trim();
    this.form.controls.externalRtpIp.setValue(v);
    this.form.controls.externalSipIp.setValue(v);
    this.form.controls.externalRtpIp.updateValueAndValidity();
    this.form.controls.externalSipIp.updateValueAndValidity();
  }

  detect() {
    this.detecting.set(true);
    this.error.set(null);
    this.http.get<{ externalAddress: string; localNetworks: string[] }>(`${API_BASE_URL}/pbx/nat/detect`).subscribe({
      next: (res) => {
        if (res.externalAddress) {
          this.form.controls.externalAddress.setValue(res.externalAddress);
          this.syncExternalToBoth();
        }
        if (Array.isArray(res.localNetworks)) {
          this.localRows.set(cidrsToRows(res.localNetworks));
        }
        this.detecting.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to detect network settings');
        this.detecting.set(false);
      },
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    this.syncExternalToBoth();
    const localNetworks = rowsToCidrs(this.localRows());
    const body = {
      externalRtpIp: this.form.controls.externalRtpIp.value,
      externalSipIp: this.form.controls.externalSipIp.value,
      etag: this.form.controls.etag.value || undefined,
      aclEtag: this.form.controls.aclEtag.value || undefined,
      localNetworks,
    };
    this.http.post<{ ok: true; etag: string }>(`${API_BASE_URL}/pbx/nat`, body).subscribe({
      next: (res) => {
        const snapshot = {
          externalRtpIp: this.form.controls.externalRtpIp.value,
          externalSipIp: this.form.controls.externalSipIp.value,
          etag: res.etag ?? this.form.controls.etag.value,
        };
        this.loaded.set(snapshot);
        this.form.controls.etag.setValue(snapshot.etag);
        this.loadedLocalNetworks.set(localNetworks);
        // Refresh aclEtag from server next time; keep current
        this.toast.success('NAT settings saved (vars.xml updated)');
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to save NAT settings');
        this.saving.set(false);
        this.load();
      },
    });
  }
}

function cidrsToRows(cidrs: string[]) {
  const out: Array<{ id: number; ip: string; mask: string }> = [];
  let id = 1;
  for (const c of cidrs ?? []) {
    const s = String(c ?? '').trim();
    if (!s) continue;
    const [ip, mask] = s.split('/');
    out.push({ id: id++, ip: (ip ?? '').trim(), mask: String(mask ?? '32').trim() });
  }
  return out;
}

function rowsToCidrs(rows: Array<{ ip: string; mask: string }>) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows ?? []) {
    const ip = String(r.ip ?? '').trim();
    if (!ip) continue;
    const mask = String(r.mask ?? '').trim();
    const cidr = mask ? `${ip}/${mask}` : ip;
    if (seen.has(cidr)) continue;
    seen.add(cidr);
    out.push(cidr);
  }
  return out;
}


