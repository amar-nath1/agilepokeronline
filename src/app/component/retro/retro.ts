import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Database, ref, set, onValue, Unsubscribe } from '@angular/fire/database';

interface RetroColumn {
  id: string;
  title: string;
  items: RetroItem[];
}

interface RetroItem {
  id: string;
  text: string;
  author: string;
}

@Component({
  selector: 'app-retro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './retro.html',
  styleUrl: './retro.scss',
})
export class Retro implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly db = inject(Database);

  readonly roomId = signal<string>('');
  readonly currentUsername = signal<string>('');
  readonly columns = signal<RetroColumn[]>([
    { id: 'went-well', title: 'Went Well', items: [] },
    { id: 'to-improve', title: 'To Improve', items: [] },
    { id: 'action-items', title: 'Action Items', items: [] },
  ]);
  readonly draftText = signal<Record<string, string>>({
    'went-well': '',
    'to-improve': '',
    'action-items': '',
  });
  readonly retroParticipants = signal<string[]>([]);
  readonly joinName = signal<string>('');
  readonly isNameModalOpen = signal<boolean>(false);
  readonly isJoinTouched = signal<boolean>(false);
  readonly isJoinNameInvalid = signal<boolean>(true);

  private dbSubscription?: Unsubscribe;

  ngOnInit(): void {
    const roomId = this.route.snapshot.paramMap.get('id') ?? '';
    this.roomId.set(roomId);

    if (!roomId) {
      this.router.navigate(['/']);
      return;
    }

    const storedName = this.getStoredUsername(roomId);
    if (storedName) {
      this.currentUsername.set(storedName);
      this.isNameModalOpen.set(false);
      this.ensureParticipantInRoom(roomId, storedName);
      this.loadParticipantsFromRoom(roomId);
      this.loadRetroBoard(roomId);
      return;
    }

    this.currentUsername.set('');
    this.isNameModalOpen.set(true);
    this.joinName.set('');
    this.isJoinTouched.set(false);
    this.isJoinNameInvalid.set(true);
    this.loadParticipantsFromRoom(roomId);
    this.loadRetroBoard(roomId);
  }

  ngOnDestroy(): void {
    if (this.dbSubscription) {
      this.dbSubscription();
    }
  }

  private getStoredUsername(roomId: string): string {
    try {
      return localStorage.getItem(`sp_username_${roomId}`) ?? '';
    } catch {
      return '';
    }
  }

  private ensureParticipantInRoom(roomId: string, name: string): void {
    const participantRef = ref(this.db, `rooms/${roomId}/participants/${name}`);
    set(participantRef, { vote: 'not-voted' });
  }

  private loadParticipantsFromRoom(roomId: string): void {
    const roomRef = ref(this.db, `rooms/${roomId}/participants`);
    onValue(roomRef, (snapshot) => {
      const participants = snapshot.val() ?? {};
      const names = Object.keys(participants).filter(Boolean);
      this.retroParticipants.set(names);
    });
  }

  private loadRetroBoard(roomId: string): void {
    const retroRef = ref(this.db, `rooms/${roomId}/retro`);
    this.dbSubscription = onValue(retroRef, (snapshot) => {
      const data = snapshot.val() ?? {};
      const next = this.columns().map(column => ({
        ...column,
        items: (data[column.id] ?? []).map((item: any, index: number) => ({
          id: item.id ?? `${column.id}-${index}`,
          text: item.text ?? '',
          author: item.author ?? 'Unknown',
        }))
      }));

      this.columns.set(next);
    });
  }

  updateDraft(columnId: string, value: string): void {
    const nextDraft = { ...this.draftText() };
    nextDraft[columnId] = value;
    this.draftText.set(nextDraft);
  }

  onJoinNameChange(value: string): void {
    this.joinName.set(value);
    this.isJoinTouched.set(true);
    this.isJoinNameInvalid.set(value.trim().length < 2);
  }

  confirmJoinRoom(): void {
    const name = this.joinName().trim();
    if (!name || name.length < 2) {
      this.isJoinTouched.set(true);
      this.isJoinNameInvalid.set(true);
      return;
    }

    const roomId = this.roomId();
    this.currentUsername.set(name);
    this.isNameModalOpen.set(false);

    if (!roomId) {
      return;
    }

    try {
      localStorage.setItem(`sp_username_${roomId}`, name);
    } catch {
      // ignore storage errors
    }

    const participantRef = ref(this.db, `rooms/${roomId}/participants/${name}`);
    set(participantRef, { vote: 'not-voted' });
  }

  addNote(columnId: string): void {
    const text = (this.draftText()[columnId] ?? '').trim();
    if (!text || !this.roomId() || !this.currentUsername().trim()) {
      return;
    }

    const author = this.currentUsername().trim() || 'Anonymous';
    const column = this.columns().find(item => item.id === columnId);
    const nextItems = [...(column?.items ?? [])];

    const item: RetroItem = {
      id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      text,
      author,
    };

    nextItems.push(item);

    const updated = this.columns().map(col => col.id === columnId ? { ...col, items: nextItems } : col);
    this.columns.set(updated);

    const retroRef = ref(this.db, `rooms/${this.roomId()}/retro/${columnId}`);
    set(retroRef, nextItems.map(({ id, text, author }) => ({ id, text, author })));

    const nextDraft = { ...this.draftText() };
    nextDraft[columnId] = '';
    this.draftText.set(nextDraft);
  }

  canSubmit(columnId: string): boolean {
    return !!this.currentUsername().trim() && (this.draftText()[columnId] ?? '').trim().length > 0;
  }

  goBackToRoom(): void {
    const roomId = this.roomId();
    if (!roomId) {
      this.router.navigate(['/']);
      return;
    }

    this.router.navigate(['/room', roomId]);
  }
}
