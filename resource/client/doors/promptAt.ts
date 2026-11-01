import type { PromptAnchor } from "@aicore-fivem/shared";
import type { Door, Leaf } from "common/doors";
import { modelHash } from "./doorSystem";

/** Height on the leaf where its prompt floats (share of the model's height): the middle, as tgiann-doorlock. */
const HEIGHT = 0.5;

/** A leaf's object in the world, 0 while it is not there (not streamed, or the picked model is missing). */
export function leafEntity(leaf: Leaf): number {
  const { x, y, z } = leaf.coords;
  return GetClosestObjectOfType(
    x,
    y,
    z,
    1,
    modelHash(leaf.model),
    false,
    false,
    false,
  );
}

/** The middle of a leaf in its own model space: the leaf runs along the wide axis, the thin axis stays centred. */
function leafMiddle(model: string): { x: number; y: number; z: number } {
  const [min = [0, 0, 0], max = [0, 0, 0]] = GetModelDimensions(
    modelHash(model),
  ) as number[][];
  const mid = (i: number) => ((min[i] ?? 0) + (max[i] ?? 0)) / 2;
  const z = (min[2] ?? 0) + ((max[2] ?? 0) - (min[2] ?? 0)) * HEIGHT;
  return { x: mid(0), y: mid(1), z };
}

/** Whether any leaf of the door exists in the world: a door the game does not have gets no prompt. */
export const doorFound = (door: Door): boolean =>
  door.leaves.some((leaf) => leafEntity(leaf) !== 0);

/**
 * Where a door's prompt floats: the middle of each leaf object, riding it as it swings or slides; ai-lib shows the
 * leaf nearest the player each frame (a double door's prompt sits on the leaf the player stands at).
 */
export function promptAt(door: Door, centre: PromptAnchor): PromptAnchor {
  const anchors = door.leaves.flatMap((leaf) => {
    const entity = leafEntity(leaf);
    return entity ? [{ entity, offset: leafMiddle(leaf.model) }] : [];
  });
  return anchors.length ? { anchors } : centre;
}
