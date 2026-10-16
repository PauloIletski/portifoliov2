import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Planet } from '../../shared/components/planet/planet';
import { PlanetParallax } from '../../shared/directives/planet-parallax';
import { MotionEnter } from '../../shared/directives/motion-enter';

@Component({
  selector: 'app-home',
  imports: [RouterLink, MatButtonModule, MotionEnter, Planet, PlanetParallax],
  templateUrl: './home.html',
  styleUrl: './home.sass',
})
export class Home {
  protected readonly animationsPaused = signal(false);
}
