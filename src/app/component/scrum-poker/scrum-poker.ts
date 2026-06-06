import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// Realtime Database modular SDK references
import { Database, ref, set, onValue, onDisconnect, Unsubscribe } from '@angular/fire/database';

interface Participant {
  name: string;
  vote: string | null;
}

@Component({
  selector: 'app-scrum-poker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scrum-poker.html',
  styleUrls: ['./scrum-poker.scss']
})
export class ScrumPoker implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly db = inject(Database);

  // Core Room State Tracking Signals
  readonly roomId = signal<string>('');
  readonly currentUsername = signal<string>('');
  readonly showVotes = signal<boolean>(false);
  readonly selectedCard = signal<string | null>(null);
  readonly copySuccess = signal<boolean>(false);
  readonly joinName = signal<string>('');
  readonly isNameModalOpen = signal<boolean>(false);
  readonly isJoinTouched = signal<boolean>(false);
  readonly isJoinNameInvalid = computed(() => this.joinName().trim().length < 2);
  readonly showJoinNameError = computed(() => this.isNameModalOpen() && this.isJoinTouched() && this.isJoinNameInvalid());
  
  // Reactive Collections
  readonly participantsList = signal<Participant[]>([]);
  readonly pokerCards = signal<string[]>(['?', '☕', '0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100']);

  private dbSubscription?: Unsubscribe;

  ngOnInit(): void {
  this.route.paramMap.subscribe(params => {
    const id = params.get('id') || '';
    this.roomId.set(id);

    if (!id) return;

    // FIX 1: Read directly from standard window history state.
    // In Angular, navigation state is securely stashed here during lifecycle transitions.
    const routerStateName = window.history.state?.['username'];
    const queryParamName = this.route.snapshot.queryParamMap.get('username');
    let enteredName = (routerStateName || queryParamName)?.trim();

    // Fallback 2: Check localStorage if history state isn't present
    if (!enteredName) {
      try {
        const stored = localStorage.getItem(`sp_username_${id}`);
        if (stored) {
          enteredName = stored.trim();
        }
      } catch (e) {
        // ignore storage errors
      }
    }

    if (enteredName) {
      this.currentUsername.set(enteredName);
      this.isNameModalOpen.set(false);
      
      // FIX 2: Only spin up the sync stream once the name is guaranteed resolved
      this.initializeRoomStream(id);
    } else {
      // Force the user to provide a name via your UI modal first
      this.currentUsername.set('');
      this.isNameModalOpen.set(true);
      this.joinName.set('');
      this.isJoinTouched.set(false);
    }
  });
}

