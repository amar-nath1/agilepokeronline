import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Database, ref, set, get } from '@angular/fire/database';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-page.html',
  styleUrls: ['./home-page.scss']
})
export class HomePage {
  private readonly router = inject(Router);
  private readonly db = inject(Database);
  
  // Header state tracking
  readonly roomInput = signal<string>('');

  // Modal State Control Signals
  readonly isModalOpen = signal<boolean>(false);
  readonly displayName = signal<string>('');
  readonly isInputTouched = signal<boolean>(false);

  // Computed Validation Signals for Zoneless Rendering
  readonly isNameInvalid = computed(() => this.displayName().trim().length < 2);
  readonly showNameError = computed(() => this.isInputTouched() && this.isNameInvalid());

  enterExistingRoom(): void {
    const roomId = this.roomInput().trim();
    if (roomId) {
      this.router.navigate(['/room', roomId]);
    }
  }

  openRoomModal(): void {
    this.displayName.set('');
    this.isInputTouched.set(false);
    this.isModalOpen.set(true);
  }

  closeRoomModal(): void {
    this.isModalOpen.set(false);
  }

  onNameChange(value: string): void {
    this.displayName.set(value);
    this.isInputTouched.set(true);
  }

  async confirmCreateRoom(): Promise<void> {
  // 1. Double check validation safety guards
  if (this.isNameInvalid()) {
    this.isInputTouched.set(true);
    return;
  }

  this.isModalOpen.set(false);
  const userName = this.displayName().trim();
  const randomRoomId = Math.floor(100000 + Math.random() * 900000).toString();
  
  const roomRef = ref(this.db, `rooms/${randomRoomId}`);
  const initial = {
  showVotes: false,
  participants: {
    [userName]: {
      vote: 'not-voted'
    }
  }
};

console.log(JSON.stringify(initial));
  try {
    // 2. FORCE the application to wait for the database payload to save completely
    await set(roomRef, initial);
    const snap = await get(roomRef);
console.log('Saved:', snap.val());
    // 3. Stash the username in localStorage BEFORE routing transitions break scopes
    localStorage.setItem(`sp_username_${randomRoomId}`, userName);
  } catch (err) {
    console.error('Failed to initialize structural room data nodes:', err);
  } finally {
    // 4. Navigate out of the asynchronous execution frame safely
    // This ensures Zoneless rendering captures the state accurately
    this.router.navigate(['/room', randomRoomId], { 
      state: { username: userName } 
    });
  }
}
}
