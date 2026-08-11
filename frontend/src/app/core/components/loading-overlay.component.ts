import { Component, inject } from '@angular/core';
import { LoadingService } from '../http/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  template: `
    @if (loading.active()) {
      <div class="loading-overlay" aria-live="polite" aria-busy="true">
        <div class="loading-card">
          <div class="loading-spinner" aria-hidden="true"></div>
          <h3>Cargando</h3>
          <p>Por favor espera unos momentos…</p>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 3000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background: rgba(20, 32, 26, 0.72);
      }

      .loading-card {
        width: min(320px, 100%);
        padding: 1.35rem 1.5rem;
        border-radius: var(--radius);
        border: 1px solid var(--line);
        background: #fff;
        box-shadow: var(--shadow);
        text-align: center;
      }

      .loading-card h3 {
        margin: 0.85rem 0 0.35rem;
        color: var(--canopy-deep);
      }

      .loading-card p {
        margin: 0;
        color: var(--ink-soft);
        font-size: 0.95rem;
      }

      .loading-spinner {
        width: 2.5rem;
        height: 2.5rem;
        margin: 0 auto;
        border: 3px solid var(--sand);
        border-top-color: var(--leaf);
        border-radius: 50%;
        animation: loading-spin 0.8s linear infinite;
      }

      @keyframes loading-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoadingOverlayComponent {
  readonly loading = inject(LoadingService);
}
