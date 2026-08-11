import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PuntosApiService } from '../../core/api.services';
import { MunicipioSelectComponent } from '../../core/components/municipio-select.component';
import {
  isShortMapsLink,
  parseMapsAddress,
  parseMapsLocation,
} from '../../core/utils/maps-url';
import { matchMunicipioFromText } from '../../core/data/municipios';
import { reverseGeocodeMunicipio } from '../../core/utils/reverse-geocode';
import { ShellComponent } from '../../layout/shell.component';

@Component({
  selector: 'app-punto-form-page',
  standalone: true,
  imports: [
    ShellComponent,
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    MunicipioSelectComponent,
  ],
  template: `
    <app-shell>
      <a routerLink="/mapa" class="btn btn-ghost" style="margin-bottom: 0.75rem; display: inline-flex">← Volver</a>
      <h1>{{ isEdit() ? 'Actualizar punto' : 'Registrar albergue o punto de acogida' }}</h1>
      @if (!isEdit()) {
        <p>
          Empieza pegando el enlace de Google Maps del albergue. Un coordinador lo revisará
          antes de publicarlo en el mapa. Si no hay señal, igual puedes guardar: se enviará al reconectar.
        </p>
      } @else {
        <p>Actualiza cupos, ubicación y datos de contacto de tu albergue.</p>
      }

      @if (message()) {
        <div class="banner" [class.ok]="!isError()" [class.danger]="isError()">{{ message() }}</div>
      }

      @if (registered()) {
        <section class="panel registration-success">
          <div class="registration-success-icon" aria-hidden="true">✓</div>
          <h2>¡Tu albergue ya está registrado!</h2>
          <p class="registration-success-lead">
            Recibimos la información de
            <strong>{{ registeredName() || 'tu albergue' }}</strong>.
          </p>
          <ul class="registration-success-list">
            <li>Un coordinador lo revisará y validará pronto.</li>
            <li>Te contactaremos usando el dato que dejaste para empezar lo antes posible.</li>
            <li>Cuando esté verificado, aparecerá en el mapa público y podrás pedir ayuda.</li>
          </ul>
          @if (registeredOffline()) {
            <div class="banner warn" style="margin-top: 1rem; text-align: left">
              Guardamos tu registro sin conexión. Se enviará automáticamente al recuperar señal.
            </div>
          }
          <div class="hero-actions" style="margin-top: 1rem">
            <a class="btn btn-primary" routerLink="/mapa">Volver al mapa</a>
            <a class="btn btn-secondary" routerLink="/ayuda-humanitaria">Cómo funciona</a>
          </div>
        </section>
      } @else {
      <form class="panel form-grid" [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label for="maps_url">
            Enlace de Google Maps @if (!isEdit()) { * }
          </label>
          <input
            id="maps_url"
            formControlName="maps_url"
            placeholder="Pega aquí el enlace de Google Maps"
            (input)="onMapsUrlChange()"
            (paste)="onMapsUrlPaste()"
          />
          <div class="hint">
            @if (isEdit()) {
              Opcional si ya tiene ubicación. Pega un enlace para actualizar coordenadas y dirección.
            } @else {
              En Maps: compartir → copiar enlace. Coordenadas, dirección y municipio se rellenan solas.
            }
          </div>
          @if (mapsHint()) {
            <div class="error">{{ mapsHint() }}</div>
          }
          @if (form.controls.lat.value != null && form.controls.lng.value != null) {
            <div class="hint" style="color: var(--canopy-deep); font-weight: 700; margin-top: 0.4rem">
              Ubicación lista: {{ form.controls.lat.value | number: '1.4-6' }},
              {{ form.controls.lng.value | number: '1.4-6' }}
              <button class="nav-link nav-button" type="button" (click)="clearLocation()" style="margin-left: 0.5rem">
                Quitar
              </button>
            </div>
          }
        </div>

        <div class="field">
          <label for="direccion">Dirección</label>
          <input id="direccion" formControlName="direccion" placeholder="Se completa desde Maps si viene en el enlace" />
        </div>

        <div class="field">
          <label for="nombre">Nombre del albergue o punto *</label>
          <input id="nombre" formControlName="nombre" placeholder="Ej. Coliseo Municipal, iglesia San José…" />
        </div>

        <div class="field">
          <label for="tipo">Tipo *</label>
          <select id="tipo" formControlName="tipo">
            <option value="oficial">Oficial</option>
            <option value="autogestionado">Autogestionado</option>
            <option value="punto_comunitario">Punto comunitario / de acogida</option>
          </select>
        </div>

        <div class="field">
          <label for="municipio">Municipio *</label>
          <app-municipio-select
            inputId="municipio"
            formControlName="municipio"
            placeholder="Escribe para buscar…"
          />
        </div>

        <div class="field">
          <label for="estado">Estado</label>
          <select id="estado" formControlName="estado">
            <option value="activo">Activo</option>
            <option value="lleno">Lleno</option>
            <option value="cerrado">Cerrado</option>
          </select>
        </div>

        <div class="field">
          <label for="responsable_nombre">Nombre de quien responde</label>
          <input id="responsable_nombre" formControlName="responsable_nombre" />
        </div>

        <div class="field">
          <label for="responsable_contacto">Contacto (privado)</label>
          <input id="responsable_contacto" formControlName="responsable_contacto" />
          <div class="hint">Solo lo verá coordinación. Recolección mínima.</div>
        </div>

        <button
          class="btn btn-primary"
          type="submit"
          [disabled]="form.invalid || busy() || !!mapsHint()"
        >
          {{ busy() ? 'Guardando…' : isEdit() ? 'Guardar cambios' : 'Registrar punto' }}
        </button>
      </form>
      }
    </app-shell>
  `,
  styles: [
    `
      .registration-success {
        text-align: center;
        max-width: 560px;
        margin: 0 auto;
        padding: 1.5rem 1.25rem 1.35rem;
      }

      .registration-success-icon {
        width: 3rem;
        height: 3rem;
        margin: 0 auto 0.85rem;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: var(--canopy-soft, #e8f0eb);
        color: var(--canopy-deep);
        font-size: 1.5rem;
        font-weight: 800;
      }

      .registration-success h2 {
        margin: 0 0 0.5rem;
        color: var(--canopy-deep);
      }

      .registration-success-lead {
        margin: 0 0 1rem;
        color: var(--ink-soft);
      }

      .registration-success-list {
        text-align: left;
        margin: 0;
        padding-left: 1.15rem;
        color: var(--ink-soft);
      }

      .registration-success-list li {
        margin-bottom: 0.45rem;
      }
    `,
  ],
})
export class PuntoFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PuntosApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isEdit = signal(false);
  readonly busy = signal(false);
  readonly registered = signal(false);
  readonly registeredOffline = signal(false);
  readonly registeredName = signal<string | null>(null);
  readonly message = signal<string | null>(null);
  readonly isError = signal(false);
  readonly mapsHint = signal<string | null>(null);
  private editId: string | null = null;
  private geocodeSeq = 0;

  readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipo: this.fb.nonNullable.control<'oficial' | 'autogestionado' | 'punto_comunitario'>(
      'oficial',
      Validators.required
    ),
    municipio: ['', Validators.required],
    direccion: [''],
    maps_url: [''],
    lat: [null as number | null],
    lng: [null as number | null],
    capacidad: [null as number | null],
    ocupacion_actual: [null as number | null],
    estado: this.fb.nonNullable.control<'activo' | 'lleno' | 'cerrado'>('activo'),
    responsable_nombre: [''],
    responsable_contacto: [''],
  });

  ngOnInit(): void {
    this.form.controls.lat.addValidators(Validators.required);
    this.form.controls.lng.addValidators(Validators.required);

    this.editId = this.route.snapshot.paramMap.get('id');
    if (this.editId && this.route.snapshot.routeConfig?.path?.includes('editar')) {
      this.isEdit.set(true);
      this.api.getById(this.editId).subscribe({
        next: (p) => {
          this.form.patchValue({
            nombre: p.nombre,
            tipo: p.tipo,
            municipio: p.municipio,
            direccion: p.direccion || '',
            lat: p.lat != null ? Number(p.lat) : null,
            lng: p.lng != null ? Number(p.lng) : null,
            capacidad: p.capacidad,
            ocupacion_actual: p.ocupacion_actual,
            estado: p.estado,
            responsable_nombre: p.responsable_nombre || '',
            responsable_contacto: p.responsable_contacto || '',
          });
          this.form.updateValueAndValidity();
        },
      });
    } else {
      this.form.controls.maps_url.addValidators(Validators.required);
      this.form.updateValueAndValidity();
    }
  }

  onMapsUrlPaste(): void {
    setTimeout(() => this.onMapsUrlChange(), 0);
  }

  onMapsUrlChange(): void {
    const url = this.form.controls.maps_url.value || '';
    if (!url.trim()) {
      this.mapsHint.set(null);
      this.geocodeSeq += 1;
      this.form.patchValue({ lat: null, lng: null });
      this.form.controls.lat.updateValueAndValidity();
      this.form.controls.lng.updateValueAndValidity();
      return;
    }

    if (isShortMapsLink(url)) {
      this.mapsHint.set(
        'Ese enlace es corto. Ábrelo en Maps, espera a que cargue y copia la URL completa de la barra de dirección.'
      );
      this.form.patchValue({ lat: null, lng: null });
      this.form.controls.lat.updateValueAndValidity();
      this.form.controls.lng.updateValueAndValidity();
      return;
    }

    const coords = parseMapsLocation(url);
    if (!coords) {
      this.mapsHint.set(
        'No pudimos leer la ubicación. Pega el enlace completo de Maps o escribe "lat, lng".'
      );
      this.form.patchValue({ lat: null, lng: null });
      this.form.controls.lat.updateValueAndValidity();
      this.form.controls.lng.updateValueAndValidity();
      return;
    }

    const patch: { lat: number; lng: number; direccion?: string; municipio?: string } = {
      lat: coords.lat,
      lng: coords.lng,
    };

    const address = parseMapsAddress(url);
    if (address && !this.form.controls.direccion.value.trim()) {
      patch.direccion = address;
    }

    const municipioMatch =
      matchMunicipioFromText(address || '') || matchMunicipioFromText(url);
    if (municipioMatch && !this.form.controls.municipio.value.trim()) {
      patch.municipio = municipioMatch;
    }

    this.form.patchValue(patch);
    this.form.controls.lat.updateValueAndValidity();
    this.form.controls.lng.updateValueAndValidity();
    this.mapsHint.set(null);

    if (!patch.municipio && !this.form.controls.municipio.value.trim()) {
      void this.resolveMunicipioFromCoords(coords.lat, coords.lng);
    }
  }

  private async resolveMunicipioFromCoords(lat: number, lng: number): Promise<void> {
    const seq = ++this.geocodeSeq;
    const municipio = await reverseGeocodeMunicipio(lat, lng);
    if (seq !== this.geocodeSeq) return;
    if (this.form.controls.lat.value !== lat || this.form.controls.lng.value !== lng) {
      return;
    }
    if (municipio && !this.form.controls.municipio.value.trim()) {
      this.form.patchValue({ municipio });
    }
  }

  clearLocation(): void {
    this.geocodeSeq += 1;
    this.form.patchValue({ maps_url: '', lat: null, lng: null });
    this.form.controls.lat.updateValueAndValidity();
    this.form.controls.lng.updateValueAndValidity();
    this.mapsHint.set(null);
  }

  submit(): void {
    this.onMapsUrlChange();
    if (this.form.invalid || this.mapsHint()) return;
    this.busy.set(true);
    this.message.set(null);

    const raw = this.form.getRawValue();
    const { maps_url: _mapsUrl, ocupacion_actual: _ocupacion, capacidad: _capacidad, ...body } = raw;

    const req$ =
      this.isEdit() && this.editId
        ? this.api.update(this.editId, body)
        : this.api.create(body);

    req$.subscribe({
      next: (p) => {
        this.busy.set(false);
        this.isError.set(false);
        if (this.isEdit()) {
          this.message.set('Albergue guardado.');
          void this.router.navigate(['/puntos', p.id]);
          return;
        }
        this.registeredName.set(p.nombre);
        this.registeredOffline.set(false);
        this.registered.set(true);
        this.message.set(null);
      },
      error: (err) => {
        this.busy.set(false);
        if (err?.queued) {
          this.isError.set(false);
          this.registeredName.set(raw.nombre || null);
          this.registeredOffline.set(true);
          this.registered.set(true);
          this.message.set(null);
          return;
        }
        if (err?.status === 409) {
          this.isError.set(true);
          this.message.set(
            'Parece un albergue duplicado (mismo nombre/municipio o muy cerca).'
          );
          return;
        }
        this.isError.set(true);
        this.message.set(err?.error?.error || 'No se pudo guardar el albergue.');
      },
    });
  }
}
