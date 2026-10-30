import {
  AdminWorld,
  GlobalGroup,
  loadLocaleTexts,
  notify,
  Points,
  stateBoolean,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import {
  centreOf,
  DOOR_PREFIX,
  EVENTS,
  isSwinging,
  readDoors,
  type Door,
} from "common/doors";
import { DoorSystem } from "./doorSystem";

const world = new AdminWorld(["doors"]);
const texts = loadLocaleTexts();
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

async function toggle(id: string): Promise<void> {
  const r: unknown = await triggerServerCallback(EVENTS.toggle, [id]).catch(
    () => null,
  );
  if (isObj(r) && r.ok === true) return;
  const key =
    isObj(r) && typeof r.error === "string" ? r.error : "DOOR_ERR_FAR";
  notify(texts[key] ?? key, "error", 2500);
}

/**
 * Doors on this client: registered in the game's door system (so the lock holds even when the door is not streamed),
 * a point each (its label follows the lock), and the lock state from GlobalState (set at join, changes as they come).
 */
const locks = new GlobalGroup(DOOR_PREFIX, stateBoolean);

class Doors {
  private readonly points = new Points();
  private readonly system = new DoorSystem();
  private list = new Map<string, Door>();

  refresh(id: string): void {
    this.points.refresh(id);
  }

  rebuild(): void {
    this.system.clear();
    this.points.clear();
    this.list = readDoors(world.get("doors"));
    for (const door of this.list.values()) {
      const centre = centreOf(door);
      if (!centre) continue;
      door.leaves.forEach((leaf, i) =>
        this.system.add(`${door.id}:${i + 1}`, leaf, door.type),
      );
      this.apply(door.id, locks.get(door.id) === true);
      this.points.add(door.id, {
        coords: centre,
        label: () =>
          Locale(
            locks.get(door.id) ? "DOOR_PROMPT_UNLOCK" : "DOOR_PROMPT_LOCK",
            door.label,
          ),
        icon: "door-closed",
        radius: door.distance,
        onPressed: () => toggle(door.id),
      });
    }
  }

  /** Locks or unlocks every object of the door the way its type locks. */
  apply(id: string, locked: boolean): void {
    const door = this.list.get(id);
    if (!door) return;
    door.leaves.forEach((_, i) =>
      this.system.setLocked(`${id}:${i + 1}`, locked, isSwinging(door.type)),
    );
  }
}

const doors = new Doors();
doors.rebuild();
world.onChange("doors", () => doors.rebuild());

locks.onChange((id, locked) => {
  doors.apply(id, locked === true);
  doors.refresh(id);
});
