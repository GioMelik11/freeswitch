import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { API_BASE_URL } from '../core/api';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6">
      <div class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow">
        <div class="mb-6">
          <div class="text-xl font-semibold">FreeSWITCH Admin</div>
          <div class="text-sm text-slate-300">Sign in to manage configs and modules</div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <label class="block">
            <div class="text-sm text-slate-200 mb-1">Username</div>
            <input
              class="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              formControlName="username"
              autocomplete="username"
            />
          </label>

          <label class="block">
            <div class="text-sm text-slate-200 mb-1">Password</div>
            <input
              type="password"
              class="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              formControlName="password"
              autocomplete="current-password"
            />
          </label>

          @if (error()) {
            <div class="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-sm text-red-200">
              {{ error() }}
            </div>
          }

          <button
            type="submit"
            [disabled]="form.invalid || loading()"
            class="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {{ loading() ? 'Signing in...' : 'Sign in' }}
          </button>

          <div class="text-xs text-slate-400">
            Default seed (first run only): <span class="font-mono">admin / admin1234</span>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class LoginPage {
  loading = signal(false);
  error = signal<string | null>(null);

  form = new FormGroup({
    username: new FormControl('admin', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('admin1234', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const body = this.form.getRawValue();
    this.http
      .post<{ accessToken: string; user: { id: string; username: string; role: string } }>(
        `${API_BASE_URL}/auth/login`,
        body,
      )
      .subscribe({
        next: (res) => {
          this.auth.setSession(res.accessToken, res.user);
          this.router.navigateByUrl('/app/pbx/extensions');
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? 'Login failed');
          this.loading.set(false);
        },
        complete: () => this.loading.set(false),
      });
  }
}


