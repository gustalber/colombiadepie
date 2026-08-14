import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NecesidadesApiService } from '../../core/api.services';
import { MunicipioSelectComponent } from '../../core/components/municipio-select.component';
import { DirectionsService } from '../../core/directions.service';
import { CategoriaFamilia, CuentaBancaria, Necesidad } from '../../core/models';
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
  lat: number | null;
  lng: number | null;
  cuentasBancarias: CuentaBancaria[];
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
                  <div class="ayudar-group-title">
                    <h3>
                      <a [routerLink]="['/puntos', group.puntoId]">{{ group.nombre }}</a>
                    </h3>
                    <p class="ayudar-group-meta">
                      {{ group.municipio }}
                      · {{ group.needs.length }}
                      {{ group.needs.length === 1 ? 'necesidad' : 'necesidades' }}
                    </p>
                  </div>
                  <div class="ayudar-group-actions">
                    <a class="btn btn-ghost btn-sm" [routerLink]="['/puntos', group.puntoId]">Ver albergue</a>
                    @if (hasCoords(group)) {
                      <button class="btn btn-ghost btn-sm" type="button" (click)="openDirections(group)">
                        Cómo llegar
                      </button>
                    }
                    @if (group.cuentasBancarias.length) {
                      <button class="btn btn-ghost btn-sm" type="button" (click)="openBankAccounts(group)">
                        Cuenta bancaria
                      </button>
                    }
                  </div>
                </header>
                <ul class="ayudar-needs-grid">
                  @for (n of group.needs; track n.id) {
                    <li class="ayudar-need-item" [class.urgent]="n.urgencia === 'alta'">
                      <div class="ayudar-need-main">
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
                      </div>
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

      @if (bankAccountsGroup(); as bankGroup) {
        <div class="modal-backdrop" (click)="closeBankAccounts()">
          <div class="modal-card bank-modal" (click)="$event.stopPropagation()">
            <h3>Cuentas bancarias</h3>
            <p class="bank-modal-intro">
              Puedes transferir o consignar a <strong>{{ bankGroup.nombre }}</strong> ({{ bankGroup.municipio }}).
            </p>
            <ul class="public-bank-list">
              @for (c of bankGroup.cuentasBancarias; track $index) {
                <li class="public-bank-item">
                  <strong>{{ c.banco }}</strong>
                  <span>{{ tipoCuentaLabel(c.tipo_cuenta) }}</span>
                  <code class="public-bank-number">{{ c.numero_cuenta }}</code>
                </li>
              }
            </ul>
            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="closeBankAccounts()">Cerrar</button>
              <a class="btn btn-primary" [routerLink]="['/puntos', bankGroup.puntoId]">Ver albergue</a>
            </div>
          </div>
        </div>
      }
    </app-shell>
  `,
})
export class AyudarPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(NecesidadesApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly directions = inject(DirectionsService);

  readonly familias = CATEGORIA_FAMILIA_ORDER;
  readonly categoriaIcon = categoriaIcon;
  readonly loading = signal(false);
  readonly needs = signal<Necesidad[]>([]);
  readonly routeFamilia = signal<CategoriaFamilia | null>(null);
  readonly bankAccountsGroup = signal<ShelterNeedsGroup | null>(null);

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
        const punto = n.punto;
        map.set(puntoId, {
          puntoId,
          nombre: punto?.nombre || 'Albergue',
          municipio: punto?.municipio || '',
          lat: this.toCoord(punto?.lat),
          lng: this.toCoord(punto?.lng),
          cuentasBancarias: punto?.cuentas_bancarias || [],
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
        return 'Mira dónde se necesita mover carga o personas. Luego registra tu capacidad logística.';
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

  hasCoords(group: ShelterNeedsGroup): boolean {
    return group.lat != null && group.lng != null;
  }

  openDirections(group: ShelterNeedsGroup): void {
    if (!this.hasCoords(group)) return;
    this.directions.open({
      lat: group.lat!,
      lng: group.lng!,
      name: group.nombre,
    });
  }

  openBankAccounts(group: ShelterNeedsGroup): void {
    if (!group.cuentasBancarias.length) return;
    this.bankAccountsGroup.set(group);
  }

  closeBankAccounts(): void {
    this.bankAccountsGroup.set(null);
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

  tipoCuentaLabel(v: string): string {
    return v === 'corriente' ? 'Corriente' : 'Ahorros';
  }

  needQty(n: Necesidad): string | null {
    if (n.cantidad == null) return null;
    if (n.cantidad_solicitada != null && n.cantidad_solicitada !== n.cantidad) {
      return `Faltan ${n.cantidad} de ${n.cantidad_solicitada} ${n.unidad || ''}`.trim();
    }
    return `${n.cantidad} ${n.unidad || ''}`.trim();
  }

  private toCoord(value: number | string | null | undefined): number | null {
    if (value == null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
}
