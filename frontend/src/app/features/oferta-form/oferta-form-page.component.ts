import { Component, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OfertasApiService } from '../../core/api.services';
import { MunicipioSelectComponent } from '../../core/components/municipio-select.component';
import { CategoriaFamilia, CategoriaNecesidad } from '../../core/models';
import {
  CATEGORIA_FAMILIA_LABELS,
  CATEGORIA_FAMILIA_ORDER,
  CATEGORIA_LABELS,
  familiaFlowHint,
  getCategoriaMeta,
  getCategoriasByFamilia,
} from '../../core/utils/labels';
import { ShellComponent } from '../../layout/shell.component';

interface DraftItem {
  categoria: CategoriaNecesidad;
  cantidad: number | null;
  unidad: string;
  descripcion: string;
}

@Component({
  selector: 'app-oferta-form-page',
  standalone: true,
  imports: [
    ShellComponent,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    MunicipioSelectComponent,
  ],
  template: `
    <app-shell>
      <a [routerLink]="backLink()" [queryParams]="backQueryParams()" class="btn btn-ghost" style="margin-bottom: 0.75rem; display: inline-flex">← Ver necesidades</a>
      <h1>{{ pageTitle() }}</h1>
      <p>{{ pageIntro() }}</p>

      @if (done()) {
        <div class="banner ok">{{ doneMessage() }}</div>
        <a class="btn btn-primary" routerLink="/">Volver al inicio</a>
      } @else {
        @if (message()) {
          <div class="banner danger">{{ message() }}</div>
        }

        <form class="panel form-grid" [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="oferente_nombre">Tu nombre o organización *</label>
            <input id="oferente_nombre" formControlName="oferente_nombre" />
          </div>

          <div class="field">
            <label for="oferente_contacto">Teléfono o correo (privado) *</label>
            <input id="oferente_contacto" formControlName="oferente_contacto" />
            <div class="hint">
              @if (hasTransportItems()) {
                Obligatorio para transporte: coordinación te llama para confirmar ruta y horario.
              } @else {
                No se muestra en el mapa público.
              }
            </div>
          </div>

          <div class="field">
            <label>Qué puedes aportar *</label>
            @if (focusFamilia()) {
              <div class="hint" style="margin-bottom: 0.55rem">{{ familiaFlowHint(focusFamilia()!) }}</div>
            } @else {
              <div class="hint" style="margin-bottom: 0.55rem">
                Elige insumos, materiales de reconstrucción o servicio de transporte.
              </div>
            }

            @for (fam of visibleFamilias(); track fam) {
              <div class="categoria-group" [class.focused]="focusFamilia() === fam">
                <h3 class="categoria-group-title">{{ familiaLabel(fam) }}</h3>
                <p class="categoria-group-hint">{{ familiaFlowHint(fam) }}</p>
                <div class="categoria-grid">
                  @for (cat of categoriasPorFamilia(fam); track cat) {
                    <label class="categoria-check">
                      <input
                        type="checkbox"
                        [checked]="hasItem(cat)"
                        (change)="toggleCategoria(cat, $event)"
                      />
                      <span>{{ categoriaLabel(cat) }}</span>
                    </label>
                  }
                </div>
              </div>
            }
          </div>

          @if (items().length > 0) {
            <div class="ops-stack">
              @for (item of items(); track item.categoria) {
                @if (itemMeta(item.categoria); as meta) {
                  <div class="panel item-panel" style="padding: 0.85rem; box-shadow: none">
                    <strong>{{ categoriaLabel(item.categoria) }}</strong>
                    <p class="item-hint">{{ meta.offer.hint }}</p>
                    <div class="form-grid" style="margin-top: 0.65rem">
                      <div class="field">
                        <label [attr.for]="'desc-' + item.categoria">Descripción</label>
                        <textarea
                          [id]="'desc-' + item.categoria"
                          [ngModel]="item.descripcion"
                          (ngModelChange)="patchItem(item.categoria, { descripcion: $event })"
                          [ngModelOptions]="{ standalone: true }"
                          [placeholder]="meta.offer.descripcionPlaceholder"
                        ></textarea>
                      </div>
                      <div class="form-row-2">
                        <div class="field">
                          <label [attr.for]="'cant-' + item.categoria">{{ meta.offer.cantidadLabel }}</label>
                          <input
                            [id]="'cant-' + item.categoria"
                            type="number"
                            [ngModel]="item.cantidad"
                            (ngModelChange)="patchItem(item.categoria, { cantidad: toNumber($event) })"
                            [ngModelOptions]="{ standalone: true }"
                            [placeholder]="meta.offer.cantidadPlaceholder"
                          />
                        </div>
                        <div class="field">
                          <label [attr.for]="'uni-' + item.categoria">{{ meta.offer.unidadLabel }}</label>
                          <input
                            [id]="'uni-' + item.categoria"
                            [ngModel]="item.unidad"
                            (ngModelChange)="patchItem(item.categoria, { unidad: $event })"
                            [ngModelOptions]="{ standalone: true }"
                            [placeholder]="meta.offer.unidadPlaceholder"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          }

          <div class="field">
            <label for="municipio_preferido">{{ municipioLabel() }} *</label>
            <app-municipio-select
              inputId="municipio_preferido"
              formControlName="municipio_preferido"
              placeholder="Buscar municipio…"
            />
          </div>

          <div class="field">
            <label for="alt_municipio">{{ altMunicipioLabel() }}</label>
            <div class="alt-muni-row">
              <app-municipio-select
                inputId="alt_municipio"
                [ngModel]="altDraft()"
                (ngModelChange)="altDraft.set($event)"
                [ngModelOptions]="{ standalone: true }"
                placeholder="Agregar otro municipio…"
              />
              <button
                class="btn btn-secondary"
                type="button"
                (click)="addAlternativo()"
                [disabled]="!altDraft()"
              >
                Agregar
              </button>
            </div>
            @if (alternativos().length > 0) {
              <div class="meta-row" style="margin-top: 0.55rem">
                @for (m of alternativos(); track m) {
                  <button
                    class="tag ok alt-chip"
                    type="button"
                    (click)="removeAlternativo(m)"
                  >
                    {{ m }} ×
                  </button>
                }
              </div>
            }
          </div>

          <button
            class="btn btn-primary"
            type="submit"
            [disabled]="form.invalid || items().length === 0 || busy()"
          >
            {{ busy() ? 'Enviando…' : 'Enviar oferta' }}
          </button>
        </form>
      }
    </app-shell>
  `,
  styles: [
    `
      .categoria-group {
        margin-bottom: 1rem;
        padding-bottom: 0.85rem;
        border-bottom: 1px solid var(--line);
      }
      .categoria-group:last-child {
        border-bottom: 0;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      .categoria-group.focused {
        padding: 0.75rem;
        border: 1px solid #b7d0c2;
        border-radius: var(--radius-sm);
        background: #f7faf8;
      }
      .categoria-group-title {
        margin: 0 0 0.25rem;
        font-size: 1rem;
        color: var(--canopy-deep);
      }
      .categoria-group-hint {
        margin: 0 0 0.55rem;
        font-size: 0.88rem;
        color: var(--ink-soft);
      }
      .categoria-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .categoria-check {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        margin: 0;
        padding: 0.55rem 0.75rem;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
        cursor: pointer;
        font-weight: 700;
        color: var(--canopy-deep);
        flex: 0 0 auto;
        white-space: nowrap;
        box-sizing: border-box;
      }
      .categoria-check input[type='checkbox'] {
        width: auto;
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        flex-shrink: 0;
        accent-color: var(--canopy);
      }
      .categoria-check:has(input:checked) {
        border-color: var(--canopy);
        background: color-mix(in srgb, var(--canopy) 12%, #fff);
      }
      .item-hint {
        margin: 0.35rem 0 0;
        font-size: 0.88rem;
        color: var(--ink-soft);
      }
      .alt-muni-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.5rem;
        align-items: start;
      }
      .alt-chip {
        border: 0;
        cursor: pointer;
        font: inherit;
      }
      @media (max-width: 640px) {
        .alt-muni-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class OfertaFormPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(OfertasApiService);

  readonly busy = signal(false);
  readonly done = signal(false);
  readonly message = signal<string | null>(null);
  readonly alternativos = signal<string[]>([]);
  readonly altDraft = signal('');
  readonly items = signal<DraftItem[]>([]);
  readonly focusFamilia = signal<CategoriaFamilia | null>(null);
  readonly familias = CATEGORIA_FAMILIA_ORDER;
  readonly familiaFlowHint = familiaFlowHint;

  readonly form = this.fb.nonNullable.group({
    oferente_nombre: ['', Validators.required],
    oferente_contacto: [''],
    municipio_preferido: ['', Validators.required],
  });

  readonly visibleFamilias = computed(() => {
    const focus = this.focusFamilia();
    return focus ? [focus] : this.familias;
  });

  readonly hasTransportItems = computed(() =>
    this.items().some((item) => getCategoriaMeta(item.categoria)?.flujo === 'servicio')
  );

  readonly pageTitle = computed(() => {
    switch (this.focusFamilia()) {
      case 'reconstruccion':
        return 'Aportar materiales de reconstrucción';
      case 'transporte':
        return 'Ofrecer transporte';
      default:
        return 'Puedo ayudar';
    }
  });

  readonly pageIntro = computed(() => {
    switch (this.focusFamilia()) {
      case 'reconstruccion':
        return 'Registra cemento, zinc, madera u otros materiales. Coordinación acuerda entrega en obra y acceso vehicular.';
      case 'transporte':
        return 'Registra tu vehículo o capacidad logística. Coordinación confirma contigo ruta, horario y contacto antes de asignar un viaje.';
      default:
        return 'Cuéntanos qué puedes aportar: insumos humanitarios, materiales de reconstrucción o transporte.';
    }
  });

  readonly municipioLabel = computed(() =>
    this.hasTransportItems()
      ? 'Municipio base de operación'
      : 'Municipio donde te queda más fácil entregar'
  );

  readonly altMunicipioLabel = computed(() =>
    this.hasTransportItems()
      ? 'Otros municipios donde también puedes mover carga (opcional)'
      : 'Otros municipios donde también podrías entregar (opcional)'
  );

  readonly doneMessage = computed(() =>
    this.hasTransportItems()
      ? '¡Gracias! Registramos tu transporte. Coordinación te contactará para confirmar ruta y horario.'
      : '¡Gracias! Registramos tu oferta. Coordinación te contactará si hay un emparejamiento.'
  );

  constructor() {
    const route = inject(ActivatedRoute);
    const familiaData = route.snapshot.data['familia'] as CategoriaFamilia | undefined;
    const familiaQuery = route.snapshot.queryParamMap.get('familia') as CategoriaFamilia | null;
    const familia = familiaData || familiaQuery;
    if (familia === 'reconstruccion' || familia === 'transporte') {
      this.focusFamilia.set(familia);
    }

    const municipio = route.snapshot.queryParamMap.get('municipio');
    if (municipio) {
      this.form.controls.municipio_preferido.setValue(municipio);
    }
  }

  backLink(): string {
    const fam = this.focusFamilia();
    if (fam === 'reconstruccion') return '/ayudar/reconstruccion';
    if (fam === 'transporte') return '/ayudar/transporte';
    return '/';
  }

  backQueryParams(): Record<string, string> {
    const municipio = this.form.controls.municipio_preferido.value.trim();
    return municipio ? { municipio } : {};
  }

  familiaLabel(fam: CategoriaFamilia): string {
    return CATEGORIA_FAMILIA_LABELS[fam];
  }

  categoriasPorFamilia(fam: CategoriaFamilia): CategoriaNecesidad[] {
    return getCategoriasByFamilia(fam) as CategoriaNecesidad[];
  }

  categoriaLabel(cat: string): string {
    return CATEGORIA_LABELS[cat] ?? cat;
  }

  itemMeta(cat: CategoriaNecesidad) {
    return getCategoriaMeta(cat);
  }

  hasItem(cat: CategoriaNecesidad): boolean {
    return this.items().some((i) => i.categoria === cat);
  }

  toggleCategoria(cat: CategoriaNecesidad, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (this.hasItem(cat)) return;
      this.items.update((list) => [
        ...list,
        { categoria: cat, cantidad: null, unidad: '', descripcion: '' },
      ]);
    } else {
      this.items.update((list) => list.filter((i) => i.categoria !== cat));
    }
    this.syncContactValidators();
  }

  patchItem(
    cat: CategoriaNecesidad,
    patch: Partial<Omit<DraftItem, 'categoria'>>
  ): void {
    this.items.update((list) =>
      list.map((i) => (i.categoria === cat ? { ...i, ...patch } : i))
    );
  }

  toNumber(value: string | number | null): number | null {
    if (value === '' || value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  addAlternativo(): void {
    const m = this.altDraft().trim();
    const preferred = this.form.controls.municipio_preferido.value.trim();
    if (!m) return;
    if (m === preferred) {
      this.message.set('Ese ya es tu municipio principal.');
      return;
    }
    if (this.alternativos().includes(m)) {
      this.altDraft.set('');
      return;
    }
    this.alternativos.update((list) => [...list, m]);
    this.altDraft.set('');
    this.message.set(null);
  }

  removeAlternativo(municipio: string): void {
    this.alternativos.update((list) => list.filter((m) => m !== municipio));
  }

  submit(): void {
    this.syncContactValidators();
    if (this.form.invalid || this.items().length === 0) return;
    this.busy.set(true);
    this.message.set(null);

    const raw = this.form.getRawValue();
    const preferred = raw.municipio_preferido.trim();
    const alts = this.alternativos().filter((m) => m && m !== preferred);

    this.api
      .createPublic({
        ...raw,
        municipio_preferido: preferred,
        municipios_alternativos: alts,
        items: this.items().map((i) => ({
          categoria: i.categoria,
          cantidad: i.cantidad,
          unidad: i.unidad || null,
          descripcion: i.descripcion || null,
        })),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.done.set(true);
        },
        error: (err) => {
          this.busy.set(false);
          this.message.set(err?.error?.error || 'No se pudo enviar la oferta.');
        },
      });
  }

  private syncContactValidators(): void {
    const ctrl = this.form.controls.oferente_contacto;
    if (this.hasTransportItems()) {
      ctrl.setValidators([Validators.required]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }
}
