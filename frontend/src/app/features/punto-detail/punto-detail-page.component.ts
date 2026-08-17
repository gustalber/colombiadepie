import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  EmparejamientosApiService,
  NecesidadesApiService,
  OfertasApiService,
  PuntosApiService,
  UsuariosApiService,
} from '../../core/api.services';
import {
  CuentaBancaria,
  Emparejamiento,
  Necesidad,
  Oferta,
  OfertaItem,
  PuntoDemanda,
  Usuario,
} from '../../core/models';
import { placeShelterSchema } from '../../core/seo/seo.schema';
import { SeoService } from '../../core/seo/seo.service';
import { DirectionsService } from '../../core/directions.service';
import {
  CATEGORIA_LABELS,
  ESTADO_EMPAREJAMIENTO_LABELS,
  ESTADO_PUNTO_LABELS,
  TIPO_PUNTO_LABELS,
  URGENCIA_LABELS,
  categoriaIcon,
  formatDateTime,
  timeAgo,
} from '../../core/utils/labels';
import { ShellComponent } from '../../layout/shell.component';
import { InstagramShareDialogComponent } from '../../core/components/instagram-share-dialog.component';
import { QuickOfferPanelComponent } from '../../core/components/quick-offer-panel.component';
import {
  buildShareNeedBlocks,
  buildShelterInstagramCaption,
  ShareNeedBlock,
} from '../../core/utils/instagram-share';
import { environment } from '../../../environments/environment';
import { ofertaDonorKey, donorIdentityKey } from '../../core/utils/donor-profile';

interface OfferOpt {
  oferta: Oferta;
  item: OfertaItem;
  coversMunicipio: boolean;
  matchQty: number | null;
}

interface DonorGroup {
  key: string;
  oferta: Oferta;
  items: OfferOpt[];
  coversMunicipio: boolean;
}

interface DonorMatchGroup {
  key: string;
  nombre: string;
  contacto: string | null;
  matches: Emparejamiento[];
}

