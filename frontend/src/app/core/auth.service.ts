import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse, RolUsuario, Usuario } from './models';

const TOKEN_KEY = 'cdp_token';
const USER_KEY = 'cdp_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly userSignal = signal<Usuario | null>(this.readUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSignal());
  readonly rol = computed(() => this.userSignal()?.rol ?? null);

  setSession(auth: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    this.tokenSignal.set(auth.token);
    this.userSignal.set(auth.user);
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.tokenSignal.set(null);
    this.userSignal.set(null);
  }

  hasRole(...roles: RolUsuario[]): boolean {
    const rol = this.userSignal()?.rol;
    return !!rol && roles.includes(rol);
  }

  /** Destination after login / for role home link. */
  homePath(): string[] {
    const user = this.userSignal();
    if (!user) return ['/login'];
    if (user.rol === 'responsable_albergue' && user.punto_id) {
      return ['/puntos', user.punto_id];
    }
    if (user.rol === 'coordinador' || user.rol === 'verificador') {
      return ['/coordinacion'];
    }
    return ['/'];
  }

  private readToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private readUser(): Usuario | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  }
}
