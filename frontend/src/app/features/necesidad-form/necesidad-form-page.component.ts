import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NecesidadesApiService, PuntosApiService } from '../../core/api.services';
import { CategoriaNecesidad, EstadoNecesidad, Urgencia } from '../../core/models';
import {
  CATEGORIA_FAMILIA_LABELS,
  CATEGORIA_FAMILIA_ORDER,
  CATEGORIA_LABELS,
  getCategoriaMeta,
  getCategoriasByFamilia,
} from '../../core/utils/labels';
import type { CategoriaFieldHints } from '../../core/utils/labels';
import { ShellComponent } from '../../layout/shell.component';

@Component({
  selector: 'app-necesidad-form-page',
  standalone: true,
  imports: [ShellComponent, ReactiveFormsModule, RouterLink],
  template: `
    <app-shell>
      <a [routerLink]="['/puntos', puntoId]" class="btn btn-ghost" style="margin-bottom: 0.75rem; display: inline-flex">
        ← Volver al albergue
      </a>
      <h1>{{ isEdit() ? 'Editar necesidad' : 'Reportar una necesidad' }}</h1>
      <p>
        @if (isEdit()) {
          Actualiza cantidades, urgencia o estado. Los cambios se reflejan de inmediato en el mapa.
        } @else {
          Cuéntanos qué hace falta. Si no hay red, queda en cola y se envía luego.
        }
      </p>

      @if (message()) {
        <div class="banner" [class.ok]="!isError()" [class.danger]="isError()">{{ message() }}</div>
      }

      @if (loading()) {
        <p class="ops-quiet">Cargando…</p>
      } @else if (blocked()) {
        <div class="banner warn">
          Este albergue aún no está verificado. Un coordinador debe verificarlo antes de reportar necesidades.
          <a [routerLink]="['/puntos', puntoId]">Volver al albergue</a>
        </div>
      } @else {
      <form class="panel form-grid" [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label for="categoria">Categoría *</label>
          <select id="categoria" formControlName="categoria">
            @for (fam of familias; track fam) {
              <optgroup [label]="familiaLabel(fam)">
                @for (cat of categoriasPorFamilia(fam); track cat) {
                  <option [value]="cat">{{ categoriaLabel(cat) }}</option>
                }
              </optgroup>
            }
          </select>
        </div>

        @if (selectedMeta(); as meta) {
          <div class="banner" [class.warn]="meta.flujo === 'servicio'">
            {{ meta.need.hint }}
          </div>
        }

        <div class="field">
          <label for="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            formControlName="descripcion"
            [placeholder]="needPlaceholder('descripcionPlaceholder', 'Detalles adicionales')"
          ></textarea>
        </div>

        <div class="form-row-2">
          <div class="field">
            <label for="cantidad">{{ needPlaceholder('cantidadLabel', 'Cantidad que falta') }}</label>
            <input
              id="cantidad"
              type="number"
              formControlName="cantidad"
              [placeholder]="needPlaceholder('cantidadPlaceholder', '')"
            />
          </div>
          <div class="field">
            <label for="unidad">{{ needPlaceholder('unidadLabel', 'Unidad') }}</label>
            <input
              id="unidad"
              formControlName="unidad"
              [placeholder]="needPlaceholder('unidadPlaceholder', 'kits, paquetes…')"
            />
          </div>
        </div>

        @if (isEdit()) {
          <div class="field">
            <label for="cantidad_solicitada">Cantidad total solicitada (opcional)</label>
            <input id="cantidad_solicitada" type="number" formControlName="cantidad_solicitada" />
            <div class="hint">Útil si ya llegó algo parcial y quieres mostrar "faltan X de Y".</div>
          </div>

          <div class="field">
            <label for="estado">Estado</label>
            <select id="estado" formControlName="estado">
              <option value="abierta">Abierta</option>
              <option value="en_camino">En camino</option>
              <option value="cubierta">Cubierta / ya no hace falta</option>
            </select>
          </div>
        }

        <div class="field">
          <label for="urgencia">Urgencia</label>
          <select id="urgencia" formControlName="urgencia">
            <option value="alta">Urgente</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div class="form-actions-row">
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || busy()">
            {{ busy() ? 'Guardando…' : isEdit() ? 'Guardar cambios' : 'Guardar necesidad' }}
          </button>
          @if (isEdit()) {
            <button class="btn btn-danger" type="button" [disabled]="busy()" (click)="confirmDelete.set(true)">
              Eliminar
            </button>
          }
        </div>
      </form>
      }
    </app-shell>

    @if (confirmDelete()) {
      <div class="modal-backdrop" (click)="confirmDelete.set(false)">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>¿Eliminar esta necesidad?</h3>
          <p>Desaparecerá del mapa y de los listados públicos. Esta acción no se puede deshacer.</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" (click)="confirmDelete.set(false)">Cancelar</button>
            <button class="btn btn-danger" type="button" [disabled]="busy()" (click)="deleteNeed()">
              {{ busy() ? 'Eliminando…' : 'Sí, eliminar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .form-actions-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
      }
      .btn-danger {
        border: none;
        background: var(--rose);
        color: #fff;
      }
      .btn-danger:hover {
        filter: brightness(1.05);
      }
    `,
  ],
})
export class NecesidadFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(NecesidadesApiService);
  private readonly puntosApi = inject(PuntosApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  puntoId = '';
  needId = '';
  readonly isEdit = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly blocked = signal(false);
  readonly confirmDelete = signal(false);
  readonly message = signal<string | null>(null);
  readonly isError = signal(false);
  readonly familias = CATEGORIA_FAMILIA_ORDER;

  readonly form = this.fb.nonNullable.group({
    categoria: ['agua' as CategoriaNecesidad, Validators.required],
    descripcion: [''],
    cantidad: [null as number | null],
    cantidad_solicitada: [null as number | null],
    unidad: [''],
    urgencia: ['media' as Urgencia],
    estado: ['abierta' as EstadoNecesidad],
  });

  private readonly categoriaValue = toSignal(this.form.controls.categoria.valueChanges, {
    initialValue: this.form.controls.categoria.value,
  });

  readonly selectedMeta = computed(() => {
    const cat = this.categoriaValue();
    return cat ? getCategoriaMeta(cat) : null;
  });

  ngOnInit(): void {
    this.puntoId = this.route.snapshot.paramMap.get('id') || '';
    this.needId = this.route.snapshot.paramMap.get('needId') || '';
    this.isEdit.set(!!this.needId);

    if (!this.puntoId) return;

    if (this.isEdit()) {
      this.loading.set(true);
      this.api.getByPunto(this.puntoId, this.needId).subscribe({
        next: (need) => {
          this.form.patchValue({
            categoria: need.categoria,
            descripcion: need.descripcion || '',
            cantidad: need.cantidad ?? null,
            cantidad_solicitada: need.cantidad_solicitada ?? null,
            unidad: need.unidad || '',
            urgencia: need.urgencia,
            estado: need.estado,
          });
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.isError.set(true);
          this.message.set('No se pudo cargar la necesidad.');
        },
      });
      return;
    }

    const familia = this.route.snapshot.queryParamMap.get('familia');
    if (familia === 'reconstruccion') {
      this.form.controls.categoria.setValue('cemento');
    } else if (familia === 'transporte') {
      this.form.controls.categoria.setValue('transporte_carga_liviana');
    }

    this.puntosApi.getById(this.puntoId).subscribe({
      next: (punto) => {
        if (!punto.verificado) {
          this.blocked.set(true);
        }
      },
      error: () => {
        this.blocked.set(true);
        this.isError.set(true);
        this.message.set('No se pudo cargar el albergue.');
      },
    });
  }

  familiaLabel(fam: string): string {
    return CATEGORIA_FAMILIA_LABELS[fam as keyof typeof CATEGORIA_FAMILIA_LABELS] ?? fam;
  }

  categoriasPorFamilia(fam: string): CategoriaNecesidad[] {
    return getCategoriasByFamilia(fam as 'humanitaria' | 'reconstruccion' | 'transporte') as CategoriaNecesidad[];
  }

  categoriaLabel(cat: string): string {
    return CATEGORIA_LABELS[cat] ?? cat;
  }

  needPlaceholder(field: keyof CategoriaFieldHints, fallback: string): string {
    return this.selectedMeta()?.need[field] ?? fallback;
  }

  submit(): void {
    if (this.form.invalid || !this.puntoId || this.blocked()) return;
    this.busy.set(true);
    this.message.set(null);

    const raw = this.form.getRawValue();
    const body = this.isEdit()
      ? {
          categoria: raw.categoria,
          descripcion: raw.descripcion || null,
          cantidad: raw.cantidad,
          cantidad_solicitada: raw.cantidad_solicitada,
          unidad: raw.unidad || null,
          urgencia: raw.urgencia,
          estado: raw.estado,
        }
      : {
          categoria: raw.categoria,
          descripcion: raw.descripcion || null,
          cantidad: raw.cantidad,
          unidad: raw.unidad || null,
          urgencia: raw.urgencia,
        };

    const req = this.isEdit()
      ? this.api.update(this.puntoId, this.needId, body)
      : this.api.create(this.puntoId, body);

    req.subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigate(['/puntos', this.puntoId]);
      },
      error: (err) => {
        this.busy.set(false);
        if (err?.queued) {
          this.isError.set(false);
          this.message.set(err.message);
          return;
        }
        this.isError.set(true);
        this.message.set(err?.error?.error || 'No se pudo guardar la necesidad.');
      },
    });
  }

  deleteNeed(): void {
    if (!this.puntoId || !this.needId) return;
    this.busy.set(true);
    this.api.remove(this.puntoId, this.needId).subscribe({
      next: () => {
        this.busy.set(false);
        void this.router.navigate(['/puntos', this.puntoId]);
      },
      error: (err) => {
        this.busy.set(false);
        this.isError.set(true);
        this.message.set(err?.error?.error || 'No se pudo eliminar la necesidad.');
        this.confirmDelete.set(false);
      },
    });
  }
}
