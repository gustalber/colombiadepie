import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlberguePromoService } from '../albergue-promo.service';

@Component({
  selector: 'app-albergue-promo-dialog',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (open()) {
      <div class="modal-backdrop promo-backdrop" (click)="snooze()">
        <div
          class="modal-card promo-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="albergue-promo-title"
          (click)="$event.stopPropagation()"
        >
          <div class="promo-badge">Convocatoria abierta</div>

          <div class="promo-notice">
            <p>
              Si eres administrador de un albergue <strong>ya registrado</strong>, escríbenos por
              WhatsApp:
            </p>
            <button
              type="button"
              class="promo-whatsapp"
              (click)="openWhatsApp($event)"
            >
              {{ whatsappUser }}
            </button>
            <div class="promo-whatsapp-hint">WhatsApp · abre el chat directo</div>
          </div>

          <div class="promo-header">
            <img class="promo-logo" src="/logo.png" width="56" height="56" alt="" aria-hidden="true" />
            <div>
              <h2 id="albergue-promo-title">¿Administra un albergue o punto de acogida?</h2>
              <p class="promo-lead">
                Albergues, refugios temporales y puntos de acogida pueden registrarse gratis para
                que familias y coordinadores encuentren cupos, ubicación y necesidades en tiempo real.
              </p>
            </div>
          </div>

          <ul class="promo-list">
            <li>Aparece en el mapa público de Colombia de Pie</li>
            <li>Publica qué necesitas (agua, cobijas, comida…)</li>
            <li>Conecta con donantes y ayuda de última milla</li>
          </ul>

          <div class="modal-actions promo-actions">
            <button class="btn btn-ghost" type="button" (click)="snooze()">Ahora no</button>
            <a class="btn btn-primary promo-cta" routerLink="/puntos/nuevo" (click)="register()">
              Registrar albergue o punto de acogida
            </a>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .promo-backdrop {
        z-index: 9999;
        animation: promo-fade-in 0.25s ease-out;
      }

      .promo-card {
        width: min(480px, 100%);
        padding: 0;
        overflow: hidden;
        border: 2px solid var(--amber-soft);
        box-shadow: 0 18px 48px rgba(31, 63, 51, 0.18);
      }

      .promo-badge {
        background: linear-gradient(90deg, var(--amber) 0%, #d99545 100%);
        color: #fff;
        font-weight: 700;
        font-size: 0.82rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        text-align: center;
        padding: 0.55rem 1rem;
      }

      .promo-notice {
        margin: 0;
        padding: 0.85rem 1.25rem;
        background: var(--sand, #f6f1e8);
        border-bottom: 1px solid var(--line, #e2ddd3);
        font-size: 0.92rem;
        line-height: 1.45;
        color: var(--ink-soft);
      }

      .promo-notice p {
        margin: 0 0 0.5rem;
      }

      .promo-whatsapp {
        display: inline-flex;
        align-items: center;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        font-weight: 700;
        color: var(--canopy-deep);
        cursor: pointer;
        text-decoration: none;
      }

      .promo-whatsapp:hover {
        text-decoration: underline;
      }

      .promo-whatsapp-hint {
        margin-top: 0.25rem;
        font-size: 0.8rem;
        color: var(--ink-soft);
      }

      .promo-header {
        display: flex;
        gap: 0.85rem;
        align-items: flex-start;
        padding: 1.15rem 1.25rem 0.5rem;
      }

      .promo-logo {
        flex-shrink: 0;
        border-radius: 0.65rem;
      }

      .promo-header h2 {
        margin: 0 0 0.35rem;
        font-size: 1.35rem;
        color: var(--canopy-deep);
      }

      .promo-lead {
        margin: 0;
        font-size: 0.98rem;
        line-height: 1.45;
      }

      .promo-list {
        margin: 0.25rem 1.25rem 1rem;
        padding-left: 1.15rem;
        color: var(--ink-soft);
      }

      .promo-list li {
        margin-bottom: 0.35rem;
      }

      .promo-actions {
        padding: 0 1.25rem 1.2rem;
        justify-content: stretch;
      }

      .promo-actions .btn {
        flex: 1 1 auto;
        text-align: center;
      }

      .promo-cta {
        font-size: 1.02rem;
        padding-top: 0.7rem;
        padding-bottom: 0.7rem;
      }

      @keyframes promo-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @media (max-width: 480px) {
        .promo-header {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .promo-list {
          font-size: 0.95rem;
        }

        .promo-actions {
          flex-direction: column-reverse;
        }
      }
    `,
  ],
})
export class AlberguePromoDialogComponent {
  private readonly promo = inject(AlberguePromoService);
  private readonly whatsappPhone = '573218608203';

  readonly open = this.promo.open;
  readonly whatsappUser = '@gustalbe';

  openWhatsApp(event: Event): void {
    event.stopPropagation();
    window.open(`https://wa.me/${this.whatsappPhone}`, '_blank', 'noopener,noreferrer');
  }

  snooze(): void {
    this.promo.closeSnooze();
  }

  register(): void {
    this.promo.closeAfterRegister();
  }
}
