import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
private readonly router = inject(Router);
  
  // Zoneless Writable Signal
  readonly roomInput = signal<string>('');

  enterExistingRoom(): void {
    const roomId = this.roomInput().trim();
    if (roomId) {
      this.router.navigate(['/room', roomId]);
    }
  }

  createInstantRoom(): void {
    // Generates a random 6-digit numeric room identifier string
    const randomRoomId = Math.floor(100000 + Math.random() * 900000).toString();
    this.router.navigate(['/room', randomRoomId]);
  }
}
