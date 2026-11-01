import { provideExport, registerExport } from "@aicore-fivem/lib/server";
import { doors, locks } from "./doors";

/** Exports (own, and ox_doorlock's setDoorState / getDoor names under the name it `provide`s). */
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
