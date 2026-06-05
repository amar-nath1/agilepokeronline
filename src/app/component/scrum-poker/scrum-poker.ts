import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Participant {
  name: string;
  vote: string | null;
}
@Component({
  selector: 'app-scrum-poker',
  imports: [CommonModule, FormsModule],
  templateUrl: './scrum-poker.html',
  styleUrl: './scrum-poker.scss',
})
export class ScrumPoker {
  // Writable Signals for Zoneless State Tracking
  readonly roomInput = signal<string>('');
  readonly roomNumber = signal<string>('82 54 96 53');
  readonly userInitials = signal<string>('DW');
  readonly selectedCard = signal<string | null>(null);
  readonly showVotes = signal<boolean>(false);
  
  // Base Data Structure
  readonly pokerCards = signal<string[]>([
    '?', '☕', '0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100'
  ]);

  // Reactive Signals for list data
  readonly rawParticipants = signal<Participant[]>([
    { name: 'dwa', vote: null }
  ]);

  // Computed Signal: Automatically recalculates values cleanly across template bindings
  readonly participants = computed(() => {
    const currentVote = this.selectedCard();
    return this.rawParticipants().map((p, index) => 
      index === 0 ? { ...p, vote: currentVote } : p
    );
  });

  enterRoom(): void {
    const freshRoom = this.roomInput().trim();
    if (freshRoom) {
      this.roomNumber.set(freshRoom);
      this.roomInput.set('');
    }
  }

  selectCard(card: string): void {
    // If clicking the already selected card, toggle it off, otherwise set it
    this.selectedCard.update(current => current === card ? null : card);
  }

  deleteEstimates(): void {
    this.selectedCard.set(null);
    this.showVotes.set(false);
  }

  toggleShow(): void {
    this.showVotes.update(show => !show);
  }
}
