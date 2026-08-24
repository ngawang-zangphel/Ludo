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
            [class.is-active]="value() === SnakesLevelId.CUSTOM"
            [attr.aria-pressed]="value() === SnakesLevelId.CUSTOM"
            (click)="select(SnakesLevelId.CUSTOM)"
          >
            Custom
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
  readonly valueChange = output<SnakesLevelId>();
  readonly SnakesLevelId = SnakesLevelId;
  readonly presets = SNAKES_PRESETS;
  readonly hint = computed(
    () => SNAKES_LEVELS.find((level) => level.id === this.value())?.description ?? ''
  );

  select(id: SnakesLevelId): void {
    if (id !== this.value()) {
      this.valueChange.emit(id);
    }
  }
}
