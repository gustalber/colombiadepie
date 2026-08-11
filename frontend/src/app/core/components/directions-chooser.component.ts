import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DirectionsService } from '../directions.service';
import {
  buildDirectionsLinks,
  openExternalUrl,
} from '../utils/maps-url';

@Component({
  selector: 'app-directions-chooser',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    @if (directions.target(); as t) {
      <div class="modal-backdrop" (click)="directions.close()">
        <div
          class="modal-card"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          aria-labelledby="directions-title"
        >
          <h3 id="directions-title">Cómo llegar</h3>
          <p>
            {{ t.name || 'Destino' }}
            <span class="ops-row-meta">
              · {{ t.lat | number: '1.4-5' }}, {{ t.lng | number: '1.4-5' }}
            </span>
          </p>
          <div class="directions-options">
            <button class="btn btn-primary" type="button" (click)="open('google')">
              Google Maps
            </button>
            <button class="btn btn-secondary" type="button" (click)="open('waze')">
              Waze
            </button>
            <button class="btn btn-secondary" type="button" (click)="open('apple')">
              Apple Maps
            </button>
            <button class="btn btn-ghost" type="button" (click)="open('geo')">
              Elegir otra app del teléfono
            </button>
          </div>
          <div class="modal-actions" style="margin-top: 0.85rem">
            <button class="btn btn-ghost" type="button" (click)="directions.close()">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .directions-options {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .directions-options .btn {
        width: 100%;
        text-align: center;
      }
    `,
  ],
})
export class DirectionsChooserComponent {
  readonly directions = inject(DirectionsService);

  open(app: 'google' | 'waze' | 'apple' | 'geo'): void {
    const t = this.directions.target();
    if (!t) return;
    const links = buildDirectionsLinks(t);
    openExternalUrl(links[app]);
    this.directions.close();
  }
}
