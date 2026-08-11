import { Component, inject } from '@angular/core';
import { AlertService } from '../http/alert.service';

@Component({
  selector: 'app-error-alert',
  standalone: true,
  template: `
    @if (alert.visible()) {
      <div class="modal-backdrop error-alert-backdrop" (click)="dismiss()">
        <div
          class="modal-card error-alert-card"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="error-alert-title"
          (click)="$event.stopPropagation()"
        >
          <h3 id="error-alert-title">{{ alert.title() }}</h3>
          <p>{{ alert.message() }}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-primary" (click)="dismiss()">
              Ok, entendido
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .error-alert-backdrop {
        z-index: 4000;
      }

      .error-alert-card h3 {
        color: var(--rose);
      }
    `,
  ],
})
export class ErrorAlertComponent {
  readonly alert = inject(AlertService);

  dismiss(): void {
    this.alert.dismiss();
  }
}
