import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  GlobalGroup,
  isNear,
  KeyedCooldowns,
  onClientCallback,
  online,
  provideExport,
  registerExport,
  stateBoolean,
} from "@aicore-fivem/lib/server";
import {
  fail,
  oneArg,
  readText,
  record,
  RecordObjects,
} from "@aicore-fivem/lib/shared";
import { centreOf, DOOR_PREFIX, EVENTS, readDoor } from "common/doors";
import { schema } from "./schema";

const panel = new AdminPanel(schema);

/** Doors saved before door types (`model`/`coords`/`model2`/`coords2`) move to `type` + `door`/`door2`. */
function upgradeOldDoors(): void {
  for (const [id, value] of Object.entries(panel.get("doors"))) {
    const v = record(value);
    if (typeof v.model !== "string" || "door" in v) continue;
    const { model, coords, model2, coords2, ...rest } = v;
    const second = typeof model2 === "string" && model2 !== "";
    const none = { x: 0, y: 0, z: 0 };
    panel.commit("doors", id, {
      ...rest,
      type: second ? "double" : "single",
      door: { model, coords: coords ?? none },
      door2: { model: second ? model2 : "", coords: coords2 ?? none },
    });
  }
}
upgradeOldDoors();

const locks = new GlobalGroup(DOOR_PREFIX, stateBoolean);
/**
 * Doors from the panel, one record re-read per edit: a new door starts in its default state (an edited one keeps its
 * lock), a deleted door's key goes (every joining player would get it).
 */
const doors = new RecordObjects(panel, "doors", readDoor, (id, door) => {
  if (locks.get(id) === undefined) locks.set(id, door.locked);
  return () => {
    if (!doors.has(id)) locks.set(id, undefined);
  };
}).records;
// Keys of doors deleted while the server was down.
for (const id of locks.ids()) if (!doors.has(id)) locks.set(id, undefined);
aiLogChannels({ doors: { active: false } });

/** A door flips at most this often: each flip is a GlobalState write replicated to every player. */
const DOOR_COOLDOWN_MS = 500;
const flips = new KeyedCooldowns<string>();

onClientCallback(
  EVENTS.toggle,
  {
    args: oneArg((id) => readText(id, 64)),
    rate: { count: 2, windowMs: 1000 },
    lock: true,
  },
  (source, id) => {
    const door = doors.get(id);
    const c = door ? centreOf(door) : null;
    if (!door || !c || !isNear(source, c, door.distance + 1.5))
      return fail("DOOR_ERR_FAR");
    if (!online.allows(source, door.access)) return fail("DOOR_ERR_DENIED");
    if (!flips.take(id, DOOR_COOLDOWN_MS)) return fail("DOOR_ERR_BUSY");
    const locked = locks.get(id) !== true;
    locks.set(id, locked);
    aiLog("doors", `${locked ? "locked" : "unlocked"} ${id}`, { source });
    return { ok: true, locked };
  },
);

/** Exports (own and ox_doorlock's setDoorState / getDoor names). */
const setState = (id: unknown, locked: unknown) => {
  if (typeof id === "string" && doors.has(id))
    locks.set(id, locked === true || locked === 1);
};
registerExport("SetDoorState", setState);
registerExport(
  "IsLocked",
  (id: unknown) => typeof id === "string" && locks.get(id) === true,
);
provideExport("ox_doorlock", "setDoorState", setState);
provideExport("ox_doorlock", "getDoor", (id: unknown) => {
  const door = typeof id === "string" ? doors.get(id) : undefined;
  return door
    ? {
        id: door.id,
        name: door.label,
        state: locks.get(door.id) === true ? 1 : 0,
      }
    : null;
});
