import { GlobalGroup, stateBoolean } from "@aicore-fivem/lib/server";
import { RecordObjects } from "@aicore-fivem/lib/shared";
import { DOOR_PREFIX, readDoor } from "common/doors";
import { panel } from "./panel";

export const locks = new GlobalGroup(DOOR_PREFIX, stateBoolean);
/**
 * Doors from the panel, one record re-read per edit: a new door starts in its default state (an edited one keeps its
 * lock), a deleted door's key goes (every joining player would get it).
 */
export const doors = new RecordObjects(panel, "doors", readDoor, (id, door) => {
  if (locks.get(id) === undefined) locks.set(id, door.locked);
  return () => {
    if (!doors.has(id)) locks.set(id, undefined);
  };
}).records;
// Keys of doors deleted while the server was down.
for (const id of locks.ids()) if (!doors.has(id)) locks.set(id, undefined);
