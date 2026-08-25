import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  cardLabel,
  parseMarriageCardId,
} from '@ludo-game/game-engine';
import {
  MarriageCard,
  MarriageGameState,
  MarriageMeld,
  MarriageSeatColor,
  MARRIAGE_SEAT_SWATCH,
  MatchStatus,
  TurnPhase,
} from '@ludo-game/shared-types';
import { MarriageDealProgress } from '../../services/game-socket.service';
import { PlayingCardComponent } from '../playing-card/playing-card';

type DragSource = 'hand' | 'stock' | 'discard' | 'open-meld' | 'open-meld-card';
type HandZone = 'main' | 'hold' | 'maal';

export interface MarriageHandLayout {
  freeCardIds: string[];
  holdCardIds: string[];
  maalSequences: Array<[string, string, string]>;
}

@Component({
  selector: 'arena-marriage-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlayingCardComponent],
  styles: `
    @keyframes marriage-deal-in {
      from {
        transform: translateY(-8px) scale(0.85);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
    @keyframes marriage-deal-fly {
      from {
        transform: translate(-50%, -50%) scale(0.7);
        opacity: 0.4;
      }
      to {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
    }
  `,
  template: `
    <div class="mx-auto max-w-6xl space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-arena-line bg-arena-navy/80 px-4 py-3">
        <div>
          <p class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">
            {{ showAllHands() ? 'Marriage · admin view' : 'Marriage · online' }}
          </p>
          <p class="mt-1 text-sm text-arena-mist">
            {{ state().rules.deckCount }} decks · {{ state().players.length }} players · no dublee win
          </p>
        </div>
        <div class="text-right text-sm text-arena-mist/80">
          @if (state().tiplu; as tiplu) {
            <p>
              Maal <span class="font-semibold text-white">{{ label(tiplu) }}</span>
              · wilds = all {{ tiplu.rank }}s · jhiplu/poplu same suit
            </p>
          } @else {
            <p>Maal hidden for you — qualify with three pure sequences to see it</p>
          }
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        @for (player of state().players; track player.id) {
          <div
            class="rounded-2xl border px-3 py-3"
            [class.border-arena-gold]="player.id === state().currentPlayerId"
            [class.bg-arena-gold/10]="player.id === state().currentPlayerId"
            [class.border-arena-line]="player.id !== state().currentPlayerId"
            [class.bg-black/20]="player.id !== state().currentPlayerId"
          >
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full" [style.background]="swatch(player.color)"></span>
              <p class="font-display text-base text-white">{{ player.name }}</p>
              @if (player.hasOpened) {
                <span
                  class="rounded-full bg-arena-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-arena-gold"
                  >Opened</span
                >
              }
            </div>
            <p class="mt-1 text-xs text-arena-mist/70">
              {{ visibleHandFor(player).length }} cards
              @if (player.openMelds.length) {
                · {{ player.openMelds.length }} open melds
              }
            </p>
            @if (deal()?.flyingToPlayerId === player.id) {
              <p class="mt-1 text-[10px] uppercase tracking-wider text-arena-gold animate-pulse">Receiving…</p>
            }
            @if (player.openMelds.length) {
              <div class="mt-2 space-y-1.5">
                @for (meld of player.openMelds; track $index) {
                  <div class="flex flex-wrap gap-1">
                    @for (card of meldCards(meld); track card.id) {
                      <arena-playing-card [card]="card" [width]="28" [height]="40" />
                    }
                  </div>
                }
              </div>
            }
            @if (showAllHands()) {
              <div class="mt-3 flex flex-wrap gap-1.5">
                @for (card of visibleHandFor(player); track card.id) {
                  <arena-playing-card
                    [card]="card"
                    [width]="36"
                    [height]="50"
                    style="animation: marriage-deal-in 0.22s ease-out"
                  />
                }
              </div>
            }
          </div>
        }
      </div>

      <div class="relative flex flex-wrap items-center justify-center gap-6 rounded-3xl border border-arena-line bg-gradient-to-br from-emerald-950/80 to-arena-navy px-4 py-8">
        @if (deal()?.flyingToPlayerId) {
          <div
            class="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-16 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border-2 border-arena-gold bg-white shadow-2xl"
            style="animation: marriage-deal-fly 0.1s ease-out"
          >
            <span class="text-[10px] font-semibold text-arena-ink">•••</span>
          </div>
        }
        <button
          type="button"
          class="flex h-28 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-arena-mist/40 bg-black/30 text-arena-mist transition hover:border-arena-gold disabled:opacity-40"
          [class.border-arena-gold]="handDropActive() && dragSource() === 'stock'"
          [class.ring-2]="handDropActive() && dragSource() === 'stock'"
          [class.ring-arena-gold]="handDropActive() && dragSource() === 'stock'"
          [class.cursor-grab]="canDraw()"
          [class.active:cursor-grabbing]="canDraw()"
          [attr.draggable]="canDraw()"
          [disabled]="!canDraw()"
          (click)="drawStock.emit()"
          (dragstart)="onPileDragStart($event, 'stock')"
          (dragend)="onDragEnd()"
        >
          <span class="text-xs uppercase tracking-wider">Stock</span>
          <span class="mt-1 font-display text-2xl text-white">{{ stockCount() }}</span>
          @if (canDraw()) {
            <span class="mt-1 text-[9px] uppercase tracking-wider text-arena-mist/70">Drag to hand</span>
          }
        </button>

        <div
          class="relative flex h-28 w-20 flex-col items-center justify-center rounded-xl border-2 shadow-lg"
          [class.border-amber-400]="!!state().tiplu"
          [class.bg-transparent]="!!state().tiplu"
          [class.border-dashed]="!state().tiplu"
          [class.border-arena-mist/40]="!state().tiplu"
          [class.bg-black/20]="!state().tiplu"
        >
          @if (state().tiplu; as maal) {
            <arena-playing-card [card]="maal" [width]="56" [height]="80" [highlight]="true" caption="Maal" />
          } @else {
            <span class="text-xs uppercase tracking-wider text-arena-mist/60">Maal</span>
            <span class="mt-1 px-1 text-center text-[9px] text-arena-mist/50">When 3 sequences ready</span>
          }
        </div>

        <button
          type="button"
          class="relative flex h-28 w-20 flex-col items-center justify-center rounded-xl border-2 bg-transparent shadow-lg transition"
          [class.border-arena-line]="!discardDropActive()"
          [class.border-arena-gold]="discardDropActive() || (handDropActive() && dragSource() === 'discard')"
          [class.ring-2]="discardDropActive() || (handDropActive() && dragSource() === 'discard')"
          [class.ring-arena-gold]="discardDropActive() || (handDropActive() && dragSource() === 'discard')"
          [class.scale-105]="discardDropActive()"
          [class.hover:border-arena-gold]="canDraw()"
          [class.opacity-40]="!canDraw() && !canDiscard()"
          [class.cursor-grab]="canDraw()"
          [class.active:cursor-grabbing]="canDraw()"
          [attr.draggable]="canDraw()"
          [disabled]="!canDraw() && !canDiscard()"
          (click)="onDiscardPileClick()"
          (dragstart)="onPileDragStart($event, 'discard')"
          (dragover)="onDiscardPileDragOver($event)"
          (dragleave)="onDiscardPileDragLeave()"
          (drop)="onDiscardPileDrop($event)"
          (dragend)="onDragEnd()"
        >
          @if (discardVisible(); as top) {
            <arena-playing-card
              [card]="top"
              [width]="56"
              [height]="80"
              [highlight]="discardDropActive() || (handDropActive() && dragSource() === 'discard')"
              [caption]="
                canDiscard() && dragSource() === 'hand'
                  ? 'Drop'
                  : canDraw()
                    ? 'Drag'
                    : 'Discard'
              "
            />
          } @else {
            <span class="text-xs text-arena-mist">
              {{ deal() && !deal()?.showDiscard ? 'Dealing…' : canDiscard() && dragSource() === 'hand' ? 'Drop to discard' : 'Empty' }}
            </span>
          }
        </button>
      </div>

      @if (!showAllHands() && current(); as me) {
        <div class="rounded-3xl border border-arena-line bg-arena-navy/80 p-4">
          <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p class="text-xs uppercase tracking-[0.25em] text-arena-gold/80">
                Your hand · {{ me.name }}
                @if (!isViewerTurn()) {
                  <span class="text-arena-mist/50"> · waiting for turn</span>
                }
              </p>
              <p class="mt-1 text-sm text-arena-mist/70">
                @if (!isViewerTurn()) {
                  Drag cards to organize · park sequences below
                  } @else if (state().turnPhase === TurnPhase.WAITING_FOR_DRAW) {
                  @if (state().tiplu) {
                    Maal is visible · drag stock or discard onto your hand
                  } @else {
                    Draw from stock or discard · park sequences below
                  }
                } @else if (state().turnPhase === TurnPhase.WAITING_FOR_DISCARD) {
                  Drag a card onto Discard{{ canEditMelds() ? ' · drop onto open melds to extend' : '' }}{{
                    canOpen() ? ', or open' : ''
                  }}{{ canShow() ? ', or show to win' : '' }}
                } @else if (state().turnPhase === TurnPhase.MATCH_OVER) {
                  Match over
                } @else {
                  Drag cards to organize · park sequences below
                }
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              @if (canOpen() && isViewerTurn()) {
                <button
                  type="button"
                  class="rounded-full bg-arena-gold px-4 py-2 text-sm font-semibold text-arena-ink"
                  (click)="open.emit()"
                >
                  Open
                </button>
              }
              @if (canShow() && isViewerTurn()) {
                <button
                  type="button"
                  class="rounded-full border border-arena-gold px-4 py-2 text-sm text-arena-gold"
                  (click)="show.emit()"
                >
                  Show & win
                </button>
              }
              @if (canDiscard()) {
                <button
                  type="button"
                  class="rounded-full border border-arena-line px-4 py-2 text-sm text-arena-mist disabled:opacity-40"
                  [disabled]="!selectedCardId()"
                  (click)="discardSelected()"
                >
                  Discard
                </button>
              }
            </div>
          </div>

          <div
            class="min-h-20 rounded-2xl border border-dashed p-3 transition"
            [class.border-arena-gold]="handDropActive()"
            [class.bg-arena-gold/10]="handDropActive()"
            [class.border-arena-line/50]="!handDropActive()"
            (dragover)="onZoneDragOver($event, 'main')"
            (dragleave)="onZoneDragLeave('main')"
            (drop)="onZoneDrop($event, 'main')"
          >
            <p class="mb-2 text-[10px] uppercase tracking-wider text-arena-mist/50">
              {{
                handDropActive()
                  ? dragSource() === 'open-meld-card'
                    ? 'Drop to remove from meld'
                    : 'Drop to draw'
                  : 'Hand'
              }}
            </p>
            <div class="flex flex-wrap gap-2">
              @for (card of mainHand(); track card.id; let index = $index) {
                <button
                  type="button"
                  draggable="true"
                  class="cursor-grab rounded-lg p-0 transition active:cursor-grabbing"
                  [class.opacity-40]="isDraggingCard(card.id)"
                  (dragstart)="onCardDragStart($event, 'main', index, card.id)"
                  (dragover)="onCardDragOver($event, 'main', index)"
                  (dragleave)="onCardDragLeave('main', index)"
                  (drop)="onCardDrop($event, 'main', index)"
                  (dragend)="onDragEnd()"
                  (click)="toggleSelect(card.id)"
                >
                  <arena-playing-card
                    [card]="card"
                    [width]="48"
                    [height]="68"
                    [highlight]="selectedCardId() === card.id || isCardHighlight('main', index)"
                  />
                </button>
              } @empty {
                <p class="py-4 text-sm text-arena-mist/40">
                  {{ canDraw() ? 'Drop stock or discard here' : 'No cards in hand tray' }}
                </p>
              }
            </div>
          </div>

          <div
            class="mt-4 min-h-24 rounded-2xl border border-dashed p-3 transition"
            [class.border-arena-gold]="stagedDropActive()"
            [class.bg-arena-gold/10]="stagedDropActive()"
            [class.border-emerald-500/40]="!stagedDropActive()"
            [class.bg-emerald-950/30]="!stagedDropActive()"
            (dragover)="onZoneDragOver($event, 'hold')"
            (dragleave)="onZoneDragLeave('hold')"
            (drop)="onZoneDrop($event, 'hold')"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-[10px] uppercase tracking-wider text-emerald-300/80">
                Sequence hold · temporary
              </p>
              <p class="text-[10px] text-arena-mist/50">
                {{ stagedHand().length }} card{{ stagedHand().length === 1 ? '' : 's' }} · drag back to hand anytime
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              @for (card of stagedHand(); track card.id; let index = $index) {
                <button
                  type="button"
                  draggable="true"
                  class="cursor-grab rounded-lg p-0 transition active:cursor-grabbing"
                  [class.opacity-40]="isDraggingCard(card.id)"
                  (dragstart)="onCardDragStart($event, 'hold', index, card.id)"
                  (dragover)="onCardDragOver($event, 'hold', index)"
                  (dragleave)="onCardDragLeave('hold', index)"
                  (drop)="onCardDrop($event, 'hold', index)"
                  (dragend)="onDragEnd()"
                  (click)="toggleSelect(card.id)"
                >
                  <arena-playing-card
                    [card]="card"
                    [width]="48"
                    [height]="68"
                    [highlight]="selectedCardId() === card.id || isCardHighlight('hold', index)"
                  />
                </button>
              } @empty {
                <p class="py-5 text-sm text-arena-mist/40">
                  Drag sequenced cards here to park them while you sort the rest
                </p>
              }
            </div>
          </div>

          <div
            class="mt-4 min-h-24 rounded-2xl border border-dashed p-3 transition"
            [class.border-arena-gold]="maalDropActive()"
            [class.bg-arena-gold/10]="maalDropActive()"
            [class.border-amber-500/50]="!maalDropActive()"
            [class.bg-amber-950/20]="!maalDropActive()"
            (dragover)="onZoneDragOver($event, 'maal')"
            (dragleave)="onZoneDragLeave('maal')"
            (drop)="onZoneDrop($event, 'maal')"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-[10px] uppercase tracking-wider text-amber-300/90">
                Maal sequences · used to see maal
              </p>
              <p class="text-[10px] text-arena-mist/50">
                @if (current()?.hasSeenMaal) {
                  Sequence cards can't be discarded · rearrange freely
                } @else {
                  Park three pure sequences here to qualify
                }
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              @for (group of maalSequenceCards(); track $index; let groupIndex = $index) {
                <div class="flex flex-wrap gap-1.5 rounded-xl border border-amber-500/30 bg-black/20 p-2">
                  @for (card of group; track card.id; let index = $index) {
                    <button
                      type="button"
                      draggable="true"
                      class="cursor-grab rounded-lg p-0 transition active:cursor-grabbing"
                      [class.opacity-40]="isDraggingCard(card.id)"
                      (dragstart)="onCardDragStart($event, 'maal', groupIndex * 3 + index, card.id)"
                      (dragover)="onCardDragOver($event, 'maal', groupIndex * 3 + index)"
                      (dragleave)="onCardDragLeave('maal', groupIndex * 3 + index)"
                      (drop)="onCardDrop($event, 'maal', groupIndex * 3 + index)"
                      (dragend)="onDragEnd()"
                      (click)="toggleSelect(card.id)"
                    >
                      <arena-playing-card
                        [card]="card"
                        [width]="48"
                        [height]="68"
                        [highlight]="selectedCardId() === card.id || isCardHighlight('maal', groupIndex * 3 + index)"
                      />
                    </button>
                  }
                </div>
              } @empty {
                <p class="py-5 text-sm text-arena-mist/40">
                  Drop three pure sequences here · those cards can't be discarded after you see the maal
                </p>
              }
            </div>
          </div>

          @if (me.openMelds.length) {
            <div class="mt-4 border-t border-arena-line/60 pt-3">
              <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
                <p class="text-xs uppercase tracking-wider text-arena-mist/50">Open melds</p>
                @if (canEditMelds()) {
                  <p class="text-[10px] text-arena-mist/50">
                    Drag a hand card onto a sequence to extend · drag a meld card back to hand to remove · drag one sequence onto another to join
                  </p>
                } @else if (!state().tiplu) {
                  <p class="text-[10px] text-arena-mist/40">Edit after maal is cut</p>
                }
              </div>
              <div class="flex flex-wrap gap-3">
                @for (meld of me.openMelds; track $index; let meldIndex = $index) {
                  <div
                    class="rounded-xl border px-3 py-2 transition"
                    [class.border-arena-gold]="meldDropIndex() === meldIndex"
                    [class.bg-arena-gold/15]="meldDropIndex() === meldIndex"
                    [class.border-arena-line/80]="meldDropIndex() !== meldIndex"
                    [class.bg-black/20]="meldDropIndex() !== meldIndex"
                    [class.cursor-grab]="canEditMelds() && meld.type === 'SEQUENCE'"
                    [attr.draggable]="canEditMelds() && meld.type === 'SEQUENCE'"
                    (dragstart)="onOpenMeldDragStart($event, meldIndex)"
                    (dragover)="onOpenMeldDragOver($event, meldIndex)"
                    (dragleave)="onOpenMeldDragLeave(meldIndex)"
                    (drop)="onOpenMeldDrop($event, meldIndex)"
                    (dragend)="onDragEnd()"
                  >
                    <p class="mb-1.5 text-[9px] uppercase tracking-wider text-arena-mist/50">
                      {{ meld.type }}{{ meld.pure ? '' : ' · impure' }}
                    </p>
                    <div class="flex flex-wrap gap-1.5">
                      @for (card of meldCards(meld); track card.id) {
                        <button
                          type="button"
                          class="cursor-grab rounded p-0 active:cursor-grabbing disabled:cursor-default"
                          [attr.draggable]="canEditMelds() && meld.type === 'SEQUENCE'"
                          [disabled]="!canEditMelds() || meld.type !== 'SEQUENCE'"
                          (dragstart)="onOpenMeldCardDragStart($event, meldIndex, card.id)"
                          (dragend)="onDragEnd()"
                        >
                          <arena-playing-card
                            [card]="card"
                            [width]="40"
                            [height]="56"
                            [dimmed]="dragSource() === 'open-meld-card' && dragCardId() === card.id"
                          />
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MarriageTableComponent {
  readonly TurnPhase = TurnPhase;
  readonly state = input.required<MarriageGameState>();
  readonly interactive = input(true);
  readonly canOpen = input(false);
  readonly canShow = input(false);
  readonly selectedCardId = input<string | null>(null);
  /** Online player: their user id. */
  readonly viewerPlayerId = input<string | null>(null);
  /** Admin / spectator: show every hand face-up. */
  readonly showAllHands = input(false);
  /** Progressive deal animation from match start. */
  readonly deal = input<MarriageDealProgress | null>(null);

  readonly drawStock = output<void>();
  readonly drawDiscard = output<void>();
  readonly open = output<void>();
  readonly show = output<void>();
  readonly discard = output<string>();
  readonly selectCard = output<string | null>();
  readonly reorder = output<MarriageHandLayout>();
  readonly extendMeld = output<{ cardId: string; meldIndex: number }>();
  readonly joinMelds = output<{ meldIndexA: number; meldIndexB: number }>();
  readonly meldCardRemove = output<{ cardId: string; meldIndex: number }>();
  readonly layoutError = output<string>();

  readonly dragSource = signal<DragSource | null>(null);
  readonly dragZone = signal<HandZone | null>(null);
  readonly dragIndex = signal<number | null>(null);
  readonly dragMeldIndex = signal<number | null>(null);
  readonly dragOverZone = signal<HandZone | null>(null);
  readonly dragOverIndex = signal<number | null>(null);
  readonly dragCardId = signal<string | null>(null);
  readonly discardDropActive = signal(false);
  readonly handDropActive = signal(false);
  readonly stagedDropActive = signal(false);
  readonly maalDropActive = signal(false);
  readonly meldDropIndex = signal<number | null>(null);

  readonly current = computed(() => {
    const state = this.state();
    const viewerId = this.viewerPlayerId();
    if (!viewerId) {
      return null;
    }
    return state.players.find((player) => player.id === viewerId) ?? null;
  });

  readonly isViewerTurn = computed(() => {
    const viewerId = this.viewerPlayerId();
    if (!viewerId) {
      return false;
    }
    return this.state().currentPlayerId === viewerId;
  });

  readonly discardTop = computed(() => {
    const pile = this.state().discard;
    return pile[pile.length - 1] ?? null;
  });

  readonly mainHand = computed(() => {
    const me = this.current();
    if (!me) {
      return [] as MarriageCard[];
    }
    const reserved = new Set([
      ...(me.holdCardIds ?? []),
      ...(me.maalSequences ?? []).flat(),
    ]);
    return this.visibleHandFor(me).filter((card) => !reserved.has(card.id));
  });

  readonly stagedHand = computed(() => {
    const me = this.current();
    if (!me) {
      return [] as MarriageCard[];
    }
    const visible = new Set(this.visibleHandFor(me).map((card) => card.id));
    const byId = new Map(me.hand.map((card) => [card.id, card]));
    return (me.holdCardIds ?? [])
      .filter((id) => visible.has(id))
      .map((id) => byId.get(id))
      .filter((card): card is MarriageCard => !!card);
  });

  readonly maalSequenceCards = computed(() => {
    const me = this.current();
    if (!me) {
      return [] as MarriageCard[][];
    }
    const byId = new Map(me.hand.map((card) => [card.id, card]));
    return (me.maalSequences ?? []).map((ids) =>
      ids.map((id) => byId.get(id)).filter((card): card is MarriageCard => !!card)
    );
  });

  constructor() {
    // Layout is persisted on the player; no local-only staging.
  }

  canDraw(): boolean {
    return (
      this.interactive() &&
      !this.deal() &&
      this.isViewerTurn() &&
      this.state().turnPhase === TurnPhase.WAITING_FOR_DRAW &&
      this.state().status === MatchStatus.LIVE
    );
  }

  canDiscard(): boolean {
    return (
      this.interactive() &&
      !this.deal() &&
      this.isViewerTurn() &&
      this.state().turnPhase === TurnPhase.WAITING_FOR_DISCARD &&
      this.state().status === MatchStatus.LIVE
    );
  }

  visibleHandFor(player: { id: string; hand: MarriageCard[] }): MarriageCard[] {
    const deal = this.deal();
    if (!deal) {
      return player.hand;
    }
    const count = deal.revealedByPlayerId[player.id] ?? 0;
    return player.hand.slice(0, count);
  }

  stockCount(): number {
    return this.state().stock.length + (this.deal()?.stockBonus ?? 0);
  }

  discardVisible(): MarriageCard | null {
    const deal = this.deal();
    if (deal && !deal.showDiscard) {
      return null;
    }
    return this.discardTop();
  }

  /** Edit/join open sequences only after maal (tiplu) is visible. */
  canEditMelds(): boolean {
    const me = this.current();
    return (
      this.canDiscard() &&
      !!me?.hasSeenMaal &&
      !!this.state().tiplu &&
      !!me?.hasOpened &&
      me.openMelds.length > 0
    );
  }

  meldCards(meld: MarriageMeld): MarriageCard[] {
    return meld.cardIds
      .map((id) => parseMarriageCardId(id))
      .filter((card): card is MarriageCard => !!card);
  }

  label(card: MarriageCard): string {
    return cardLabel(card);
  }

  isRed(card: MarriageCard): boolean {
    return card.suit === 'H' || card.suit === 'D';
  }

  isProtectedCard(cardId: string): boolean {
    const me = this.current();
    if (!me?.hasSeenMaal) {
      return false;
    }
    const locked = me.maalProtectIds?.length
      ? me.maalProtectIds
      : (me.maalSequences ?? []).flat();
    return locked.includes(cardId);
  }

  swatch(color: MarriageSeatColor | string): string {
    return MARRIAGE_SEAT_SWATCH[color as MarriageSeatColor] ?? '#94a3b8';
  }

  isDraggingCard(cardId: string): boolean {
    return this.dragSource() === 'hand' && this.dragCardId() === cardId;
  }

  isCardHighlight(zone: HandZone, index: number): boolean {
    return this.dragOverZone() === zone && this.dragOverIndex() === index;
  }

  toggleSelect(cardId: string): void {
    if (!this.canDiscard()) {
      return;
    }
    this.selectCard.emit(this.selectedCardId() === cardId ? null : cardId);
  }

  discardSelected(): void {
    const id = this.selectedCardId();
    if (!id) {
      return;
    }
    if (this.isProtectedCard(id)) {
      this.layoutError.emit('you cannot break the sequence once you see the maal');
      return;
    }
    this.discard.emit(id);
  }

  onDiscardPileClick(): void {
    if (this.canDraw()) {
      this.drawDiscard.emit();
    }
  }

  onPileDragStart(event: DragEvent, source: 'stock' | 'discard'): void {
    if (!this.canDraw()) {
      event.preventDefault();
      return;
    }
    this.dragSource.set(source);
    this.dragZone.set(null);
    this.dragIndex.set(null);
    this.dragCardId.set(null);
    event.dataTransfer?.setData('application/x-draw-source', source);
    event.dataTransfer?.setData('text/plain', source);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDiscardPileDragOver(event: DragEvent): void {
    if (!this.canDiscard() || this.dragSource() !== 'hand' || !this.dragCardId()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.discardDropActive.set(true);
  }

  onDiscardPileDragLeave(): void {
    this.discardDropActive.set(false);
  }

  onDiscardPileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const cardId = this.dragCardId() ?? event.dataTransfer?.getData('application/x-card-id');
    this.clearDragUi();
    if (!cardId || !this.canDiscard()) {
      return;
    }
    if (this.isProtectedCard(cardId)) {
      this.layoutError.emit('you cannot break the sequence once you see the maal');
      return;
    }
    this.selectCard.emit(null);
    this.discard.emit(cardId);
  }

  onCardDragStart(event: DragEvent, zone: HandZone, index: number, cardId: string): void {
    if (!this.canOrganize() && !this.canDiscard()) {
      event.preventDefault();
      return;
    }
    this.dragSource.set('hand');
    this.dragZone.set(zone);
    this.dragIndex.set(index);
    this.dragMeldIndex.set(null);
    this.dragCardId.set(cardId);
    event.dataTransfer?.setData('text/plain', cardId);
    event.dataTransfer?.setData('application/x-card-id', cardId);
    event.dataTransfer?.setData('application/x-hand-zone', zone);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onOpenMeldCardDragStart(event: DragEvent, meldIndex: number, cardId: string): void {
    if (!this.canEditMelds()) {
      event.preventDefault();
      return;
    }
    event.stopPropagation();
    this.dragSource.set('open-meld-card');
    this.dragMeldIndex.set(meldIndex);
    this.dragCardId.set(cardId);
    this.dragZone.set(null);
    this.dragIndex.set(null);
    event.dataTransfer?.setData('application/x-meld-index', String(meldIndex));
    event.dataTransfer?.setData('application/x-card-id', cardId);
    event.dataTransfer?.setData('text/plain', cardId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onOpenMeldDragStart(event: DragEvent, meldIndex: number): void {
    if (!this.canEditMelds()) {
      event.preventDefault();
      return;
    }
    if (this.dragSource() === 'open-meld-card') {
      return;
    }
    const meld = this.current()?.openMelds[meldIndex];
    if (!meld || meld.type !== 'SEQUENCE') {
      event.preventDefault();
      return;
    }
    this.dragSource.set('open-meld');
    this.dragMeldIndex.set(meldIndex);
    this.dragCardId.set(null);
    this.dragZone.set(null);
    this.dragIndex.set(null);
    event.dataTransfer?.setData('application/x-meld-index', String(meldIndex));
    event.dataTransfer?.setData('text/plain', `meld:${meldIndex}`);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onOpenMeldDragOver(event: DragEvent, meldIndex: number): void {
    const source = this.dragSource();
    if (!this.canEditMelds()) {
      return;
    }
    if (source === 'hand' && this.dragCardId()) {
      event.preventDefault();
      event.stopPropagation();
      this.meldDropIndex.set(meldIndex);
      return;
    }
    if (source === 'open-meld' && this.dragMeldIndex() !== null && this.dragMeldIndex() !== meldIndex) {
      event.preventDefault();
      event.stopPropagation();
      this.meldDropIndex.set(meldIndex);
    }
  }

  onOpenMeldDragLeave(meldIndex: number): void {
    if (this.meldDropIndex() === meldIndex) {
      this.meldDropIndex.set(null);
    }
  }

  onOpenMeldDrop(event: DragEvent, meldIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    const source = this.dragSource();
    const cardId = this.dragCardId();
    const fromMeld = this.dragMeldIndex();
    this.clearDragUi();
    if (!this.canEditMelds()) {
      return;
    }
    if (source === 'hand' && cardId) {
      this.extendMeld.emit({ cardId, meldIndex });
      this.selectCard.emit(null);
      return;
    }
    if (source === 'open-meld' && fromMeld != null && fromMeld !== meldIndex) {
      this.joinMelds.emit({ meldIndexA: fromMeld, meldIndexB: meldIndex });
    }
  }

  onCardDragOver(event: DragEvent, zone: HandZone, index: number): void {
    if (this.dragSource() !== 'hand' || !this.canOrganize()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.dragOverZone.set(zone);
    this.dragOverIndex.set(index);
    this.handDropActive.set(zone === 'main');
    this.stagedDropActive.set(zone === 'hold');
    this.maalDropActive.set(zone === 'maal');
  }

  onCardDragLeave(zone: HandZone, index: number): void {
    if (this.dragOverZone() === zone && this.dragOverIndex() === index) {
      this.dragOverIndex.set(null);
      this.dragOverZone.set(null);
    }
  }

  onCardDrop(event: DragEvent, zone: HandZone, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.dragSource() === 'hand') {
      this.moveHandCard(zone, index);
      return;
    }
    this.onZoneDrop(event, zone);
  }

  onZoneDragOver(event: DragEvent, zone: HandZone): void {
    const source = this.dragSource();
    if (source === 'stock' || source === 'discard') {
      if (!this.canDraw() || zone !== 'main') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.handDropActive.set(true);
      return;
    }
    if (source === 'open-meld-card' && zone === 'main' && this.canEditMelds()) {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.handDropActive.set(true);
      return;
    }
    if (source === 'hand' && this.canOrganize()) {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      this.dragOverZone.set(zone);
      this.dragOverIndex.set(null);
      this.handDropActive.set(zone === 'main');
      this.stagedDropActive.set(zone === 'hold');
      this.maalDropActive.set(zone === 'maal');
    }
  }

  onZoneDragLeave(zone: HandZone): void {
    if (zone === 'main') {
      this.handDropActive.set(false);
    } else if (zone === 'hold') {
      this.stagedDropActive.set(false);
    } else {
      this.maalDropActive.set(false);
    }
  }

  onZoneDrop(event: DragEvent, zone: HandZone): void {
    event.preventDefault();
    event.stopPropagation();
    const source = this.dragSource() ?? (event.dataTransfer?.getData('application/x-draw-source') as DragSource | '');

    if ((source === 'stock' || source === 'discard') && zone === 'main' && this.canDraw()) {
      this.clearDragUi();
      if (source === 'stock') {
        this.drawStock.emit();
      } else {
        this.drawDiscard.emit();
      }
      return;
    }

    if (source === 'open-meld-card' && zone === 'main' && this.canEditMelds()) {
      const cardId = this.dragCardId();
      const meldIndex = this.dragMeldIndex();
      this.clearDragUi();
      if (cardId && meldIndex != null) {
        this.meldCardRemove.emit({ cardId, meldIndex });
      }
      return;
    }

    if (source === 'hand' && this.canOrganize()) {
      const toIndex =
        zone === 'main'
          ? this.mainHand().length
          : zone === 'hold'
            ? this.stagedHand().length
            : this.maalFlatIds().length;
      this.moveHandCard(zone, toIndex);
      return;
    }

    this.clearDragUi();
  }

  onDragEnd(): void {
    this.clearDragUi();
  }

  private maalFlatIds(): string[] {
    return (this.current()?.maalSequences ?? []).flat();
  }

  private moveHandCard(toZone: HandZone, toIndex: number): void {
    const fromZone = this.dragZone();
    const fromIndex = this.dragIndex();
    const cardId = this.dragCardId();
    this.clearDragUi();
    const me = this.current();
    if (!cardId || fromZone == null || fromIndex == null || !me || !this.canOrganize()) {
      return;
    }

    const mainIds = this.mainHand().map((card) => card.id);
    const holdIds = this.stagedHand().map((card) => card.id);
    const maalIds = this.maalFlatIds();

    const fromList =
      fromZone === 'main' ? mainIds : fromZone === 'hold' ? holdIds : maalIds;
    if (fromList[fromIndex] !== cardId) {
      return;
    }

    const [moved] = fromList.splice(fromIndex, 1);
    if (!moved) {
      return;
    }

    const toList = toZone === 'main' ? mainIds : toZone === 'hold' ? holdIds : maalIds;
    const insertAt =
      fromZone === toZone && fromIndex < toIndex ? Math.max(0, toIndex - 1) : toIndex;
    toList.splice(Math.min(insertAt, toList.length), 0, moved);

    let maalSequences = me.maalSequences ?? [];
    if (toZone === 'maal' || fromZone === 'maal') {
      // Rebuild as groups of 3; incomplete trailing cards go back to hold.
      const chunks: Array<[string, string, string]> = [];
      for (let i = 0; i + 2 < maalIds.length; i += 3) {
        chunks.push([maalIds[i]!, maalIds[i + 1]!, maalIds[i + 2]!]);
      }
      const leftover = maalIds.length % 3 === 0 ? [] : maalIds.slice(maalIds.length - (maalIds.length % 3));
      if (leftover.length) {
        holdIds.push(...leftover);
      }
      maalSequences = chunks;
    }

    this.reorder.emit({
      freeCardIds: mainIds,
      holdCardIds: holdIds,
      maalSequences,
    });
  }

  private clearDragUi(): void {
    this.dragSource.set(null);
    this.dragZone.set(null);
    this.dragIndex.set(null);
    this.dragMeldIndex.set(null);
    this.dragOverZone.set(null);
    this.dragOverIndex.set(null);
    this.dragCardId.set(null);
    this.discardDropActive.set(false);
    this.handDropActive.set(false);
    this.stagedDropActive.set(false);
    this.maalDropActive.set(false);
    this.meldDropIndex.set(null);
  }

  private canOrganize(): boolean {
    return (
      this.interactive() &&
      !!this.viewerPlayerId() &&
      !this.showAllHands() &&
      this.state().status === MatchStatus.LIVE
    );
  }
}
