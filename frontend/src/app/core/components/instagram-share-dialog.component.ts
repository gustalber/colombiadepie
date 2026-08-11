import { Component, effect, input, output, signal } from '@angular/core';
import { copyShareText, ShareNeedBlock } from '../utils/instagram-share';
import { downloadQrPoster, renderQrPoster } from '../utils/share-qr-poster';
import {
  canShareFiles,
  downloadStoryImage,
  openWhatsAppShare,
  renderStoryCard,
  shareStoryImage,
} from '../utils/share-story-image';

@Component({
  selector: 'app-instagram-share-dialog',
  standalone: true,
  template: `
    @if (open()) {
      <div class="modal-backdrop ig-share-backdrop" (click)="closed.emit()">
        <div
          class="modal-card ig-share-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ig-share-title"
          (click)="$event.stopPropagation()"
        >
          <div class="ig-share-header">
            <h3 id="ig-share-title">Compartir necesidades</h3>
            <p class="ig-share-lead">
              Publica en <strong>Instagram</strong> o <strong>WhatsApp</strong>, o descarga el
              <strong>QR para imprimir</strong> en el albergue. El enlace y el código llevan a quienes quieren donar.
            </p>
          </div>

          <div class="ig-share-body">
            @if (previewUrl()) {
              <div class="ig-share-previews">
                <div class="ig-share-preview-block">
                  <span class="ig-share-preview-label">Historia / redes</span>
                  <div class="ig-story-preview-wrap">
                    <img
                      class="ig-story-preview"
                      [src]="previewUrl()"
                      alt="Vista previa para historia"
                    />
                  </div>
                </div>
                @if (qrPreviewUrl()) {
                  <div class="ig-share-preview-block">
                    <span class="ig-share-preview-label">QR para imprimir</span>
                    <div class="ig-qr-preview-wrap">
                      <img
                        class="ig-qr-preview"
                        [src]="qrPreviewUrl()"
                        alt="Vista previa del código QR para imprimir"
                      />
                    </div>
                  </div>
                }
              </div>
            } @else if (generating()) {
              <div class="ig-story-loading">Generando imagen y QR…</div>
            }

            <div class="ig-share-link">
              <span>Enlace para donar</span>
              <a [href]="shareUrl()" target="_blank" rel="noopener noreferrer">{{ shareUrl() }}</a>
            </div>

            @if (message()) {
              <div class="banner" [class.ok]="!isError()" [class.danger]="isError()">
                {{ message() }}
              </div>
            }

            <div class="ig-share-actions-grid">
              @if (canShareStory()) {
                <button class="btn btn-instagram" type="button" (click)="shareInstagramStory()">
                  Historia Instagram
                </button>
              }
              <button class="btn btn-whatsapp" type="button" (click)="shareWhatsApp()">
                WhatsApp
              </button>
              <button class="btn btn-secondary" type="button" (click)="downloadImage()" [disabled]="!storyBlob()">
                Descargar imagen
              </button>
              <button class="btn btn-secondary" type="button" (click)="downloadQr()" [disabled]="!qrBlob()">
                Descargar QR
              </button>
              <button class="btn btn-ghost" type="button" (click)="copy()">
                {{ copied() ? 'Texto copiado' : 'Copiar texto' }}
              </button>
            </div>

            <p class="ig-share-hint">
              @if (canShareStory()) {
                Historia: elige Instagram en el menú y publícala como story.
              } @else {
                Descarga la imagen y súbela a tu story de Instagram o estado de WhatsApp.
              }
              El QR se puede pegar en la entrada del albergue: al escanearlo abre esta página.
            </p>
          </div>

          <div class="modal-actions ig-share-footer">
            <button class="btn btn-ghost" type="button" (click)="closed.emit()">Cerrar</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .ig-share-backdrop {
        z-index: 5000;
        align-items: flex-start;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding:
          max(0.75rem, env(safe-area-inset-top))
          max(0.75rem, env(safe-area-inset-right))
          max(0.75rem, env(safe-area-inset-bottom))
          max(0.75rem, env(safe-area-inset-left));
      }

      .ig-share-card {
        display: flex;
        flex-direction: column;
        width: min(480px, 100%);
        max-height: min(92dvh, 720px);
        padding: 0;
        margin: auto;
        overflow: hidden;
      }

      .ig-share-header {
        flex-shrink: 0;
        padding: 1.1rem 1.2rem 0;
      }

      .ig-share-header h3 {
        margin: 0 0 0.45rem;
      }

      .ig-share-body {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 0.75rem 1.2rem;
        -webkit-overflow-scrolling: touch;
      }

      .ig-share-footer {
        flex-shrink: 0;
        padding: 0.65rem 1.2rem 1rem;
        border-top: 1px solid var(--line);
        background: #fff;
      }

      .ig-share-lead {
        margin: 0;
        color: var(--ink-soft);
        font-size: 0.92rem;
        line-height: 1.45;
      }

      .ig-share-previews {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.65rem;
        margin-bottom: 0.75rem;
      }

      .ig-share-preview-block {
        display: grid;
        gap: 0.35rem;
        min-width: 0;
      }

      .ig-share-preview-label {
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--ink-soft);
      }

      .ig-story-preview-wrap,
      .ig-qr-preview-wrap {
        display: flex;
        justify-content: center;
        max-height: 180px;
        overflow: hidden;
      }

      .ig-story-preview,
      .ig-qr-preview {
        width: auto;
        max-width: min(120px, 28vw);
        max-height: 180px;
        height: auto;
        object-fit: contain;
        border-radius: 12px;
        border: 1px solid var(--line);
        box-shadow: var(--shadow);
      }

      .ig-qr-preview {
        background: #fff;
      }

      .ig-story-loading {
        text-align: center;
        color: var(--ink-soft);
        padding: 1.5rem 0;
        margin-bottom: 0.75rem;
      }

      .ig-share-link {
        display: grid;
        gap: 0.25rem;
        margin-bottom: 0.75rem;
        font-size: 0.88rem;
      }

      .ig-share-link span {
        color: var(--ink-soft);
        font-weight: 700;
      }

      .ig-share-link a {
        word-break: break-all;
        font-weight: 700;
      }

      .ig-share-actions-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.45rem;
        margin-bottom: 0.55rem;
      }

      .ig-share-actions-grid .btn {
        width: 100%;
        justify-content: center;
        font-size: 0.88rem;
        padding: 0.55rem 0.65rem;
      }

      .ig-share-hint {
        margin: 0;
        font-size: 0.82rem;
        color: var(--ink-soft);
        line-height: 1.45;
      }

      .btn-whatsapp {
        border: none;
        color: #fff;
        background: #25d366;
      }

      .btn-whatsapp:hover {
        filter: brightness(1.05);
      }

      @media (max-width: 480px) {
        .ig-share-card {
          max-height: min(94dvh, 720px);
        }

        .ig-story-preview-wrap,
        .ig-qr-preview-wrap {
          max-height: 150px;
        }

        .ig-story-preview,
        .ig-qr-preview {
          max-width: min(100px, 40vw);
          max-height: 150px;
        }

        .ig-share-actions-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class InstagramShareDialogComponent {
  readonly open = input(false);
  readonly caption = input('');
  readonly shareUrl = input('');
  readonly shelterName = input('');
  readonly municipio = input('');
  readonly shareNeeds = input<ShareNeedBlock[]>([]);

  readonly closed = output<void>();

  readonly copied = signal(false);
  readonly message = signal<string | null>(null);
  readonly isError = signal(false);
  readonly generating = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly storyBlob = signal<Blob | null>(null);
  readonly qrPreviewUrl = signal<string | null>(null);
  readonly qrBlob = signal<Blob | null>(null);
  readonly canShareStory = signal(canShareFiles());

  private previewObjectUrl: string | null = null;
  private qrPreviewObjectUrl: string | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        void this.buildStoryPreview();
      } else {
        this.revokePreview();
      }
    });
  }

  async shareInstagramStory(): Promise<void> {
    const blob = this.storyBlob();
    if (!blob) return;

    const ok = await shareStoryImage(blob, this.caption());
    this.isError.set(!ok);
    this.message.set(
      ok
        ? 'Elige Instagram y publícala como historia.'
        : 'Descarga la imagen y súbela manualmente a tu story.'
    );
  }

  shareWhatsApp(): void {
    openWhatsAppShare(this.caption());
    this.isError.set(false);
    this.message.set('WhatsApp abierto. Envía a contactos o a tu estado.');
  }

  downloadImage(): void {
    const blob = this.storyBlob();
    if (!blob) return;
    downloadStoryImage(blob, this.shelterName());
    this.isError.set(false);
    this.message.set('Imagen descargada. Súbela a Instagram o WhatsApp.');
  }

  downloadQr(): void {
    const blob = this.qrBlob();
    if (!blob) return;
    downloadQrPoster(blob, this.shelterName());
    this.isError.set(false);
    this.message.set('QR descargado. Imprímelo y colócalo en la entrada del albergue.');
  }

  async copy(): Promise<void> {
    const ok = await copyShareText(this.caption());
    this.copied.set(ok);
    this.isError.set(!ok);
    this.message.set(ok ? 'Texto copiado.' : 'No pudimos copiar el texto.');
  }

  private async buildStoryPreview(): Promise<void> {
    this.generating.set(true);
    this.message.set(null);
    this.revokePreview();

    try {
      const input = {
        shelterName: this.shelterName(),
        municipio: this.municipio(),
        needLines: this.shareNeeds(),
        donateUrl: this.shareUrl(),
      };

      const [storyBlob, qrBlob] = await Promise.all([
        renderStoryCard(input),
        renderQrPoster(input),
      ]);

      this.storyBlob.set(storyBlob);
      const url = URL.createObjectURL(storyBlob);
      this.previewObjectUrl = url;
      this.previewUrl.set(url);

      this.qrBlob.set(qrBlob);
      const qrUrl = URL.createObjectURL(qrBlob);
      this.qrPreviewObjectUrl = qrUrl;
      this.qrPreviewUrl.set(qrUrl);
    } catch {
      this.isError.set(true);
      this.message.set('No pudimos generar la imagen. Usa copiar texto o WhatsApp.');
    } finally {
      this.generating.set(false);
    }
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    if (this.qrPreviewObjectUrl) {
      URL.revokeObjectURL(this.qrPreviewObjectUrl);
      this.qrPreviewObjectUrl = null;
    }
    this.previewUrl.set(null);
    this.storyBlob.set(null);
    this.qrPreviewUrl.set(null);
    this.qrBlob.set(null);
  }
}
