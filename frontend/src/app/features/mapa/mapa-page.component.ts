import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { PuntosApiService } from '../../core/api.services';
import { MunicipioSelectComponent } from '../../core/components/municipio-select.component';
import { DirectionsService } from '../../core/directions.service';
import { PuntoDemanda } from '../../core/models';
import {
  ESTADO_PUNTO_LABELS,
  timeAgo,
} from '../../core/utils/labels';
import { ShellComponent } from '../../layout/shell.component';

@Component({
  selector: 'app-mapa-page',
  standalone: true,
  imports: [ShellComponent, ReactiveFormsModule, RouterLink, MunicipioSelectComponent],
  template: `
    <app-shell>
      <section>
        <h1>Encuentra un albergue cerca</h1>
        <p>
          Mira necesidades abiertas y qué tan fresca está la información.
          Todo pensado para usarse con poco tiempo y poca señal.
          Busca <strong>albergues</strong>, <strong>puntos de acogida</strong> y
          ofrece <strong>ayuda humanitaria de última milla</strong>.
        </p>

        <div class="hero-actions">
          <a class="btn btn-primary" routerLink="/">Quiero ayudar</a>
          <a class="btn btn-secondary" routerLink="/puntos/nuevo">Registrar albergue o punto</a>
          <a class="btn btn-ghost" routerLink="/ayuda-humanitaria">Cómo funciona la ayuda</a>
        </div>

        <form class="panel filters-panel" style="margin-bottom: 1rem" [formGroup]="filters" (ngSubmit)="load()">
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
              <label for="estado">Estado</label>
              <select id="estado" formControlName="estado">
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="lleno">Lleno</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
            <button class="btn btn-primary" type="submit">Filtrar</button>
          </div>
        </form>

        <div class="grid-split">
          <div class="map-frame" #mapHost></div>

          <div class="panel">
            <h2>Lista de albergues</h2>
            <p>{{ puntos().length }} encontrados</p>

            @if (loading()) {
              <div class="empty">Cargando albergues…</div>
            } @else if (puntos().length === 0) {
              <div class="empty">
                @if (hasActiveFilters()) {
                  No hay albergues con esos filtros.
                } @else {
                  Aún no hay albergues verificados en el mapa.
                  <a routerLink="/puntos/nuevo">Registra el primero</a>
                }
              </div>
            } @else {
              <div class="list">
                @for (p of puntos(); track p.id) {
                  <div class="card-link" [class.stale]="p.sin_confirmar">
                    <a [routerLink]="['/puntos', p.id]" class="card-link-main">
                      <strong>{{ p.nombre }}</strong>
                      <div>{{ p.municipio }}</div>
                      <div class="meta-row">
                        <span class="tag" [class]="p.estado">{{ estadoLabel(p.estado) }}</span>
                        @if (p.sin_confirmar) {
                          <span class="tag alta">Por confirmar</span>
                        }
                        <span class="tag">{{ timeAgo(p.updated_at) }}</span>
                      </div>
                    </a>
                    @if (hasCoords(p)) {
                      <button
                        class="btn btn-ghost btn-sm"
                        type="button"
                        (click)="openDirections(p)"
                      >
                        Cómo llegar
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <section class="panel" style="margin-top: 1.25rem">
          <h2>Ayuda humanitaria cerca de ti</h2>
          <p>
            Colombia de Pie es un directorio vivo de albergues y donaciones de
            última milla. Consulta la
            <a routerLink="/ayuda-humanitaria">guía de ayuda humanitaria</a>
            o ve albergues por municipio:
          </p>
          <div class="meta-row">
            <a class="tag ok" routerLink="/albergues/cali">Cali</a>
            <a class="tag ok" routerLink="/albergues/buenaventura">Buenaventura</a>
            <a class="tag ok" routerLink="/albergues/quibdo">Quibdó</a>
            <a class="tag ok" routerLink="/albergues/pereira">Pereira</a>
            <a class="tag ok" routerLink="/albergues/armenia">Armenia</a>
            <a class="tag ok" routerLink="/albergues/manizales">Manizales</a>
            <a class="tag" routerLink="/ayuda-humanitaria">Ver todos</a>
          </div>
        </section>
      </section>
    </app-shell>
  `,
})
export class MapaPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapHost') mapHost!: ElementRef<HTMLDivElement>;

  private readonly api = inject(PuntosApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly directions = inject(DirectionsService);
  private map?: L.Map;
  private markers = L.layerGroup();
  private resizeObserver?: ResizeObserver;
  private popupClickHandler?: (event: Event) => void;

  readonly puntos = signal<PuntoDemanda[]>([]);
  readonly loading = signal(false);

  readonly filters = this.fb.nonNullable.group({
    municipio: '',
    estado: '',
  });

  readonly timeAgo = timeAgo;

  ngAfterViewInit(): void {
    this.initMap();
    const municipio = this.route.snapshot.queryParamMap.get('municipio');
    if (municipio) {
      this.filters.patchValue({ municipio });
    }
    this.load();
  }

  ngOnDestroy(): void {
    if (this.popupClickHandler) {
      this.mapHost?.nativeElement.removeEventListener('click', this.popupClickHandler);
    }
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  hasCoords(p: PuntoDemanda): boolean {
    const lat = p.lat != null ? Number(p.lat) : NaN;
    const lng = p.lng != null ? Number(p.lng) : NaN;
    return Number.isFinite(lat) && Number.isFinite(lng);
  }

  openDirections(p: PuntoDemanda): void {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    this.directions.open({ lat, lng, name: p.nombre });
  }

  load(): void {
    this.loading.set(true);
    const { municipio, estado } = this.filters.getRawValue();

    this.api
      .list({ municipio: municipio || undefined, estado: estado || undefined }, { skipError: true })
      .subscribe({
        next: (res) => {
          this.puntos.set(res.data);
          this.renderMarkers(res.data);
          this.loading.set(false);
        },
        error: () => {
          this.puntos.set([]);
          this.renderMarkers([]);
          this.loading.set(false);
        },
      });
  }

  hasActiveFilters(): boolean {
    const { municipio, estado } = this.filters.getRawValue();
    return !!(municipio || estado);
  }

  estadoLabel(estado: string): string {
    return ESTADO_PUNTO_LABELS[estado] ?? estado;
  }

  private initMap(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    this.map = L.map(this.mapHost.nativeElement, {
      center: [4.57, -74.3],
      zoom: 6,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    this.markers.addTo(this.map);

    this.popupClickHandler = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const btn = target?.closest?.('.js-como-llegar') as HTMLElement | null;
      if (!btn) return;
      event.preventDefault();
      const lat = Number(btn.dataset['lat']);
      const lng = Number(btn.dataset['lng']);
      const name = btn.dataset['name'] || undefined;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      this.directions.open({ lat, lng, name });
    };
    this.mapHost.nativeElement.addEventListener('click', this.popupClickHandler);

    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize();
    });
    this.resizeObserver.observe(this.mapHost.nativeElement);
  }

  private renderMarkers(puntos: PuntoDemanda[]): void {
    if (!this.map) return;
    this.markers.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    for (const p of puntos) {
      const lat = p.lat != null ? Number(p.lat) : NaN;
      const lng = p.lng != null ? Number(p.lng) : NaN;
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

      const color =
        p.estado === 'cerrado'
          ? '#888'
          : p.estado === 'lleno'
            ? '#c47b2d'
            : '#2f5d4a';

      const safeName = escapeHtml(p.nombre);
      const safeMuni = escapeHtml(p.municipio);

      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2,
      }      ).bindPopup(
        `<strong>${safeName}</strong><br/>${safeMuni}<br/>
        <a href="/puntos/${p.id}">Ver detalle</a>
        · <button type="button" class="js-como-llegar map-popup-btn"
            data-lat="${lat}" data-lng="${lng}" data-name="${escapeAttr(p.nombre)}">
            Cómo llegar
          </button>`
      );

      marker.addTo(this.markers);
      bounds.push([lat, lng]);
    }

    if (bounds.length) {
      this.map.fitBounds(bounds as L.LatLngBoundsExpression, {
        padding: [30, 30],
      });
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
