import {
  AdminWorld,
  allows,
  callAction,
  GlobalGroup,
  onMembershipChange,
  Points,
  stateBoolean,
} from "@aicore-fivem/lib/client";
import { RecordObjects } from "@aicore-fivem/lib/shared";
import { Locale } from "common";
import {
  centreOf,
  DOOR_PREFIX,
  EVENTS,
  isSwinging,
  readDoor,
  type Door,
} from "common/doors";
import { DoorSystem } from "./doorSystem";
import { doorFound, promptAt } from "./promptAt";

const world = new AdminWorld(["doors"]);

const toggle = (id: string) =>
  callAction(EVENTS.toggle, [id], { fallback: "DOOR_ERR_FAR" });

/**
 * Doors on this client: registered in the game's door system (so the lock holds even when the door is not streamed),
 * a point each (its label follows the lock), and the lock state from GlobalState (set at join, changes as they come).
 */
const locks = new GlobalGroup(DOOR_PREFIX, stateBoolean);

class Doors {
  private readonly points = new Points();
  private readonly system = new DoorSystem();
  /** One door's objects and point, rebuilt only when that record changes. */
  private readonly objects = new RecordObjects(
    world,
    "doors",
    readDoor,
    (id, door) => this.build(id, door),
  );

  refresh(id?: string): void {
    this.points.refresh(id);
  }

  private build(id: string, door: Door): (() => void) | undefined {
    const centre = centreOf(door);
    if (!centre) return;
    const names = door.leaves.map((leaf, i) => {
      const name = `${id}:${i + 1}`;
      this.system.add(name, leaf, door.type);
      return name;
    });
    this.lock(id, door, locks.get(id) === true);
    this.points.add(id, {
      coords: centre,
      label: () =>
        Locale(
          locks.get(id) ? "DOOR_PROMPT_UNLOCK" : "DOOR_PROMPT_LOCK",
          door.label,
        ),
      icon: "door-closed",
      radius: door.distance,
      // The prompt sits on the door itself (tgiann-doorlock style), not in the right-hand list.
      world: () => promptAt(door, centre),
      // A locked door's point shows only to who passes its access rule (the server checks the same rule), and
      // only when the door's object is in the world.
      canShow: () => allows(door.access) && doorFound(door),
      onPressed: () => toggle(id),
    });
    return () => {
      for (const name of names) this.system.remove(name);
      this.points.remove(id);
    };
  }

  /** A lock change of a door (GlobalState). */
  apply(id: string, locked: boolean): void {
    const door = this.objects.records.get(id);
    if (door) this.lock(id, door, locked);
  }

  /** Locks or unlocks every object of the door the way its type locks. */
  private lock(id: string, door: Door, locked: boolean): void {
    door.leaves.forEach((_, i) =>
      this.system.setLocked(`${id}:${i + 1}`, locked, isSwinging(door.type)),
    );
  }
}

const doors = new Doors();
onMembershipChange(() => doors.refresh());

locks.onChange((id, locked) => {
  doors.apply(id, locked === true);
  doors.refresh(id);
});
