import { bool, num, record, str } from "@aicore-fivem/lib/shared"

/** ai-doorlock's contracts and panel content. No natives. */

export const EVENTS = {
  /** Callback: (doorId) -> { ok, locked } lock or unlock a door the player may use. */
  toggle: "ai-doorlock:toggle",
} as const

/** GlobalState key of a door's lock (true = locked): shared state everyone needs. */
export const doorKey = (id: string): string => `door:${id}`

export interface Point {
  x: number
  y: number
  z: number
}

export interface Door {
  id: string
  label: string
  model: string
  coords: Point
  /** The second leaf of a double door (empty model = single door). */
  model2: string
  coords2: Point
  /** Locked when the server starts. */
  locked: boolean
  /** Empty = anyone may lock it. */
  jobs: string[]
  /** Metres from the door where the prompt shows. */
  distance: number
}

const point = (v: unknown): Point => {
  const c = record(v)
  return { x: num(c.x, 0), y: num(c.y, 0), z: num(c.z, 0) }
}

export function readDoors(raw: unknown): Map<string, Door> {
  const out = new Map<string, Door>()
  for (const [id, value] of Object.entries(record(raw))) {
    const v = record(value)
    out.set(id, {
      id,
      label: str(v.label, id, 48),
      model: str(v.model, "", 64),
      coords: point(v.coords),
      model2: str(v.model2, "", 64),
      coords2: point(v.coords2),
      locked: bool(v.locked, true),
      jobs: Array.isArray(v.jobs)
        ? v.jobs.filter((j): j is string => typeof j === "string")
        : [],
      distance: num(v.distance, 2.5, 1, 15),
    })
  }
  return out
}

/** The middle of a door (both leaves of a double door). */
export const centreOf = (door: Door): Point =>
  door.model2
    ? {
        x: (door.coords.x + door.coords2.x) / 2,
        y: (door.coords.y + door.coords2.y) / 2,
        z: (door.coords.z + door.coords2.z) / 2,
      }
    : door.coords
