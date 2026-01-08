import { Injectable, signal } from '@angular/core';

export type AuthUser = { id: string; username: string; role: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'fs_admin_token';
  private readonly userKey = 'fs_admin_user';

  token = signal<string | null>(localStorage.getItem(this.tokenKey));
  user = signal<AuthUser | null>(
    localStorage.getItem(this.userKey) ? JSON.parse(localStorage.getItem(this.userKey)!) : null,
  );

  setSession(token: string, user: AuthUser) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.token.set(token);
    this.user.set(user);
  }

  clear() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.token.set(null);
    this.user.set(null);
  }
}


