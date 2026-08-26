import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  cardLabel,
  classifyMeld,
  classifyOpenSequence,
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

type DragSource = 'hand' | 'stock' | 'discard' | 'open-meld' | 'open-meld-card' | 'new-meld-card';
type HandZone = 'main' | 'hold' | 'maal';

export interface MarriageHandLayout {
  freeCardIds: string[];
  holdCardIds: string[];
  maalSequences: string[][];
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
    @keyframes marriage-card-flip {
      0% {
        transform: rotateY(90deg) scale(0.92);
        opacity: 0.35;
      }
      100% {
        transform: rotateY(0deg) scale(1);
        opacity: 1;
      }
    }
    .marriage-drawn-flip {
      animation: marriage-card-flip 0.45s ease-out;
      transform-style: preserve-3d;
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
            <p>Maal hidden for you — drop three pure sequences or tunnels into Maal sequences to reveal it</p>
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

      <div
        class="relative flex flex-wrap items-center justify-center gap-6 rounded-3xl border bg-gradient-to-br from-emerald-950/80 to-arena-navy px-4 py-8 transition"
        [class.border-arena-line]="!discardDropActive()"
        [class.border-arena-gold]="discardDropActive()"
        [class.ring-2]="discardDropActive()"
        [class.ring-arena-gold]="discardDropActive()"
        [class.from-emerald-800/90]="discardDropActive()"
        (dragover)="onCenterTableDragOver($event)"
        (dragleave)="onCenterTableDragLeave($event)"
        (drop)="onCenterTableDrop($event)"
      >
        @if (deal()?.flyingToPlayerId) {
          <div
            class="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-16 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border-2 border-arena-gold bg-white shadow-2xl"
            style="animation: marriage-deal-fly 0.1s ease-out"
          >
            <span class="text-[10px] font-semibold text-arena-ink">•••</span>
          </div>
        }
        @if (canDiscard() && dragSource() === 'hand') {
          <p
            class="pointer-events-none absolute inset-x-0 top-2 text-center text-[10px] uppercase tracking-[0.2em] text-arena-gold"
          >
            Drop here to discard
          </p>
        }
        <button
          type="button"
          class="flex h-28 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-arena-mist/40 bg-black/30 text-arena-mist transition hover:border-arena-gold disabled:opacity-40"
          [class.border-arena-gold]="handDropActive() && dragSource() === 'stock'"
          [class.ring-2]="handDropActive() && dragSource() === 'stock'"
          [class.ring-arena-gold]="handDropActive() && dragSource() === 'stock'"
          [class.cursor-grab]="canDraw()"
          [class.active:cursor-grabbing]="canDraw()"
          [class.pointer-events-none]="canDiscard() && dragSource() === 'hand'"
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
          [class.pointer-events-none]="canDiscard() && dragSource() === 'hand'"
        >
          @if (state().tiplu; as maal) {
            <arena-playing-card [card]="maal" [width]="56" [height]="80" [highlight]="true" caption="Maal" />
          } @else {
            <span class="text-xs uppercase tracking-wider text-arena-mist/60">Maal</span>
            <span class="mt-1 px-1 text-center text-[9px] text-arena-mist/50">When 3 sequences ready</span>
          }
        </div>

        <div
          role="button"
          tabindex="0"
          class="relative flex h-28 w-20 flex-col items-center justify-center rounded-xl border-2 bg-transparent shadow-lg transition"
          [class.border-arena-line]="!discardDropActive()"
          [class.border-arena-gold]="discardDropActive() || (handDropActive() && dragSource() === 'discard')"
          [class.ring-2]="discardDropActive() || (handDropActive() && dragSource() === 'discard')"
          [class.ring-arena-gold]="discardDropActive() || (handDropActive() && dragSource() === 'discard')"
          [class.scale-105]="discardDropActive()"
          [class.hover:border-arena-gold]="canDraw()"
          [class.opacity-40]="!canDraw() && !canDiscard()"
          [class.cursor-grab]="canDraw()"
          [class.cursor-pointer]="canDiscard() && dragSource() !== 'hand'"
          [attr.draggable]="canDraw() ? true : null"
          (click)="onDiscardPileClick()"
          (keydown.enter)="onDiscardPileClick()"
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
        </div>
      </div>

      @if (!showAllHands() && current(); as me) {
        <div
          class="rounded-3xl border bg-arena-navy/80 p-4 transition"
          [class.border-arena-line]="!handDropActive() || dragSource() === 'hand'"
          [class.border-arena-gold]="handDropActive() && (dragSource() === 'stock' || dragSource() === 'discard')"
          [class.ring-2]="handDropActive() && (dragSource() === 'stock' || dragSource() === 'discard')"
          [class.ring-arena-gold]="handDropActive() && (dragSource() === 'stock' || dragSource() === 'discard')"
          (dragover)="onYourHandPanelDragOver($event)"
          (dragleave)="onYourHandPanelDragLeave($event)"
          (drop)="onYourHandPanelDrop($event)"
        >
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
                    Maal is visible · drag stock or discard onto this hand to draw{{
                      canEditMelds() ? ' · or drag open-meld cards back to hand' : ''
                    }}
                  } @else {
                    Drag stock or discard onto this hand to draw · park sequences below
                  }
                } @else if (state().turnPhase === TurnPhase.WAITING_FOR_DISCARD) {
                  Drag a card onto the green table to discard{{ canEditMelds() ? ' · drop onto open melds to extend' : '' }}{{
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
                handDropActive() && (dragSource() === 'stock' || dragSource() === 'discard')
                  ? 'Drawing…'
                  : handDropActive()
                    ? dragSource() === 'open-meld-card'
                      ? 'Drop to remove from meld'
                      : 'Drop here'
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
                  [class.marriage-drawn-flip]="isJustDrawn(card.id)"
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
                    [highlight]="selectedCardId() === card.id || isJustDrawn(card.id) || isCardHighlight('main', index)"
                  />
                </button>
              } @empty {
                <p class="py-4 text-sm text-arena-mist/40">
                  {{ canDraw() ? 'Drag stock or discard here to draw' : 'No cards in hand tray' }}
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

          @if (!me.hasSeenMaal) {
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
                  Park three pure sequences or tunnels here to qualify
                </p>
              </div>
              <div class="flex flex-wrap gap-3">
                @for (slot of [0, 1, 2]; track slot) {
                  <div
                    class="flex min-h-[4.5rem] min-w-[9rem] flex-1 flex-wrap gap-1.5 rounded-xl border border-dashed border-amber-500/30 bg-black/20 p-2 transition"
                    [class.border-arena-gold]="maalDropGroup() === slot"
                    [class.bg-arena-gold/15]="maalDropGroup() === slot"
                    [class.border-solid]="maalSequenceCards()[slot].length > 0"
                    (dragover)="onMaalGroupDragOver($event, slot)"
                    (dragleave)="onMaalGroupDragLeave(slot)"
                    (drop)="onMaalGroupDrop($event, slot)"
                  >
                    @if (maalSequenceCards()[slot].length) {
                      @for (card of maalSequenceCards()[slot]; track card.id; let index = $index) {
                        <button
                          type="button"
                          draggable="true"
                          class="cursor-grab rounded-lg p-0 transition active:cursor-grabbing"
                          [class.opacity-40]="isDraggingCard(card.id)"
                          (dragstart)="onCardDragStart($event, 'maal', maalFlatIndex(slot, index), card.id)"
                          (dragover)="onCardDragOver($event, 'maal', maalFlatIndex(slot, index))"
                          (dragleave)="onCardDragLeave('maal', maalFlatIndex(slot, index))"
                          (drop)="onMaalCardDrop($event, slot, index)"
                          (dragend)="onDragEnd()"
                          (click)="toggleSelect(card.id)"
                        >
                          <arena-playing-card
                            [card]="card"
                            [width]="48"
                            [height]="68"
                            [highlight]="selectedCardId() === card.id || isCardHighlight('maal', maalFlatIndex(slot, index))"
                          />
                        </button>
                      }
                    } @else {
                      <p class="w-full self-center py-3 text-center text-[10px] uppercase tracking-wider text-arena-mist/40">
                        Sequence {{ slot + 1 }}
                      </p>
                    }
                  </div>
                }
              </div>
            </div>
          }

          @if (me.hasOpened) {
            <div class="mt-4 border-t border-arena-line/60 pt-3">
              <div class="mb-2 flex flex-wrap items-end justify-between gap-2">
                <p class="text-xs uppercase tracking-wider text-arena-mist/50">Open melds</p>
                @if (canEditMelds()) {
                  <p class="text-[10px] text-arena-mist/50">
                    Keep at least 3 melds · drag a card to hand to free it · drop to extend · New meld to lay another
                  </p>
                } @else if (!isViewerTurn()) {
                  <p class="text-[10px] text-arena-mist/40">Edit on your turn</p>
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
                        <div
                          class="rounded p-0"
                          [class.cursor-grab]="canEditMelds()"
                          [attr.draggable]="canEditMelds() ? true : null"
                          (dragstart)="onOpenMeldCardDragStart($event, meldIndex, card.id)"
                          (dragend)="onDragEnd()"
                        >
                          <arena-playing-card
                            [card]="card"
                            [width]="40"
                            [height]="56"
                            [dimmed]="dragSource() === 'open-meld-card' && dragCardId() === card.id"
                          />
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (canEditMelds()) {
                  <div
                    class="min-w-[9rem] rounded-xl border border-dashed px-3 py-2 transition"
                    [class.border-arena-gold]="newMeldDropActive()"
                    [class.bg-arena-gold/15]="newMeldDropActive()"
                    [class.border-arena-line/60]="!newMeldDropActive()"
                    [class.bg-black/10]="!newMeldDropActive()"
                    (dragover)="onNewMeldDragOver($event)"
                    (dragleave)="onNewMeldDragLeave()"
                    (drop)="onNewMeldDrop($event)"
                  >
                    <p class="mb-1.5 text-[9px] uppercase tracking-wider text-arena-mist/50">New meld</p>
                    <div class="flex flex-wrap gap-1.5">
                      @for (card of newMeldCards(); track card.id) {
                        <button
                          type="button"
                          class="cursor-grab rounded p-0"
                          draggable="true"
                          (dragstart)="onNewMeldCardDragStart($event, card.id)"
                          (dragend)="onDragEnd()"
                        >
                          <arena-playing-card [card]="card" [width]="40" [height]="56" />
                        </button>
                      } @empty {
                        <p class="py-3 text-[10px] text-arena-mist/40">Drop 3+ cards</p>
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
  readonly addMeld = output<string[]>();
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
  /** Prevents double-draw while a stock/discard drag stays over the hand. */
  readonly drawTouchCommitted = signal(false);
  readonly maalDropGroup = signal<number | null>(null);
  readonly meldDropIndex = signal<number | null>(null);
  readonly newMeldDropActive = signal(false);
  /** Local staging for laying an additional open meld. */
  readonly newMeldCardIds = signal<string[]>([]);

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
      // After maal is seen the tray is hidden — fold those cards into the free hand UI.
      ...(me.hasSeenMaal ? [] : (me.maalSequences ?? []).flat()),
      ...this.newMeldCardIds(),
    ]);
    return this.visibleHandFor(me).filter((card) => !reserved.has(card.id));
  });

  readonly stagedHand = computed(() => {
    const me = this.current();
    if (!me) {
      return [] as MarriageCard[];
    }
    const staged = new Set(this.newMeldCardIds());
    const visible = new Set(this.visibleHandFor(me).map((card) => card.id));
    const byId = new Map(me.hand.map((card) => [card.id, card]));
    return (me.holdCardIds ?? [])
      .filter((id) => visible.has(id) && !staged.has(id))
      .map((id) => byId.get(id))
      .filter((card): card is MarriageCard => !!card);
  });

  readonly maalSequenceCards = computed(() => {
    const me = this.current();
    const empty: MarriageCard[][] = [[], [], []];
    if (!me) {
      return empty;
    }
    const staged = new Set(this.newMeldCardIds());
    const byId = new Map(me.hand.map((card) => [card.id, card]));
    const slots: MarriageCard[][] = [0, 1, 2].map((i) => {
      const ids = me.maalSequences?.[i] ?? [];
      return ids
        .filter((id) => !staged.has(id))
        .map((id) => byId.get(id))
        .filter((card): card is MarriageCard => !!card);
    });
    return slots;
  });

  constructor() {
    effect(() => {
      const me = this.current();
      const handIds = new Set((me?.hand ?? []).map((card) => card.id));
      const staged = this.newMeldCardIds();
      const next = staged.filter((id) => handIds.has(id));
      if (next.length !== staged.length) {
        this.newMeldCardIds.set(next);
      }
    });
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

  /** Edit open melds on your turn once opened (draw or discard phase). */
  canEditMelds(): boolean {
    const me = this.current();
    const phase = this.state().turnPhase;
    return (
      this.interactive() &&
      !this.deal() &&
      this.isViewerTurn() &&
      this.state().status === MatchStatus.LIVE &&
      (phase === TurnPhase.WAITING_FOR_DRAW || phase === TurnPhase.WAITING_FOR_DISCARD) &&
      !!me?.hasOpened &&
      !!this.state().tiplu
    );
  }

  newMeldCards(): MarriageCard[] {
    const me = this.current();
    if (!me) {
      return [];
    }
    const byId = new Map(me.hand.map((card) => [card.id, card]));
    return this.newMeldCardIds()
      .map((id) => byId.get(id))
      .filter((card): card is MarriageCard => !!card);
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
      this.layoutError.emit('you cannot destroy the sequence once you have seen the maal');
      return;
    }
    this.discard.emit(id);
  }

  onDiscardPileClick(): void {
    if (this.canDraw()) {
      this.drawDiscard.emit();
    }
  }

  isJustDrawn(cardId: string): boolean {
    return this.state().drawnCardId === cardId;
  }

  onPileDragStart(event: DragEvent, source: 'stock' | 'discard'): void {
    if (!this.canDraw()) {
      event.preventDefault();
      return;
    }
    this.drawTouchCommitted.set(false);
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
    this.commitHandDiscard(
      this.dragCardId() ?? event.dataTransfer?.getData('application/x-card-id') ?? null
    );
  }

  onCenterTableDragOver(event: DragEvent): void {
    if (!this.canDiscard() || this.dragSource() !== 'hand' || !this.dragCardId()) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.discardDropActive.set(true);
  }

  onCenterTableDragLeave(event: DragEvent): void {
    const next = event.relatedTarget as Node | null;
    const current = event.currentTarget as Node | null;
    if (current && next && current.contains(next)) {
      return;
    }
    this.discardDropActive.set(false);
  }

  onCenterTableDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.commitHandDiscard(
      this.dragCardId() ?? event.dataTransfer?.getData('application/x-card-id') ?? null
    );
  }

  private commitHandDiscard(cardId: string | null): void {
    this.clearDragUi();
    if (!cardId || !this.canDiscard()) {
      return;
    }
    if (this.isProtectedCard(cardId)) {
      this.layoutError.emit('you cannot destroy the sequence once you have seen the maal');
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

  onNewMeldDragOver(event: DragEvent): void {
    if (!this.canEditMelds()) {
      return;
    }
    const source = this.dragSource();
    if (source !== 'hand' && source !== 'new-meld-card') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.newMeldDropActive.set(true);
  }

  onNewMeldDragLeave(): void {
    this.newMeldDropActive.set(false);
  }

  onNewMeldDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const source = this.dragSource();
    const cardId = this.dragCardId();
    this.newMeldDropActive.set(false);
    if (!this.canEditMelds() || !cardId) {
      this.clearDragUi();
      return;
    }
    if (source === 'hand') {
      const fromZone = this.dragZone();
      // Remove from hand layout first via reorder, then stage.
      if (fromZone === 'main' || fromZone === 'hold' || fromZone === 'maal') {
        // Stage locally; card hidden from trays via newMeldCardIds filter.
        if (!this.newMeldCardIds().includes(cardId)) {
          this.newMeldCardIds.update((ids) => [...ids, cardId]);
        }
        this.clearDragUi();
        this.tryCommitNewMeld();
        return;
      }
    }
    this.clearDragUi();
  }

  onNewMeldCardDragStart(event: DragEvent, cardId: string): void {
    if (!this.canEditMelds()) {
      event.preventDefault();
      return;
    }
    this.dragSource.set('new-meld-card');
    this.dragCardId.set(cardId);
    this.dragZone.set(null);
    this.dragIndex.set(null);
    event.dataTransfer?.setData('application/x-card-id', cardId);
    event.dataTransfer?.setData('text/plain', cardId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  private tryCommitNewMeld(): void {
    const me = this.current();
    const ids = this.newMeldCardIds();
    if (!me || ids.length < 3) {
      return;
    }
    let valid = false;
    if (ids.length === 3) {
      valid = !!classifyMeld([ids[0]!, ids[1]!, ids[2]!], me.hand, this.state().tiplu, false);
    } else {
      const meld = classifyOpenSequence(ids, me.hand, this.state().tiplu);
      valid = !!meld && meld.type === 'SEQUENCE';
    }
    if (!valid) {
      return;
    }
    this.addMeld.emit([...ids]);
    this.newMeldCardIds.set([]);
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
      const me = this.current();
      if (me && me.openMelds.length <= 3) {
        this.layoutError.emit('you cannot destroy the sequence once you have seen the maal');
        return;
      }
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
      this.tryCommitDrawFromDrag(source);
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
    if (source === 'new-meld-card' && zone === 'main' && this.canEditMelds()) {
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
      this.maalDropGroup.set(null);
    }
  }

  onZoneDrop(event: DragEvent, zone: HandZone): void {
    event.preventDefault();
    event.stopPropagation();
    const source = this.dragSource() ?? (event.dataTransfer?.getData('application/x-draw-source') as DragSource | '');

    if ((source === 'stock' || source === 'discard') && zone === 'main' && this.canDraw()) {
      this.tryCommitDrawFromDrag(source);
      return;
    }

    if (source === 'open-meld-card' && zone === 'main' && this.canEditMelds()) {
      const cardId = this.dragCardId();
      const meldIndex = this.dragMeldIndex();
      this.clearDragUi();
      if (cardId && meldIndex != null) {
        if (this.wouldBreakMinOpenMelds(meldIndex, cardId)) {
          this.layoutError.emit('you cannot destroy the sequence once you have seen the maal');
          return;
        }
        this.meldCardRemove.emit({ cardId, meldIndex });
      }
      return;
    }

    if (source === 'new-meld-card' && zone === 'main' && this.canEditMelds()) {
      const cardId = this.dragCardId();
      this.clearDragUi();
      if (cardId) {
        this.newMeldCardIds.update((ids) => ids.filter((id) => id !== cardId));
      }
      return;
    }

    if (source === 'hand' && this.canOrganize()) {
      if (zone === 'maal') {
        // Prefer first empty sequence slot, else append to last used.
        const slots = this.current()?.maalSequences ?? [];
        let slot = [0, 1, 2].find((i) => !(slots[i]?.length)) ?? 0;
        if ([0, 1, 2].every((i) => (slots[i]?.length ?? 0) > 0)) {
          slot = 2;
        }
        const len = slots[slot]?.length ?? 0;
        this.moveHandCard('maal', this.maalFlatIndex(slot, len), slot);
        return;
      }
      const toIndex =
        zone === 'main' ? this.mainHand().length : this.stagedHand().length;
      this.moveHandCard(zone, toIndex);
      return;
    }

    this.clearDragUi();
  }

  onDragEnd(): void {
    this.clearDragUi();
    this.drawTouchCommitted.set(false);
  }

  private maalFlatIds(): string[] {
    return (this.current()?.maalSequences ?? []).flat();
  }

  /** Flat index across variable-length maal groups. */
  maalFlatIndex(groupIndex: number, cardIndex: number): number {
    const groups = [0, 1, 2].map((i) => this.current()?.maalSequences?.[i] ?? []);
    let flat = 0;
    for (let g = 0; g < groupIndex; g += 1) {
      flat += groups[g]?.length ?? 0;
    }
    return flat + cardIndex;
  }

  private flatToMaalPos(flatIndex: number): { group: number; index: number } | null {
    const groups = [0, 1, 2].map((i) => this.current()?.maalSequences?.[i] ?? []);
    let remaining = flatIndex;
    for (let g = 0; g < groups.length; g += 1) {
      const len = groups[g]?.length ?? 0;
      if (remaining < len) {
        return { group: g, index: remaining };
      }
      remaining -= len;
    }
    return null;
  }

  onMaalGroupDragOver(event: DragEvent, groupIndex: number): void {
    if (this.dragSource() !== 'hand' || !this.canOrganize()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.maalDropActive.set(true);
    this.maalDropGroup.set(groupIndex);
    this.dragOverZone.set('maal');
  }

  onMaalGroupDragLeave(groupIndex: number): void {
    if (this.maalDropGroup() === groupIndex) {
      this.maalDropGroup.set(null);
    }
  }

  onMaalGroupDrop(event: DragEvent, groupIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.dragSource() !== 'hand' || !this.canOrganize()) {
      this.clearDragUi();
      return;
    }
    const groupLen = this.current()?.maalSequences?.[groupIndex]?.length ?? 0;
    this.moveHandCard('maal', this.maalFlatIndex(groupIndex, groupLen), groupIndex);
  }

  onMaalCardDrop(event: DragEvent, groupIndex: number, cardIndex: number): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.dragSource() === 'hand') {
      this.moveHandCard('maal', this.maalFlatIndex(groupIndex, cardIndex), groupIndex);
      return;
    }
    this.onZoneDrop(event, 'maal');
  }

  private moveHandCard(toZone: HandZone, toIndex: number, toMaalGroup?: number | null): void {
    const fromZone = this.dragZone();
    const fromIndex = this.dragIndex();
    const cardId = this.dragCardId();
    const targetGroup = toMaalGroup ?? this.maalDropGroup();
    this.clearDragUi();
    const me = this.current();
    if (!cardId || fromZone == null || fromIndex == null || !me || !this.canOrganize()) {
      return;
    }

    const mainIds = this.mainHand().map((card) => card.id);
    const holdIds = this.stagedHand().map((card) => card.id);
    // Keep three slot arrays so Sequence 1/2/3 drop targets stay stable.
    const groups: string[][] = [0, 1, 2].map((i) => [...(me.maalSequences?.[i] ?? [])]);
    let fromGroup: number | null = null;
    let fromLocal: number | null = null;

    if (fromZone === 'main') {
      if (mainIds[fromIndex] !== cardId) {
        return;
      }
      mainIds.splice(fromIndex, 1);
    } else if (fromZone === 'hold') {
      if (holdIds[fromIndex] !== cardId) {
        return;
      }
      holdIds.splice(fromIndex, 1);
    } else {
      const pos = this.flatToMaalPos(fromIndex);
      if (!pos || groups[pos.group]?.[pos.index] !== cardId) {
        return;
      }
      fromGroup = pos.group;
      fromLocal = pos.index;
      groups[pos.group]!.splice(pos.index, 1);
    }

    if (toZone === 'main') {
      const insertAt =
        fromZone === 'main' && fromIndex < toIndex ? Math.max(0, toIndex - 1) : toIndex;
      mainIds.splice(Math.min(insertAt, mainIds.length), 0, cardId);
    } else if (toZone === 'hold') {
      const insertAt =
        fromZone === 'hold' && fromIndex < toIndex ? Math.max(0, toIndex - 1) : toIndex;
      holdIds.splice(Math.min(insertAt, holdIds.length), 0, cardId);
    } else {
      const dest = targetGroup != null && targetGroup >= 0 && targetGroup < 3 ? targetGroup : 0;
      const group = groups[dest]!;
      if (fromGroup === dest && fromLocal != null) {
        const start = this.groupStartFlat(groups, dest);
        // Use pre-removal lengths for start — recompute from original
        const orig = [0, 1, 2].map((i) => [...(me.maalSequences?.[i] ?? [])]);
        const origStart = this.groupStartFlat(orig, dest);
        let local = Math.max(0, Math.min(group.length, toIndex - origStart));
        if (fromLocal < local) {
          local = Math.max(0, local - 1);
        }
        group.splice(local, 0, cardId);
      } else {
        group.push(cardId);
      }
    }

    this.reorder.emit({
      freeCardIds: mainIds,
      holdCardIds: holdIds,
      maalSequences: groups,
    });
  }

  private groupStartFlat(groups: string[][], groupIndex: number): number {
    let flat = 0;
    for (let g = 0; g < groupIndex; g += 1) {
      flat += groups[g]?.length ?? 0;
    }
    return flat;
  }

  /** True when removing this card would dissolve a meld and leave fewer than 3 open melds. */
  private wouldBreakMinOpenMelds(meldIndex: number, cardId: string): boolean {
    const me = this.current();
    if (!me || me.openMelds.length > 3) {
      return false;
    }
    const meld = me.openMelds[meldIndex];
    if (!meld?.cardIds.includes(cardId)) {
      return false;
    }
    const nextIds = meld.cardIds.filter((id) => id !== cardId);
    if (meld.type === 'SEQUENCE' && nextIds.length >= 3) {
      const pool = [...me.hand, ...this.meldCards(meld)];
      const next = classifyOpenSequence(nextIds, pool, this.state().tiplu);
      if (next && next.type === 'SEQUENCE') {
        return false;
      }
    }
    return true;
  }

  private tryCommitDrawFromDrag(source: DragSource): void {
    if (source !== 'stock' && source !== 'discard') {
      return;
    }
    if (!this.canDraw() || this.drawTouchCommitted()) {
      return;
    }
    this.drawTouchCommitted.set(true);
    this.clearDragUi();
    if (source === 'stock') {
      this.drawStock.emit();
    } else {
      this.drawDiscard.emit();
    }
  }

  onYourHandPanelDragOver(event: DragEvent): void {
    const source = this.dragSource();
    if (source !== 'stock' && source !== 'discard') {
      return;
    }
    if (!this.canDraw() && !this.drawTouchCommitted()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.handDropActive.set(true);
    this.tryCommitDrawFromDrag(source);
  }

  onYourHandPanelDragLeave(event: DragEvent): void {
    const next = event.relatedTarget as Node | null;
    const current = event.currentTarget as Node | null;
    if (current && next && current.contains(next)) {
      return;
    }
    this.handDropActive.set(false);
  }

  onYourHandPanelDrop(event: DragEvent): void {
    const source =
      this.dragSource() ??
      (event.dataTransfer?.getData('application/x-draw-source') as DragSource | '');
    if (source !== 'stock' && source !== 'discard') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.tryCommitDrawFromDrag(source);
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
    this.maalDropGroup.set(null);
    this.meldDropIndex.set(null);
    this.newMeldDropActive.set(false);
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
