import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NecesidadesApiService } from '../../core/api.services';
import { MunicipioSelectComponent } from '../../core/components/municipio-select.component';
import { CategoriaFamilia, Necesidad } from '../../core/models';
import {
  CATEGORIA_FAMILIA_LABELS,
  CATEGORIA_FAMILIA_ORDER,
  CATEGORIA_LABELS,
  URGENCIA_LABELS,
  categoriaIcon,
  getCategoriaFamilia,
} from '../../core/utils/labels';
import { QuickOfferPanelComponent } from '../../core/components/quick-offer-panel.component';
import { ShellComponent } from '../../layout/shell.component';

interface ShelterNeedsGroup {
  puntoId: string;
  nombre: string;
  municipio: string;
  needs: Necesidad[];
}

@Component({
  selector: 'app-ayudar-page',
  standalone: true,
  imports: [ShellComponent, ReactiveFormsModule, RouterLink, MunicipioSelectComponent, QuickOfferPanelComponent],
  template: `
    <app-shell>
      <a routerLink="/mapa" class="btn btn-ghost" style="margin-bottom: 0.75rem; display: inline-flex">← Ver mapa de albergues</a>

      <h1>{{ pageTitle() }}</h1>
      <p>{{ pageIntro() }}</p>

      <form class="panel filters-panel ayudar-filters" [formGroup]="filters" (ngSubmit)="load()">
        <div class="form-filters">
          <div class="field">
            <label for="municipio">Municipio</label>
            <app-municipio-select
              inputId="municipio"
              formControlName="municipio"
              [allowEmpty]="true"
              emptyLabel="Todos los municipios"
              placeholder="Buscar municipio…"
            />
          </div>
          <div class="field">
            <label for="familia">Tipo de ayuda</label>
            <select id="familia" formControlName="familia">
              <option value="">Todas</option>
              @for (fam of familias; track fam) {
                <option [value]="fam">{{ familiaLabel(fam) }}</option>
              }
            </select>
          </div>
          <button class="btn btn-primary" type="submit">Filtrar</button>
        </div>
      </form>

      <section class="panel ayudar-results">
        <div class="ayudar-results-head">
          <div>
            <h2>Necesidades abiertas</h2>
            <p>
              @if (loading()) {
                Cargando…
              } @else {
                {{ filteredNeeds().length }}
                {{ filteredNeeds().length === 1 ? 'pedido activo' : 'pedidos activos' }}
                @if (filters.controls.municipio.value) {
                  en {{ filters.controls.municipio.value }}
                }
              }
            </p>
          </div>
        </div>

        @if (loading()) {
          <p class="ops-quiet">Buscando qué hace falta…</p>
        } @else if (filteredNeeds().length === 0) {
          <div class="empty">
            @if (hasActiveFilters()) {
              No hay necesidades abiertas con esos filtros.
              <button class="btn btn-ghost btn-sm" type="button" (click)="clearFilters()">Ver todas</button>
            } @else {
              Por ahora no hay necesidades abiertas reportadas. Igual puedes ofrecer ayuda general.
            }
          </div>
        } @else {
          <div class="ayudar-groups">
            @for (group of groupedNeeds(); track group.puntoId) {
              <article class="ayudar-group panel">
                <header class="ayudar-group-head">
                  <div>
                    <h3>
                      <a [routerLink]="['/puntos', group.puntoId]">{{ group.nombre }}</a>
                    </h3>
                    <p class="ayudar-group-meta">{{ group.municipio }}</p>
                  </div>
                  <a class="btn btn-ghost btn-sm" [routerLink]="['/puntos', group.puntoId]">Ver albergue</a>
                </header>
                <ul class="ayudar-needs-list">
                  @for (n of group.needs; track n.id) {
                    <li class="ayudar-need-item" [class.urgent]="n.urgencia === 'alta'">
                      <div class="ayudar-need-row">
                        <span class="ayudar-need-icon" aria-hidden="true">{{ categoriaIcon(n.categoria) }}</span>
                        <div class="ayudar-need-body">
                          <strong>{{ categoriaLabel(n.categoria) }}</strong>
                          @if (needQty(n); as qty) {
                            <span class="ayudar-need-qty">{{ qty }}</span>
                          }
                          @if (n.descripcion) {
                            <span class="ayudar-need-desc">{{ n.descripcion }}</span>
                          }
                        </div>
                        <span class="tag" [class]="n.urgencia">{{ urgenciaLabel(n.urgencia) }}</span>
                      </div>
                      <app-quick-offer-panel
                        [need]="n"
                        [municipio]="group.municipio"
                        [compact]="true"
                      />
                    </li>
                  }
                </ul>
              </article>
            }
          </div>
        }
      </section>

      <section class="panel ayudar-cta">
        <h2>¿Quieres ofrecer otra cosa?</h2>
        <p>
          Si tienes más aportes o cubres varios municipios, puedes registrar una oferta general.
        </p>
        <div class="ayudar-cta-actions">
          <a class="btn btn-primary" [routerLink]="['/ayudar/registrar']" [queryParams]="registerQueryParams()">
            Registrar mi oferta
          </a>
          <a class="btn btn-secondary" routerLink="/ayuda-humanitaria">Cómo funciona</a>
        </div>
      </section>
    </app-shell>
  `,
  styles: [
    `
      .ayudar-filters {
        margin-bottom: 1rem;
      }
      .ayudar-results {
        margin-bottom: 1rem;
      }
      .ayudar-results-head h2 {
        margin: 0 0 0.25rem;
      }
      .ayudar-results-head p {
        margin: 0;
        color: var(--ink-soft);
      }
      .ayudar-groups {
        display: grid;
        gap: 0.85rem;
        margin-top: 0.85rem;
      }
      .ayudar-group {
        padding: 0.85rem 1rem;
        box-shadow: none;
        border: 1px solid var(--line);
      }
      .ayudar-group-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.65rem;
        margin-bottom: 0.65rem;
      }
      .ayudar-group-head h3 {
        margin: 0 0 0.2rem;
        font-size: 1.05rem;
      }
      .ayudar-group-meta {
        margin: 0;
        color: var(--ink-soft);
        font-size: 0.9rem;
      }
      .ayudar-needs-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 0.55rem;
      }
      .ayudar-need-item {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        padding: 0.65rem 0.75rem;
        border-radius: var(--radius-sm);
        background: #f7faf8;
        border: 1px solid var(--line);
      }
      .ayudar-need-item.urgent {
        border-color: #e8b4ae;
        background: #fff8f7;
      }
      .ayudar-need-row {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.65rem;
        align-items: start;
      }
      .ayudar-need-item:has(.public-quick-offer),
      .ayudar-need-item:has(.public-quick-offer-done) {
        padding-bottom: 0.85rem;
      }
      .ayudar-need-icon {
        font-size: 1.35rem;
        line-height: 1;
        margin-top: 0.1rem;
      }
      .ayudar-need-body {
        display: grid;
        gap: 0.15rem;
        min-width: 0;
      }
      .ayudar-need-body strong {
        color: var(--canopy-deep);
      }
      .ayudar-need-qty {
        font-weight: 700;
        color: var(--canopy-deep);
      }
      .ayudar-need-desc {
        color: var(--ink-soft);
        font-size: 0.9rem;
        line-height: 1.4;
      }
      .ayudar-need-item .public-offer-btn--compact {
        width: 100%;
        margin-top: 0.15rem;
      }
      .ayudar-need-item .public-quick-offer {
        margin-top: 0;
      }
      .ayudar-need-item .public-quick-offer-done {
        margin-top: 0;
      }
      .ayudar-cta {
        text-align: center;
        border-color: var(--canopy);
        background: #eef7f1;
      }
      .ayudar-cta h2 {
        margin: 0 0 0.35rem;
      }
      .ayudar-cta p {
        margin: 0 0 1rem;
        color: var(--ink-soft);
        max-width: 32rem;
        margin-inline: auto;
      }
      .ayudar-cta-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        justify-content: center;
      }
    `,
  ],
})
export class AyudarPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(NecesidadesApiService);
  private readonly route = inject(ActivatedRoute);

  readonly familias = CATEGORIA_FAMILIA_ORDER;
  readonly categoriaIcon = categoriaIcon;
  readonly loading = signal(false);
  readonly needs = signal<Necesidad[]>([]);
  readonly routeFamilia = signal<CategoriaFamilia | null>(null);

  readonly filters = this.fb.nonNullable.group({
    municipio: [''],
    familia: ['' as '' | CategoriaFamilia],
  });

  readonly filteredNeeds = computed(() => {
    const familia = this.filters.controls.familia.value;
    const items = this.needs().filter(
      (n) => n.cantidad == null || Number(n.cantidad) > 0
    );
    if (!familia) return items;
    return items.filter((n) => getCategoriaFamilia(n.categoria) === familia);
  });

  readonly groupedNeeds = computed((): ShelterNeedsGroup[] => {
    const map = new Map<string, ShelterNeedsGroup>();
    for (const n of this.filteredNeeds()) {
      const puntoId = n.punto?.id || n.punto_id;
      if (!map.has(puntoId)) {
        map.set(puntoId, {
          puntoId,
          nombre: n.punto?.nombre || 'Albergue',
          municipio: n.punto?.municipio || '',
          needs: [],
        });
      }
      map.get(puntoId)!.needs.push(n);
    }
    return [...map.values()].sort((a, b) => a.municipio.localeCompare(b.municipio, 'es'));
  });

  readonly pageTitle = computed(() => {
    switch (this.routeFamilia()) {
      case 'reconstruccion':
        return 'Ayudar con reconstrucción';
      case 'transporte':
        return 'Ofrecer transporte';
      default:
        return 'Puedo ayudar';
    }
  });

  readonly pageIntro = computed(() => {
    switch (this.routeFamilia()) {
      case 'reconstruccion':
        return 'Mira qué materiales de obra hacen falta cerca de ti. Luego registra lo que puedes aportar.';
      case 'transporte':
        return 'Mira dónde se necesita mover carga o personas. Luego registra tu vehículo o capacidad logística.';
      default:
        return 'Primero mira qué hace falta en los albergues. Pulsa «Yo aporto» en lo que tengas o registra una oferta general.';
    }
  });

  ngOnInit(): void {
    const familia = this.route.snapshot.data['familia'] as CategoriaFamilia | undefined;
    if (familia === 'reconstruccion' || familia === 'transporte') {
      this.routeFamilia.set(familia);
      this.filters.controls.familia.setValue(familia);
    }

    const municipio = this.route.snapshot.queryParamMap.get('municipio');
    if (municipio) {
      this.filters.controls.municipio.setValue(municipio);
    }

    this.load();
  }

  load(): void {
    this.loading.set(true);
    const municipio = this.filters.controls.municipio.value.trim() || undefined;

    this.api.listOpen({ estado: 'abierta', municipio }, { skipError: true }).subscribe({
      next: (res) => {
        this.needs.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.needs.set([]);
        this.loading.set(false);
      },
    });
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.controls.municipio.value || this.filters.controls.familia.value);
  }

  clearFilters(): void {
    this.filters.reset({ municipio: '', familia: '' });
    if (this.routeFamilia()) {
      this.filters.controls.familia.setValue(this.routeFamilia()!);
    }
    this.load();
  }

  registerQueryParams(): Record<string, string> {
    const queryParams: Record<string, string> = {};
    const municipio = this.filters.controls.municipio.value.trim();
    const familia = this.filters.controls.familia.value || this.routeFamilia();
    if (municipio) queryParams['municipio'] = municipio;
    if (familia) queryParams['familia'] = familia;
    return queryParams;
  }

  familiaLabel(fam: CategoriaFamilia): string {
    return CATEGORIA_FAMILIA_LABELS[fam];
  }

  categoriaLabel(cat: string): string {
    return CATEGORIA_LABELS[cat] ?? cat;
  }

  urgenciaLabel(v: string): string {
    return URGENCIA_LABELS[v] ?? v;
  }

  needQty(n: Necesidad): string | null {
    if (n.cantidad == null) return null;
    if (n.cantidad_solicitada != null && n.cantidad_solicitada !== n.cantidad) {
      return `Faltan ${n.cantidad} de ${n.cantidad_solicitada} ${n.unidad || ''}`.trim();
    }
    return `${n.cantidad} ${n.unidad || ''}`.trim();
  }
}
