import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../core/api.services';
import { AuthService } from '../../core/auth.service';
import { ShellComponent } from '../../layout/shell.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ShellComponent, ReactiveFormsModule, RouterLink],
  template: `
    <app-shell>
      <a routerLink="/" class="btn btn-ghost" style="margin-bottom: 0.75rem; display: inline-flex">← Volver</a>
      <h1>Entrar</h1>
      <p>Para coordinación, verificación o administración de tu albergue.</p>

      @if (message()) {
        <div class="banner danger">{{ message() }}</div>
      }

      <form class="panel form-grid" style="max-width: 460px" [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label for="email">Correo</label>
          <input id="email" type="email" formControlName="email" autocomplete="username" />
        </div>
        <div class="field">
          <label for="password">Contraseña</label>
          <input id="password" type="password" formControlName="password" autocomplete="current-password" />
        </div>
        <button class="btn btn-primary" type="submit" [disabled]="form.invalid || busy()">
          {{ busy() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
    </app-shell>
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly message = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.busy.set(true);
    this.message.set(null);
    const { email, password } = this.form.getRawValue();

    this.api.login(email, password).subscribe({
      next: (res) => {
        this.auth.setSession(res);
        this.busy.set(false);
        void this.router.navigate(this.auth.homePath());
      },
      error: () => {
        this.busy.set(false);
        this.message.set('Credenciales inválidas.');
      },
    });
  }
}
