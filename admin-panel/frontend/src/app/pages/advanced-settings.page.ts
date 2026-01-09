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
        <div class="text-lg font-semibold">Advanced Settings</div>
        <div class="text-sm text-slate-300">Global FreeSWITCH settings (writes to <span class="font-mono">vars.xml</span>)</div>
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
      <div class="text-sm font-medium mb-2">Core</div>
      <form [formGroup]="form" (ngSubmit)="save()" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="block">
          <div class="text-xs text-slate-300 mb-1">default_password</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="defaultPassword" placeholder="1234" />
        </label>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">hold_music</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="holdMusic" placeholder="local_stream://moh" />
        </label>

        <div class="block sm:col-span-2">
          <div class="text-xs text-slate-300 mb-1">global_codec_prefs</div>
          <div class="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
            <div class="flex flex-wrap gap-2 mb-2">
              @for (c of globalSelected(); track c) {
                <button
                  type="button"
                  class="rounded-full border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-200 hover:bg-slate-800/40"
                  title="Remove"
                  (click)="toggleCodec('global', c)"
                >
                  {{ c }} ✕
                </button>
              }
              @if (globalSelected().length === 0) {
                <div class="text-xs text-slate-400">Pick codecs below (order will be saved).</div>
              }
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              @for (c of codecOptions(); track c) {
                <label class="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    class="accent-indigo-600"
                    [checked]="globalSelected().includes(c)"
                    (change)="toggleCodec('global', c)"
                  />
                  <span class="font-mono">{{ c }}</span>
                </label>
              }
            </div>
            <div class="mt-3 flex gap-2">
              <input
                class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                placeholder="Add custom codec (optional)"
                [value]="customCodec()"
                (input)="customCodec.set($any($event.target).value)"
              />
              <button
                type="button"
                class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
                (click)="addCustom('global')"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div class="block sm:col-span-2">
          <div class="text-xs text-slate-300 mb-1">outbound_codec_prefs</div>
          <div class="rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
            <div class="flex flex-wrap gap-2 mb-2">
              @for (c of outboundSelected(); track c) {
                <button
                  type="button"
                  class="rounded-full border border-slate-800 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-200 hover:bg-slate-800/40"
                  title="Remove"
                  (click)="toggleCodec('outbound', c)"
                >
                  {{ c }} ✕
                </button>
              }
              @if (outboundSelected().length === 0) {
                <div class="text-xs text-slate-400">Pick codecs below (order will be saved).</div>
              }
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              @for (c of codecOptions(); track c) {
                <label class="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    class="accent-indigo-600"
                    [checked]="outboundSelected().includes(c)"
                    (change)="toggleCodec('outbound', c)"
                  />
                  <span class="font-mono">{{ c }}</span>
                </label>
              }
            </div>
            <div class="mt-3 flex gap-2">
              <input
                class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                placeholder="Add custom codec (optional)"
                [value]="customCodec2()"
                (input)="customCodec2.set($any($event.target).value)"
              />
              <button
                type="button"
                class="rounded-lg border border-slate-800 px-3 py-2 text-sm hover:bg-slate-900"
                (click)="addCustom('outbound')"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">rtp_start_port</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="rtpStartPort" placeholder="10000" />
        </label>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">rtp_end_port</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="rtpEndPort" placeholder="20000" />
        </label>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">console_loglevel</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="consoleLoglevel" placeholder="info" />
        </label>

        <div class="block sm:col-span-2">
          <div class="text-xs text-slate-300 mb-1">Debug flags</div>
          <div class="flex flex-wrap gap-4 rounded-lg border border-slate-800 bg-slate-950/30 px-3 py-2">
            <label class="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" class="accent-indigo-600"
                     [checked]="form.controls.callDebug.value"
                     (change)="form.controls.callDebug.setValue($any($event.target).checked)" />
              call_debug
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" class="accent-indigo-600"
                     [checked]="form.controls.rtpDebug.value"
                     (change)="form.controls.rtpDebug.setValue($any($event.target).checked)" />
              rtp_debug
            </label>
            <label class="flex items-center gap-2 text-sm text-slate-200">
              <input type="checkbox" class="accent-indigo-600"
                     [checked]="form.controls.mediaDebug.value"
                     (change)="form.controls.mediaDebug.setValue($any($event.target).checked)" />
              media_debug
            </label>
          </div>
        </div>

        <div class="sm:col-span-2 mt-4 text-sm font-medium">TLS (optional)</div>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">sip_tls_version</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="sipTlsVersion" placeholder="tlsv1.2" />
        </label>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">sip_tls_ciphers</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="sipTlsCiphers" placeholder="HIGH:!aNULL:!MD5" />
        </label>

        <div class="sm:col-span-2 mt-4 text-sm font-medium">Misc (optional)</div>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">recordings_dir</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="recordingsDir" placeholder="/var/lib/freeswitch/recordings" />
        </label>

        <label class="block">
          <div class="text-xs text-slate-300 mb-1">presence_privacy</div>
          <input class="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm"
                 formControlName="presencePrivacy" placeholder="unknown" />
        </label>

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
export class AdvancedSettingsPage {
  error = signal<string | null>(null);
  saving = signal(false);
  private loaded = signal<any | null>(null);

