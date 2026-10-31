import {
  type AccessRule,
  bool,
  num,
  readAccess,
  record,
  str,
} from "@aicore-fivem/lib/shared";

/** ai-doorlock's contracts and panel content. No natives. */

export const EVENTS = {
  /** Callback: (doorId) -> { ok, locked } lock or unlock a door the player may use. */
  toggle: "ai-doorlock:toggle",
} as const;

/** GlobalState prefix of a door's lock (`door:<id>`, true = locked): shared state everyone needs. */
export const DOOR_PREFIX = "door:";

/**
 * What a door is; decides how many objects it has and how it locks:
 * swinging doors lock once they have swung shut, sliding doors and gates lock at once,
 * garage doors and barriers are driven by the game (their speed is never touched).
 */
export const DOOR_TYPES = [
  "single",
  "double",
  "sliding",
  "doubleSliding",
  "garage",
] as const;
export type DoorType = (typeof DOOR_TYPES)[number];

/** Types made of two objects (the second at `door2`). */
export const isDouble = (type: DoorType): boolean =>
  type === "double" || type === "doubleSliding";
/** Types that swing on hinges (locked only once shut). */
export const isSwinging = (type: DoorType): boolean =>
  type === "single" || type === "double";

export interface Point {
  x: number;
  y: number;
  z: number;
}

/** One door object in the world, found by its model and position. */
export interface Leaf {
  /** Model name, or the unsigned hash as digits when the game has no name for it. */
  model: string;
  coords: Point;
}

export interface Door {
  id: string;
  label: string;
  type: DoorType;
  /** The picked objects of this type: one, or two for a double type (unpicked ones are left out). */
  leaves: Leaf[];
  /** Locked when the server starts. */
  locked: boolean;
  /** Who may lock it (lib access fields; public = anyone). */
  access: AccessRule;
  /** Metres from the door where the prompt shows. */
  distance: number;
}

const point = (v: unknown): Point => {
  const c = record(v);
  return { x: num(c.x, 0), y: num(c.y, 0), z: num(c.z, 0) };
};

const leaf = (v: unknown): Leaf | null => {
  const l = record(v);
  const model = str(l.model, "", 64);
  return model ? { model, coords: point(l.coords) } : null;
};

const doorType = (v: unknown): DoorType =>
  DOOR_TYPES.find((t) => t === v) ?? "single";

/** One door record (`panel.records` / `world.records`). */
export function readDoor(id: string, v: Record<string, unknown>): Door {
  const type = doorType(v.type);
  const picked = isDouble(type) ? [v.door, v.door2] : [v.door];
  return {
    id,
    label: str(v.label, id, 48),
    type,
    leaves: picked.map(leaf).filter((l): l is Leaf => l !== null),
    locked: bool(v.locked, true),
    access: readAccess(v),
    distance: num(v.distance, 2.5, 1, 15),
  };
}

/** The middle of a door (between both objects of a double door); null before an object is picked. */
export function centreOf(door: Door): Point | null {
  const [a, b] = door.leaves;
  if (!a) return null;
  if (!b) return a.coords;
  return {
    x: (a.coords.x + b.coords.x) / 2,
    y: (a.coords.y + b.coords.y) / 2,
    z: (a.coords.z + b.coords.z) / 2,
  };
}
