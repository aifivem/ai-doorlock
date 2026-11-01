import {
  aiLog,
  aiLogChannels,
  isNear,
  KeyedCooldowns,
  onClientCallback,
  online,
} from "@aicore-fivem/lib/server";
import { fail, oneArg, readText } from "@aicore-fivem/lib/shared";
import { centreOf, EVENTS } from "common/doors";
import { doors, locks } from "./doors";

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
