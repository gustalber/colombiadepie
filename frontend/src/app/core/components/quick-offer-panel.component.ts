import { Component, computed, inject, input, signal } from '@angular/core';
import { OfertasApiService } from '../api.services';
import { Necesidad } from '../models';
import { loadDonorProfile, saveDonorProfile } from '../utils/donor-profile';

@Component({
  selector: 'app-quick-offer-panel',
  standalone: true,
  template: `
    @if (done()) {
      <div class="public-quick-offer-done">
        ✓ Aporte registrado. El albergue te llamará para coordinar la entrega.
      </div>
    } @else if (open()) {
      <div class="public-quick-offer">
        @if (error()) {
          <p class="public-quick-offer-error">{{ error() }}</p>
        }

        <div class="field public-quick-offer-qty">
          <label [attr.for]="qtyInputId()">Cantidad que puedes aportar</label>
          <div class="public-quick-offer-qty-row">
            <input
              [id]="qtyInputId()"
              type="number"
              min="1"
              [max]="maxQty() ?? null"
              inputmode="numeric"
              placeholder="Ej. 10"
              [value]="qty() ?? ''"
              (input)="onQtyInput($event)"
              [disabled]="busy()"
            />
            @if (need().unidad) {
              <span class="public-quick-offer-unit">{{ need().unidad }}</span>
            }
          </div>
          @if (maxQty(); as max) {
            <div class="hint">Máximo {{ max }} {{ need().unidad || 'unidades' }}</div>
          }
        </div>

        @if (showDonorFields()) {
          <div class="public-quick-offer-contact">
            <div class="field">
              <label [attr.for]="nombreInputId()">Tu nombre *</label>
              <input
                [id]="nombreInputId()"
                type="text"
                placeholder="Ej. María López"
                [value]="nombre()"
                (input)="onNombreInput($event)"
                [disabled]="busy()"
              />
            </div>
            <div class="field">
              <label [attr.for]="telInputId()">Teléfono o WhatsApp *</label>
              <input
                [id]="telInputId()"
                type="tel"
                autocomplete="tel"
                placeholder="Ej. 300 123 4567"
                [value]="contacto()"
                (input)="onContactoInput($event)"
                [disabled]="busy()"
              />
            </div>
          </div>
        } @else {
          <p class="public-quick-offer-saved">
            Como <strong>{{ nombre() }}</strong>
            @if (contacto()) {
              · {{ contacto() }}
            }
            <button type="button" class="link-btn" (click)="editDonor()">Cambiar</button>
          </p>
        }

        <div class="public-quick-offer-actions">
          <button type="button" class="btn btn-primary" (click)="submit()" [disabled]="busy()">
            {{ busy() ? 'Enviando…' : 'Confirmar aporte' }}
          </button>
          <button type="button" class="btn btn-ghost" (click)="cancel()" [disabled]="busy()">
            Cancelar
          </button>
        </div>
      </div>
    } @else {
      <button
        type="button"
        class="btn btn-primary public-offer-btn"
        [class.public-offer-btn--compact]="compact()"
        (click)="start()"
      >
        {{ buttonLabel() }}
      </button>
    }
  `,
})
export class QuickOfferPanelComponent {
  private readonly ofertasApi = inject(OfertasApiService);

  readonly need = input.required<Necesidad>();
  readonly municipio = input.required<string>();
  readonly buttonLabel = input('Yo aporto');
  readonly compact = input(false);

  readonly open = signal(false);
  readonly done = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly qty = signal<number | null>(null);
  readonly nombre = signal('');
  readonly contacto = signal('');
  readonly editDonorMode = signal(false);

  readonly maxQty = computed(() => {
    const cantidad = this.need().cantidad;
    if (cantidad == null || cantidad <= 0) return null;
    return cantidad;
  });

  readonly showDonorFields = computed(() => {
    if (this.editDonorMode()) return true;
    const saved = loadDonorProfile();
    if (!saved?.oferente_nombre?.trim()) return true;
    if (!saved.oferente_contacto?.trim()) return true;
    return false;
  });

  readonly qtyInputId = computed(() => `qty-${this.need().id}`);
  readonly nombreInputId = computed(() => `nombre-${this.need().id}`);
  readonly telInputId = computed(() => `tel-${this.need().id}`);

  start(): void {
    const saved = loadDonorProfile();
    this.open.set(true);
    this.qty.set(null);
    this.error.set(null);
    this.editDonorMode.set(false);
    this.nombre.set(saved?.oferente_nombre || '');
    this.contacto.set(saved?.oferente_contacto || '');
  }

  cancel(): void {
    if (this.busy()) return;
    this.open.set(false);
    this.qty.set(null);
    this.error.set(null);
    this.editDonorMode.set(false);
  }

  editDonor(): void {
    this.editDonorMode.set(true);
  }

  onQtyInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value;
    if (raw === '') {
      this.qty.set(null);
      return;
    }
    let val = Number(raw);
    if (!Number.isFinite(val)) {
      this.qty.set(null);
      return;
    }
    val = Math.max(1, Math.floor(val));
    const max = this.maxQty();
    if (max != null && val > max) {
      val = max;
      input.value = String(max);
    }
    this.qty.set(val);
  }

  onNombreInput(event: Event): void {
    this.nombre.set((event.target as HTMLInputElement).value);
  }

  onContactoInput(event: Event): void {
    this.contacto.set((event.target as HTMLInputElement).value);
  }

  submit(): void {
    const n = this.need();
    const qty = this.qty();
    const nombre = this.nombre().trim();
    const contacto = this.contacto().trim();

    if (qty == null || qty <= 0) {
      this.error.set('Indica cuánto puedes aportar.');
      return;
    }
    const max = this.maxQty();
    if (max != null && qty > max) {
      this.error.set(`El albergue necesita como máximo ${max} ${n.unidad || ''}`.trim());
      return;
    }
    if (!nombre) {
      this.error.set('Escribe tu nombre para que coordinación te contacte.');
      return;
    }
    if (!contacto) {
      this.error.set('Indica tu teléfono o WhatsApp para que coordinación te contacte.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    this.ofertasApi
      .createPublic({
        necesidad_id: n.id,
        oferente_nombre: nombre,
        oferente_contacto: contacto,
        municipio_preferido: this.municipio(),
        items: [
          {
            categoria: n.categoria,
            cantidad: qty,
            unidad: n.unidad || null,
            descripcion: n.descripcion?.trim() || null,
          },
        ],
      })
      .subscribe({
        next: () => {
          saveDonorProfile({ oferente_nombre: nombre, oferente_contacto: contacto });
          this.busy.set(false);
          this.open.set(false);
          this.done.set(true);
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.error || 'No se pudo registrar tu aporte.');
        },
      });
  }
}
