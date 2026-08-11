import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/api.services';
import { AuthService } from '../../core/auth.service';
import { ShellComponent } from '../../layout/shell.component';

const MIN_PASSWORD_LENGTH = 10;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('new_password')?.value;
  const confirm = group.get('confirm_password')?.value;
  if (!newPassword || !confirm) return null;
  return newPassword === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-change-password-page',
  standalone: true,
  imports: [ShellComponent, ReactiveFormsModule, RouterLink],
  template: `
    <app-shell>
      <a [routerLink]="backLink()" class="btn btn-ghost" style="margin-bottom: 0.75rem; display: inline-flex">
        ← Volver
      </a>

      <h1>Cambiar contraseña</h1>
      <p>Actualiza tu contraseña de acceso. Mínimo {{ minLength }} caracteres.</p>

      @if (!auth.isLoggedIn()) {
        <div class="banner warn">
          Debes iniciar sesión para cambiar tu contraseña.
          <a routerLink="/login">Entrar</a>
        </div>
      } @else {
        @if (message()) {
          <div class="banner" [class.ok]="!isError()" [class.danger]="isError()">
            {{ message() }}
          </div>
        }

        <form
          class="panel form-grid change-password-form"
          [formGroup]="form"
          (ngSubmit)="submit()"
        >
          <div class="field">
            <label for="current">Contraseña actual</label>
            <input
              id="current"
              type="password"
              formControlName="current_password"
              autocomplete="current-password"
            />
          </div>

          <div class="field">
            <label for="new">Nueva contraseña</label>
            <input
              id="new"
              type="password"
              formControlName="new_password"
              autocomplete="new-password"
            />
            @if (form.controls.new_password.touched && form.controls.new_password.hasError('minlength')) {
              <span class="field-hint danger">Mínimo {{ minLength }} caracteres.</span>
            }
          </div>

          <div class="field">
            <label for="confirm">Confirmar nueva contraseña</label>
            <input
              id="confirm"
              type="password"
              formControlName="confirm_password"
              autocomplete="new-password"
            />
            @if (form.touched && form.hasError('passwordMismatch')) {
              <span class="field-hint danger">Las contraseñas no coinciden.</span>
            }
          </div>

          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || busy()">
            {{ busy() ? 'Guardando…' : 'Guardar contraseña' }}
          </button>
        </form>
      }
    </app-shell>
  `,
  styles: [
    `
      .change-password-form {
        max-width: 460px;
      }

      .field-hint {
        font-size: 0.85rem;
        color: var(--ink-soft);
      }

      .field-hint.danger {
        color: var(--danger, #b4473c);
      }
    `,
  ],
})
export class ChangePasswordPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApiService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly minLength = MIN_PASSWORD_LENGTH;
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly isError = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      current_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm_password: ['', Validators.required],
    },
    { validators: passwordsMatch }
  );

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/login']);
    }
  }

  backLink(): string[] {
    return this.auth.homePath();
  }

  submit(): void {
    if (this.form.invalid || !this.auth.isLoggedIn()) return;

    this.busy.set(true);
    this.message.set(null);
    this.isError.set(false);

    const { current_password, new_password } = this.form.getRawValue();

    this.api.changePassword(current_password, new_password).subscribe({
      next: () => {
        this.busy.set(false);
        this.isError.set(false);
        this.message.set('Contraseña actualizada correctamente.');
        this.form.reset();
      },
      error: (err) => {
        this.busy.set(false);
        this.isError.set(true);
        this.message.set(err?.error?.error || 'No se pudo cambiar la contraseña.');
      },
    });
  }
}
