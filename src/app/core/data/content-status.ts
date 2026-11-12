import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
@Component({
  selector: 'app-content-status',
  imports: [MatProgressSpinnerModule, MatButtonModule],
  template: `
    @if (loading()) {
      <div class="loading-status" role="status">
        <mat-spinner [diameter]="24" [strokeWidth]="3" aria-hidden="true" />
        <span>{{ english() ? 'Loading…' : 'Carregando…' }}</span>
      </div>
    }
    @if (error()) {
      <div role="alert">
        <p>
          {{
            english()
              ? 'Unable to load content. Please try again.'
              : 'Não foi possível carregar o conteúdo. Tente novamente.'
          }}
        </p>
        <button mat-stroked-button (click)="retry.emit()">
          {{ english() ? 'Try again' : 'Tentar novamente' }}
        </button>
      </div>
    }
  `,
})
export class ContentStatus {
  readonly loading = input(false);
  readonly error = input(false);
  readonly english = input(false);
  readonly retry = output<void>();
}
