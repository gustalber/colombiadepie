import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AfectadosApiService,
  EmparejamientosApiService,
  NecesidadesApiService,
  OfertasApiService,
  PuntosApiService,
} from '../../core/api.services';
import { AuthService } from '../../core/auth.service';
import {
  Afectado,
  CategoriaNecesidad,
  Emparejamiento,
  Necesidad,
  Oferta,
  OfertaItem,
  PuntoDemanda,
  SituacionActualCenso,
} from '../../core/models';
import {
  CATEGORIA_LABELS,
  ESTADO_EMPAREJAMIENTO_LABELS,
  URGENCIA_LABELS,
  timeAgo,
} from '../../core/utils/labels';
import { SITUACION_ACTUAL_LABELS } from '../../core/utils/censo-labels';
import { ShellComponent } from '../../layout/shell.component';

type CoordTab = 'emparejar' | 'revisar' | 'curso' | 'censo';

interface OfferOpt {
  oferta: Oferta;
  item: OfertaItem;
  coversMunicipio: boolean;
}

@Component({
  selector: 'app-coordinacion-page',
  standalone: true,
  imports: [ShellComponent, RouterLink],
  template: `
    <app-shell>
      <h1>Coordinación</h1>
      <p class="lead">
        Une lo que falta en un albergue con lo que alguien puede aportar.
        <a routerLink="/coordinacion/reportes" class="report-link">Ver reportería de censo →</a>
      </p>

      @if (!auth.isLoggedIn()) {
        <div class="banner warn">
          Necesitas <a routerLink="/login">iniciar sesión</a> como coordinador o verificador.
        </div>
      } @else if (!auth.hasRole('coordinador', 'verificador')) {
        <div class="banner warn">
          Este panel es solo para coordinación.
          @if (auth.hasRole('responsable_albergue')) {
            @if (auth.user()?.punto_id; as puntoId) {
              Ve a
              <a [routerLink]="['/puntos', puntoId]">tu albergue</a>
              para actualizar cupos y necesidades.
            }
          }
        </div>
      } @else {
        @if (message()) {
          <div class="banner" [class.ok]="!isError()" [class.danger]="isError()">{{ message() }}</div>
        }

        <div class="coord-stats" [class.two]="!auth.hasRole('coordinador')">
          <button
            type="button"
            class="stat"
            [class.warn]="stalePuntos().length > 0"
            (click)="tab.set('revisar')"
          >
            <strong>{{ stalePuntos().length }}</strong>
            <span>por verificar</span>
          </button>
          @if (auth.hasRole('coordinador')) {
            <button type="button" class="stat" (click)="tab.set('emparejar')">
              <strong>{{ availableItemCount() }}</strong>
              <span>ítems listos</span>
            </button>
            <button
              type="button"
              class="stat"
              [class.warn]="activeMatches().length > 0"
              (click)="tab.set('curso')"
            >
              <strong>{{ activeMatches().length }}</strong>
              <span>en curso</span>
            </button>
          }
        </div>

        <div class="coord-tabs" role="tablist">
          @if (auth.hasRole('coordinador')) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'emparejar'"
              [class.active]="tab() === 'emparejar'"
              (click)="tab.set('emparejar')"
            >
              Emparejar
            </button>
          }
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === 'revisar'"
            [class.active]="tab() === 'revisar'"
            (click)="tab.set('revisar')"
          >
            Verificar
            @if (stalePuntos().length) {
              <span class="tab-count">{{ stalePuntos().length }}</span>
            }
          </button>
          @if (auth.hasRole('coordinador')) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="tab() === 'curso'"
              [class.active]="tab() === 'curso'"
              (click)="selectTab('curso')"
            >
              En curso
              @if (activeMatches().length) {
                <span class="tab-count">{{ activeMatches().length }}</span>
              }
            </button>
          }
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === 'censo'"
            [class.active]="tab() === 'censo'"
            (click)="selectTab('censo')"
          >
            Censo
            @if (censoTotal()) {
              <span class="tab-count">{{ censoTotal() }}</span>
            }
          </button>
        </div>

        @if (tab() === 'emparejar' && auth.hasRole('coordinador')) {
          <section class="panel match-desk">
            <div class="match-step">
              <div class="step-label">1 · ¿En qué municipio?</div>
              @if (municipiosConNecesidad().length === 0) {
                <div class="empty">No hay necesidades abiertas todavía.</div>
              } @else {
                <div class="chip-row">
                  @for (m of municipiosConNecesidad(); track m.name) {
                    <button
                      type="button"
                      class="chip"
                      [class.on]="filterMunicipio() === m.name"
                      (click)="onFilterMunicipio(m.name)"
                    >
                      {{ m.name }}
                      <span class="chip-n">{{ m.count }}</span>
                    </button>
                  }
                </div>
              }
            </div>

            @if (filterMunicipio()) {
              <div class="match-step">
                <div class="step-label">2 · ¿Qué categoría?</div>
                <div class="chip-row">
                  @for (c of categoriasEnMunicipio(); track c.value) {
                    <button
                      type="button"
                      class="chip"
                      [class.on]="filterCategoria() === c.value"
                      [class.dim]="c.needs === 0"
                      (click)="onFilterCategoria(c.value)"
                    >
                      {{ c.label }}
                      <span class="chip-n" [class.need]="c.needs > 0">{{ c.needs }}</span>
                      @if (c.offers > 0) {
                        <span class="chip-n offer">{{ c.offers }}</span>
                      }
                    </button>
                  }
                </div>
                <div class="chip-legend">
                  <span><i class="dot need"></i> necesidades</span>
                  <span><i class="dot offer"></i> ofertas</span>
                </div>
              </div>
            }

            @if (filterMunicipio() && filterCategoria()) {
              <div class="match-step">
                <div class="step-label">
                  3 · Elige necesidad y aporte
                  <span class="step-context">
                    {{ categoriaLabel(filterCategoria()) }} en {{ filterMunicipio() }}
                  </span>
                </div>

                <div class="match-board">
                  <div class="match-col">
                    <div class="col-head">
                      <strong>Necesita</strong>
                      <span>{{ filteredNeeds().length }}</span>
                    </div>
                    <div class="pick-list">
                      @for (n of filteredNeeds(); track n.id) {
                        <button
                          type="button"
                          class="pick"
                          [class.on]="selectedNeedId() === n.id"
                          (click)="selectNeed(n)"
                        >
                          <div class="pick-top">
                            <span class="tag" [class]="n.urgencia">{{ urgenciaLabel(n.urgencia) }}</span>
                            @if (selectedNeedId() === n.id) {
                              <span class="pick-check">Elegida</span>
                            }
                          </div>
                          <strong>{{ n.punto?.nombre || 'Albergue' }}</strong>
                          <div class="pick-qty">
                            @if (n.cantidad != null) {
                              @if (n.cantidad_solicitada != null && n.cantidad_solicitada !== n.cantidad) {
                                Faltan {{ n.cantidad }} de {{ n.cantidad_solicitada }} {{ n.unidad || '' }}
                              } @else {
                                {{ n.cantidad }} {{ n.unidad || '' }}
                              }
                            } @else {
                              Cantidad sin especificar
                            }
                          </div>
                          @if (n.descripcion) {
                            <div class="pick-desc">{{ n.descripcion }}</div>
                          }
                          @if (n.punto?.responsable_contacto; as tel) {
                            <a
                              class="pick-call"
                              [href]="telHref(tel)"
                              (click)="$event.stopPropagation()"
                            >
                              Llamar albergue · {{ tel }}
                            </a>
                          } @else if (n.punto?.responsable_nombre) {
                            <div class="pick-desc">
                              Responsable: {{ n.punto?.responsable_nombre }}
                            </div>
                          }
                        </button>
                      } @empty {
                        <div class="empty tight">
                          No hay necesidades abiertas de
                          {{ categoriaLabel(filterCategoria()) }} aquí.
                        </div>
                      }
                    </div>
                  </div>

                  <div class="match-bridge" aria-hidden="true">→</div>

                  <div class="match-col">
                    <div class="col-head">
                      <strong>Puede aportar</strong>
                      <span>{{ filteredOfferItems().length }}</span>
                    </div>
                    <div class="pick-list">
                      @for (opt of filteredOfferItems(); track opt.item.id) {
                        <button
                          type="button"
                          class="pick"
                          [class.on]="selectedItemId() === opt.item.id"
                          [class.fit]="opt.coversMunicipio"
                          (click)="selectOfferItem(opt.item)"
                        >
                          <div class="pick-top">
                            @if (opt.coversMunicipio) {
                              <span class="tag ok">Sirve para {{ filterMunicipio() }}</span>
                            } @else {
                              <span class="tag">Otra zona</span>
                            }
                            @if (selectedItemId() === opt.item.id) {
                              <span class="pick-check">Elegida</span>
                            }
                          </div>
                          <strong>{{ opt.oferta.oferente_nombre }}</strong>
                          <div class="pick-qty">
                            @if (opt.item.cantidad != null) {
                              {{ opt.item.cantidad }} {{ opt.item.unidad || '' }}
                            } @else {
                              Cantidad sin especificar
                            }
                          </div>
                          @if (opt.item.descripcion) {
                            <div class="pick-desc">{{ opt.item.descripcion }}</div>
                          }
                          @if (opt.oferta.municipio_preferido) {
                            <div class="pick-desc">
                              Entrega: {{ opt.oferta.municipio_preferido }}
                              @if (opt.oferta.municipios_alternativos?.length) {
                                · {{ opt.oferta.municipios_alternativos!.join(', ') }}
                              }
                            </div>
                          }
                          @if (opt.oferta.oferente_contacto; as tel) {
                            <a
                              class="pick-call"
                              [href]="telHref(tel)"
                              (click)="$event.stopPropagation()"
                            >
                              Llamar oferente · {{ tel }}
                            </a>
                          }
                        </button>
                      } @empty {
                        <div class="empty tight">
                          No hay aportes disponibles de
                          {{ categoriaLabel(filterCategoria()) }}.
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
          </section>

          @if (selectionSummary(); as summary) {
            <div class="match-bar">
              <div class="match-bar-copy">
                <div class="match-bar-kicker">Vas a conectar</div>
                <div class="match-bar-line">
                  <strong>{{ summary.needName }}</strong>
                  necesita
                  <strong>{{ summary.categoria }}</strong>
                  ←
                  <strong>{{ summary.offerName }}</strong>
                  aporta
                  @if (summary.qty) {
                    <strong>{{ summary.qty }}</strong>
                  }
                </div>
                @if (summary.remaining != null && summary.solicitada != null) {
                  <div class="match-bar-remaining">
                    @if (summary.remaining > 0) {
                      Quedarán {{ summary.remaining }} de {{ summary.solicitada }}
                      {{ summary.unit }} por cubrir — la necesidad seguirá abierta.
                    } @else {
                      Con esto se reserva el total pedido ({{ summary.solicitada }} {{ summary.unit }}).
                    }
                  </div>
                }
                @if (summary.needPhone || summary.offerPhone) {
                  <div class="match-bar-calls">
                    @if (summary.needPhone; as tel) {
                      <a class="btn btn-ghost btn-sm" [href]="telHref(tel)">Albergue {{ tel }}</a>
                    }
                    @if (summary.offerPhone; as tel) {
                      <a class="btn btn-ghost btn-sm" [href]="telHref(tel)">Oferente {{ tel }}</a>
                    }
                  </div>
                }
              </div>
              <button
                class="btn btn-primary"
                type="button"
                [disabled]="busy()"
                (click)="createMatch()"
              >
                {{ busy() ? 'Emparejando…' : 'Confirmar emparejamiento' }}
              </button>
            </div>
          }
        }

        @if (tab() === 'revisar') {
          <section class="panel">
            <h2>Albergues por verificar</h2>
            <p class="hint">Revisa y marca como verificados los puntos que lo necesiten.</p>
            <div class="list">
              @for (p of stalePuntos(); track p.id) {
                <div class="card-link stale">
                  <strong>{{ p.nombre }}</strong>
                  <div>{{ p.municipio }} · {{ timeAgo(p.updated_at) }}</div>
                  <div class="hero-actions">
                    <a class="btn btn-ghost" [routerLink]="['/puntos', p.id]">Ver</a>
                    <button class="btn btn-secondary" type="button" (click)="verifyPunto(p.id)">
                      Verificar
                    </button>
                  </div>
                </div>
              } @empty {
                <div class="empty">Todo al día: no hay albergues pendientes de verificar.</div>
              }
            </div>
          </section>
        }

        @if (tab() === 'curso' && auth.hasRole('coordinador')) {
          <section class="panel">
            <h2>Emparejamientos en curso</h2>
            <p class="hint">Avanza el estado o cancela si ya no aplica.</p>
            <div class="list">
              @for (m of matches(); track m.id) {
                <div class="card-link">
                  <div class="meta-row" style="margin-bottom: 0.35rem">
                    <span class="tag" [class]="matchTagClass(m.estado)">
                      {{ matchEstadoLabel(m.estado) }}
                    </span>
                  </div>
                  <strong>
                    {{ categoriaLabel(m.necesidad?.categoria || '') }}
                    ↔
                    {{ m.oferta?.oferente_nombre }}
                    @if (m.oferta_item) {
                      ({{ categoriaLabel(m.oferta_item.categoria) }})
                    }
                  </strong>
                  @if (m.cantidad != null) {
                    <div class="hint">Cantidad en este envío: {{ m.cantidad }} {{ m.oferta_item?.unidad || m.necesidad?.unidad || '' }}</div>
                  }
                  @if (m.oferta?.oferente_contacto; as tel) {
                    <div class="hero-actions" style="margin-top: 0.45rem">
                      <a class="btn btn-ghost btn-sm" [href]="telHref(tel)">Llamar oferente · {{ tel }}</a>
                    </div>
                  }
                  @if (canAdvanceMatch(m.estado) || canCancelMatch(m.estado)) {
                    <div class="hero-actions" style="margin-top: 0.65rem">
                      @if (nextMatchAction(m.estado); as next) {
                        <button
                          class="btn btn-primary"
                          type="button"
                          (click)="setMatchEstado(m.id, next.estado)"
                        >
                          {{ next.label }}
                        </button>
                      }
                      @if (canCancelMatch(m.estado)) {
                        <button
                          class="btn btn-ghost"
                          type="button"
                          (click)="setMatchEstado(m.id, 'cancelado')"
                        >
                          Cancelar
                        </button>
                      }
                    </div>
                  }
                  @if (matchHint(m.estado); as hint) {
                    <div class="hint" style="margin-top: 0.5rem">{{ hint }}</div>
                  }
                </div>
              } @empty {
                <div class="empty">Aún no hay emparejamientos.</div>
              }
            </div>
          </section>
        }

        @if (tab() === 'censo') {
          <section class="panel">
            <h2>Censo de afectados</h2>
            <p class="hint">
              Vista consolidada de registros captados por albergues con censo habilitado.
            </p>

            <div class="censo-coord-stats">
              <div class="censo-stat">
                <strong>{{ censoAfectados().length }}</strong>
                <span>registros</span>
              </div>
              <div class="censo-stat">
                <strong>{{ censoPersonasTotal() }}</strong>
                <span>personas</span>
              </div>
              <div class="censo-stat">
                <strong>{{ censoEnAlbergue() }}</strong>
                <span>en albergue</span>
              </div>
            </div>

            <div class="censo-coord-filters">
              <div class="field">
                <label for="censo-coord-municipio">Municipio</label>
                <select id="censo-coord-municipio" [value]="censoFilterMunicipio()" (change)="onCensoFilterMunicipio($event)">
                  <option value="">Todos</option>
                  @for (m of censoMunicipios(); track m) {
                    <option [value]="m">{{ m }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label for="censo-coord-situacion">Situación</label>
                <select id="censo-coord-situacion" [value]="censoFilterSituacion()" (change)="onCensoFilterSituacion($event)">
                  <option value="">Todas</option>
                  @for (item of situacionOptions; track item.value) {
                    <option [value]="item.value">{{ item.label }}</option>
                  }
                </select>
              </div>
              <button class="btn btn-ghost btn-sm" type="button" (click)="loadCenso()" [disabled]="censoLoading()">
                {{ censoLoading() ? 'Actualizando…' : 'Actualizar' }}
              </button>
            </div>

            @if (censoLoading()) {
              <p class="hint">Cargando registros…</p>
            } @else if (censoAfectados().length === 0) {
              <div class="empty">No hay registros de censo todavía.</div>
            } @else {
              <div class="list">
                @for (a of censoAfectados(); track a.id) {
                  <div class="card-link censo-coord-item">
                    <div class="meta-row" style="margin-bottom: 0.35rem">
                      <span class="tag">{{ situacionLabel(a.situacion_actual) }}</span>
                      <span class="tag">{{ a.total_personas }} pers.</span>
                    </div>
                    <strong>{{ a.nombre_referencia || 'Sin referencia' }}</strong>
                    <div class="hint">
                      {{ a.municipio }}
                      @if (a.vereda_barrio) { · {{ a.vereda_barrio }} }
                    </div>
                    @if (a.captado_por; as cap) {
                      <div class="hint">
                        Captado por
                        <a [routerLink]="['/puntos', cap.id, 'censo']">{{ cap.nombre }}</a>
                        · {{ cap.municipio }}
                      </div>
                    }
                    @if (a.punto_acogida; as acog) {
                      <div class="hint">En albergue: {{ acog.nombre }}</div>
                    }
                  </div>
                }
              </div>
            }
          </section>
        }
      }
    </app-shell>
  `,
  styles: [
    `
      .lead {
        margin: 0 0 1rem;
        color: var(--ink-soft);
      }
      .report-link {
        display: inline-block;
        margin-left: 0.35rem;
        font-weight: 700;
      }

      .coord-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.55rem;
        margin-bottom: 0.85rem;
      }

      .coord-stats.two {
        grid-template-columns: 1fr;
        max-width: 14rem;
      }

      .stat {
        border: 1px solid var(--line);
        background: #fff;
        border-radius: 14px;
        padding: 0.7rem 0.8rem;
        text-align: left;
        cursor: pointer;
        font: inherit;
        color: var(--ink);
      }

      .stat strong {
        display: block;
        font-size: 1.35rem;
        color: var(--canopy-deep);
        line-height: 1.1;
      }

      .stat span {
        font-size: 0.82rem;
        color: var(--ink-soft);
      }

      .stat.warn {
        border-color: color-mix(in srgb, var(--rose, #b42318) 35%, var(--line));
        background: color-mix(in srgb, var(--rose, #b42318) 6%, #fff);
      }

      .coord-tabs {
        display: flex;
        gap: 0.35rem;
        margin-bottom: 0.85rem;
        flex-wrap: wrap;
      }

      .coord-tabs button {
        border: 1px solid var(--line);
        background: #fff;
        border-radius: 999px;
        padding: 0.45rem 0.9rem;
        font: inherit;
        font-weight: 700;
        color: var(--ink-soft);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .coord-tabs button.active {
        background: var(--canopy);
        border-color: var(--canopy);
        color: #fff;
      }

      .tab-count {
        display: inline-grid;
        place-items: center;
        min-width: 1.25rem;
        height: 1.25rem;
        padding: 0 0.3rem;
        border-radius: 999px;
        background: color-mix(in srgb, #000 18%, transparent);
        font-size: 0.75rem;
      }

      .coord-tabs button.active .tab-count {
        background: color-mix(in srgb, #fff 25%, transparent);
      }

      .match-desk {
        display: grid;
        gap: 1.15rem;
      }

      .match-step {
        display: grid;
        gap: 0.55rem;
      }

      .step-label {
        font-weight: 800;
        color: var(--canopy-deep);
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        align-items: baseline;
      }

      .step-context {
        font-weight: 600;
        color: var(--ink-soft);
        font-size: 0.9rem;
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border: 1px solid var(--line);
        background: #fff;
        border-radius: 999px;
        padding: 0.45rem 0.75rem;
        font: inherit;
        font-weight: 700;
        color: var(--canopy-deep);
        cursor: pointer;
      }

      .chip.on {
        border-color: var(--canopy);
        background: color-mix(in srgb, var(--canopy) 12%, #fff);
      }

      .chip.dim {
        opacity: 0.72;
      }

      .chip-n {
        font-size: 0.75rem;
        font-weight: 800;
        min-width: 1.2rem;
        height: 1.2rem;
        padding: 0 0.28rem;
        border-radius: 999px;
        display: inline-grid;
        place-items: center;
        background: #eef3f0;
        color: var(--ink-soft);
      }

      .chip-n.need {
        background: color-mix(in srgb, var(--rose, #b42318) 14%, #fff);
        color: var(--rose, #b42318);
      }

      .chip-n.offer {
        background: color-mix(in srgb, var(--canopy) 16%, #fff);
        color: var(--canopy-deep);
      }

      .chip-legend {
        display: flex;
        gap: 0.85rem;
        font-size: 0.8rem;
        color: var(--ink-soft);
      }

      .chip-legend .dot {
        display: inline-block;
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        margin-right: 0.3rem;
        vertical-align: middle;
      }

      .chip-legend .dot.need {
        background: var(--rose, #b42318);
      }

      .chip-legend .dot.offer {
        background: var(--canopy);
      }

      .match-board {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 0.75rem;
        align-items: start;
      }

      .match-bridge {
        align-self: center;
        color: var(--canopy);
        font-size: 1.4rem;
        font-weight: 800;
        padding-top: 1.6rem;
      }

      .match-col {
        min-width: 0;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: #fbfcfb;
        overflow: hidden;
      }

      .col-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.65rem 0.8rem;
        border-bottom: 1px solid var(--line);
        background: #fff;
      }

      .col-head span {
        font-size: 0.85rem;
        color: var(--ink-soft);
        font-weight: 700;
      }

      .pick-list {
        display: grid;
        gap: 0.45rem;
        padding: 0.55rem;
        max-height: 28rem;
        overflow: auto;
      }

      .pick {
        width: 100%;
        text-align: left;
        border: 1px solid var(--line);
        background: #fff;
        border-radius: 12px;
        padding: 0.7rem 0.75rem;
        cursor: pointer;
        font: inherit;
        color: inherit;
        display: grid;
        gap: 0.2rem;
      }

      .pick:hover {
        border-color: color-mix(in srgb, var(--canopy) 45%, var(--line));
      }

      .pick.on {
        border-color: var(--canopy);
        box-shadow: inset 0 0 0 1px var(--canopy);
        background: color-mix(in srgb, var(--canopy) 8%, #fff);
      }

      .pick.fit:not(.on) {
        border-color: color-mix(in srgb, var(--canopy) 35%, var(--line));
      }

      .pick-top {
        display: flex;
        justify-content: space-between;
        gap: 0.4rem;
        align-items: center;
        margin-bottom: 0.15rem;
      }

      .pick-check {
        font-size: 0.75rem;
        font-weight: 800;
        color: var(--canopy);
      }

      .pick-qty {
        font-weight: 700;
        color: var(--canopy-deep);
      }

      .pick-desc {
        font-size: 0.85rem;
        color: var(--ink-soft);
      }

      .pick-call {
        display: inline-flex;
        margin-top: 0.35rem;
        font-size: 0.85rem;
        font-weight: 800;
        color: var(--canopy);
        text-decoration: none;
      }

      .pick-call:hover {
        text-decoration: underline;
      }

      .empty.tight {
        margin: 0.4rem;
        padding: 0.85rem;
      }

      .match-bar {
        position: sticky;
        bottom: 0.75rem;
        z-index: 5;
        margin-top: 0.85rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        justify-content: space-between;
        padding: 0.85rem 1rem;
        border-radius: 16px;
        border: 1px solid var(--canopy);
        background: color-mix(in srgb, var(--canopy) 10%, #fff);
        box-shadow: 0 10px 30px color-mix(in srgb, var(--ink) 12%, transparent);
      }

      .match-bar-kicker {
        font-size: 0.78rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--canopy);
        margin-bottom: 0.15rem;
      }

      .match-bar-line {
        color: var(--ink);
        line-height: 1.35;
      }

      .match-bar-remaining {
        margin-top: 0.25rem;
        font-size: 0.85rem;
        color: var(--ink-soft);
      }

      .match-bar-calls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-top: 0.45rem;
      }

      @media (max-width: 820px) {
        .match-board {
          grid-template-columns: 1fr;
        }

        .match-bridge {
          display: none;
        }

        .coord-stats {
          grid-template-columns: 1fr;
        }

        .match-bar {
          position: sticky;
          bottom: 0.4rem;
        }

        .match-bar .btn {
          width: 100%;
        }

        .censo-coord-filters {
          grid-template-columns: 1fr;
        }
      }

      .censo-coord-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.55rem;
        margin: 0.85rem 0 1rem;
      }

      .censo-stat {
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 0.65rem 0.75rem;
        background: #f7faf8;
        display: grid;
        gap: 0.15rem;
      }

      .censo-stat strong {
        font-size: 1.25rem;
        line-height: 1.1;
      }

      .censo-stat span {
        font-size: 0.85rem;
        color: var(--ink-soft);
      }

      .censo-coord-filters {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 0.65rem;
        align-items: end;
        margin-bottom: 1rem;
      }

      .censo-coord-filters .field {
        margin: 0;
      }

      .censo-coord-item .hint a {
        color: var(--canopy);
        font-weight: 600;
      }
    `,
  ],
})
export class CoordinacionPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly puntosApi = inject(PuntosApiService);
  private readonly ofertasApi = inject(OfertasApiService);
  private readonly necesidadesApi = inject(NecesidadesApiService);
  private readonly matchesApi = inject(EmparejamientosApiService);
  private readonly afectadosApi = inject(AfectadosApiService);
  private readonly router = inject(Router);

  readonly situacionOptions = Object.entries(SITUACION_ACTUAL_LABELS).map(([value, label]) => ({
    value: value as SituacionActualCenso,
    label,
  }));

  readonly tab = signal<CoordTab>('emparejar');
  readonly stalePuntos = signal<PuntoDemanda[]>([]);
  readonly ofertas = signal<Oferta[]>([]);
  readonly matches = signal<Emparejamiento[]>([]);
  readonly openNeeds = signal<Necesidad[]>([]);
  readonly censoAfectados = signal<Afectado[]>([]);
  readonly censoLoading = signal(false);
  readonly censoFilterMunicipio = signal('');
  readonly censoFilterSituacion = signal('');
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly isError = signal(false);

  readonly filterMunicipio = signal('');
  readonly filterCategoria = signal('');
  readonly selectedNeedId = signal('');
  readonly selectedItemId = signal('');

  readonly timeAgo = timeAgo;

  readonly availableItemCount = computed(() => {
    let n = 0;
    for (const o of this.ofertas()) n += this.availableItems(o).length;
    return n;
  });

  readonly activeMatches = computed(() =>
    this.matches().filter((m) =>
      ['propuesto', 'confirmado', 'en_camino'].includes(m.estado)
    )
  );

  readonly censoTotal = computed(() => this.censoAfectados().length);

  readonly censoPersonasTotal = computed(() =>
    this.censoAfectados().reduce((sum, row) => sum + Number(row.total_personas || 0), 0)
  );

  readonly censoEnAlbergue = computed(() =>
    this.censoAfectados().filter((row) => row.situacion_actual === 'en_albergue').length
  );

  readonly censoMunicipios = computed(() => {
    const set = new Set<string>();
    for (const row of this.censoAfectados()) {
      if (row.municipio?.trim()) set.add(row.municipio.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  });

  readonly municipiosConNecesidad = computed(() => {
    const map = new Map<string, number>();
    for (const n of this.openNeeds()) {
      const m = n.punto?.municipio?.trim();
      if (!m) continue;
      map.set(m, (map.get(m) || 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

  readonly categoriasEnMunicipio = computed(() => {
    const municipio = this.filterMunicipio();
    const needCounts = new Map<string, number>();
    for (const n of this.openNeeds()) {
      if ((n.punto?.municipio || '').trim() !== municipio) continue;
      needCounts.set(n.categoria, (needCounts.get(n.categoria) || 0) + 1);
    }

    const offerCounts = new Map<string, number>();
    for (const o of this.ofertas()) {
      for (const item of this.availableItems(o)) {
        offerCounts.set(
          item.categoria,
          (offerCounts.get(item.categoria) || 0) + 1
        );
      }
    }

    const keys = new Set([...needCounts.keys(), ...offerCounts.keys()]);
    return [...keys]
      .map((value) => ({
        value: value as CategoriaNecesidad,
        label: CATEGORIA_LABELS[value] ?? value,
        needs: needCounts.get(value) || 0,
        offers: offerCounts.get(value) || 0,
      }))
      .sort((a, b) => {
        if (b.needs !== a.needs) return b.needs - a.needs;
        return a.label.localeCompare(b.label, 'es');
      });
  });

  readonly filteredNeeds = computed(() => {
    const municipio = this.filterMunicipio();
    const categoria = this.filterCategoria();
    if (!municipio || !categoria) return [];
    return this.openNeeds().filter(
      (n) =>
        n.categoria === categoria &&
        (n.punto?.municipio || '').trim() === municipio
    );
  });

  readonly filteredOfferItems = computed(() => {
    const categoria = this.filterCategoria();
    const municipio = this.filterMunicipio();
    if (!categoria) return [] as OfferOpt[];

    const out: OfferOpt[] = [];
    for (const o of this.ofertas()) {
      for (const item of this.availableItems(o)) {
        if (item.categoria !== categoria) continue;
        out.push({
          oferta: o,
          item,
          coversMunicipio: this.offerCoversMunicipio(o, municipio),
        });
      }
    }
    return out.sort(
      (a, b) => Number(b.coversMunicipio) - Number(a.coversMunicipio)
    );
  });

  readonly selectionSummary = computed(() => {
    const needId = this.selectedNeedId();
    const itemId = this.selectedItemId();
    if (!needId || !itemId) return null;

    const need = this.openNeeds().find((n) => n.id === needId);
    const opt = this.filteredOfferItems().find((o) => o.item.id === itemId);
    if (!need || !opt) return null;

    const matchQty = this.resolveMatchQty(need.cantidad, opt.item.cantidad);
    const unit = opt.item.unidad || need.unidad || '';
    const qty =
      matchQty != null ? `${matchQty} ${unit}`.trim() : '';
    const remaining =
      need.cantidad != null && matchQty != null
        ? Math.max(0, Number(need.cantidad) - matchQty)
        : null;

    return {
      needName: need.punto?.nombre || 'Albergue',
      offerName: opt.oferta.oferente_nombre,
      categoria: this.categoriaLabel(need.categoria),
      qty,
      remaining,
      unit,
      solicitada: need.cantidad_solicitada ?? need.cantidad,
      needPhone: need.punto?.responsable_contacto || null,
      offerPhone: opt.oferta.oferente_contacto || null,
    };
  });

  resolveMatchQty(
    needQty: number | null | undefined,
    offerQty: number | null | undefined
  ): number | null {
    if (needQty == null && offerQty == null) return null;
    if (needQty == null) return offerQty ?? null;
    if (offerQty == null) return needQty;
    return Math.min(Number(needQty), Number(offerQty));
  }

  telHref(raw: string): string {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '#';
    if (/^mailto:/i.test(trimmed) || /@/.test(trimmed)) {
      return trimmed.startsWith('mailto:') ? trimmed : `mailto:${trimmed}`;
    }
    const digits = trimmed.replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : '#';
  }

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) return;
    if (!this.auth.hasRole('coordinador', 'verificador')) {
      void this.router.navigate(this.auth.homePath());
      return;
    }
    if (!this.auth.hasRole('coordinador')) {
      this.tab.set('revisar');
    }
    this.reload();
    this.loadCenso();
  }

  selectTab(value: CoordTab): void {
    this.tab.set(value);
    if (value === 'censo') this.loadCenso();
  }

  situacionLabel(value: SituacionActualCenso): string {
    return SITUACION_ACTUAL_LABELS[value] || value;
  }

  onCensoFilterMunicipio(event: Event): void {
    this.censoFilterMunicipio.set((event.target as HTMLSelectElement).value);
    this.loadCenso();
  }

  onCensoFilterSituacion(event: Event): void {
    this.censoFilterSituacion.set((event.target as HTMLSelectElement).value);
    this.loadCenso();
  }

  loadCenso(): void {
    if (!this.auth.hasRole('coordinador', 'verificador')) return;
    this.censoLoading.set(true);
    const municipio = this.censoFilterMunicipio().trim();
    const situacion = this.censoFilterSituacion().trim();
    this.afectadosApi
      .listCoord({
        municipio: municipio || undefined,
        situacion_actual: situacion || undefined,
        estado_registro: 'activo',
      })
      .subscribe({
        next: (res) => {
          this.censoAfectados.set(res.data);
          this.censoLoading.set(false);
        },
        error: () => {
          this.censoAfectados.set([]);
          this.censoLoading.set(false);
        },
      });
  }

  availableItems(o: Oferta) {
    return (o.items || []).filter((i) => i.estado === 'disponible');
  }

  offerCoversMunicipio(o: Oferta, municipio: string): boolean {
    if (!municipio) return false;
    if (o.municipio_preferido === municipio) return true;
    return (o.municipios_alternativos || []).includes(municipio);
  }

  onFilterMunicipio(value: string): void {
    this.filterMunicipio.set(value);
    this.filterCategoria.set('');
    this.selectedNeedId.set('');
    this.selectedItemId.set('');

    const cats = this.categoriasEnMunicipio();
    const withNeeds = cats.filter((c) => c.needs > 0);
    if (withNeeds.length === 1) {
      this.onFilterCategoria(withNeeds[0].value);
    }
  }

  onFilterCategoria(value: string): void {
    this.filterCategoria.set(value);
    this.selectedNeedId.set('');
    this.selectedItemId.set('');
    queueMicrotask(() => this.autoSelectIfSingle());
  }

  selectNeed(n: Necesidad): void {
    this.selectedNeedId.set(n.id);
  }

  selectOfferItem(item: OfertaItem): void {
    this.selectedItemId.set(item.id);
  }

  private autoSelectIfSingle(): void {
    const needs = this.filteredNeeds();
    const offers = this.filteredOfferItems();
    if (needs.length === 1) this.selectedNeedId.set(needs[0].id);
    if (offers.length === 1) this.selectedItemId.set(offers[0].item.id);
  }

  reload(): void {
    this.puntosApi.list().subscribe({
      next: (res) => {
        this.stalePuntos.set(
          res.data.filter((p) => p.sin_confirmar || !p.verificado)
        );
      },
    });

    this.ofertasApi.list({ estado: 'disponible' }).subscribe({
      next: (res) => this.ofertas.set(res.data),
      error: () => this.ofertas.set([]),
    });

    if (this.auth.hasRole('coordinador')) {
      this.matchesApi.list().subscribe({
        next: (res) => this.matches.set(res.data),
        error: () => this.matches.set([]),
      });

      this.necesidadesApi.listOpen({ estado: 'abierta' }).subscribe({
        next: (res) => {
          this.openNeeds.set(res.data);
          this.bootstrapFilters();
        },
        error: () => this.openNeeds.set([]),
      });
    }
  }

  private bootstrapFilters(): void {
    const municipios = this.municipiosConNecesidad();
    if (!this.filterMunicipio() && municipios.length === 1) {
      this.onFilterMunicipio(municipios[0].name);
    }
  }

  verifyPunto(id: string): void {
    this.puntosApi.verify(id).subscribe({
      next: (updated) => {
        this.isError.set(false);
        this.message.set(
          updated.verificado
            ? 'Albergue verificado. Ábrelo para crear su usuario si hace falta.'
            : 'Se quitó la verificación del albergue.'
        );
        this.reload();
      },
      error: (err) => {
        this.isError.set(true);
        this.message.set(
          err?.error?.error || 'No se pudo actualizar la verificación.'
        );
      },
    });
  }

  createMatch(): void {
    if (!this.selectedNeedId() || !this.selectedItemId()) return;
    this.busy.set(true);
    this.matchesApi
      .create({
        necesidad_id: this.selectedNeedId(),
        oferta_item_id: this.selectedItemId(),
        estado: 'confirmado',
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.isError.set(false);
          this.message.set(
            'Emparejamiento confirmado. Si aún faltaba cantidad, la necesidad sigue abierta para otro aporte.'
          );
          this.selectedNeedId.set('');
          this.selectedItemId.set('');
          this.reload();
          this.tab.set('curso');
        },
        error: (err) => {
          this.busy.set(false);
          this.isError.set(true);
          this.message.set(err?.error?.error || 'No se pudo emparejar.');
        },
      });
  }

  setMatchEstado(id: string, estado: string): void {
    this.matchesApi.updateEstado(id, estado).subscribe({
      next: () => {
        this.isError.set(false);
        this.message.set(`Actualizado: ${this.matchEstadoLabel(estado)}.`);
        this.reload();
      },
      error: (err) => {
        this.isError.set(true);
        this.message.set(err?.error?.error || 'No se pudo actualizar.');
      },
    });
  }

  categoriaLabel(v: string): string {
    return CATEGORIA_LABELS[v] ?? v;
  }

  urgenciaLabel(v: string): string {
    return URGENCIA_LABELS[v] ?? v;
  }

  matchEstadoLabel(v: string): string {
    return ESTADO_EMPAREJAMIENTO_LABELS[v] ?? v;
  }

  matchTagClass(estado: string): string {
    if (estado === 'entregado') return 'ok';
    if (estado === 'cancelado') return 'alta';
    if (estado === 'en_camino') return 'media';
    return '';
  }

  canAdvanceMatch(estado: string): boolean {
    return ['propuesto', 'confirmado'].includes(estado);
  }

  canCancelMatch(estado: string): boolean {
    return ['propuesto', 'confirmado', 'en_camino'].includes(estado);
  }

  nextMatchAction(estado: string): { estado: string; label: string } | null {
    if (estado === 'propuesto' || estado === 'confirmado') {
      return { estado: 'en_camino', label: 'Marcar como en camino' };
    }
    return null;
  }

  matchHint(estado: string): string | null {
    if (estado === 'en_camino') {
      return 'Pendiente de confirmación del responsable del albergue al recibir la ayuda.';
    }
    return null;
  }
}
