import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AfectadosApiService, PuntosApiService } from '../../core/api.services';
import { AuthService } from '../../core/auth.service';
import { MunicipioSelectComponent } from '../../core/components/municipio-select.component';
import {
  Afectado,
  AfectadoIntegrante,
  ModoRegistroCenso,
  PuntoDemanda,
  SituacionActualCenso,
  ViviendaEstadoCenso,
} from '../../core/models';
import {
  CONDICION_ESPECIAL_LABELS,
  MODO_REGISTRO_LABELS,
  NECESIDADES_CENSO_SUGERIDAS,
  RANGO_EDAD_LABELS,
  SITUACION_ACTUAL_LABELS,
  VIVIENDA_ESTADO_LABELS,
} from '../../core/utils/censo-labels';
import { ShellComponent } from '../../layout/shell.component';

@Component({
  selector: 'app-censo-afectados-page',
  standalone: true,
  imports: [ShellComponent, ReactiveFormsModule, RouterLink, MunicipioSelectComponent],
  template: `
    <app-shell>
      <a [routerLink]="['/puntos', puntoId()]" class="btn btn-ghost" style="margin-bottom: 0.75rem; display: inline-flex">
        ← Volver al albergue
      </a>

      <h1>Censo de afectados</h1>
      @if (punto(); as p) {
        <p>
          Registra familias o personas afectadas por el terremoto en tu zona.
          <strong>No tienen que estar en el albergue.</strong>
          Captura: {{ p.nombre }} · {{ p.municipio }}
        </p>
      }

      @if (loading()) {
        <p class="ops-quiet">Cargando…</p>
      } @else if (!punto()?.censo_afectados_habilitado) {
        <div class="banner warn">
          El censo de afectados no está habilitado para este albergue.
          Coordinación debe activarlo.
        </div>
      } @else {
        @if (message()) {
          <div class="banner" [class.ok]="!isError()" [class.danger]="isError()">{{ message() }}</div>
        }

        <div class="panel censo-toolbar">
          <div class="censo-toolbar-actions">
            <button class="btn btn-primary" type="button" (click)="startCreate()">
              {{ showForm() ? 'Cancelar registro' : 'Nuevo registro' }}
            </button>
            <a class="btn btn-secondary" routerLink="/coordinacion/reportes">Ver reportes</a>
          </div>
          <div class="field censo-filter">
            <label for="censo-scope-filter">Ver</label>
            <select id="censo-scope-filter" [value]="filterScope()" (change)="onFilterScope($event)">
              <option value="todos">Todos los registrados</option>
              <option value="en_albergue">Solo en albergue</option>
              <option value="fuera">Fuera del albergue</option>
            </select>
          </div>
        </div>

        @if (showForm()) {
          <form class="panel form-grid censo-form" [formGroup]="form" (ngSubmit)="submit()">
            <h2>{{ editingId() ? 'Editar registro' : 'Nuevo registro' }}</h2>

            <div class="field">
              <label>Modo de censo</label>
              <select formControlName="modo_registro" (change)="onModoChange()">
                <option value="agregado">{{ MODO_REGISTRO_LABELS.agregado }}</option>
                <option value="detallado">{{ MODO_REGISTRO_LABELS.detallado }}</option>
              </select>
            </div>

            <div class="form-row-2">
              <div class="field">
                <label>Tipo</label>
                <select formControlName="tipo_registro" (change)="onTipoRegistroChange()">
                  <option value="hogar">Hogar / familia</option>
                  <option value="persona_sola">Persona sola</option>
                </select>
              </div>
              <div class="field">
                <label>Referencia (opcional)</label>
                <input formControlName="nombre_referencia" placeholder="Ej. Familia en la calle 5" />
              </div>
            </div>

            <div class="form-row-2">
              <div class="field">
                <label>Municipio afectación</label>
                <app-municipio-select formControlName="municipio" />
              </div>
              <div class="field">
                <label>Vereda / barrio</label>
                <input formControlName="vereda_barrio" />
              </div>
            </div>

            <div class="field">
              <label>Dirección aproximada</label>
              <input formControlName="direccion_aproximada" />
            </div>

            <div class="form-row-2">
              <div class="field">
                <label>Estado vivienda</label>
                <select formControlName="vivienda_estado">
                  @for (item of viviendaOptions; track item.value) {
                    <option [value]="item.value">{{ item.label }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label>Situación actual</label>
                <select formControlName="situacion_actual" (change)="onSituacionChange()">
                  @for (item of situacionOptions; track item.value) {
                    <option [value]="item.value">{{ item.label }}</option>
                  }
                </select>
              </div>
            </div>

            @if (form.controls.situacion_actual.value === 'en_albergue') {
              <div class="field">
                <label>Albergue donde está</label>
                <select formControlName="punto_acogida_id">
                  <option [value]="puntoId()">{{ punto()?.nombre }} (este albergue)</option>
                </select>
              </div>
            } @else {
              <div class="form-row-2">
                <div class="field">
                  <label>Municipio donde está ahora</label>
                  <app-municipio-select
                    formControlName="municipio_ubicacion_actual"
                    [allowEmpty]="true"
                    emptyLabel="Igual al de afectación"
                  />
                </div>
                <div class="field">
                  <label>Ubicación (texto)</label>
                  <input formControlName="ubicacion_texto" placeholder="Con familiar, carpa, etc." />
                </div>
              </div>
            }

            @if (form.controls.modo_registro.value === 'agregado') {
              <fieldset class="censo-fieldset">
                <legend>Personas en el núcleo</legend>
                <div class="form-row-2">
                  <div class="field">
                    <label>Total</label>
                    <input
                      type="number"
                      formControlName="total_personas"
                      readonly
                      tabindex="-1"
                      class="censo-total-readonly"
                    />
                    <p class="hint">Calculado según los rangos de edad.</p>
                  </div>
                  <div class="field">
                    <label>0–5 años</label>
                    <input type="number" min="0" formControlName="ninos_0_5" (input)="syncAggregatedTotal()" />
                  </div>
                  <div class="field">
                    <label>6–17 años</label>
                    <input type="number" min="0" formControlName="ninos_6_17" (input)="syncAggregatedTotal()" />
                  </div>
                  <div class="field">
                    <label>Hombres 18–59</label>
                    <input type="number" min="0" formControlName="adultos_hombres" (input)="syncAggregatedTotal()" />
                  </div>
                  <div class="field">
                    <label>Mujeres 18–59</label>
                    <input type="number" min="0" formControlName="adultos_mujeres" (input)="syncAggregatedTotal()" />
                  </div>
                  <div class="field">
                    <label>60+ años</label>
                    <input type="number" min="0" formControlName="adultos_mayores_60" (input)="syncAggregatedTotal()" />
                  </div>
                  <div class="field">
                    <label>Embarazadas</label>
                    <input type="number" min="0" formControlName="embarazadas" />
                  </div>
                  <div class="field">
                    <label>Con discapacidad</label>
                    <input type="number" min="0" formControlName="personas_discapacidad" />
                  </div>
                </div>
              </fieldset>
            } @else {
              <fieldset class="censo-fieldset">
                <legend>Integrantes</legend>
                <div formArrayName="integrantes" class="censo-integrantes">
                  @for (ctrl of integrantes.controls; track $index; let i = $index) {
                    <div class="censo-integrante panel" [formGroupName]="i">
                      <div class="form-row-2">
                        <div class="field">
                          <label>Edad</label>
                          <select formControlName="rango_edad">
                            @for (item of rangoEdadOptions; track item.value) {
                              <option [value]="item.value">{{ item.label }}</option>
                            }
                          </select>
                        </div>
                        <div class="field">
                          <label>Sexo</label>
                          <select formControlName="sexo">
                            <option value="">—</option>
                            <option value="masculino">Masculino</option>
                            <option value="femenino">Femenino</option>
                            <option value="otro">Otro</option>
                            <option value="no_indica">Prefiere no decir</option>
                          </select>
                        </div>
                        <div class="field">
                          <label>Condición</label>
                          <select formControlName="condicion_especial">
                            @for (item of condicionOptions; track item.value) {
                              <option [value]="item.value">{{ item.label }}</option>
                            }
                          </select>
                        </div>
                        <div class="field">
                          <label>Nombre (opcional)</label>
                          <input formControlName="nombre" />
                        </div>
                      </div>
                      @if (integrantes.length > 1) {
                        <button class="btn btn-ghost btn-sm" type="button" (click)="removeIntegrante(i)">
                          Quitar
                        </button>
                      }
                    </div>
                  }
                </div>
                @if (form.controls.tipo_registro.value === 'hogar') {
                  <button class="btn btn-secondary btn-sm" type="button" (click)="addIntegrante()">
                    + Integrante
                  </button>
                }
              </fieldset>
            }

            <div class="field">
              <label>Necesidades (separadas por coma)</label>
              <input formControlName="necesidades_text" [attr.list]="'necesidades-censo-list'" />
              <datalist id="necesidades-censo-list">
                @for (n of necesidadesSugeridas; track n) {
                  <option [value]="n"></option>
                }
              </datalist>
            </div>

            <div class="field">
              <label>Observaciones</label>
              <textarea formControlName="observaciones" rows="2"></textarea>
            </div>

            <label class="censo-consent">
              <input type="checkbox" formControlName="consentimiento_registro" />
              Confirmo que informé el propósito del registro y cuentan con consentimiento.
            </label>

            @if (submitBlockers().length) {
              <div class="censo-submit-hints" role="status">
                <p>Para {{ editingId() ? 'guardar' : 'registrar' }}, completa:</p>
                <ul>
                  @for (hint of submitBlockers(); track hint) {
                    <li>{{ hint }}</li>
                  }
                </ul>
              </div>
            }

            <button class="btn btn-primary" type="submit" [disabled]="!canSubmit()">
              {{ busy() ? 'Guardando…' : editingId() ? 'Guardar cambios' : 'Registrar' }}
            </button>
          </form>
        }

        <section class="panel">
          <h2>Registros ({{ afectados().length }})</h2>
          @if (afectados().length === 0) {
            <div class="empty">Aún no hay registros de afectados.</div>
          } @else {
            <ul class="censo-list">
              @for (a of afectados(); track a.id) {
                <li class="censo-item">
                  <div>
                    <strong>{{ a.nombre_referencia || 'Sin referencia' }}</strong>
                    <span class="tag">{{ situacionLabel(a.situacion_actual) }}</span>
                    <span class="tag">{{ a.total_personas }} pers.</span>
                    @if (a.modo_registro === 'detallado') {
                      <span class="tag">Detallado</span>
                    }
                    <p class="censo-item-meta">
                      {{ a.municipio }}
                      @if (a.vereda_barrio) { · {{ a.vereda_barrio }} }
                      · {{ viviendaLabel(a.vivienda_estado) }}
                    </p>
                  </div>
                  <div class="censo-item-actions">
                    <button class="btn btn-secondary btn-sm" type="button" (click)="openView(a)">Ver</button>
                    <button class="btn btn-ghost btn-sm" type="button" (click)="startEdit(a)">Editar</button>
                    <button class="btn btn-ghost btn-sm" type="button" (click)="remove(a)">Eliminar</button>
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      }

      @if (viewingAfectado(); as a) {
        <div class="modal-backdrop" (click)="closeView()">
          <div
            class="modal-card censo-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="censo-detail-title"
            (click)="$event.stopPropagation()"
          >
            <h3 id="censo-detail-title">{{ a.nombre_referencia || 'Registro de afectado' }}</h3>

            @if (viewLoading()) {
              <p class="censo-detail-loading">Cargando detalle…</p>
            } @else {
              <div class="censo-detail-tags">
                <span class="tag">{{ situacionLabel(a.situacion_actual) }}</span>
                <span class="tag">{{ a.total_personas }} pers.</span>
                <span class="tag">{{ MODO_REGISTRO_LABELS[a.modo_registro] }}</span>
                <span class="tag">{{ tipoRegistroLabel(a.tipo_registro) }}</span>
              </div>

              <dl class="censo-detail-grid">
                <dt>Ubicación afectación</dt>
                <dd>
                  {{ a.municipio }}
                  @if (a.vereda_barrio) { · {{ a.vereda_barrio }} }
                  @if (a.direccion_aproximada) {
                    <div class="censo-detail-sub">{{ a.direccion_aproximada }}</div>
                  }
                </dd>

                <dt>Estado vivienda</dt>
                <dd>{{ viviendaLabel(a.vivienda_estado) }}</dd>

                <dt>Situación actual</dt>
                <dd>
                  {{ situacionLabel(a.situacion_actual) }}
                  @if (a.situacion_actual === 'en_albergue' && a.punto_acogida) {
                    <div class="censo-detail-sub">Albergue: {{ a.punto_acogida.nombre }}</div>
                  } @else {
                    @if (a.municipio_ubicacion_actual) {
                      <div class="censo-detail-sub">{{ a.municipio_ubicacion_actual }}</div>
                    }
                    @if (a.ubicacion_texto) {
                      <div class="censo-detail-sub">{{ a.ubicacion_texto }}</div>
                    }
                  }
                </dd>

                <dt>Personas</dt>
                <dd>
                  @if (a.modo_registro === 'detallado' && a.integrantes?.length) {
                    <ul class="censo-detail-integrantes">
                      @for (row of a.integrantes; track row.id || $index) {
                        <li>
                          {{ rangoEdadLabel(row.rango_edad) }}
                          @if (row.sexo) { · {{ sexoLabel(row.sexo) }} }
                          @if (row.condicion_especial !== 'ninguna') {
                            · {{ condicionLabel(row.condicion_especial) }}
                          }
                          @if (row.nombre) { · {{ row.nombre }} }
                        </li>
                      }
                    </ul>
                  } @else {
                    <ul class="censo-detail-demographics">
                      @for (item of demographicLines(a); track item.label) {
                        <li>{{ item.label }}: <strong>{{ item.value }}</strong></li>
                      }
                    </ul>
                  }
                </dd>

                @if (a.necesidades?.length) {
                  <dt>Necesidades</dt>
                  <dd class="censo-detail-needs">
                    @for (n of a.necesidades; track n) {
                      <span class="tag">{{ n }}</span>
                    }
                  </dd>
                }

                @if (a.observaciones) {
                  <dt>Observaciones</dt>
                  <dd>{{ a.observaciones }}</dd>
                }

                <dt>Registro</dt>
                <dd>
                  {{ formatDate(a.created_at) }}
                  · Consentimiento {{ a.consentimiento_registro ? 'sí' : 'no' }}
                </dd>
              </dl>
            }

            <div class="modal-actions">
              <button class="btn btn-ghost" type="button" (click)="closeView()">Cerrar</button>
              <button class="btn btn-secondary" type="button" (click)="editFromView(a)">Editar</button>
            </div>
          </div>
        </div>
      }
    </app-shell>
  `,
  styles: [
    `
      .censo-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: end;
        justify-content: space-between;
        margin-bottom: 1rem;
      }
      .censo-toolbar-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .censo-filter {
        min-width: min(100%, 220px);
        margin: 0;
      }
      .censo-form {
        margin-bottom: 1rem;
      }
      .censo-fieldset {
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        padding: 0.75rem;
        margin: 0;
      }
      .censo-fieldset legend {
        padding: 0 0.35rem;
        font-weight: 700;
      }
      .censo-integrantes {
        display: grid;
        gap: 0.65rem;
        margin-bottom: 0.65rem;
      }
      .censo-integrante {
        padding: 0.65rem;
        box-shadow: none;
      }
      .censo-consent {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        font-size: 0.92rem;
        color: var(--ink-soft);
      }
      .censo-total-readonly {
        background: #eef3f0;
        color: var(--canopy-deep);
        font-weight: 700;
        cursor: default;
      }
      .censo-submit-hints {
        margin: 0;
        padding: 0.75rem 0.85rem;
        border-radius: var(--radius-sm);
        border: 1px solid #e0c9a8;
        background: var(--amber-soft);
        color: var(--ink);
        font-size: 0.92rem;
      }
      .censo-submit-hints p {
        margin: 0 0 0.35rem;
        font-weight: 700;
        color: var(--canopy-deep);
      }
      .censo-submit-hints ul {
        margin: 0;
        padding-left: 1.1rem;
      }
      .censo-submit-hints li + li {
        margin-top: 0.2rem;
      }
      .censo-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.65rem;
      }
      .censo-item {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: flex-start;
        padding: 0.75rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #f7faf8;
      }
      .censo-item-meta {
        margin: 0.35rem 0 0;
        color: var(--ink-soft);
        font-size: 0.9rem;
      }
      .censo-item-actions {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        flex-shrink: 0;
      }
      .censo-detail-modal {
        width: min(560px, 100%);
        max-height: min(88vh, 760px);
        overflow: auto;
      }
      .censo-detail-loading {
        margin: 0 0 1rem;
        color: var(--ink-soft);
      }
      .censo-detail-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-bottom: 0.85rem;
      }
      .censo-detail-grid {
        display: grid;
        grid-template-columns: minmax(7.5rem, 34%) 1fr;
        gap: 0.55rem 0.85rem;
        margin: 0 0 1rem;
      }
      .censo-detail-grid dt {
        margin: 0;
        font-weight: 700;
        color: var(--canopy-deep);
        font-size: 0.9rem;
      }
      .censo-detail-grid dd {
        margin: 0;
        color: var(--ink-soft);
        font-size: 0.95rem;
      }
      .censo-detail-sub {
        margin-top: 0.2rem;
        color: var(--ink-soft);
      }
      .censo-detail-demographics,
      .censo-detail-integrantes {
        margin: 0;
        padding-left: 1.1rem;
      }
      .censo-detail-needs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }
    `,
  ],
})
export class CensoAfectadosPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly puntosApi = inject(PuntosApiService);
  private readonly afectadosApi = inject(AfectadosApiService);
  readonly auth = inject(AuthService);

  readonly MODO_REGISTRO_LABELS = MODO_REGISTRO_LABELS;
  readonly necesidadesSugeridas = NECESIDADES_CENSO_SUGERIDAS;
  readonly situacionOptions = Object.entries(SITUACION_ACTUAL_LABELS).map(([value, label]) => ({
    value: value as SituacionActualCenso,
    label,
  }));
  readonly viviendaOptions = Object.entries(VIVIENDA_ESTADO_LABELS).map(([value, label]) => ({
    value: value as keyof typeof VIVIENDA_ESTADO_LABELS,
    label,
  }));
  readonly rangoEdadOptions = Object.entries(RANGO_EDAD_LABELS).map(([value, label]) => ({
    value,
    label,
  }));
  readonly condicionOptions = Object.entries(CONDICION_ESPECIAL_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  readonly puntoId = signal('');
  readonly punto = signal<PuntoDemanda | null>(null);
  readonly afectados = signal<Afectado[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly isError = signal(false);
  readonly filterScope = signal<'todos' | 'en_albergue' | 'fuera'>('todos');
  readonly viewingAfectado = signal<Afectado | null>(null);
  readonly viewLoading = signal(false);

  private readonly aggregatedAgeFields = [
    'ninos_0_5',
    'ninos_6_17',
    'adultos_hombres',
    'adultos_mujeres',
    'adultos_mayores_60',
  ] as const;

  readonly form = this.fb.nonNullable.group({
    modo_registro: ['agregado' as ModoRegistroCenso, Validators.required],
    tipo_registro: ['hogar' as 'hogar' | 'persona_sola', Validators.required],
    nombre_referencia: [''],
    municipio: ['', Validators.required],
    vereda_barrio: [''],
    direccion_aproximada: [''],
    vivienda_estado: ['no_sabe' as ViviendaEstadoCenso, Validators.required],
    situacion_actual: ['no_ubicado' as SituacionActualCenso, Validators.required],
    punto_acogida_id: [''],
    municipio_ubicacion_actual: [''],
    ubicacion_texto: [''],
    total_personas: [0],
    ninos_0_5: [0, Validators.min(0)],
    ninos_6_17: [0, Validators.min(0)],
    adultos_hombres: [0, Validators.min(0)],
    adultos_mujeres: [0, Validators.min(0)],
    adultos_mayores_60: [0, Validators.min(0)],
    embarazadas: [0, Validators.min(0)],
    personas_discapacidad: [0, Validators.min(0)],
    personas_enfermedad_cronica: [0, Validators.min(0)],
    necesidades_text: [''],
    observaciones: [''],
    consentimiento_registro: [false, Validators.requiredTrue],
    integrantes: this.fb.array([this.createIntegranteGroup()]),
  });

  get integrantes() {
    return this.form.controls.integrantes;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.puntoId.set(id);
    this.loadPunto();
    this.loadAfectados();
    this.syncFormMode();
  }

  canSubmit(): boolean {
    return this.submitBlockers().length === 0 && !this.busy();
  }

  submitBlockers(): string[] {
    const hints: string[] = [];
    const raw = this.form.getRawValue();

    if (!raw.municipio?.trim()) {
      hints.push('Selecciona el municipio de afectación desde la lista.');
    }
    if (!raw.consentimiento_registro) {
      hints.push('Marca la confirmación de consentimiento.');
    }

    if (raw.modo_registro === 'agregado') {
      const ageSum = this.aggregatedAgeSumFrom(raw);
      if (ageSum < 1) {
        hints.push('Indica al menos una persona en los rangos de edad.');
      } else if (raw.tipo_registro === 'persona_sola' && ageSum !== 1) {
        hints.push('Persona sola: los rangos de edad deben sumar exactamente 1.');
      }
    } else {
      const rows = raw.integrantes || [];
      if (rows.length === 0) {
        hints.push('Agrega al menos un integrante en modo detallado.');
      }
      rows.forEach((row, index) => {
        if (row.rango_edad === '18_59' && !row.sexo) {
          hints.push(`Integrante ${index + 1}: indica sexo para edad 18–59.`);
        }
      });
      if (raw.tipo_registro === 'persona_sola' && rows.length !== 1) {
        hints.push('Persona sola: debe haber exactamente un integrante.');
      }
    }

    return hints;
  }

  private aggregatedAgeSumFrom(raw: {
    ninos_0_5: number;
    ninos_6_17: number;
    adultos_hombres: number;
    adultos_mujeres: number;
    adultos_mayores_60: number;
  }): number {
    return (
      Math.max(0, Number(raw.ninos_0_5 || 0)) +
      Math.max(0, Number(raw.ninos_6_17 || 0)) +
      Math.max(0, Number(raw.adultos_hombres || 0)) +
      Math.max(0, Number(raw.adultos_mujeres || 0)) +
      Math.max(0, Number(raw.adultos_mayores_60 || 0))
    );
  }

  private syncFormMode(): void {
    const agregado = this.form.controls.modo_registro.value === 'agregado';
    if (agregado) {
      this.integrantes.disable({ emitEvent: false });
      this.syncAggregatedTotal();
    } else {
      this.integrantes.enable({ emitEvent: false });
    }
  }

  situacionLabel(v: SituacionActualCenso): string {
    return SITUACION_ACTUAL_LABELS[v] || v;
  }

  viviendaLabel(v: string): string {
    return VIVIENDA_ESTADO_LABELS[v as keyof typeof VIVIENDA_ESTADO_LABELS] || v;
  }

  tipoRegistroLabel(v: Afectado['tipo_registro']): string {
    return v === 'persona_sola' ? 'Persona sola' : 'Hogar / familia';
  }

  rangoEdadLabel(v: string): string {
    return RANGO_EDAD_LABELS[v as keyof typeof RANGO_EDAD_LABELS] || v;
  }

  condicionLabel(v: string): string {
    return CONDICION_ESPECIAL_LABELS[v as keyof typeof CONDICION_ESPECIAL_LABELS] || v;
  }

  sexoLabel(v: string): string {
    const labels: Record<string, string> = {
      masculino: 'Masculino',
      femenino: 'Femenino',
      otro: 'Otro',
      no_indica: 'Prefiere no decir',
    };
    return labels[v] || v;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  demographicLines(a: Afectado): Array<{ label: string; value: number }> {
    const rows: Array<{ label: string; value: number }> = [
      { label: 'Total', value: a.total_personas },
      { label: '0–5 años', value: a.ninos_0_5 },
      { label: '6–17 años', value: a.ninos_6_17 },
      { label: 'Hombres 18–59', value: a.adultos_hombres },
      { label: 'Mujeres 18–59', value: a.adultos_mujeres },
      { label: '60+ años', value: a.adultos_mayores_60 },
      { label: 'Embarazadas', value: a.embarazadas },
      { label: 'Con discapacidad', value: a.personas_discapacidad },
      { label: 'Enfermedad crónica', value: a.personas_enfermedad_cronica },
    ];
    return rows.filter((row) => row.label === 'Total' || row.value > 0);
  }

  openView(a: Afectado): void {
    this.viewingAfectado.set(a);
    this.viewLoading.set(true);
    this.afectadosApi.getByPunto(this.puntoId(), a.id).subscribe({
      next: (full) => {
        this.viewingAfectado.set(full);
        this.viewLoading.set(false);
      },
      error: () => {
        this.viewLoading.set(false);
      },
    });
  }

  closeView(): void {
    this.viewingAfectado.set(null);
    this.viewLoading.set(false);
  }

  editFromView(a: Afectado): void {
    this.closeView();
    this.startEdit(a);
  }

  onFilterScope(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'todos' | 'en_albergue' | 'fuera';
    this.filterScope.set(value);
    this.loadAfectados();
  }

  onModoChange(): void {
    this.syncFormMode();
    if (this.form.controls.modo_registro.value === 'detallado') {
      if (this.integrantes.length === 0) this.addIntegrante();
    }
  }

  onTipoRegistroChange(): void {
    if (this.form.controls.tipo_registro.value === 'persona_sola') {
      this.form.patchValue({
        ninos_0_5: 0,
        ninos_6_17: 0,
        adultos_hombres: 0,
        adultos_mujeres: 0,
        adultos_mayores_60: 0,
        embarazadas: 0,
        personas_discapacidad: 0,
        personas_enfermedad_cronica: 0,
      });
    }
    this.syncAggregatedTotal();
  }

  syncAggregatedTotal(): void {
    if (this.form.controls.modo_registro.value !== 'agregado') return;

    const sum = this.aggregatedAgeFields.reduce(
      (acc, key) => acc + Math.max(0, Number(this.form.controls[key].value || 0)),
      0
    );
    this.form.controls.total_personas.setValue(sum, { emitEvent: false });
  }

  private aggregatedAgeSum(): number {
    return this.aggregatedAgeFields.reduce(
      (acc, key) => acc + Math.max(0, Number(this.form.controls[key].value || 0)),
      0
    );
  }

  onSituacionChange(): void {
    if (this.form.controls.situacion_actual.value === 'en_albergue') {
      this.form.controls.punto_acogida_id.setValue(this.puntoId());
    } else {
      this.form.controls.punto_acogida_id.setValue('');
    }
  }

  startCreate(): void {
    if (this.showForm() && !this.editingId()) {
      this.showForm.set(false);
      return;
    }
    this.editingId.set(null);
    this.form.reset({
      modo_registro: 'agregado',
      tipo_registro: 'hogar',
      municipio: this.punto()?.municipio || '',
      vivienda_estado: 'no_sabe',
      situacion_actual: 'no_ubicado',
      total_personas: 0,
      ninos_0_5: 0,
      ninos_6_17: 0,
      adultos_hombres: 0,
      adultos_mujeres: 0,
      adultos_mayores_60: 0,
      embarazadas: 0,
      personas_discapacidad: 0,
      personas_enfermedad_cronica: 0,
      consentimiento_registro: false,
    });
    this.integrantes.clear();
    this.integrantes.push(this.createIntegranteGroup());
    this.syncFormMode();
    this.showForm.set(true);
  }

  startEdit(a: Afectado): void {
    this.editingId.set(a.id);
    this.showForm.set(true);
    this.form.patchValue({
      modo_registro: a.modo_registro,
      tipo_registro: a.tipo_registro,
      nombre_referencia: a.nombre_referencia || '',
      municipio: a.municipio,
      vereda_barrio: a.vereda_barrio || '',
      direccion_aproximada: a.direccion_aproximada || '',
      vivienda_estado: a.vivienda_estado,
      situacion_actual: a.situacion_actual,
      punto_acogida_id: a.punto_acogida_id || '',
      municipio_ubicacion_actual: a.municipio_ubicacion_actual || '',
      ubicacion_texto: a.ubicacion_texto || '',
      total_personas: a.total_personas,
      ninos_0_5: a.ninos_0_5,
      ninos_6_17: a.ninos_6_17,
      adultos_hombres: a.adultos_hombres,
      adultos_mujeres: a.adultos_mujeres,
      adultos_mayores_60: a.adultos_mayores_60,
      embarazadas: a.embarazadas,
      personas_discapacidad: a.personas_discapacidad,
      personas_enfermedad_cronica: a.personas_enfermedad_cronica,
      necesidades_text: (a.necesidades || []).join(', '),
      observaciones: a.observaciones || '',
      consentimiento_registro: a.consentimiento_registro,
    });
    this.integrantes.clear();
    if (a.modo_registro === 'detallado' && a.integrantes?.length) {
      for (const row of a.integrantes) {
        const group = this.createIntegranteGroup();
        group.patchValue({
          rango_edad: row.rango_edad,
          sexo: row.sexo || '',
          condicion_especial: row.condicion_especial || 'ninguna',
          nombre: row.nombre || '',
        });
        this.integrantes.push(group);
      }
    } else {
      this.integrantes.push(this.createIntegranteGroup());
    }
    this.syncFormMode();
  }

  addIntegrante(): void {
    this.integrantes.push(this.createIntegranteGroup());
  }

  removeIntegrante(index: number): void {
    this.integrantes.removeAt(index);
  }

  submit(): void {
    this.syncAggregatedTotal();
    const blockers = this.submitBlockers();
    if (blockers.length) {
      this.isError.set(true);
      this.message.set(blockers[0]);
      return;
    }

    if (this.busy()) return;
    this.busy.set(true);
    this.message.set(null);

    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      modo_registro: raw.modo_registro,
      tipo_registro: raw.tipo_registro,
      nombre_referencia: raw.nombre_referencia || null,
      municipio: raw.municipio,
      vereda_barrio: raw.vereda_barrio || null,
      direccion_aproximada: raw.direccion_aproximada || null,
      vivienda_estado: raw.vivienda_estado,
      situacion_actual: raw.situacion_actual,
      municipio_ubicacion_actual: raw.municipio_ubicacion_actual || null,
      ubicacion_texto: raw.ubicacion_texto || null,
      observaciones: raw.observaciones || null,
      consentimiento_registro: raw.consentimiento_registro,
      necesidades: raw.necesidades_text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      desplazado: raw.situacion_actual !== 'vivienda_propia_danada',
      motivo_principal: 'terremoto',
      prioridad: 'media',
      fuente: 'visita_campo',
      estado_registro: 'activo',
    };

    if (raw.situacion_actual === 'en_albergue') {
      body['punto_acogida_id'] = raw.punto_acogida_id || this.puntoId();
    }

    if (raw.modo_registro === 'agregado') {
      Object.assign(body, {
        total_personas: raw.total_personas,
        ninos_0_5: raw.ninos_0_5,
        ninos_6_17: raw.ninos_6_17,
        adultos_hombres: raw.adultos_hombres,
        adultos_mujeres: raw.adultos_mujeres,
        adultos_mayores_60: raw.adultos_mayores_60,
        embarazadas: raw.embarazadas,
        personas_discapacidad: raw.personas_discapacidad,
        personas_enfermedad_cronica: raw.personas_enfermedad_cronica,
      });
    } else {
      body['integrantes'] = raw.integrantes.map((row) => ({
        rango_edad: row.rango_edad,
        sexo: row.sexo || null,
        condicion_especial: row.condicion_especial,
        nombre: row.nombre || null,
        rol_en_hogar: 'otro',
      }));
    }

    const id = this.editingId();
    const req = id
      ? this.afectadosApi.update(this.puntoId(), id, body)
      : this.afectadosApi.create(this.puntoId(), body);

    req.subscribe({
      next: () => {
        this.busy.set(false);
        this.isError.set(false);
        this.message.set(id ? 'Registro actualizado.' : 'Registro creado.');
        this.showForm.set(false);
        this.editingId.set(null);
        this.loadAfectados();
      },
      error: (err) => {
        this.busy.set(false);
        this.isError.set(true);
        this.message.set(err?.error?.error || 'No se pudo guardar el registro.');
      },
    });
  }

  remove(a: Afectado): void {
    if (!confirm('¿Eliminar este registro de afectado?')) return;
    this.afectadosApi.remove(this.puntoId(), a.id).subscribe({
      next: () => {
        this.message.set('Registro eliminado.');
        this.isError.set(false);
        this.loadAfectados();
      },
      error: (err) => {
        this.isError.set(true);
        this.message.set(err?.error?.error || 'No se pudo eliminar.');
      },
    });
  }

  private loadPunto(): void {
    this.puntosApi.getById(this.puntoId()).subscribe({
      next: (p) => {
        this.punto.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.punto.set(null);
        this.loading.set(false);
      },
    });
  }

  private loadAfectados(): void {
    const scope = this.filterScope();
    const filters =
      scope === 'en_albergue'
        ? { en_albergue: true }
        : scope === 'fuera'
          ? { en_albergue: false }
          : undefined;

    this.afectadosApi.listByPunto(this.puntoId(), filters).subscribe({
      next: (res) => this.afectados.set(res.data),
      error: () => this.afectados.set([]),
    });
  }

  private createIntegranteGroup() {
    return this.fb.nonNullable.group({
      rango_edad: ['18_59' as AfectadoIntegrante['rango_edad'], Validators.required],
      sexo: [''],
      condicion_especial: ['ninguna' as AfectadoIntegrante['condicion_especial'], Validators.required],
      nombre: [''],
    });
  }
}
