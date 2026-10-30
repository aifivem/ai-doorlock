import {
  AdminWorld,
  callAction,
  getPlayerData,
  GlobalGroup,
  onPlayerData,
  Points,
  resourceExport,
  seedPlayerData,
  stateBoolean,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { Locale, ResourceName } from "common";
import {
  centreOf,
  DOOR_PREFIX,
  EVENTS,
  isSwinging,
  readDoors,
  type Door,
} from "common/doors";
import { DoorSystem } from "./doorSystem";

const core = resourceExport("ai-core");
const log = createLogger(ResourceName);
const world = new AdminWorld(["doors"]);

const toggle = (id: string) =>
  callAction(EVENTS.toggle, [id], { fallback: "DOOR_ERR_FAR" });

/** A job door shows only to members of one of its jobs (the server checks again). */
const mayUse = (door: Door): boolean =>
  door.jobs.length === 0 ||
  (getPlayerData("jobs") ?? []).some((m) => door.jobs.includes(m.job));

/**
 * Doors on this client: registered in the game's door system (so the lock holds even when the door is not streamed),
 * a point each (its label follows the lock), and the lock state from GlobalState (set at join, changes as they come).
 */
const locks = new GlobalGroup(DOOR_PREFIX, stateBoolean);

class Doors {
  private readonly points = new Points();
  private readonly system = new DoorSystem();
  private list = new Map<string, Door>();

  refresh(id?: string): void {
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
        canShow: () => mayUse(door),
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

// After a restart of this resource ai-core does not push the jobs again: start from its snapshot.
try {
  const data = core.GetPlayerData();
  if (data) seedPlayerData(data);
} catch (error) {
  // ai-core starting too: its push on character load fills the jobs.
  log.warn("ai-core's player data is not ready yet", error);
}

const doors = new Doors();
onPlayerData("jobs", () => doors.refresh());
doors.rebuild();
world.onChange("doors", () => doors.rebuild());

locks.onChange((id, locked) => {
  doors.apply(id, locked === true);
  doors.refresh(id);
});
