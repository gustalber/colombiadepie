import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AfectadosApiService, PuntosApiService } from '../../core/api.services';
import { AuthService } from '../../core/auth.service';
import { MunicipioSelectComponent } from '../../core/components/municipio-select.component';
import {
  CensoReporte,
  CensoReporteBucket,
  PuntoDemanda,
  SituacionActualCenso,
} from '../../core/models';
import {
  SITUACION_ACTUAL_LABELS,
  VIVIENDA_ESTADO_LABELS,
} from '../../core/utils/censo-labels';
import { ShellComponent } from '../../layout/shell.component';

interface BarRow {
  label: string;
  value: number;
  pct: number;
}

@Component({
  selector: 'app-censo-reporte-page',
  standalone: true,
  imports: [ShellComponent, RouterLink, MunicipioSelectComponent, FormsModule, DecimalPipe],
  template: `
    <app-shell>
      <div class="report-head">
        <div>
          @if (auth.hasRole('coordinador', 'verificador')) {
            <a routerLink="/coordinacion" class="btn btn-ghost btn-sm">← Coordinación</a>
          } @else {
            @if (auth.user()?.punto_id; as puntoId) {
              <a [routerLink]="['/puntos', puntoId, 'censo']" class="btn btn-ghost btn-sm">← Censo</a>
            }
          }
          <h1>Reportería · Censo de afectados</h1>
          <p class="lead">
            Visualización de personas afectadas registradas por albergues captadores.
            @if (scopeLabel()) {
              <strong>{{ scopeLabel() }}</strong>
            }
          </p>
        </div>
        <button class="btn btn-secondary" type="button" (click)="load()" [disabled]="loading()">
          {{ loading() ? 'Actualizando…' : 'Actualizar' }}
        </button>
      </div>

      @if (!auth.isLoggedIn()) {
        <div class="banner warn">
          Necesitas <a routerLink="/login">iniciar sesión</a>.
        </div>
      } @else if (!canAccess()) {
        <div class="banner warn">No tienes acceso a esta reportería.</div>
      } @else {
        @if (error()) {
          <div class="banner danger">{{ error() }}</div>
        }

        @if (auth.hasRole('coordinador', 'verificador')) {
          <div class="panel report-filters">
            <div class="field">
              <label for="reporte-municipio">Municipio</label>
              <app-municipio-select
                inputId="reporte-municipio"
                [allowEmpty]="true"
                emptyLabel="Todos los municipios"
                [ngModel]="filterMunicipio()"
                (ngModelChange)="onMunicipioFilter($event)"
              />
            </div>
            <div class="field">
              <label for="reporte-punto">Albergue captador</label>
              <select id="reporte-punto" [value]="filterPuntoId()" (change)="onPuntoFilter($event)">
                <option value="">Todos</option>
                @for (p of puntosCenso(); track p.id) {
                  <option [value]="p.id">{{ p.nombre }} · {{ p.municipio }}</option>
                }
              </select>
            </div>
          </div>
        }

        @if (loading() && !report()) {
          <p class="hint">Cargando reporte…</p>
        } @else {
          @if (report(); as r) {
          <p class="report-meta">
            Generado {{ formatDateTime(r.generado_en) }}
            · {{ r.resumen.total_registros }} registros activos
          </p>

          <div class="report-kpis">
            <article class="kpi">
              <strong>{{ r.resumen.total_personas | number }}</strong>
              <span>Personas afectadas</span>
            </article>
            <article class="kpi">
              <strong>{{ r.resumen.total_registros | number }}</strong>
              <span>Núcleos registrados</span>
            </article>
            <article class="kpi">
              <strong>{{ pctAlbergue(r) }}%</strong>
              <span>En albergue</span>
              <small>{{ r.resumen.en_albergue_personas | number }} pers.</small>
            </article>
            <article class="kpi">
              <strong>{{ r.resumen.personas_discapacidad | number }}</strong>
              <span>Con discapacidad</span>
            </article>
            <article class="kpi">
              <strong>{{ r.resumen.embarazadas | number }}</strong>
              <span>Embarazadas</span>
            </article>
            <article class="kpi">
              <strong>{{ r.resumen.puntos_captadores | number }}</strong>
              <span>Albergues captando</span>
            </article>
          </div>

          <div class="report-grid">
            <section class="panel report-card">
              <h2>Acogida</h2>
              <div
                class="donut"
                [style.background]="donutStyle(r)"
                role="img"
                [attr.aria-label]="'En albergue ' + pctAlbergue(r) + ' por ciento'"
              >
                <div class="donut-hole">
                  <strong>{{ pctAlbergue(r) }}%</strong>
                  <span>en albergue</span>
                </div>
              </div>
              <ul class="donut-legend">
                <li><i class="swatch albergue"></i> En albergue · {{ r.resumen.en_albergue_personas | number }}</li>
                <li><i class="swatch fuera"></i> Fuera · {{ r.resumen.fuera_albergue_personas | number }}</li>
              </ul>
            </section>

            <section class="panel report-card">
              <h2>Pirámide por edad</h2>
              @for (row of edadRows(r); track row.label) {
                <div class="bar-row">
                  <span class="bar-label">{{ row.label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill edad" [style.width.%]="row.pct"></div>
                  </div>
                  <span class="bar-value">{{ row.value | number }}</span>
                </div>
              }
            </section>

            <section class="panel report-card wide">
              <h2>Personas por municipio de afectación</h2>
              @if (municipioRows(r).length === 0) {
                <div class="empty">Sin datos por municipio.</div>
              } @else {
                @for (row of municipioRows(r); track row.label) {
                  <div class="bar-row">
                    <span class="bar-label">{{ row.label }}</span>
                    <div class="bar-track">
                      <div class="bar-fill municipio" [style.width.%]="row.pct"></div>
                    </div>
                    <span class="bar-value">{{ row.value | number }}</span>
                  </div>
                }
              }
            </section>

            <section class="panel report-card">
              <h2>Situación actual</h2>
              @for (row of situacionRows(r); track row.label) {
                <div class="bar-row">
                  <span class="bar-label">{{ row.label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill situacion" [style.width.%]="row.pct"></div>
                  </div>
                  <span class="bar-value">{{ row.value | number }}</span>
                </div>
              }
            </section>

            <section class="panel report-card">
              <h2>Estado de vivienda</h2>
              @for (row of viviendaRows(r); track row.label) {
                <div class="bar-row">
                  <span class="bar-label">{{ row.label }}</span>
                  <div class="bar-track">
                    <div class="bar-fill vivienda" [style.width.%]="row.pct"></div>
                  </div>
                  <span class="bar-value">{{ row.value | number }}</span>
                </div>
              }
            </section>

            <section class="panel report-card">
              <h2>Necesidades más mencionadas</h2>
              @if (r.necesidades_top.length === 0) {
                <div class="empty">Aún no hay necesidades registradas.</div>
              } @else {
                @for (item of r.necesidades_top; track item.nombre) {
                  <div class="bar-row">
                    <span class="bar-label">{{ item.nombre }}</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill necesidad"
                        [style.width.%]="necesidadPct(item.menciones, r.necesidades_top)"
                      ></div>
                    </div>
                    <span class="bar-value">{{ item.menciones }}</span>
                  </div>
                }
              }
            </section>

            <section class="panel report-card wide">
              <h2>Captura por albergue</h2>
              @if (r.por_captador.length === 0) {
                <div class="empty">Sin registros captados.</div>
              } @else {
                @for (c of r.por_captador; track c.punto_id) {
                  <div class="bar-row">
                    <span class="bar-label" [title]="c.nombre">
                      {{ c.nombre }}
                      <small>{{ c.municipio }}</small>
                    </span>
                    <div class="bar-track">
                      <div
                        class="bar-fill captador"
                        [style.width.%]="captadorPct(c.personas, r.por_captador)"
                      ></div>
                    </div>
                    <span class="bar-value">{{ c.personas | number }}</span>
                  </div>
                }
              }
            </section>

            <section class="panel report-card wide">
              <h2>Registros últimos 14 días</h2>
              <div class="timeline">
                @for (d of r.registros_por_dia; track d.fecha) {
                  <div class="timeline-col" [title]="d.fecha + ': ' + d.registros + ' registros'">
                    <div
                      class="timeline-bar"
                      [style.height.%]="timelinePct(d.registros, r.registros_por_dia)"
                    ></div>
                    <span class="timeline-n">{{ d.registros || '·' }}</span>
                    <span class="timeline-d">{{ shortDate(d.fecha) }}</span>
                  </div>
                }
              </div>
            </section>
          </div>
          }
        }
      }
    </app-shell>
  `,
  styles: [
    `
      .report-head {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
      }
      .lead {
        margin: 0.35rem 0 0;
        color: var(--ink-soft);
      }
      .report-meta {
        margin: 0 0 0.85rem;
        color: var(--ink-soft);
        font-size: 0.92rem;
      }
      .report-filters {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .report-kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.55rem;
        margin-bottom: 1rem;
      }
      .kpi {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #fff;
        padding: 0.75rem 0.85rem;
        display: grid;
        gap: 0.15rem;
      }
      .kpi strong {
        font-size: 1.45rem;
        line-height: 1.1;
        color: var(--canopy-deep);
      }
      .kpi span {
        color: var(--ink-soft);
        font-size: 0.88rem;
      }
      .kpi small {
        color: var(--leaf);
        font-size: 0.82rem;
      }
      .report-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.85rem;
      }
      .report-card h2 {
        margin: 0 0 0.75rem;
        font-size: 1.05rem;
      }
      .report-card.wide {
        grid-column: 1 / -1;
      }
      .donut {
        width: 160px;
        height: 160px;
        border-radius: 50%;
        margin: 0 auto 0.75rem;
        position: relative;
      }
      .donut-hole {
        position: absolute;
        inset: 22%;
        border-radius: 50%;
        background: #fff;
        display: grid;
        place-content: center;
        text-align: center;
        padding: 0.35rem;
      }
      .donut-hole strong {
        font-size: 1.35rem;
        color: var(--canopy-deep);
      }
      .donut-hole span {
        font-size: 0.75rem;
        color: var(--ink-soft);
      }
      .donut-legend {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.35rem;
        font-size: 0.9rem;
        color: var(--ink-soft);
      }
      .donut-legend li {
        display: flex;
        align-items: center;
        gap: 0.45rem;
      }
      .swatch {
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 999px;
        display: inline-block;
      }
      .swatch.albergue {
        background: var(--canopy);
      }
      .swatch.fuera {
        background: var(--amber);
      }
      .bar-row {
        display: grid;
        grid-template-columns: minmax(5.5rem, 34%) 1fr auto;
        gap: 0.45rem;
        align-items: center;
        margin-bottom: 0.45rem;
      }
      .bar-label {
        font-size: 0.86rem;
        color: var(--ink-soft);
        line-height: 1.2;
      }
      .bar-label small {
        display: block;
        color: var(--leaf);
        font-size: 0.75rem;
      }
      .bar-track {
        height: 0.65rem;
        background: #e8efea;
        border-radius: 999px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 999px;
        min-width: 2px;
      }
      .bar-fill.edad { background: #4f8a6b; }
      .bar-fill.municipio { background: #2f5d4a; }
      .bar-fill.situacion { background: #3d7a62; }
      .bar-fill.vivienda { background: #6a8f7b; }
      .bar-fill.necesidad { background: #c47b2d; }
      .bar-fill.captador { background: #1f3f33; }
      .bar-value {
        font-size: 0.86rem;
        font-weight: 700;
        color: var(--canopy-deep);
        min-width: 2rem;
        text-align: right;
      }
      .timeline {
        display: grid;
        grid-template-columns: repeat(14, minmax(0, 1fr));
        gap: 0.35rem;
        align-items: end;
        min-height: 140px;
      }
      .timeline-col {
        display: grid;
        gap: 0.2rem;
        justify-items: center;
        align-content: end;
        min-height: 130px;
      }
      .timeline-bar {
        width: 100%;
        max-width: 1.4rem;
        background: linear-gradient(180deg, var(--canopy), var(--leaf));
        border-radius: 6px 6px 2px 2px;
        min-height: 4px;
      }
      .timeline-n {
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--canopy-deep);
      }
      .timeline-d {
        font-size: 0.65rem;
        color: var(--ink-soft);
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        max-height: 3.2rem;
      }
      @media (max-width: 820px) {
        .report-grid {
          grid-template-columns: 1fr;
        }
        .timeline-d {
          writing-mode: horizontal-tb;
          transform: none;
        }
      }
    `,
  ],
})
export class CensoReportePageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly afectadosApi = inject(AfectadosApiService);
  private readonly puntosApi = inject(PuntosApiService);
  private readonly router = inject(Router);

  readonly report = signal<CensoReporte | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly filterMunicipio = signal('');
  readonly filterPuntoId = signal('');
  readonly puntosCenso = signal<PuntoDemanda[]>([]);

  readonly scopeLabel = computed(() => {
    if (this.auth.hasRole('responsable_albergue')) return 'Solo tu albergue captador';
    const municipio = this.filterMunicipio().trim();
    const puntoId = this.filterPuntoId();
    if (puntoId) {
      const p = this.puntosCenso().find((row) => row.id === puntoId);
      if (p) return `Albergue: ${p.nombre}`;
    }
    if (municipio) return `Municipio: ${municipio}`;
    return 'Todos los registros activos';
  });

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) return;
    if (!this.canAccess()) {
      void this.router.navigate(this.auth.homePath());
      return;
    }
    if (this.auth.hasRole('coordinador', 'verificador')) {
      this.puntosApi.list().subscribe({
        next: (res) =>
          this.puntosCenso.set(res.data.filter((p) => p.censo_afectados_habilitado)),
        error: () => this.puntosCenso.set([]),
      });
    }
    this.load();
  }

  canAccess(): boolean {
    return this.auth.hasRole('coordinador', 'verificador', 'responsable_albergue');
  }

  onMunicipioFilter(value: string): void {
    this.filterMunicipio.set(value || '');
    this.load();
  }

  onPuntoFilter(event: Event): void {
    this.filterPuntoId.set((event.target as HTMLSelectElement).value);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    const municipio = this.filterMunicipio().trim() || undefined;
    const puntoId = this.filterPuntoId() || undefined;

    const req =
      this.auth.hasRole('responsable_albergue') && this.auth.user()?.punto_id
        ? this.afectadosApi.getReporteByPunto(this.auth.user()!.punto_id!, { municipio })
        : this.afectadosApi.getReporte({
            municipio,
            punto_id: puntoId,
          });

    req.subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.report.set(null);
        this.loading.set(false);
        this.error.set(err?.error?.error || 'No se pudo cargar el reporte.');
      },
    });
  }

  pctAlbergue(r: CensoReporte): number {
    if (!r.resumen.total_personas) return 0;
    return Math.round((r.resumen.en_albergue_personas / r.resumen.total_personas) * 100);
  }

  donutStyle(r: CensoReporte): string {
    const pct = this.pctAlbergue(r);
    return `conic-gradient(var(--canopy) 0 ${pct}%, var(--amber) ${pct}% 100%)`;
  }

  edadRows(r: CensoReporte): BarRow[] {
    const items = [
      { label: '0–5 años', value: r.por_edad.ninos_0_5 },
      { label: '6–17 años', value: r.por_edad.ninos_6_17 },
      { label: 'Hombres 18–59', value: r.por_edad.adultos_hombres },
      { label: 'Mujeres 18–59', value: r.por_edad.adultos_mujeres },
      { label: '60+ años', value: r.por_edad.adultos_mayores_60 },
    ];
    return this.toBarRows(items);
  }

  municipioRows(r: CensoReporte): BarRow[] {
    return this.bucketRows(r.por_municipio, (v) => v);
  }

  situacionRows(r: CensoReporte): BarRow[] {
    return this.bucketRows(r.por_situacion, (v) =>
      SITUACION_ACTUAL_LABELS[v as SituacionActualCenso] || v
    );
  }

  viviendaRows(r: CensoReporte): BarRow[] {
    return this.bucketRows(
      r.por_vivienda,
      (v) => VIVIENDA_ESTADO_LABELS[v as keyof typeof VIVIENDA_ESTADO_LABELS] || v
    );
  }

  necesidadPct(value: number, rows: CensoReporte['necesidades_top']): number {
    const max = rows[0]?.menciones || 0;
    return max ? Math.round((value / max) * 100) : 0;
  }

  captadorPct(value: number, rows: CensoReporte['por_captador']): number {
    const max = rows[0]?.personas || 0;
    return max ? Math.round((value / max) * 100) : 0;
  }

  timelinePct(value: number, rows: CensoReporte['registros_por_dia']): number {
    const max = Math.max(...rows.map((d) => d.registros), 1);
    return Math.max(4, Math.round((value / max) * 100));
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  }

  shortDate(iso: string): string {
    const date = new Date(iso + 'T12:00:00');
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }

  private bucketRows(
    buckets: CensoReporteBucket[],
    labelFn: (clave: string) => string
  ): BarRow[] {
    const items = buckets.slice(0, 10).map((row) => ({
      label: row.etiqueta || labelFn(String(row.clave || '')),
      value: row.personas,
    }));
    return this.toBarRows(items);
  }

  private toBarRows(items: Array<{ label: string; value: number }>): BarRow[] {
    const max = Math.max(...items.map((i) => i.value), 1);
    return items.map((item) => ({
      ...item,
      pct: Math.round((item.value / max) * 100),
    }));
  }
}