  private readonly baseCodecs = [
    'PCMU',
    'PCMA',
    'G722',
    'OPUS',
    'G729',
    'iLBC',
    'GSM',
    'SPEEX',
    'SPEEXWB',
    'SPEEXUW',
  ];
  private readonly customCodecs = signal<string[]>([]);
  codecOptions = computed(() => {
    const set = new Set<string>();
    for (const c of this.baseCodecs) set.add(c);
    for (const c of this.customCodecs()) set.add(c);
    return [...set];
  });

  globalSelected = signal<string[]>([]);
  outboundSelected = signal<string[]>([]);
  customCodec = signal('');
  customCodec2 = signal('');

  form = new FormGroup({
    defaultPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    holdMusic: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    globalCodecPrefs: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    outboundCodecPrefs: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rtpStartPort: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rtpEndPort: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    consoleLoglevel: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    callDebug: new FormControl(false, { nonNullable: true }),
    rtpDebug: new FormControl(false, { nonNullable: true }),
    mediaDebug: new FormControl(false, { nonNullable: true }),
    sipTlsVersion: new FormControl('', { nonNullable: true }),
    sipTlsCiphers: new FormControl('', { nonNullable: true }),
    recordingsDir: new FormControl('', { nonNullable: true }),
    presencePrivacy: new FormControl('', { nonNullable: true }),
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
    this.http.get<any>(`${API_BASE_URL}/pbx/settings/advanced`).subscribe({
      next: (res) => {
        const g = parseCodecList(res.globalCodecPrefs ?? '');
        const o = parseCodecList(res.outboundCodecPrefs ?? '');
        const unknown = [...g, ...o].filter((x) => x && !this.baseCodecs.includes(x));
        if (unknown.length) {
          this.customCodecs.set([...new Set([...this.customCodecs(), ...unknown])]);
        }
        this.globalSelected.set(g);
        this.outboundSelected.set(o);
        const snapshot = {
          defaultPassword: res.defaultPassword ?? '',
          holdMusic: res.holdMusic ?? '',
          globalCodecPrefs: joinCodecList(g),
          outboundCodecPrefs: joinCodecList(o),
          rtpStartPort: res.rtpStartPort ?? '',
          rtpEndPort: res.rtpEndPort ?? '',
          consoleLoglevel: res.consoleLoglevel ?? '',
          callDebug: Boolean(res.callDebug),
          rtpDebug: Boolean(res.rtpDebug),
          mediaDebug: Boolean(res.mediaDebug),
          sipTlsVersion: res.sipTlsVersion ?? '',
          sipTlsCiphers: res.sipTlsCiphers ?? '',
          recordingsDir: res.recordingsDir ?? '',
          presencePrivacy: res.presencePrivacy ?? '',
          etag: res.etag ?? '',
        };
        this.loaded.set(snapshot);
        this.form.reset(snapshot);
      },
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to load settings'),
    });
  }

  restore() {
    const cur = this.loaded();
    if (!cur) return this.load();
    this.form.reset({ ...cur });
    this.globalSelected.set(parseCodecList(cur.globalCodecPrefs ?? ''));
    this.outboundSelected.set(parseCodecList(cur.outboundCodecPrefs ?? ''));
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    const body = {
      defaultPassword: this.form.controls.defaultPassword.value,
      holdMusic: this.form.controls.holdMusic.value,
      globalCodecPrefs: this.form.controls.globalCodecPrefs.value,
      outboundCodecPrefs: this.form.controls.outboundCodecPrefs.value,
      rtpStartPort: this.form.controls.rtpStartPort.value,
      rtpEndPort: this.form.controls.rtpEndPort.value,
      consoleLoglevel: this.form.controls.consoleLoglevel.value,
      callDebug: this.form.controls.callDebug.value,
      rtpDebug: this.form.controls.rtpDebug.value,
      mediaDebug: this.form.controls.mediaDebug.value,
      sipTlsVersion: this.form.controls.sipTlsVersion.value || undefined,
      sipTlsCiphers: this.form.controls.sipTlsCiphers.value || undefined,
      recordingsDir: this.form.controls.recordingsDir.value || undefined,
      presencePrivacy: this.form.controls.presencePrivacy.value || undefined,
      etag: this.form.controls.etag.value || undefined,
    };
    this.http.post<{ ok: true; etag: string }>(`${API_BASE_URL}/pbx/settings/advanced`, body).subscribe({
      next: (res) => {
        const snapshot = {
          ...this.form.getRawValue(),
          etag: res.etag ?? this.form.controls.etag.value,
        };
        this.loaded.set(snapshot);
        this.form.controls.etag.setValue(snapshot.etag);
        this.toast.success('Advanced settings saved (vars.xml updated)');
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to save settings');
        this.saving.set(false);
        this.load();
      },
    });
  }

  toggleCodec(which: 'global' | 'outbound', codec: string) {
    const c = String(codec ?? '').trim().replace(/\s+/g, '');
    if (!c) return;
    if (which === 'global') {
      const cur = this.globalSelected();
      const idx = cur.indexOf(c);
      const next = idx >= 0 ? cur.filter((x) => x !== c) : [...cur, c];
      this.globalSelected.set(next);
      this.form.controls.globalCodecPrefs.setValue(joinCodecList(next));
      this.form.controls.globalCodecPrefs.markAsDirty();
      this.form.controls.globalCodecPrefs.updateValueAndValidity();
      return;
    }
    const cur = this.outboundSelected();
    const idx = cur.indexOf(c);
    const next = idx >= 0 ? cur.filter((x) => x !== c) : [...cur, c];
    this.outboundSelected.set(next);
    this.form.controls.outboundCodecPrefs.setValue(joinCodecList(next));
    this.form.controls.outboundCodecPrefs.markAsDirty();
    this.form.controls.outboundCodecPrefs.updateValueAndValidity();
  }

  addCustom(which: 'global' | 'outbound') {
    const raw = which === 'global' ? this.customCodec() : this.customCodec2();
    const normalized = String(raw ?? '').trim().replace(/\s+/g, '');
    if (!normalized) return;
    if (!this.codecOptions().includes(normalized)) {
      this.customCodecs.set([...new Set([...this.customCodecs(), normalized])]);
    }
    this.toggleCodec(which, normalized);
    if (which === 'global') this.customCodec.set('');
    else this.customCodec2.set('');
  }
}

function parseCodecList(s: string) {
  const raw = String(s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    const val = v.replace(/\s+/g, '');
    if (!val) continue;
    if (seen.has(val)) continue;
    seen.add(val);
    out.push(val);
  }
  return out;
}

function joinCodecList(arr: string[]) {
  return (arr ?? [])
    .map((x) => String(x ?? '').trim().replace(/\s+/g, ''))
    .filter(Boolean)
    .join(',');
}