@Component({
  selector: 'app-punto-detail-page',
  standalone: true,
  imports: [ShellComponent, RouterLink, ReactiveFormsModule, InstagramShareDialogComponent, QuickOfferPanelComponent],
  template: `
    <app-shell>
      @if (loading()) {
        <div class="empty">Cargando albergue…</div>
      } @else if (error()) {
        <div class="banner danger">{{ error() }}</div>
      } @else if (punto()) {
        @let p = punto()!;

        <a
          class="btn btn-ghost"
          style="margin-bottom: 0.75rem; display: inline-flex"
          [routerLink]="isOwnShelter() ? auth.homePath() : ['/']"
        >
          ← {{ isOwnShelter() ? 'Inicio' : isPublicVisitor() ? 'Ver todos los albergues' : 'Volver al mapa' }}
        </a>

        @if (actionMessage()) {
          <div
            class="banner"
            [class.ok]="!actionIsError()"
            [class.danger]="actionIsError()"
          >
            {{ actionMessage() }}
          </div>
        }

        @if (isPublicVisitor()) {
          <div class="public-page">
            @if (publicOpenNeeds().length > 0) {
              <section id="public-needs" class="public-needs panel public-needs-primary">
                <header class="public-needs-top">
                  <div class="public-needs-top-row">
                    <span class="public-hero-badge">Pedido de ayuda</span>
                    @if (canShareOnInstagram()) {
                      <button
                        class="btn btn-instagram btn-sm public-share-btn"
                        type="button"
                        (click)="openInstagramShare()"
                      >
                        Compartir
                      </button>
                    }
                  </div>
                  <h1 class="public-needs-title">Les falta esto</h1>
                  <p class="public-shelter-ref">
                    <span>{{ p.municipio }}</span>
                    <span class="public-shelter-ref-sep" aria-hidden="true">·</span>
                    <span>{{ p.nombre }}</span>
                  </p>
                  <div class="public-trust">
                    @if (p.verificado) {
                      <span class="public-trust-item ok">✓ Revisado por coordinación</span>
                    }
                    <span class="public-trust-item">Actualizado {{ timeAgo(p.updated_at) }}</span>
                  </div>
                </header>

                @if (publicUrgentNeeds().length > 0) {
                  <p class="public-urgent-banner">
                    ⚡ {{ publicUrgentNeeds().length }}
                    {{ publicUrgentNeeds().length === 1 ? 'necesidad urgente' : 'necesidades urgentes' }}
                    — tu aporte puede ser hoy
                  </p>
                }

                <div class="public-needs-grid">
                  @for (n of publicOpenNeeds(); track n.id) {
                    <article
                      class="public-need-card public-need-card--hero"
                      [class.urgent]="n.urgencia === 'alta'"
                    >
                      <div class="public-need-icon" aria-hidden="true">{{ categoriaIcon(n.categoria) }}</div>
                      <div class="public-need-body">
                        <div class="public-need-top">
                          <span class="public-need-cat">{{ categoriaLabel(n.categoria) }}</span>
                          @if (n.urgencia === 'alta') {
                            <span class="public-need-urgent-pill">Urgente</span>
                          } @else if (n.urgencia === 'media') {
                            <span class="public-need-priority">Prioridad media</span>
                          }
                        </div>
                        @if (needQtyLabel(n); as qty) {
                          <div class="public-need-qty">{{ qty }}</div>
                        } @else {
                          <div class="public-need-qty muted">Cantidad por confirmar contigo</div>
                        }
                        @if (showNeedDesc(n)) {
                          <p class="public-need-desc">{{ n.descripcion }}</p>
                        }

                        <app-quick-offer-panel [need]="n" [municipio]="p.municipio" />
                      </div>
                    </article>
                  }
                </div>
              </section>

              <section class="public-how panel">
                <h2>Así funciona tu ayuda</h2>
                <ol class="public-steps">
                  <li>
                    <strong>Dices cuánto puedes aportar</strong>
                    <span>Pulsa «Yo aporto» en lo que tengas disponible.</span>
                  </li>
                  <li>
                    <strong>El albergue te llama</strong>
                    <span>Con tu teléfono acordáis cuándo y cómo entregar.</span>
                  </li>
                  <li>
                    <strong>Llevas la ayuda</strong>
                    <span>Sin filas ni trámites: solo entregar lo prometido.</span>
                  </li>
                </ol>
              </section>

              @if (p.cuentas_bancarias?.length) {
                <section class="public-bank panel">
                  <h2>Transferencia bancaria</h2>
                  <p class="public-bank-intro">
                    También puedes apoyar a {{ p.nombre }} con una consignación o transferencia.
                  </p>
                  <ul class="public-bank-list">
                    @for (c of p.cuentas_bancarias!; track $index) {
                      <li class="public-bank-item">
                        <strong>{{ c.banco }}</strong>
                        <span>{{ tipoCuentaLabel(c.tipo_cuenta) }}</span>
                        <code class="public-bank-number">{{ c.numero_cuenta }}</code>
                      </li>
                    }
                  </ul>
                </section>
              }
            } @else {
              <section class="public-empty panel">
                <span class="public-hero-badge">Pedido de ayuda</span>
                <p class="public-shelter-ref">
                  <span>{{ p.municipio }}</span>
                  <span class="public-shelter-ref-sep" aria-hidden="true">·</span>
                  <span>{{ p.nombre }}</span>
                </p>
                <div class="public-empty-icon" aria-hidden="true">🤝</div>
                <h1 class="public-needs-title">Sin pedidos abiertos por ahora</h1>
                <p>
                  Este albergue no reporta necesidades en este momento, pero puedes
                  ofrecer ayuda general para {{ p.municipio }}.
                </p>
              </section>

              @if (p.cuentas_bancarias?.length) {
                <section class="public-bank panel">
                  <h2>Transferencia bancaria</h2>
                  <p class="public-bank-intro">
                    También puedes apoyar a {{ p.nombre }} con una consignación o transferencia.
                  </p>
                  <ul class="public-bank-list">
                    @for (c of p.cuentas_bancarias!; track $index) {
                      <li class="public-bank-item">
                        <strong>{{ c.banco }}</strong>
                        <span>{{ tipoCuentaLabel(c.tipo_cuenta) }}</span>
                        <code class="public-bank-number">{{ c.numero_cuenta }}</code>
                      </li>
                    }
                  </ul>
                </section>
              }
            }

            <section class="public-cta panel">
              <h2>¿Tienes algo de la lista?</h2>
              <p>Elige un ítem arriba, indica cuánto puedes llevar y listo.</p>
              <div class="public-cta-actions">
                @if (publicOpenNeeds().length > 0) {
                  <button
                    type="button"
                    class="btn btn-primary public-cta-main"
                    (click)="scrollToPublicNeeds()"
                  >
                    Ver qué necesitan
                  </button>
                } @else {
                  <a
                    class="btn btn-primary public-cta-main"
                    routerLink="/ayudar/registrar"
                    [queryParams]="offerHelpQueryParams(p)"
                  >
                    Ofrecer ayuda general
                  </a>
                }
                @if (canShareOnInstagram()) {
                  <button class="btn btn-instagram" type="button" (click)="openInstagramShare()">
                    Compartir para que más gente ayude
                  </button>
                }
                @if (hasCoords(p)) {
                  <button class="btn btn-secondary" type="button" (click)="openDirections(p)">
                    Ver cómo llegar
                  </button>
                }
              </div>
            </section>

            <details class="ops-fold public-more">
              <summary>Ubicación y datos del albergue</summary>
              <div class="ops-facts">
                @if (p.direccion) {
                  <div><span>Dirección</span><strong>{{ p.direccion }}</strong></div>
                }
                <div><span>Municipio</span><strong>{{ p.municipio }}</strong></div>
                <div><span>Tipo de punto</span><strong>{{ tipoLabel(p.tipo) }}</strong></div>
                <div><span>Estado</span><strong>{{ estadoLabel(p.estado) }}</strong></div>
              </div>
            </details>

            @if (publicOpenNeeds().length > 0) {
              <div class="public-sticky-cta">
                <button
                  type="button"
                  class="btn btn-primary public-sticky-btn"
                  (click)="scrollToPublicNeeds()"
                >
                  Yo aporto — elige arriba
                </button>
              </div>
            }
          </div>
        } @else {
        <header class="ops-header">
          <div class="ops-header-main">
            <p class="ops-kicker">
              {{ isOwnShelter() ? 'Tu albergue' : 'Albergue' }} · {{ p.municipio }}
            </p>
            <h1>{{ p.nombre }}</h1>
            <p class="ops-sub">
              {{ tipoLabel(p.tipo) }}
              · Actualizado {{ timeAgo(p.updated_at) }}
              @if (p.direccion) {
                · {{ p.direccion }}
              }
            </p>
          </div>
          <div class="ops-cupo" [class.warn]="p.estado === 'lleno'" [class.muted]="p.estado === 'cerrado'">
            <span class="tag" [class]="p.estado">{{ estadoLabel(p.estado) }}</span>
          </div>
        </header>

        <div class="ops-status-row">
          @if (p.verificado) {
            <span class="tag ok">Verificado</span>
          } @else {
            <span class="tag">Sin verificar</span>
          }
          @if (p.sin_confirmar) {
            <span class="tag alta">Por confirmar (+10 h)</span>
          }
        </div>

        @if (p.sin_confirmar) {
          <div class="banner warn">
            Sin actividad reciente: la ficha del albergue ni sus necesidades se han actualizado en más de 10 horas.
          </div>
        }

        <div class="ops-actions">
          @if (hasCoords(p)) {
            <button class="btn btn-secondary" type="button" (click)="openDirections(p)">
              Cómo llegar
            </button>
          }
          @if (canEdit()) {
            <a class="btn btn-secondary" [routerLink]="['/puntos', p.id, 'editar']">
              Actualizar datos
            </a>
            <button class="btn btn-secondary" type="button" (click)="openBankAccountsModal()">
              Cuentas bancarias
            </button>
            @if (canAccessCenso()) {
              <a class="btn btn-secondary" [routerLink]="['/puntos', p.id, 'censo']">
                Censo de afectados
              </a>
            }
            @if (canRequestHelp()) {
              <a class="btn btn-primary" [routerLink]="['/puntos', p.id, 'necesidades', 'nueva']">
                Pedir ayuda
              </a>
            } @else {
              <button class="btn btn-primary" type="button" disabled title="El albergue debe estar verificado">
                Pedir ayuda
              </button>
            }
            @if (canShareOnInstagram()) {
              <button class="btn btn-instagram" type="button" (click)="startSharePick()">
                Compartir necesidades
              </button>
            }
          }
          @if (canVerify()) {
            <button class="btn btn-secondary" type="button" (click)="toggleVerify()" [disabled]="busy()">
              {{ p.verificado ? 'Quitar verificación' : 'Marcar verificado' }}
            </button>
          }
          @if (canManageUsers()) {
            <label class="ops-censo-toggle">
              <input
                type="checkbox"
                [checked]="p.censo_afectados_habilitado"
                [disabled]="busy()"
                (change)="toggleCensoAfectados($event)"
              />
              Censo de afectados
            </label>
            <button
              class="btn btn-secondary"
              type="button"
              (click)="showUserForm.set(!showUserForm())"
              [disabled]="!p.verificado"
            >
              {{ showUserForm() ? 'Ocultar usuario' : 'Crear usuario' }}
            </button>
          }
          @if (!isOwnShelter()) {
            <a
              class="btn btn-ghost"
              routerLink="/ayudar/registrar"
              [queryParams]="offerHelpQueryParams(p)"
            >
              Ofrecer ayuda
            </a>
          }
          @if (canShareOnInstagram() && !canEdit()) {
            <button class="btn btn-instagram" type="button" (click)="startSharePick()">
              Compartir necesidades
            </button>
          }
        </div>

        @if (canEdit() && !p.verificado) {
          <div class="banner warn">
            Este albergue aún no está verificado. Un coordinador debe verificarlo antes de pedir ayuda o emparejar ofertas.
          </div>
        }

        @if (canManageUsers() && !p.verificado) {
          <div class="banner warn">
            Primero marca el albergue como verificado para poder crear su usuario.
          </div>
        }

        @if (canManageUsers() && p.verificado && showUserForm()) {
          <section class="panel" style="margin-top: 1rem">
            <h2>Crear usuario del albergue</h2>
            <p>
              Cuenta de <strong>responsable de albergue</strong> para actualizar cupos y necesidades.
            </p>
            <form class="form-grid" [formGroup]="userForm" (ngSubmit)="createUser()">
              <div class="field">
                <label for="user_nombre">Nombre *</label>
                <input id="user_nombre" formControlName="nombre" placeholder="Ej. María López" />
              </div>
              <div class="field">
                <label for="user_email">Correo *</label>
                <input id="user_email" type="email" formControlName="email" autocomplete="off" />
              </div>
              <div class="hint">
                Al crear, verás aquí la contraseña temporal para copiarla y enviarla.
              </div>
              <button
                class="btn btn-primary"
                type="submit"
                [disabled]="userForm.invalid || busyUser()"
              >
                {{ busyUser() ? 'Creando…' : 'Crear usuario' }}
              </button>
            </form>

            @if (tempPassword(); as pwd) {
              <div class="password-reveal">
                <strong>Contraseña temporal</strong>
                <div class="pwd-meta">
                  Para {{ tempPasswordEmail() }}. Cópiala ahora: no se volverá a mostrar.
                </div>
                <div class="pwd-value">{{ pwd }}</div>
                <button class="btn btn-secondary" type="button" (click)="copyTempPassword()">
                  {{ copied() ? 'Copiada' : 'Copiar contraseña' }}
                </button>
              </div>
            }
          </section>
        }

        @if (canManageUsers() && puntoUsers().length > 0) {
          <section class="panel" style="margin-top: 1rem">
            <h2>Usuarios de este albergue</h2>
            <div class="list">
              @for (u of puntoUsers(); track u.id) {
                <div class="ops-row">
                  <div>
                    <strong>{{ u.nombre }}</strong>
                    <div class="ops-row-meta">{{ u.email }}</div>
                  </div>
                  <button
                    class="btn btn-ghost"
                    type="button"
                    [disabled]="busyReset() === u.id"
                    (click)="resetPassword(u)"
                  >
                    {{ busyReset() === u.id ? 'Generando…' : 'Resetear contraseña' }}
                  </button>
                </div>
              }
            </div>
          </section>
        }

        @if (canSelfMatch()) {
          <section class="panel match-desk" style="margin-top: 1.25rem">
            <div class="match-desk-head">
              <h2>Conseguir ayuda</h2>
              <p>
                Personas que pueden aportar hacia tus necesidades en
                <strong>{{ p.municipio }}</strong>.
              </p>
            </div>

            @if (openNeedsForMatch().length === 0) {
              <div class="empty">No tienes necesidades abiertas para emparejar.</div>
            } @else if (donorGroups().length === 0) {
              <div class="empty">
                No hay aportes disponibles que coincidan con tus necesidades abiertas.
              </div>
            } @else {
              <div class="match-step">
                <div class="step-label">
                  1 · ¿Quién puede aportar?
                  <span class="step-context">{{ donorGroups().length }} persona(s)</span>
                </div>
                <div class="pick-list donor-list">
                  @for (g of donorGroups(); track g.key) {
                    <button
                      type="button"
                      class="pick donor-pick"
                      [class.on]="selectedDonorKey() === g.key"
                      [class.fit]="g.coversMunicipio"
                      (click)="selectDonor(g)"
                    >
                      <div class="pick-top">
                        @if (g.coversMunicipio) {
                          <span class="tag ok">Sirve para {{ p.municipio }}</span>
                        } @else {
                          <span class="tag">Otra zona</span>
                        }
                        @if (selectedDonorKey() === g.key) {
                          <span class="pick-check">Elegida</span>
                        }
                      </div>
                      <strong>{{ g.oferta.oferente_nombre }}</strong>
                      <ul class="donor-offer-lines">
                        @for (opt of g.items; track opt.item.id) {
                          <li>
                            <div class="donor-offer-line-main">
                              <span class="donor-offer-cat">{{ categoriaLabel(opt.item.categoria) }}</span>
                              <span class="donor-offer-qty">
                                @if (opt.item.cantidad != null) {
                                  {{ opt.item.cantidad }} {{ opt.item.unidad || '' }}
                                } @else {
                                  Cantidad sin especificar
                                }
                              </span>
                            </div>
                            @if (offerItemDescripcion(opt.item); as desc) {
                              <span class="donor-offer-desc">{{ desc }}</span>
                            }
                          </li>
                        }
                      </ul>
                      @if (g.oferta.municipio_preferido) {
                        <div class="pick-desc">
                          Entrega: {{ g.oferta.municipio_preferido }}
                        </div>
                      }
                      @if (g.oferta.oferente_contacto; as tel) {
                        <a
                          class="pick-call"
                          [href]="telHref(tel)"
                          (click)="$event.stopPropagation()"
                        >
                          Llamar · {{ tel }}
                        </a>
                      }
                    </button>
                  }
                </div>
              </div>

              @if (selectedDonor(); as donor) {
                <div class="match-step">
                  <div class="step-label">
                    2 · Elige qué conectar de {{ donor.oferta.oferente_nombre }}
                    <span class="step-context">{{ p.municipio }}</span>
                  </div>

                  <div class="match-board">
                    <div class="match-col">
                      <div class="col-head">
                        <strong>Tu necesidad</strong>
                        <span>{{ filteredOwnNeeds().length }}</span>
                      </div>
                      <div class="pick-list">
                        @for (n of filteredOwnNeeds(); track n.id) {
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
                            <strong>{{ categoriaLabel(n.categoria) }}</strong>
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
                          </button>
                        } @empty {
                          <div class="empty tight">
                            Esta persona no cubre ninguna de tus necesidades abiertas.
                          </div>
                        }
                      </div>
                    </div>

                    <div class="match-bridge" aria-hidden="true">→</div>

                    <div class="match-col">
                      <div class="col-head">
                        <strong>Lo que aporta</strong>
                        <span>{{ matchingOffers().length }}</span>
                      </div>
                      <div class="pick-list">
                        @if (matchingOffers().length === 0) {
                          <div class="empty tight">
                            @if (selectedNeed()) {
                              No tiene aporte disponible para
                              {{ categoriaLabel(selectedNeed()!.categoria) }}.
                            } @else {
                              Elige primero tu necesidad.
                            }
                          </div>
                        } @else {
                          <div class="pick donor-items-card">
                            @for (opt of matchingOffers(); track opt.item.id) {
                              <button
                                type="button"
                                class="donor-item-row"
                                [class.on]="selectedItemId() === opt.item.id"
                                (click)="selectOfferItem(opt)"
                              >
                                <div class="donor-item-main">
                                  <strong>{{ categoriaLabel(opt.item.categoria) }}</strong>
                                  <span class="donor-item-qty">
                                    @if (opt.matchQty != null) {
                                      {{ opt.matchQty }} {{ opt.item.unidad || '' }}
                                    } @else if (opt.item.cantidad != null) {
                                      {{ opt.item.cantidad }} {{ opt.item.unidad || '' }}
                                    } @else {
                                      Cantidad sin especificar
                                    }
                                  </span>
                                </div>
                                @if (opt.item.descripcion) {
                                  <div class="pick-desc">{{ opt.item.descripcion }}</div>
                                }
                                @if (selectedItemId() === opt.item.id) {
                                  <span class="pick-check">Elegido</span>
                                }
                              </button>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            }
          </section>

          @if (selectionSummary(); as summary) {
            <div class="match-bar">
              <div class="match-bar-copy">
                <div class="match-bar-kicker">Vas a conectar</div>
                <div class="match-bar-line">
                  Tu albergue necesita
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
                      {{ summary.unit }} por cubrir.
                    } @else {
                      Con esto se reserva el total pedido.
                    }
                  </div>
                }
                @if (summary.offerPhone; as tel) {
                  <div class="match-bar-calls">
                    <a class="btn btn-ghost btn-sm" [href]="telHref(tel)">Llamar oferente {{ tel }}</a>
                  </div>
                }
              </div>
              <button
                class="btn btn-primary"
                type="button"
                [disabled]="!!busySelfMatch()"
                (click)="confirmSelfMatch()"
              >
                {{ busySelfMatch() ? 'Emparejando…' : 'Confirmar emparejamiento' }}
              </button>
            </div>
          }
        }

        @if (canSeeMatches()) {
          <section class="ops-block ops-priority" style="margin-top: 1.25rem">
            <div class="ops-block-head">
              <div>
                <h2>Por recibir</h2>
                <p>
                  Personas que dijeron «Yo aporto» — llámalas para coordinar la entrega
                  @if (incomingHelp().length > 0) {
                    · {{ incomingByDonor().length }} persona(s),
                    {{ incomingHelp().length }} aporte(s)
                  }
                </p>
              </div>
              @if (incomingByDonor().length > 0) {
                <span class="ops-count">{{ incomingByDonor().length }}</span>
              }
            </div>

            @if (incomingHelp().length === 0) {
              <p class="ops-quiet">No hay nada en camino ahora.</p>
            } @else {
              <div class="ops-stack">
                @for (g of incomingByDonor(); track g.key) {
                  <article class="ops-donor-group">
                    <div class="ops-donor-head">
                      <strong>{{ g.nombre }}</strong>
                      @if (g.contacto; as tel) {
                        <a class="btn btn-ghost btn-sm" [href]="telHref(tel)">Llamar · {{ tel }}</a>
                      }
                    </div>
                    <div class="ops-donor-items">
                      @for (m of g.matches; track m.id) {
                        <article class="ops-arrival ops-arrival-nested" [class.ready]="m.estado === 'en_camino'">
                          <div class="ops-arrival-main">
                            <div class="ops-arrival-top">
                              <span class="tag" [class]="m.estado === 'en_camino' ? 'media' : ''">
                                {{ matchEstadoLabel(m.estado) }}
                              </span>
                              <span class="ops-arrival-cat">{{ categoriaLabel(m.necesidad?.categoria || '') }}</span>
                            </div>
                            @if (matchDescripcion(m); as desc) {
                              <div class="ops-match-desc ops-match-desc-prominent">{{ desc }}</div>
                            }
                            <div class="ops-arrival-details">
                              @if (matchQtyLabel(m); as qty) {
                                <span>{{ qty }}</span>
                              }
                              <span [title]="formatDateTime(m.created_at)">
                                {{ matchConfirmedLabel(m) }}
                              </span>
                              @if (m.estado === 'en_camino') {
                                <span [title]="formatDateTime(m.updated_at)">
                                  En camino {{ timeAgo(m.updated_at) }}
                                </span>
                              }
                              @if (m.eta) {
                                <span>Llega: {{ m.eta }}</span>
                              }
                            </div>
                          </div>
                          <div class="ops-arrival-actions">
                          @if (canConfirmDelivery() && m.estado === 'en_camino') {
                            <button
                              class="btn btn-primary btn-sm"
                              type="button"
                              [disabled]="busyMatch() === m.id"
                              (click)="askConfirmDelivery(m)"
                            >
                              Ya llegó
                            </button>
                          }
                          @if (canAdvanceToEnCamino() && (m.estado === 'propuesto' || m.estado === 'confirmado')) {
                            <button
                              class="btn btn-secondary btn-sm"
                              type="button"
                              [disabled]="busyMatch() === m.id"
                              (click)="markEnCamino(m)"
                            >
                              Ya va en camino
                            </button>
                          }
                          </div>
                        </article>
                      }
                    </div>
                  </article>
                }
              </div>
            }
          </section>
        }

        <section class="ops-block" style="margin-top: 1rem">
          <div class="ops-block-head">
            <div>
              <h2>{{ canManageNeeds() ? 'Necesidades' : 'Necesidades abiertas' }}</h2>
              <p>
                @if (sharePickMode()) {
                  Elige qué incluir en la imagen, QR o mensaje.
                } @else if (canManageNeeds()) {
                  Administra cantidades, urgencia y estado de cada pedido.
                } @else {
                  Lo que todavía falta en el albergue.
                }
              </p>
            </div>
            <div class="ops-block-head-actions">
              @if (canShareOnInstagram()) {
                @if (sharePickMode()) {
                  <button class="btn btn-ghost btn-sm" type="button" (click)="cancelSharePick()">
                    Cancelar
                  </button>
                  <button
                    class="btn btn-instagram btn-sm"
                    type="button"
                    [disabled]="shareSelectedCount() === 0"
                    (click)="openInstagramShareSelected()"
                  >
                    Compartir{{ shareSelectedCount() > 0 ? ' (' + shareSelectedCount() + ')' : '' }}
                  </button>
                } @else {
                  <button class="btn btn-instagram btn-sm" type="button" (click)="startSharePick()">
                    Compartir
                  </button>
                }
              }
              @if ((p.necesidades || []).length > 0) {
                <span class="ops-count">{{ p.necesidades!.length }}</span>
              }
            </div>
          </div>

          @if (sharePickMode()) {
            <div class="share-pick-toolbar">
              <span>{{ shareSelectedCount() }} de {{ shareableNeeds().length }} seleccionadas</span>
              <button class="btn btn-ghost btn-sm" type="button" (click)="selectAllShareNeeds()">
                Seleccionar todas
              </button>
              <button class="btn btn-ghost btn-sm" type="button" (click)="clearShareSelection()">
                Limpiar
              </button>
            </div>
          }

          @if (!(p.necesidades || []).length) {
            <p class="ops-quiet">No hay necesidades abiertas.</p>
          } @else {
            <div class="ops-stack">
              @for (n of p.necesidades; track n.id) {
                <article
                  class="ops-need"
                  [class.urgent]="n.urgencia === 'alta'"
                  [class.share-pick]="sharePickMode() && isShareableNeed(n)"
                  [class.share-pick-on]="sharePickMode() && isShareSelected(n.id)"
                  [class.share-pick-off]="sharePickMode() && !isShareableNeed(n)"
                  (click)="sharePickMode() && isShareableNeed(n) ? toggleShareNeed(n.id) : null"
                >
                  @if (sharePickMode() && isShareableNeed(n)) {
                    <label class="share-pick-check" (click)="$event.stopPropagation()">
                      <input
                        type="checkbox"
                        [checked]="isShareSelected(n.id)"
                        (change)="toggleShareNeed(n.id)"
                      />
                    </label>
                  }
                  <div class="share-pick-body">
                    <strong>{{ categoriaLabel(n.categoria) }}</strong>
                    <div class="ops-row-meta">
                      {{ n.descripcion || 'Sin descripción' }}
                      @if (n.cantidad != null) {
                        ·
                        @if (n.cantidad_solicitada != null && n.cantidad_solicitada !== n.cantidad) {
                          faltan {{ n.cantidad }} de {{ n.cantidad_solicitada }} {{ n.unidad || '' }}
                        } @else {
                          {{ n.cantidad }} {{ n.unidad || '' }}
                        }
                      }
                    </div>
                  </div>
                  <div class="need-side">
                    <div class="meta-row">
                      <span class="tag" [class]="n.urgencia">{{ urgenciaLabel(n.urgencia) }}</span>
                      @if (!n.verificado) {
                        <span class="tag">Sin verificar</span>
                      }
                      @if (n.estado !== 'abierta') {
                        <span class="tag">{{ needEstadoLabel(n.estado) }}</span>
                      }
                    </div>
                    @if (canManageNeeds() && !sharePickMode()) {
                      <div class="need-actions">
                        <a
                          class="btn btn-ghost btn-sm"
                          [routerLink]="['/puntos', p.id, 'necesidades', n.id, 'editar']"
                        >
                          Editar
                        </a>
                        @if (n.estado === 'abierta') {
                          <button class="btn btn-ghost btn-sm" type="button" (click)="markNeedCovered(n)">
                            Marcar cubierta
                          </button>
                        }
                        <button
                          class="btn btn-ghost btn-sm need-delete-btn"
                          type="button"
                          (click)="askDeleteNeed(n)"
                        >
                          Eliminar
                        </button>
                      </div>
                    }
                  </div>
                </article>
              }
            </div>
          }
        </section>

        @if (canSeeMatches()) {
          <details class="ops-fold" style="margin-top: 1rem">
            <summary>
              Historial de ayudas
              @if (matchHistory().length > 0) {
                <span class="ops-fold-count">{{ matchHistory().length }}</span>
              }
            </summary>
            <div class="ops-stack" style="margin-top: 0.75rem">
              @for (g of historyByDonor(); track g.key) {
                <div class="ops-donor-group ops-donor-group-history">
                  <div class="ops-donor-head">
                    <strong>{{ g.nombre }}</strong>
                    <span class="ops-row-meta">{{ g.matches.length }} aporte(s)</span>
                  </div>
                  <div class="ops-donor-items">
                    @for (m of g.matches; track m.id) {
                      <div class="ops-history-row ops-history-row-nested">
                        <div>
                          <div class="ops-row-meta">
                            <strong>{{ categoriaLabel(m.necesidad?.categoria || '') }}</strong>
                            @if (matchQtyLabel(m); as qty) {
                              · {{ qty }}
                            }
                          </div>
                          @if (matchDescripcion(m); as desc) {
                            <div class="ops-match-desc ops-match-desc-prominent">{{ desc }}</div>
                          }
                          <div class="ops-arrival-details">
                            <span [title]="formatDateTime(m.created_at)">
                              Confirmado {{ timeAgo(m.created_at) }}
                            </span>
                            @if (m.estado === 'entregado') {
                              <span [title]="formatDateTime(m.updated_at)">
                                Entregado {{ timeAgo(m.updated_at) }}
                              </span>
                            } @else if (m.estado === 'cancelado') {
                              <span [title]="formatDateTime(m.updated_at)">
                                Cancelado {{ timeAgo(m.updated_at) }}
                              </span>
                            }
                          </div>
                          @if (m.evidencias?.length) {
                            <div class="evidence-grid compact">
                              @for (ev of m.evidencias!; track ev.url) {
                                <a class="evidence-thumb" [href]="mediaUrl(ev.url)" target="_blank" rel="noopener">
                                  <img [src]="mediaUrl(ev.url)" alt="Evidencia de entrega" />
                                </a>
                              }
                            </div>
                          }
                        </div>
                        <span class="tag" [class]="matchHistoryTag(m.estado)">
                          {{ matchEstadoLabel(m.estado) }}
                        </span>
                      </div>
                    }
                  </div>
                </div>
              } @empty {
                <p class="ops-quiet">Aún no hay entregas ni cancelaciones.</p>
              }
            </div>
          </details>
        }

        <details class="ops-fold" style="margin-top: 0.75rem">
          <summary>Datos del albergue</summary>
          <div class="ops-facts">
            <div><span>Tipo</span><strong>{{ tipoLabel(p.tipo) }}</strong></div>
            <div><span>Responsable</span><strong>{{ p.responsable_nombre || 'No reportado' }}</strong></div>
            @if (p.responsable_contacto) {
              <div><span>Contacto</span><strong>{{ p.responsable_contacto }}</strong></div>
            }
            <div><span>Actualizado</span><strong>{{ timeAgo(p.updated_at) }}</strong></div>
            @if (p.cuentas_bancarias?.length) {
              <div class="ops-bank-block">
                <span>Cuentas bancarias</span>
                <ul class="ops-bank-list">
                  @for (c of p.cuentas_bancarias!; track $index) {
                    <li>
                      <strong>{{ c.banco }}</strong>
                      · {{ tipoCuentaLabel(c.tipo_cuenta) }}
                      · {{ c.numero_cuenta }}
                    </li>
                  }
                </ul>
              </div>
            }
          </div>
        </details>
        }

        @if (pendingDeleteNeed(); as need) {
          <div class="modal-backdrop" (click)="cancelDeleteNeed()">
            <div class="modal-card" (click)="$event.stopPropagation()">
              <h3>¿Eliminar esta necesidad?</h3>
              <p>
                {{ categoriaLabel(need.categoria) }}
                @if (needQtyLabel(need); as qty) {
                  · {{ qty }}
                }
              </p>
              <p>Desaparecerá del mapa y de los listados. No se puede deshacer.</p>
              <div class="modal-actions">
                <button class="btn btn-ghost" type="button" (click)="cancelDeleteNeed()">Cancelar</button>
                <button
                  class="btn btn-danger-inline"
                  type="button"
                  [disabled]="busyNeed() === need.id"
                  (click)="confirmDeleteNeed()"
                >
                  {{ busyNeed() === need.id ? 'Eliminando…' : 'Sí, eliminar' }}
                </button>
              </div>
            </div>
          </div>
        }

        @if (pendingDelivery(); as pending) {
          <div class="modal-backdrop" (click)="cancelConfirmDelivery()">
            <div class="modal-card" (click)="$event.stopPropagation()">
              <h3>¿Confirmar que ya llegó?</h3>
              <p>
                {{ pending.oferta?.oferente_nombre || 'Esta ayuda' }}
                · {{ categoriaLabel(pending.necesidad?.categoria || '') }}
                @if (matchQtyLabel(pending); as qty) {
                  · {{ qty }}
                }
              </p>

              <div class="modal-actions">
                <button class="btn btn-ghost" type="button" (click)="cancelConfirmDelivery()">
                  Volver
                </button>
                <button
                  class="btn btn-primary"
                  type="button"
                  [disabled]="busyMatch() === pending.id"
                  (click)="confirmDelivery()"
                >
                  {{ busyMatch() === pending.id ? 'Confirmando…' : 'Sí, ya llegó' }}
                </button>
              </div>
            </div>
          </div>
        }

        @if (bankAccountsOpen()) {
          <div class="modal-backdrop" (click)="closeBankAccountsModal()">
            <div class="modal-card bank-modal" (click)="$event.stopPropagation()">
              <h3>Cuentas bancarias</h3>
              <p class="bank-modal-intro">
                Publica las cuentas donde pueden consignar o transferir. Los donantes las verán en la ficha del albergue.
              </p>

              <form [formGroup]="bankAccountsForm" (ngSubmit)="saveBankAccounts()">
                <div formArrayName="cuentas" class="bank-rows">
                  @for (row of bankAccountRows.controls; track $index; let i = $index) {
                    <fieldset class="bank-row" [formGroupName]="i">
                      <legend>Cuenta {{ i + 1 }}</legend>
                      <div class="field">
                        <label [attr.for]="'bank-banco-' + i">Banco *</label>
                        <input
                          [id]="'bank-banco-' + i"
                          formControlName="banco"
                          placeholder="Ej. Bancolombia"
                          [disabled]="busyBankAccounts()"
                        />
                      </div>
                      <div class="field">
                        <label [attr.for]="'bank-tipo-' + i">Tipo de cuenta *</label>
                        <select [id]="'bank-tipo-' + i" formControlName="tipo_cuenta" [disabled]="busyBankAccounts()">
                          <option value="ahorros">Ahorros</option>
                          <option value="corriente">Corriente</option>
                        </select>
                      </div>
                      <div class="field">
                        <label [attr.for]="'bank-numero-' + i">Número de cuenta *</label>
                        <input
                          [id]="'bank-numero-' + i"
                          formControlName="numero_cuenta"
                          inputmode="numeric"
                          autocomplete="off"
                          placeholder="Solo dígitos"
                          [disabled]="busyBankAccounts()"
                        />
                      </div>
                      @if (bankAccountRows.length > 1) {
                        <button
                          class="btn btn-ghost btn-sm bank-remove"
                          type="button"
                          [disabled]="busyBankAccounts()"
                          (click)="removeBankAccountRow(i)"
                        >
                          Quitar cuenta
                        </button>
                      }
                    </fieldset>
                  }
                </div>

                @if (bankAccountRows.length < 5) {
                  <button
                    class="btn btn-ghost btn-sm"
                    type="button"
                    [disabled]="busyBankAccounts()"
                    (click)="addBankAccountRow()"
                  >
                    + Agregar otra cuenta
                  </button>
                }

                <div class="modal-actions">
                  <button
                    class="btn btn-ghost"
                    type="button"
                    [disabled]="busyBankAccounts()"
                    (click)="clearBankAccounts()"
                  >
                    Quitar todas
                  </button>
                  <button class="btn btn-ghost" type="button" (click)="closeBankAccountsModal()" [disabled]="busyBankAccounts()">
                    Cancelar
                  </button>
                  <button class="btn btn-primary" type="submit" [disabled]="busyBankAccounts()">
                    {{ busyBankAccounts() ? 'Guardando…' : 'Guardar cuentas' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      }
    </app-shell>

    <app-instagram-share-dialog
      [open]="instagramShareOpen()"
      [caption]="instagramCaption()"
      [shareUrl]="instagramShareUrl()"
      [shelterName]="instagramShelterName()"
      [municipio]="instagramMunicipio()"
      [shareNeeds]="instagramShareNeeds()"
      (closed)="onShareDialogClosed()"
    />
  `,
  styles: [
    `
      .match-desk {
        display: grid;
        gap: 1.15rem;
      }
      .share-pick-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.45rem;
        margin-bottom: 0.75rem;
        padding: 0.55rem 0.65rem;
        border-radius: var(--radius-sm);
        background: #eef7f1;
        border: 1px solid #b7d0c2;
        font-size: 0.9rem;
        color: var(--ink-soft);
      }
      .ops-censo-toggle {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        font-size: 0.92rem;
        color: var(--ink-soft);
        padding: 0.35rem 0.5rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        cursor: pointer;
      }
      .ops-censo-toggle input {
        margin: 0;
      }
      .ops-need.share-pick {
        cursor: pointer;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.65rem;
        align-items: start;
      }
      .ops-need.share-pick-on {
        border-color: var(--canopy);
        box-shadow: inset 0 0 0 1px var(--canopy);
        background: color-mix(in srgb, var(--canopy) 6%, #fff);
      }
      .ops-need.share-pick-off {
        opacity: 0.55;
      }
      .share-pick-check {
        display: grid;
        place-items: center;
        margin: 0.15rem 0 0;
        cursor: pointer;
      }
      .share-pick-check input {
        width: 1.1rem;
        height: 1.1rem;
        accent-color: var(--canopy);
        cursor: pointer;
      }
      .share-pick-body {
        min-width: 0;
      }
      .need-side {
        display: grid;
        gap: 0.45rem;
        justify-items: end;
      }
      .need-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        justify-content: flex-end;
      }
      .need-delete-btn {
        color: var(--rose);
      }
      .btn-danger-inline {
        border: none;
        background: var(--rose);
        color: #fff;
      }
      .match-desk-head h2 {
        margin: 0 0 0.25rem;
      }
      .match-desk-head p {
        margin: 0;
        color: var(--ink-soft);
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
      .donor-list {
        padding: 0;
        max-height: none;
      }
      .donor-pick .donor-offer-lines {
        list-style: none;
        margin: 0.35rem 0 0;
        padding: 0;
        display: grid;
        gap: 0.25rem;
      }
      .donor-offer-lines li {
        display: grid;
        gap: 0.15rem;
        font-size: 0.88rem;
      }
      .donor-offer-line-main {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.35rem;
      }
      .donor-offer-desc,
      .ops-match-desc,
      .ops-match-dates {
        font-size: 0.85rem;
        color: var(--ink-soft);
        line-height: 1.35;
      }
      .donor-offer-cat {
        font-weight: 700;
        color: var(--canopy-deep);
      }
      .donor-offer-qty {
        color: var(--ink-soft);
      }
      .donor-items-card {
        cursor: default;
        padding: 0.35rem;
        gap: 0;
      }
      .donor-items-card:hover {
        border-color: var(--line);
      }
      .donor-item-row {
        width: 100%;
        text-align: left;
        border: 0;
        border-radius: 10px;
        background: transparent;
        padding: 0.55rem 0.6rem;
        cursor: pointer;
        font: inherit;
        color: inherit;
        display: grid;
        gap: 0.15rem;
      }
      .donor-item-row:hover {
        background: color-mix(in srgb, var(--canopy) 6%, #fff);
      }
      .donor-item-row.on {
        background: color-mix(in srgb, var(--canopy) 10%, #fff);
        box-shadow: inset 0 0 0 1px var(--canopy);
      }
      .donor-item-main {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.35rem;
        align-items: baseline;
      }
      .donor-item-qty {
        font-weight: 700;
        color: var(--canopy-deep);
      }
      .ops-donor-group {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #fbfcfb;
        overflow: hidden;
      }
      .ops-donor-group-history {
        border: 0;
        border-radius: 0;
        background: transparent;
        border-top: 1px solid var(--line);
        padding-top: 0.65rem;
      }
      .ops-donor-group-history:first-child {
        border-top: 0;
        padding-top: 0;
      }
      .ops-donor-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.75rem 0.85rem;
        background: #fff;
        border-bottom: 1px solid var(--line);
      }
      .ops-donor-group-history .ops-donor-head {
        padding: 0 0 0.35rem;
        background: transparent;
        border-bottom: 0;
      }
      .ops-donor-items {
        display: grid;
        gap: 0;
      }
      .ops-arrival-nested {
        border-top: 1px solid var(--line);
        margin: 0;
        padding: 0.75rem 0.85rem;
        border-radius: 0;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 0.65rem 1rem;
        align-items: start;
      }
      .ops-arrival-main {
        min-width: 0;
      }
      .ops-match-desc-prominent {
        font-size: 0.96rem;
        font-weight: 600;
        color: var(--ink);
        margin: 0.2rem 0 0.35rem;
      }
      .ops-arrival-details {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 0.75rem;
        font-size: 0.85rem;
        color: var(--ink-soft);
      }
      .ops-arrival-actions {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        flex-shrink: 0;
      }
      .ops-arrival-nested:first-child {
        border-top: 0;
      }
      .ops-history-row-nested {
        border-top: 1px solid var(--line);
        padding: 0.55rem 0;
        margin: 0;
      }
      .ops-history-row-nested:first-child {
        border-top: 0;
        padding-top: 0;
      }
      .ops-arrival {
        align-items: flex-start;
      }
      .evidence-modal {
        max-width: 28rem;
        width: min(100%, 28rem);
      }
      .evidence-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.45rem;
        margin-top: 0.65rem;
      }
      .evidence-grid.compact {
        grid-template-columns: repeat(4, minmax(0, 4.5rem));
        margin-top: 0.45rem;
      }
      .evidence-thumb {
        position: relative;
        aspect-ratio: 1;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--line);
        background: #f3f6f4;
        display: block;
      }
      .evidence-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .evidence-remove {
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        width: 1.5rem;
        height: 1.5rem;
        border: 0;
        border-radius: 999px;
        background: color-mix(in srgb, #000 55%, transparent);
        color: #fff;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
        line-height: 1;
      }
      @media (max-width: 820px) {
        .match-board {
          grid-template-columns: 1fr;
        }
        .match-bridge {
          display: none;
        }
        .match-bar .btn {
          width: 100%;
        }
        .ops-arrival-nested {
          grid-template-columns: 1fr;
        }
        .ops-arrival-actions .btn {
          width: 100%;
        }
      }
    `,
  ],
})
export class PuntoDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly puntosApi = inject(PuntosApiService);
  private readonly usuariosApi = inject(UsuariosApiService);
  private readonly matchesApi = inject(EmparejamientosApiService);
  private readonly ofertasApi = inject(OfertasApiService);
  private readonly necesidadesApi = inject(NecesidadesApiService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private readonly seo = inject(SeoService);
  private readonly directions = inject(DirectionsService);

  readonly punto = signal<PuntoDemanda | null>(null);
  readonly puntoUsers = signal<Usuario[]>([]);
  readonly incomingHelp = signal<Emparejamiento[]>([]);
  readonly matchHistory = signal<Emparejamiento[]>([]);
  readonly availableOfertas = signal<Oferta[]>([]);
  readonly selectedDonorKey = signal('');
  readonly selectedNeedId = signal('');
  readonly selectedItemId = signal('');
  readonly pendingDelivery = signal<Emparejamiento | null>(null);
  readonly pendingDeleteNeed = signal<Necesidad | null>(null);
  readonly busyNeed = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionMessage = signal<string | null>(null);
  readonly actionIsError = signal(false);
  readonly busy = signal(false);
  readonly busyUser = signal(false);
  readonly busyMatch = signal<string | null>(null);
  readonly busySelfMatch = signal<string | null>(null);
  readonly busyReset = signal<string | null>(null);
  readonly showUserForm = signal(false);
  readonly tempPassword = signal<string | null>(null);
  readonly tempPasswordEmail = signal<string | null>(null);
  readonly copied = signal(false);
  readonly instagramShareOpen = signal(false);
  readonly instagramCaption = signal('');
  readonly instagramShareUrl = signal('');
  readonly instagramShelterName = signal('');
  readonly instagramMunicipio = signal('');
  readonly instagramShareNeeds = signal<ShareNeedBlock[]>([]);
  readonly sharePickMode = signal(false);
  readonly shareSelectedIds = signal<Set<string>>(new Set());
  readonly bankAccountsOpen = signal(false);
  readonly busyBankAccounts = signal(false);

  readonly bankAccountsForm = this.fb.nonNullable.group({
    cuentas: this.fb.nonNullable.array([] as ReturnType<typeof this.buildBankAccountGroup>[]),
  });

  readonly timeAgo = timeAgo;
  readonly formatDateTime = formatDateTime;

  readonly publicOpenNeeds = computed(() => {
    const needs = (this.punto()?.necesidades || []).filter(
      (n) =>
        n.estado === 'abierta' &&
        (n.cantidad == null || Number(n.cantidad) > 0)
    );
    const urgRank = (u: string) => (u === 'alta' ? 0 : u === 'media' ? 1 : 2);
    return [...needs].sort((a, b) => urgRank(a.urgencia) - urgRank(b.urgencia));
  });

  readonly publicUrgentNeeds = computed(() =>
    this.publicOpenNeeds().filter((n) => n.urgencia === 'alta')
  );

  readonly shareableNeeds = computed(() =>
    (this.punto()?.necesidades || []).filter(
      (n) =>
        n.estado === 'abierta' &&
        (n.cantidad == null || Number(n.cantidad) > 0)
    )
  );

  readonly shareSelectedCount = computed(() => this.shareSelectedIds().size);

  readonly openNeedsForMatch = computed(() =>
    (this.punto()?.necesidades || []).filter(
      (n) =>
        n.estado === 'abierta' &&
        (n.cantidad == null || Number(n.cantidad) > 0)
    )
  );

  readonly donorGroups = computed(() => {
    const p = this.punto();
    const needs = this.openNeedsForMatch();
    if (!p || needs.length === 0) return [] as DonorGroup[];

    const needCategories = new Set(needs.map((n) => n.categoria));
    const byKey = new Map<string, DonorGroup>();

    for (const o of this.availableOfertas()) {
      const items: OfferOpt[] = [];
      for (const item of o.items || []) {
        if (item.estado !== 'disponible') continue;
        if (item.cantidad != null && Number(item.cantidad) <= 0) continue;
        if (!needCategories.has(item.categoria)) continue;
        items.push({
          oferta: o,
          item,
          coversMunicipio: this.offerCoversMunicipio(o, p.municipio),
          matchQty: null,
        });
      }
      if (items.length === 0) continue;

      const key = ofertaDonorKey(o);
      const covers = items.some((i) => i.coversMunicipio);
      const existing = byKey.get(key);
      if (existing) {
        const seen = new Set(existing.items.map((i) => i.item.id));
        for (const opt of items) {
          if (seen.has(opt.item.id)) continue;
          seen.add(opt.item.id);
          existing.items.push(opt);
        }
        existing.coversMunicipio = existing.coversMunicipio || covers;
        continue;
      }

      byKey.set(key, {
        key,
        oferta: o,
        items,
        coversMunicipio: covers,
      });
    }

    return [...byKey.values()].sort((a, b) => {
      if (Number(b.coversMunicipio) !== Number(a.coversMunicipio)) {
        return Number(b.coversMunicipio) - Number(a.coversMunicipio);
      }
      return a.oferta.oferente_nombre.localeCompare(b.oferta.oferente_nombre, 'es');
    });
  });

  readonly selectedDonor = computed(() => {
    const key = this.selectedDonorKey();
    if (!key) return null;
    return this.donorGroups().find((g) => g.key === key) || null;
  });

  readonly incomingByDonor = computed(() =>
    groupMatchesByDonor(this.incomingHelp())
  );

  readonly historyByDonor = computed(() =>
    groupMatchesByDonor(this.matchHistory())
  );

  readonly filteredOwnNeeds = computed(() => {
    const donor = this.selectedDonor();
    if (!donor) return [];
    const donorCategories = new Set(donor.items.map((i) => i.item.categoria));
    return this.openNeedsForMatch().filter((n) => donorCategories.has(n.categoria));
  });

  readonly selectedNeed = computed(() => {
    const id = this.selectedNeedId();
    if (!id) return null;
    return this.filteredOwnNeeds().find((n) => n.id === id) || null;
  });

  readonly matchingOffers = computed(() => {
    const donor = this.selectedDonor();
    const need = this.selectedNeed();
    if (!donor) return [] as OfferOpt[];

    return donor.items
      .filter((opt) => !need || opt.item.categoria === need.categoria)
      .map((opt) => ({
        ...opt,
        matchQty: this.resolveMatchQty(need?.cantidad, opt.item.cantidad),
      }))
      .sort((a, b) => {
        if (need) return 0;
        return this.categoriaLabel(a.item.categoria).localeCompare(
          this.categoriaLabel(b.item.categoria),
          'es'
        );
      });
  });

  readonly selectionSummary = computed(() => {
    const need = this.selectedNeed();
    const itemId = this.selectedItemId();
    if (!need || !itemId) return null;
    const opt = this.matchingOffers().find((o) => o.item.id === itemId);
    if (!opt) return null;

    const matchQty = this.resolveMatchQty(need.cantidad, opt.item.cantidad);
    const unit = opt.item.unidad || need.unidad || '';
    return {
      categoria: this.categoriaLabel(need.categoria),
      offerName: opt.oferta.oferente_nombre,
      qty: matchQty != null ? `${matchQty} ${unit}`.trim() : '',
      remaining:
        need.cantidad != null && matchQty != null
          ? Math.max(0, Number(need.cantidad) - matchQty)
          : null,
      unit,
      solicitada: need.cantidad_solicitada ?? need.cantidad,
      offerPhone: opt.oferta.oferente_contacto || null,
      need,
      opt,
    };
  });

  readonly userForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
  });

  get bankAccountRows(): FormArray {
    return this.bankAccountsForm.get('cuentas') as FormArray;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Albergue no encontrado');
      this.loading.set(false);
      return;
    }
    this.loadPunto(id);
  }

  private loadPunto(id: string): void {
    this.puntosApi.getById(id).subscribe({
      next: (p) => {
        this.punto.set(p);
        this.loading.set(false);
        this.applyPuntoSeo(p);
        if (this.canManageUsers()) {
          this.loadUsers(p.id);
        }
        if (this.canSeeMatches()) {
          this.loadIncomingHelp(p.id);
          this.loadMatchHistory(p.id);
        }
        if (this.canSelfMatch()) {
          this.loadOfertas();
        }
      },
      error: () => {
        this.error.set('No pudimos cargar este albergue.');
        this.loading.set(false);
      },
    });
  }

  private applyPuntoSeo(p: PuntoDemanda): void {
    const path = `/puntos/${p.id}`;
    const needs = (p.necesidades || [])
      .slice(0, 3)
      .map((n) => this.categoriaLabel(n.categoria))
      .join(', ');
    const description = [
      `${p.nombre} en ${p.municipio}.`,
      needs ? `Necesidades: ${needs}.` : 'Consulta cómo ayudar.',
      'Ayuda de última milla en Colombia de Pie.',
    ].join(' ');

    this.seo.apply({
      path,
      title: `${p.nombre} — albergue en ${p.municipio}`,
      description: description.slice(0, 160),
      keywords: [
        `albergue ${p.municipio}`,
        p.nombre,
        'ayuda humanitaria',
        'punto de acogida',
        'cupos albergue',
      ],
      type: 'article',
    });
    this.seo.setJsonLd(
      placeShelterSchema({
        name: p.nombre,
        description,
        url: this.seo.absoluteUrl(path),
        municipio: p.municipio,
        address: p.direccion,
        lat: p.lat != null ? Number(p.lat) : null,
        lng: p.lng != null ? Number(p.lng) : null,
      })
    );
  }

  canEdit(): boolean {
    const p = this.punto();
    if (!p || !this.auth.isLoggedIn()) return false;
    if (this.auth.hasRole('coordinador')) return true;
    return this.isOwnShelter();
  }

  canManageNeeds(): boolean {
    return this.canEdit();
  }

  needEstadoLabel(v: string): string {
    const labels: Record<string, string> = {
      abierta: 'Abierta',
      en_camino: 'En camino',
      cubierta: 'Cubierta',
    };
    return labels[v] ?? v;
  }

  askDeleteNeed(need: Necesidad): void {
    this.pendingDeleteNeed.set(need);
  }

  cancelDeleteNeed(): void {
    this.pendingDeleteNeed.set(null);
  }

  confirmDeleteNeed(): void {
    const need = this.pendingDeleteNeed();
    const p = this.punto();
    if (!need || !p) return;

    this.busyNeed.set(need.id);
    this.necesidadesApi.remove(p.id, need.id).subscribe({
      next: () => {
        this.busyNeed.set(null);
        this.pendingDeleteNeed.set(null);
        this.loadPunto(p.id);
      },
      error: () => {
        this.busyNeed.set(null);
        this.actionIsError.set(true);
        this.actionMessage.set('No se pudo eliminar la necesidad.');
        this.pendingDeleteNeed.set(null);
      },
    });
  }

  markNeedCovered(need: Necesidad): void {
    const p = this.punto();
    if (!p || need.estado === 'cubierta') return;

    this.busyNeed.set(need.id);
    this.necesidadesApi.updateEstado(p.id, need.id, 'cubierta').subscribe({
      next: () => {
        this.busyNeed.set(null);
        this.loadPunto(p.id);
      },
      error: () => {
        this.busyNeed.set(null);
        this.actionIsError.set(true);
        this.actionMessage.set('No se pudo actualizar la necesidad.');
      },
    });
  }

  isPublicVisitor(): boolean {
    return !this.auth.isLoggedIn();
  }

  offerHelpQueryParams(p: PuntoDemanda): Record<string, string> {
    return { municipio: p.municipio };
  }

  scrollToPublicNeeds(): void {
    document.getElementById('public-needs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  needQtyLabel(n: Necesidad): string | null {
    if (n.cantidad == null) return null;
    if (n.cantidad_solicitada != null && n.cantidad_solicitada !== n.cantidad) {
      return `Faltan ${n.cantidad} de ${n.cantidad_solicitada} ${n.unidad || ''}`.trim();
    }
    return `${n.cantidad} ${n.unidad || ''}`.trim();
  }

  showNeedDesc(n: Necesidad): boolean {
    const desc = n.descripcion?.trim();
    if (!desc) return false;
    const qty = this.needQtyLabel(n);
    if (!qty) return true;
    return desc.toLowerCase() !== qty.toLowerCase();
  }

  isOwnShelter(): boolean {
    const p = this.punto();
    return (
      !!p &&
      this.auth.hasRole('responsable_albergue') &&
      this.auth.user()?.punto_id === p.id
    );
  }

  canVerify(): boolean {
    return this.auth.hasRole('coordinador', 'verificador');
  }

  canManageUsers(): boolean {
    return this.auth.hasRole('coordinador');
  }

  canSeeMatches(): boolean {
    return this.auth.hasRole('coordinador') || this.isOwnShelter();
  }

  canConfirmDelivery(): boolean {
    return this.isOwnShelter();
  }

  canRequestHelp(): boolean {
    return this.canEdit() && !!this.punto()?.verificado;
  }

  canAccessCenso(): boolean {
    const p = this.punto();
    if (!p?.censo_afectados_habilitado || !this.canEdit()) return false;
    return this.isOwnShelter() || this.auth.hasRole('coordinador');
  }

  canSelfMatch(): boolean {
    return this.isOwnShelter() && !!this.punto()?.verificado;
  }

  canShareOnInstagram(): boolean {
    if (this.shareableNeeds().length === 0) return false;
    if (this.isOwnShelter()) {
      return !!this.punto()?.verificado;
    }
    return true;
  }

  isShareableNeed(n: Necesidad): boolean {
    return (
      n.estado === 'abierta' &&
      (n.cantidad == null || Number(n.cantidad) > 0)
    );
  }

  isShareSelected(id: string): boolean {
    return this.shareSelectedIds().has(id);
  }

  startSharePick(): void {
    const needs = this.shareableNeeds();
    if (needs.length === 0) return;
    if (needs.length === 1) {
      this.openInstagramShare(needs);
      return;
    }
    this.sharePickMode.set(true);
    this.shareSelectedIds.set(new Set());
  }

  cancelSharePick(): void {
    this.sharePickMode.set(false);
    this.shareSelectedIds.set(new Set());
  }

  toggleShareNeed(id: string): void {
    this.shareSelectedIds.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  selectAllShareNeeds(): void {
    this.shareSelectedIds.set(new Set(this.shareableNeeds().map((n) => n.id)));
  }

  clearShareSelection(): void {
    this.shareSelectedIds.set(new Set());
  }

  openInstagramShareSelected(): void {
    const ids = this.shareSelectedIds();
    const needs = this.shareableNeeds().filter((n) => ids.has(n.id));
    if (needs.length === 0) return;
    this.openInstagramShare(needs);
  }

  onShareDialogClosed(): void {
    this.instagramShareOpen.set(false);
    this.cancelSharePick();
  }

  openInstagramShare(needs?: Necesidad[]): void {
    const p = this.punto();
    if (!p) return;

    const selected = needs ?? this.shareableNeeds();
    if (selected.length === 0) return;

    const url = this.seo.absoluteUrl(`/puntos/${p.id}`);
    this.instagramShareUrl.set(url);
    this.instagramShelterName.set(p.nombre);
    this.instagramMunicipio.set(p.municipio);
    this.instagramShareNeeds.set(buildShareNeedBlocks(selected));
    this.instagramCaption.set(buildShelterInstagramCaption(p, selected, url));
    this.instagramShareOpen.set(true);
  }

  canAdvanceToEnCamino(): boolean {
    return this.isOwnShelter() || this.auth.hasRole('coordinador');
  }

  hasCoords(p: PuntoDemanda): boolean {
    const lat = p.lat != null ? Number(p.lat) : NaN;
    const lng = p.lng != null ? Number(p.lng) : NaN;
    return Number.isFinite(lat) && Number.isFinite(lng);
  }

  openDirections(p: PuntoDemanda): void {
    this.directions.open({
      lat: Number(p.lat),
      lng: Number(p.lng),
      name: p.nombre,
    });
  }

  loadIncomingHelp(puntoId: string): void {
    this.matchesApi
      .list({
        punto_id: puntoId,
        estado: 'propuesto,confirmado,en_camino',
      })
      .subscribe({
        next: (res) => this.incomingHelp.set(res.data),
        error: () => this.incomingHelp.set([]),
      });
  }

  loadMatchHistory(puntoId: string): void {
    this.matchesApi
      .list({
        punto_id: puntoId,
        estado: 'entregado,cancelado',
      })
      .subscribe({
        next: (res) => this.matchHistory.set(res.data),
        error: () => this.matchHistory.set([]),
      });
  }

  loadOfertas(): void {
    this.ofertasApi.list({ estado: 'disponible' }).subscribe({
      next: (res) => {
        this.availableOfertas.set(res.data);
        if (
          this.selectedDonorKey() &&
          !this.donorGroups().some((g) => g.key === this.selectedDonorKey())
        ) {
          this.selectedDonorKey.set('');
          this.selectedNeedId.set('');
          this.selectedItemId.set('');
        } else if (!this.selectedDonorKey() && this.donorGroups().length === 1) {
          this.selectDonor(this.donorGroups()[0]);
        }
      },
      error: () => this.availableOfertas.set([]),
    });
  }

  selectDonor(group: DonorGroup): void {
    this.selectedDonorKey.set(group.key);
    this.selectedNeedId.set('');
    this.selectedItemId.set('');
    queueMicrotask(() => this.autoSelectIfSingle());
  }

  selectNeed(n: Necesidad): void {
    this.selectedNeedId.set(n.id);
    this.selectedItemId.set('');
    queueMicrotask(() => {
      const offers = this.matchingOffers();
      if (offers.length === 1) this.selectedItemId.set(offers[0].item.id);
    });
  }

  selectOfferItem(opt: OfferOpt): void {
    this.selectedItemId.set(opt.item.id);
  }

  private autoSelectIfSingle(): void {
    const needs = this.filteredOwnNeeds();
    if (needs.length === 1) this.selectedNeedId.set(needs[0].id);
    const offers = this.matchingOffers();
    if (offers.length === 1) this.selectedItemId.set(offers[0].item.id);
  }

  offerCoversMunicipio(o: Oferta, municipio: string): boolean {
    if (!municipio) return false;
    if (o.municipio_preferido === municipio) return true;
    return (o.municipios_alternativos || []).includes(municipio);
  }

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

  private buildBankAccountGroup(data?: CuentaBancaria) {
    return this.fb.nonNullable.group({
      banco: [data?.banco || '', Validators.required],
      tipo_cuenta: [data?.tipo_cuenta || 'ahorros', Validators.required],
      numero_cuenta: [
        data?.numero_cuenta || '',
        [Validators.required, Validators.pattern(/^\d{6,20}$/)],
      ],
    });
  }

  openBankAccountsModal(): void {
    this.bankAccountRows.clear();
    const existing = this.punto()?.cuentas_bancarias || [];
    if (existing.length === 0) {
      this.bankAccountRows.push(this.buildBankAccountGroup());
    } else {
      for (const cuenta of existing) {
        this.bankAccountRows.push(this.buildBankAccountGroup(cuenta));
      }
    }
    this.bankAccountsOpen.set(true);
  }

  closeBankAccountsModal(): void {
    if (this.busyBankAccounts()) return;
    this.bankAccountsOpen.set(false);
  }

  addBankAccountRow(): void {
    if (this.bankAccountRows.length >= 5) return;
    this.bankAccountRows.push(this.buildBankAccountGroup());
  }

  removeBankAccountRow(index: number): void {
    this.bankAccountRows.removeAt(index);
  }

  clearBankAccounts(): void {
    const p = this.punto();
    if (!p) return;
    this.busyBankAccounts.set(true);
    this.puntosApi.update(p.id, { cuentas_bancarias: [] }).subscribe({
      next: (updated) => {
        this.busyBankAccounts.set(false);
        this.bankAccountsOpen.set(false);
        this.punto.set(updated);
        this.actionIsError.set(false);
        this.actionMessage.set('Se quitaron las cuentas bancarias del albergue.');
      },
      error: (err) => {
        this.busyBankAccounts.set(false);
        this.actionIsError.set(true);
        this.actionMessage.set(err?.error?.error || 'No se pudieron quitar las cuentas.');
      },
    });
  }

  saveBankAccounts(): void {
    if (this.bankAccountsForm.invalid) {
      this.bankAccountsForm.markAllAsTouched();
      this.actionIsError.set(true);
      this.actionMessage.set('Revisa banco, tipo y número de cada cuenta (6–20 dígitos).');
      return;
    }

    const p = this.punto();
    if (!p) return;

    const cuentas = this.bankAccountRows.getRawValue().map((row) => ({
      banco: row.banco.trim(),
      tipo_cuenta: row.tipo_cuenta as CuentaBancaria['tipo_cuenta'],
      numero_cuenta: row.numero_cuenta.trim().replace(/\s/g, ''),
    }));

    this.busyBankAccounts.set(true);
    this.puntosApi.update(p.id, { cuentas_bancarias: cuentas }).subscribe({
      next: (updated) => {
        this.busyBankAccounts.set(false);
        this.bankAccountsOpen.set(false);
        this.punto.set(updated);
        this.actionIsError.set(false);
        this.actionMessage.set(
          cuentas.length
            ? 'Cuentas bancarias guardadas. Ya son visibles para quien quiera donar.'
            : 'Se quitaron las cuentas bancarias del albergue.'
        );
      },
      error: (err) => {
        this.busyBankAccounts.set(false);
        this.actionIsError.set(true);
        this.actionMessage.set(err?.error?.error || 'No se pudieron guardar las cuentas.');
      },
    });
  }

  confirmSelfMatch(): void {
    const summary = this.selectionSummary();
    if (!summary) return;
    this.busySelfMatch.set(summary.opt.item.id);
    this.matchesApi
      .create({
        necesidad_id: summary.need.id,
        oferta_item_id: summary.opt.item.id,
        estado: 'confirmado',
      })
      .subscribe({
        next: () => {
          this.busySelfMatch.set(null);
          this.actionIsError.set(false);
          this.actionMessage.set(
            'Emparejamiento creado. Llama al oferente para coordinar y luego marca “en camino”.'
          );
          this.selectedItemId.set('');
          const puntoId = this.punto()?.id;
          if (puntoId) this.loadPunto(puntoId);
        },
        error: (err) => {
          this.busySelfMatch.set(null);
          this.actionIsError.set(true);
          this.actionMessage.set(
            err?.error?.error || 'No se pudo emparejar esta ayuda.'
          );
        },
      });
  }

  markEnCamino(match: Emparejamiento): void {
    this.busyMatch.set(match.id);
    this.matchesApi.updateEstado(match.id, 'en_camino').subscribe({
      next: () => {
        this.busyMatch.set(null);
        this.actionIsError.set(false);
        this.actionMessage.set('Marcado como en camino.');
        const puntoId = this.punto()?.id;
        if (puntoId) {
          this.loadIncomingHelp(puntoId);
          this.loadMatchHistory(puntoId);
        }
      },
      error: (err) => {
        this.busyMatch.set(null);
        this.actionIsError.set(true);
        this.actionMessage.set(err?.error?.error || 'No se pudo actualizar.');
      },
    });
  }

  askConfirmDelivery(match: Emparejamiento): void {
    this.pendingDelivery.set(match);
  }

  cancelConfirmDelivery(): void {
    if (this.busyMatch()) return;
    this.pendingDelivery.set(null);
  }

  matchQtyLabel(m: Emparejamiento): string | null {
    const qty = m.cantidad != null ? m.cantidad : null;
    if (qty == null) return null;
    const unit = m.oferta_item?.unidad || m.necesidad?.unidad || '';
    return `${qty} ${unit}`.trim();
  }

  matchDescripcion(m: Emparejamiento): string | null {
    const fromNeed = m.necesidad?.descripcion?.trim();
    if (fromNeed) return fromNeed;
    const fromItem = m.oferta_item?.descripcion?.trim();
    return fromItem || null;
  }

  matchConfirmedLabel(m: Emparejamiento): string {
    if (m.estado === 'propuesto') {
      return `Propuesto ${timeAgo(m.created_at)}`;
    }
    return `Confirmado ${timeAgo(m.created_at)}`;
  }

  offerItemDescripcion(item: OfertaItem): string | null {
    return item.descripcion?.trim() || null;
  }

  mediaUrl(path: string): string {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return `${environment.apiUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  confirmDelivery(): void {
    const p = this.punto();
    const pending = this.pendingDelivery();
    if (!p || !pending) return;

    this.busyMatch.set(pending.id);
    this.actionMessage.set(null);
    this.matchesApi.confirmDelivery(pending.id).subscribe({
      next: () => {
        this.busyMatch.set(null);
        this.pendingDelivery.set(null);
        this.actionIsError.set(false);
        this.actionMessage.set('Ayuda marcada como entregada. Gracias.');
        this.loadIncomingHelp(p.id);
        this.loadMatchHistory(p.id);
        this.loadPunto(p.id);
      },
      error: (err) => {
        this.busyMatch.set(null);
        this.actionIsError.set(true);
        this.actionMessage.set(
          err?.error?.error || 'No se pudo confirmar la entrega.'
        );
      },
    });
  }

  matchHistoryTag(estado: string): string {
    if (estado === 'entregado') return 'ok';
    if (estado === 'cancelado') return 'alta';
    return '';
  }

  loadUsers(puntoId: string): void {
    this.usuariosApi.listByPunto(puntoId).subscribe({
      next: (res) => this.puntoUsers.set(res.data),
      error: () => this.puntoUsers.set([]),
    });
  }

  createUser(): void {
    const p = this.punto();
    if (!p || this.userForm.invalid) return;
    this.busyUser.set(true);
    this.actionMessage.set(null);
    this.tempPassword.set(null);
    this.copied.set(false);
    const { nombre, email } = this.userForm.getRawValue();

    this.usuariosApi
      .createResponsable({ nombre, email, punto_id: p.id })
      .subscribe({
        next: (user) => {
          this.busyUser.set(false);
          this.actionIsError.set(false);
          const pwd = user.temporary_password || null;
          if (pwd) {
            this.tempPassword.set(pwd);
            this.tempPasswordEmail.set(user.email);
            this.actionMessage.set('Usuario creado. Copia la contraseña de abajo.');
          } else {
            this.actionIsError.set(true);
            this.actionMessage.set(
              'Usuario creado, pero no recibimos la contraseña. Usa “Resetear contraseña”.'
            );
          }
          this.userForm.reset({ nombre: '', email: '' });
          this.loadUsers(p.id);
        },
        error: (err) => {
          this.busyUser.set(false);
          this.actionIsError.set(true);
          this.actionMessage.set(err?.error?.error || 'No se pudo crear el usuario.');
        },
      });
  }

  resetPassword(user: Usuario): void {
    this.busyReset.set(user.id);
    this.actionMessage.set(null);
    this.tempPassword.set(null);
    this.copied.set(false);
    this.showUserForm.set(true);
    this.usuariosApi.resetPassword(user.id).subscribe({
      next: (updated) => {
        this.busyReset.set(null);
        this.actionIsError.set(false);
        const pwd = updated.temporary_password || null;
        if (pwd) {
          this.tempPassword.set(pwd);
          this.tempPasswordEmail.set(updated.email);
          this.actionMessage.set('Contraseña restablecida. Copia la de abajo.');
        } else {
          this.actionIsError.set(true);
          this.actionMessage.set('No recibimos la nueva contraseña. Intenta de nuevo.');
        }
      },
      error: (err) => {
        this.busyReset.set(null);
        this.actionIsError.set(true);
        this.actionMessage.set(err?.error?.error || 'No se pudo resetear la contraseña.');
      },
    });
  }

  copyTempPassword(): void {
    const pwd = this.tempPassword();
    if (!pwd || !navigator.clipboard) return;
    void navigator.clipboard.writeText(pwd).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  toggleVerify(): void {
    const p = this.punto();
    if (!p) return;
    this.busy.set(true);
    this.actionMessage.set(null);
    this.puntosApi.verify(p.id).subscribe({
      next: (updated) => {
        this.punto.set(updated);
        this.busy.set(false);
        this.actionIsError.set(false);
        this.actionMessage.set(
          updated.verificado
            ? 'Albergue verificado. Ya puedes crear su usuario.'
            : 'Se quitó la verificación del albergue.'
        );
        if (updated.verificado) {
          this.showUserForm.set(true);
        }
      },
      error: () => {
        this.actionIsError.set(true);
        this.actionMessage.set(
          p.verificado
            ? 'No se pudo quitar la verificación.'
            : 'No se pudo verificar el albergue.'
        );
        this.busy.set(false);
      },
    });
  }

  toggleCensoAfectados(event: Event): void {
    const p = this.punto();
    if (!p || !this.auth.hasRole('coordinador')) return;
    const checked = (event.target as HTMLInputElement).checked;
    this.busy.set(true);
    this.actionMessage.set(null);
    this.puntosApi.update(p.id, { censo_afectados_habilitado: checked }).subscribe({
      next: (updated) => {
        this.punto.set(updated);
        this.busy.set(false);
        this.actionIsError.set(false);
        this.actionMessage.set(
          checked
            ? 'Censo de afectados habilitado para este albergue.'
            : 'Censo de afectados deshabilitado.'
        );
      },
      error: (err) => {
        (event.target as HTMLInputElement).checked = !checked;
        this.busy.set(false);
        this.actionIsError.set(true);
        this.actionMessage.set(
          err?.error?.error || 'No se pudo actualizar el censo de afectados.'
        );
      },
    });
  }

  estadoLabel(v: string): string {
    return ESTADO_PUNTO_LABELS[v] ?? v;
  }
  tipoLabel(v: string): string {
    return TIPO_PUNTO_LABELS[v] ?? v;
  }
  tipoCuentaLabel(v: string): string {
    return v === 'corriente' ? 'Corriente' : 'Ahorros';
  }
  categoriaLabel(v: string): string {
    return CATEGORIA_LABELS[v] ?? v;
  }
  categoriaIcon = categoriaIcon;
  urgenciaLabel(v: string): string {
    return URGENCIA_LABELS[v] ?? v;
  }
  matchEstadoLabel(v: string): string {
    return ESTADO_EMPAREJAMIENTO_LABELS[v] ?? v;
  }
}

function groupMatchesByDonor(matches: Emparejamiento[]): DonorMatchGroup[] {
  const map = new Map<string, DonorMatchGroup>();
  for (const m of matches) {
    const key = m.oferta
      ? ofertaDonorKey(m.oferta)
      : donorIdentityKey(null, null, m.oferta_id || m.id);
    const existing = map.get(key);
    if (existing) {
      existing.matches.push(m);
      if (!existing.contacto && m.oferta?.oferente_contacto) {
        existing.contacto = m.oferta.oferente_contacto;
      }
      continue;
    }
    map.set(key, {
      key,
      nombre: m.oferta?.oferente_nombre || 'Ayuda emparejada',
      contacto: m.oferta?.oferente_contacto ?? null,
      matches: [m],
    });
  }
  return [...map.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );
}
