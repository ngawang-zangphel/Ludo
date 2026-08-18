export type DiceRng = () => number;

export function rollDice(rng: DiceRng = Math.random): number {
  return Math.floor(rng() * 6) + 1;
}

/** Test helper: returns a RNG that yields the given dice faces in order. */
export function createDiceSequence(faces: readonly number[]): DiceRng {
  let index = 0;
  return () => {
    const face = faces[index];
    if (face === undefined) {
      throw new Error('Dice sequence exhausted');
    }
    index += 1;
    return (face - 1) / 6;
  };
}
