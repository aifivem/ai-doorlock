import type { Vec3 } from "@aicore-fivem/lib/shared";
import type { Door } from "common/doors";

/** Height on the door where its prompt floats (share of the model's height). */
const HEIGHT = 0.55;

/** A model's size box: [min, max] in model space. */
function box(model: string): [number[], number[]] {
  const [min = [0, 0, 0], max = [0, 0, 0]] = GetModelDimensions(
    GetHashKey(model),
  ) as number[][];
  return [min, max];
}

/**
 * Where a door's prompt floats: the middle of the leaf at about handle height. Read when the prompt shows (the door
 * is streamed then); a double door's middle is between its two leaves.
 */
export function promptAt(door: Door, centre: Vec3): Vec3 {
  const [first, second] = door.leaves;
  if (!first) return centre;
  const [min, max] = box(first.model);
  const up = (min[2] ?? 0) + ((max[2] ?? 0) - (min[2] ?? 0)) * HEIGHT;
  if (second) return { ...centre, z: centre.z + up };
  const { x, y, z } = first.coords;
  const entity = GetClosestObjectOfType(
    x,
    y,
    z,
    1,
    GetHashKey(first.model),
    false,
    false,
    false,
  );
  if (!entity) return { x, y, z: z + up };
  // The leaf runs along the model's wide axis; the thin axis stays centred.
  const mid = (i: number) => ((min[i] ?? 0) + (max[i] ?? 0)) / 2;
  const [ox = 0, oy = 0, oz = 0] = GetOffsetFromEntityInWorldCoords(
    entity,
    mid(0),
    mid(1),
    up,
  );
  return { x: ox, y: oy, z: oz };
}
