import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DirectionsChooserComponent } from '../core/components/directions-chooser.component';
import { AuthService } from '../core/auth.service';
import { ConnectivityService } from '../core/connectivity.service';
import { OutboxService } from '../core/outbox.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, DirectionsChooserComponent],
  template: `
    <div class="shell">
      <header class="topbar">
        <div class="topbar-inner">
          <a routerLink="/" class="brand">
            <img class="brand-logo" src="/logo.png" width="40" height="40" alt="" aria-hidden="true" />
            <span class="brand-text">
              <strong>Colombia de Pie</strong>
              <span>Albergues y ayuda de última milla</span>
            </span>
          </a>
          <nav class="nav-actions">
            <a
              class="nav-item"
              routerLink="/"
              routerLinkActive="nav-current"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              Puedo ayudar
            </a>
            <a class="nav-item" routerLink="/mapa" routerLinkActive="nav-current">
              Mapa
            </a>
            <a
              class="nav-item"
              routerLink="/ayuda-humanitaria"
              routerLinkActive="nav-current"
            >
              Guía
            </a>
            @if (!auth.hasRole('responsable_albergue')) {
              <a class="nav-item" routerLink="/puntos/nuevo" routerLinkActive="nav-current">
                Registrar punto
              </a>
            }
            @if (auth.hasRole('coordinador', 'verificador')) {
              <a class="nav-item" routerLink="/coordinacion" routerLinkActive="nav-current">
                Coordinación
              </a>
              <a class="nav-item" routerLink="/coordinacion/reportes" routerLinkActive="nav-current">
                Reportes
              </a>
            }
            @if (auth.hasRole('responsable_albergue')) {
              @if (auth.user()?.punto_id; as puntoId) {
                <a
                  class="nav-item"
                  [routerLink]="['/puntos', puntoId]"
                  routerLinkActive="nav-current"
                >
                  Mi albergue
                </a>
              }
            }
            @if (auth.isLoggedIn()) {
              <a class="nav-item" routerLink="/cuenta/contrasena" routerLinkActive="nav-current">
                Contraseña
              </a>
              <button class="nav-item nav-button" type="button" (click)="logout()">
                Salir
              </button>
            } @else {
              <a class="nav-item" routerLink="/login" routerLinkActive="nav-current">Entrar</a>
            }
          </nav>
        </div>
        <div class="status-strip">
          @if (connectivity.online()) {
            <span class="pill ok">● En línea</span>
          } @else {
            <span class="pill warn">● Sin conexión — puedes seguir capturando</span>
          }
          @if (outbox.pendingCount() > 0) {
            <span class="pill warn">
              {{ outbox.pendingCount() }} pendiente{{ outbox.pendingCount() === 1 ? '' : 's' }} de enviar
            </span>
            @if (connectivity.online()) {
              <button class="nav-item nav-button" type="button" (click)="syncNow()">
                Enviar ahora
              </button>
            }
          }
          @if (auth.user(); as user) {
            <span class="pill">{{ user.nombre }} · {{ roleLabel(user.rol) }}</span>
          }
        </div>
      </header>

      <main class="page">
        <ng-content />
      </main>

      <p class="footer-note">
        Datos personales con recolección mínima · Ley 1581 de 2012
      </p>

      <app-directions-chooser />
    </div>
  `,
})
export class ShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly connectivity = inject(ConnectivityService);
  readonly outbox = inject(OutboxService);

  ngOnInit(): void {
    if (this.connectivity.online()) {
      void this.outbox.flush();
    }
  }

  logout(): void {
    this.auth.clearSession();
  }

  syncNow(): void {
    void this.outbox.flush();
  }

  roleLabel(rol: string): string {
    const labels: Record<string, string> = {
      coordinador: 'Coordinación',
      responsable_albergue: 'Responsable de albergue',
      verificador: 'Verificador',
      oferente: 'Oferente',
    };
    return labels[rol] ?? rol;
  }
}
