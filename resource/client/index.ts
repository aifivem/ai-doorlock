import { AdminWorld, GlobalGroup, loadLocaleTexts, notify, Points, stateBoolean, triggerServerCallback } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { centreOf, DOOR_PREFIX, EVENTS, readDoors, type Door } from "common/doors";

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
  private list = new Map<string, Door>();
  private registered: number[] = [];

  refresh(id: string): void {
    this.points.refresh(id);
  }

  rebuild(): void {
    for (const hash of this.registered) RemoveDoorFromSystem(hash);
    this.registered = [];
    this.points.clear();
    this.list = readDoors(world.get("doors"));
    for (const door of this.list.values()) {
      if (!door.model) continue;
      this.register(`${door.id}:1`, door.model, door.coords);
      if (door.model2) this.register(`${door.id}:2`, door.model2, door.coords2);
      this.apply(door.id, locks.get(door.id) === true);
      this.point(door.id);
    }
  }

  private register(
    name: string,
    model: string,
    at: { x: number; y: number; z: number },
  ): void {
    const hash = GetHashKey(`ai-doorlock:${name}`);
    AddDoorToSystem(
      hash,
      GetHashKey(model),
      at.x,
      at.y,
      at.z,
      false,
      false,
      false,
    );
    this.registered.push(hash);
  }

  /** Locks the door in the game's door system. */
  apply(id: string, locked: boolean): void {
    const door = this.list.get(id);
    if (!door) return;
    for (const leaf of door.model2 ? ["1", "2"] : ["1"])
      DoorSystemSetDoorState(
        GetHashKey(`ai-doorlock:${id}:${leaf}`),
        locked ? 1 : 0,
        false,
        false,
      );
  }

  private point(id: string): void {
    const door = this.list.get(id);
    if (!door?.model) return;
    this.points.add(id, {
      coords: centreOf(door),
      label: () =>
        Locale(
          locks.get(id) ? "DOOR_PROMPT_UNLOCK" : "DOOR_PROMPT_LOCK",
          door.label,
        ),
      icon: "door-closed",
      radius: door.distance,
      onPressed: () => toggle(id),
    });
  }
}

const doors = new Doors();
doors.rebuild();
world.onChange("doors", () => doors.rebuild());

locks.onChange((id, locked) => {
  doors.apply(id, locked === true);
  doors.refresh(id);
});
