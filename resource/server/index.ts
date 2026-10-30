import {
  AdminPanel,
  aiLog,
  aiLogChannels,
  GlobalGroup,
  onClientCallback,
  provideExport,
  registerExport,
  resourceExport,
  stateBoolean,
} from "@aicore-fivem/lib/server";
import { record } from "@aicore-fivem/lib/shared";
import { centreOf, DOOR_PREFIX, EVENTS, readDoors } from "common/doors";
import { schema } from "./schema";

const core = resourceExport("ai-core");

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
/** Doors from the panel, parsed again after every change; a new door starts in its default state. */
const content = { doors: readDoors(panel.get("doors")) };
aiLogChannels({ doors: { active: false } });

function seed(): void {
  for (const door of content.doors.values())
    if (locks.get(door.id) === undefined) locks.set(door.id, door.locked);
}
seed();
panel.onChange("doors", () => {
  content.doors = readDoors(panel.get("doors"));
  seed();
});

const mayUse = (source: number, jobs: string[]): boolean =>
  jobs.length === 0 ||
  (core.GetJobs(source) ?? []).some((m) => jobs.includes(m.job));

onClientCallback(
  EVENTS.toggle,
  { args: ([id]) => (typeof id === "string" ? [id] : null), lock: true },
  (source, id) => {
    const door = content.doors.get(id);
    if (!door) return { ok: false, error: "DOOR_ERR_FAR" };
    const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
    const c = centreOf(door);
    if (!c || Math.hypot(x - c.x, y - c.y, z - c.z) > door.distance + 1.5)
      return { ok: false, error: "DOOR_ERR_FAR" };
    if (!mayUse(source, door.jobs))
      return { ok: false, error: "DOOR_ERR_DENIED" };
    const locked = locks.get(id) !== true;
    locks.set(id, locked);
    aiLog("doors", `${locked ? "locked" : "unlocked"} ${id}`, { source });
    return { ok: true, locked };
  },
);

/** Exports (own and ox_doorlock's setDoorState / getDoor names). */
const setState = (id: unknown, locked: unknown) => {
  if (typeof id === "string" && content.doors.has(id))
    locks.set(id, locked === true || locked === 1);
};
registerExport("SetDoorState", setState);
registerExport(
  "IsLocked",
  (id: unknown) => typeof id === "string" && locks.get(id) === true,
);
provideExport("ox_doorlock", "setDoorState", setState);
provideExport("ox_doorlock", "getDoor", (id: unknown) => {
  const door = typeof id === "string" ? content.doors.get(id) : undefined;
  return door
    ? {
        id: door.id,
        name: door.label,
        state: locks.get(door.id) === true ? 1 : 0,
      }
    : null;
});
