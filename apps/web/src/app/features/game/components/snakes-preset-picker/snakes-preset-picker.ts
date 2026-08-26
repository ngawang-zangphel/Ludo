import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SNAKES_LEVELS, SNAKES_PRESETS, SnakesLevelId } from '@ludo-game/shared-types';

@Component({
  selector: 'arena-snakes-preset-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p class="text-[11px] uppercase tracking-[0.28em] text-arena-gold/80">Preset</p>
      <div class="snakes-preset-row mt-2">
        @for (preset of presets; track preset.id) {
          <button
            type="button"
            class="snakes-preset-btn"
            [class.is-active]="value() === preset.id"
            [attr.aria-pressed]="value() === preset.id"
            (click)="select(preset.id)"
          >
            {{ preset.name }}
          </button>
        }
        @if (showCustom()) {
          <button
            type="button"
            class="snakes-preset-btn is-custom"
            [class.is-active]="customActive()"
            [attr.aria-pressed]="customActive()"
            (click)="select(SnakesLevelId.CUSTOM)"
          >
            Custom
          </button>
        }
        @if (showCreate()) {
          <button
            type="button"
            class="snakes-preset-btn is-custom"
            [class.is-active]="createActive()"
            [attr.aria-pressed]="createActive()"
            (click)="selectCreate()"
          >
            Create your own
          </button>
        }
      </div>
      @if (hint(); as text) {
        <p class="snakes-preset-hint">{{ text }}</p>
      }
    </div>
  `,
})
export class SnakesPresetPickerComponent {
  readonly value = input.required<SnakesLevelId>();
  readonly showCustom = input(true);
  readonly showCreate = input(false);
  readonly createSelected = input(false);
  readonly valueChange = output<SnakesLevelId>();
  readonly createSelectedChange = output<boolean>();
  readonly SnakesLevelId = SnakesLevelId;
  readonly presets = SNAKES_PRESETS;
  readonly customActive = computed(
    () => this.value() === SnakesLevelId.CUSTOM && !this.createSelected()
  );
  readonly createActive = computed(
    () => this.value() === SnakesLevelId.CUSTOM && this.createSelected()
  );
  readonly hint = computed(() => {
    if (this.createActive()) {
      return 'Draw snakes and ladders for this match only. This board is not saved.';
    }
    if (this.customActive()) {
      return 'Choose a saved custom board';
    }
    return SNAKES_LEVELS.find((level) => level.id === this.value())?.description ?? '';
  });

  select(id: SnakesLevelId): void {
    if (id === SnakesLevelId.CUSTOM && this.createSelected()) {
      this.createSelectedChange.emit(false);
      this.valueChange.emit(SnakesLevelId.CUSTOM);
      return;
    }
    if (id !== this.value()) {
      this.valueChange.emit(id);
    }
  }

  selectCreate(): void {
    if (this.createActive()) {
      return;
    }
    this.createSelectedChange.emit(true);
  }
}
