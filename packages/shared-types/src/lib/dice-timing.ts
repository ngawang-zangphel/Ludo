/** Quiet wait before the visible auto-roll countdown starts. */
export const DICE_IDLE_MS = 12_000;

/** Visible countdown length before the dice auto-rolls. */
export const DICE_COUNTDOWN_MS = 10_000;

/** Total time from roll-available until auto-roll. */
export const DICE_AUTO_ROLL_MS = DICE_IDLE_MS + DICE_COUNTDOWN_MS;
