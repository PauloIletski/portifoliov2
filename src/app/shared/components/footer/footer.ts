import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.sass',
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