private initializeRoomStream(roomId: string): void {
  const roomRef = ref(this.db, `rooms/${roomId}`);

  // Set up the real-time WebSocket database synchronized listener
  this.dbSubscription = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      this.showVotes.set(data.showVotes || false);
      
      if (data.participants) {
        const formattedList = Object.keys(data.participants).map(key => ({
          name: key,
          vote: data.participants[key].vote ?? null
        }));
        this.participantsList.set(formattedList);
      } else {
        this.participantsList.set([]);
      }
    }
  });

  // FIX 3: Register current user presence explicitly on a granular branch path node
  const activeUser = this.currentUsername().trim();
  if (activeUser) {
    this.registerUserPresence(roomId, activeUser);
  }
}

  private registerUserPresence(roomId: string, username: string): void {
  const activeUser = username?.trim();
  // 🛑 GUARD 1: Prevent empty string writes from wiping out the participants folder
  if (!activeUser) {
    console.warn('Presence blocked: Username not resolved yet.');
    return;
  }

  // 🛑 GUARD 2: Prevent system keys or invalid names from corrupting paths
  if (activeUser === 'undefined' || activeUser === 'null') {
    console.warn('Presence blocked: System placeholder string detected.');
    return;
  }

  // Target ONLY this specific user's slot inside the database tree
  const userPresenceRef = ref(this.db, `rooms/${roomId}/participants/${activeUser}`);

  // 1. Establish the user entry on the server first
  set(userPresenceRef, { vote: this.selectedCard() || 'not-voted' })
    .then(() => {
      console.log(`Presence successfully registered for: ${activeUser}`);

      // 2. Queue up the cleanup hook ONLY after the user node is verified active.
      // This ensures that only this user's node is removed when the tab closes.
      onDisconnect(userPresenceRef).remove()
        .catch(err => console.error('Failed to attach onDisconnect tracking:', err));
    })
    .catch(err => {
      console.error(`Database write blocked for participant [${activeUser}]:`, err);
    });
}

  selectCard(card: string): void {
    const nextCardValue = this.selectedCard() === card ? 'not-voted' : card;
    this.selectedCard.set(nextCardValue);

    // Push local select value changes up to real-time sync matrix nodes
    const voteRef = ref(this.db, `rooms/${this.roomId()}/participants/${this.currentUsername()}/vote`);
    set(voteRef, nextCardValue);
  }

  toggleShow(): void {
    const nextShowState = !this.showVotes();
    const visibilityRef = ref(this.db, `rooms/${this.roomId()}/showVotes`);
    set(visibilityRef, nextShowState);

    // Sort participants by vote value in ascending order when revealing
    if (nextShowState) {
      const sorted = [...this.participantsList()].sort((a, b) => {
        return this.getVoteSortValue(a.vote) - this.getVoteSortValue(b.vote);
      });
      this.participantsList.set(sorted);
    }
  }

  private getVoteSortValue(vote: string | null): number {
    if (!vote || vote === 'not-voted') return Infinity; // Non-voted participants appear last
    
    const voteOrder: { [key: string]: number } = {
      '?': -1,
      '☕': -0.5,
      '0': 0,
      '0.5': 0.5,
      '1': 1,
      '2': 2,
      '3': 3,
      '5': 5,
      '8': 8,
      '13': 13,
      '20': 20,
      '40': 40,
      '100': 100,
    };
    
    return voteOrder[vote] ?? Infinity;
  }

  deleteEstimates(): void {
    this.selectedCard.set('not-voted');
    
    // Clear all server variables cleanly back to scratch zero baseline indices
    const roomStateRef = ref(this.db, `rooms/${this.roomId()}/showVotes`);
    set(roomStateRef, false);

    const participants = this.participantsList();
    participants.forEach(p => {
      const resetVoteRef = ref(this.db, `rooms/${this.roomId()}/participants/${p.name}/vote`);
      set(resetVoteRef, 'not-voted');
    });
  }

  ngOnDestroy(): void {
    // Tear down live WebSocket listener channels to prevent leaks
    if (this.dbSubscription) {
      this.dbSubscription();
    }
  }

  onJoinNameChange(value: string): void {
    this.joinName.set(value);
    this.isJoinTouched.set(true);
  }

  confirmJoinRoom(): void {
     // 1. Prevent submission if the name is invalid
  if (this.isJoinNameInvalid()) {
    this.isJoinTouched.set(true);
    return;
  }

  const name = this.joinName().trim();
  const currentRoomId = this.roomId();

  // 2. Lock down the user's identity state parameters
  this.currentUsername.set(name);
  this.isNameModalOpen.set(false);

  if (currentRoomId) {
    // 3. Persist name locally so refreshes keep them logged in
    try {
      localStorage.setItem(`sp_username_${currentRoomId}`, name);
    } catch (e) {
      // ignore local storage capacity/security restrictions
    }

    // 4. Connect to Firebase WebSockets and listen to room state mutations.
    // This method automatically calls registerUserPresence under the hood!
    this.initializeRoomStream(currentRoomId);
  }
  }

  

  copyRoomUrl(): void {
    // Copy a "clean" room URL without any query parameters (no username)
    const cleanUrl = window.location.origin + window.location.pathname;
    navigator.clipboard.writeText(cleanUrl).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    }).catch(() => {
      // Optional fallback could be added here if needed
    });
  }
}
