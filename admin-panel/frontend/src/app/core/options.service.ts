import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from './api';

export type OptionExtension = { id: string; label: string };
export type OptionTrunk = { name: string; isDefault?: boolean };
export type OptionQueue = { name: string };
export type OptionIvr = { name: string };
export type OptionTimeCondition = { name: string; extensionNumber: string };
export type SoundItem = { category: 'music' | 'ivr' | 'other'; file: string; relPath: string; fsPath: string; playPath: string };

export type PbxOptions = {
  extensions: OptionExtension[];
  trunks: OptionTrunk[];
  queues: OptionQueue[];
  ivrs: OptionIvr[];
  timeConditions: OptionTimeCondition[];
  sounds: { all: SoundItem[]; music: SoundItem[]; ivr: SoundItem[] };
  mohClasses: string[];
  strategies: string[];
  domains: string[];
  defaultTrunkName?: string | null;
};

@Injectable({ providedIn: 'root' })
export class OptionsService {
  options = signal<PbxOptions | null>(null);
  loading = signal(false);

  constructor(private readonly http: HttpClient) { }

  refresh() {
    this.loading.set(true);
    this.http.get<PbxOptions>(`${API_BASE_URL}/pbx/options`).subscribe({
      next: (res) => this.options.set(res),
      error: () => this.options.set(null),
      complete: () => this.loading.set(false),
    });
  }
}


