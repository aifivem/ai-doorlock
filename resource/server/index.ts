import { AdminPanel, aiLog, aiLogChannels, onClientCallback, provideExport, registerExport, resourceExport } from "@aicore-fivem/lib/server";
import type { DataSpec, PanelSchema } from "@aicore-fivem/shared";
import { centreOf, doorKey, EVENTS, readDoors } from "common/doors";

const core = resourceExport("ai-core");

const point: DataSpec = { type: "vec3" };
/** ai-doorlock's panel: one record per door (a double door has a second leaf). */
const schema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "lock",
  files: {
    doors: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: { label: "", model: "", coords: { x: 0, y: 0, z: 0 }, model2: "", coords2: { x: 0, y: 0, z: 0 }, locked: true, jobs: [], distance: 2.5 },
      sections: {
        label: { type: "text", min: 1, max: 48 },
        model: { type: "text", min: 2, max: 64 },
        coords: point,
        model2: { type: "text", min: 0, max: 64 },
        coords2: point,
        locked: { type: "bool" },
        jobs: { type: "names", max: 20, itemMax: 32, pattern: "^[a-z0-9_]{2,32}$" },
        distance: { type: "number", min: 1, max: 15 },
      },
    },
  },
  tabs: [
    {
      id: "doors",
      file: "doors",
      icon: "lock",
      label: "ADMIN_TAB_DOORS",
      desc: "ADMIN_TAB_DOORS_DESC",
      createLabel: "ADMIN_NEW_DOOR",
      deleteLabel: "ADMIN_DELETE_DOOR",
      deleteDesc: "ADMIN_DELETE_DOOR_DESC",
      cards: [
        {
          icon: "lock",
          title: "ADMIN_C_DOOR",
          desc: "ADMIN_C_DOOR_DESC",
          fields: [
            { widget: "text", path: "label", label: "ADMIN_F_LABEL", placeholder: "ADMIN_P_LABEL" },
            { widget: "text", path: "model", label: "ADMIN_F_MODEL", hint: "ADMIN_H_MODEL", placeholder: "ADMIN_P_MODEL" },
            { widget: "point", path: "coords", label: "ADMIN_F_COORDS", hint: "ADMIN_H_COORDS" },
            { widget: "text", path: "model2", label: "ADMIN_F_MODEL2", hint: "ADMIN_H_MODEL2", placeholder: "ADMIN_P_MODEL" },
            { widget: "point", path: "coords2", label: "ADMIN_F_COORDS2" },
            { widget: "switch", path: "locked", label: "ADMIN_F_LOCKED", hint: "ADMIN_H_LOCKED" },
            { widget: "tags", path: "jobs", label: "ADMIN_F_JOBS", hint: "ADMIN_H_JOBS", placeholder: "ADMIN_P_JOBS" },
            { widget: "number", path: "distance", label: "ADMIN_F_DISTANCE", hint: "ADMIN_H_DISTANCE", min: 1, max: 15, step: 0.5, unit: "m" },
          ],
        },
      ],
    },
  ],
};

const panel = new AdminPanel(schema);
/** Doors from the panel, parsed again after every change; a new door starts in its default state. */
const content = { doors: readDoors(panel.get("doors")) };
aiLogChannels({ doors: { active: false } });

function seed(): void {
  for (const door of content.doors.values()) if (GlobalState[doorKey(door.id)] === undefined) GlobalState.set(doorKey(door.id), door.locked, true);
}
seed();
panel.onChange("doors", () => {
  content.doors = readDoors(panel.get("doors"));
  seed();
});

const mayUse = (source: number, jobs: string[]): boolean => jobs.length === 0 || (core.GetJobs(source) ?? []).some((m) => jobs.includes(m.job));

onClientCallback(EVENTS.toggle, { args: ([id]) => (typeof id === "string" ? [id] : null), lock: true }, (source, id) => {
  const door = content.doors.get(id);
  if (!door) return { ok: false, error: "DOOR_ERR_FAR" };
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  const c = centreOf(door);
  if (Math.hypot(x - c.x, y - c.y, z - c.z) > door.distance + 1.5) return { ok: false, error: "DOOR_ERR_FAR" };
  if (!mayUse(source, door.jobs)) return { ok: false, error: "DOOR_ERR_DENIED" };
  const locked = GlobalState[doorKey(id)] !== true;
  GlobalState.set(doorKey(id), locked, true);
  aiLog("doors", `${locked ? "locked" : "unlocked"} ${id}`, { source });
  return { ok: true, locked };
});

/** Exports (own and ox_doorlock's setDoorState / getDoor names). */
const setState = (id: unknown, locked: unknown) => {
  if (typeof id === "string" && content.doors.has(id)) GlobalState.set(doorKey(id), locked === true || locked === 1, true);
};
registerExport("SetDoorState", setState);
registerExport("IsLocked", (id: unknown) => typeof id === "string" && GlobalState[doorKey(id)] === true);
provideExport("ox_doorlock", "setDoorState", setState);
provideExport("ox_doorlock", "getDoor", (id: unknown) => {
  const door = typeof id === "string" ? content.doors.get(id) : undefined;
  return door ? { id: door.id, name: door.label, state: GlobalState[doorKey(door.id)] === true ? 1 : 0 } : null;
});
