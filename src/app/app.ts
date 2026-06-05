import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScrumPoker } from './component/scrum-poker/scrum-poker'; // Import here
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ScrumPoker],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('scrum-poker');
}
