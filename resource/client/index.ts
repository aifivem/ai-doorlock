import { AdminWorld, hidePrompt, loadLocaleTexts, notify, onPromptPressed, showPrompt, triggerServerCallback, Zones } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { centreOf, doorKey, EVENTS, readDoors, type Door } from "common/doors";

const world = new AdminWorld(["doors"]);
const texts = loadLocaleTexts();
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * Doors on this client: registered in the game's door system (so the lock holds even when the door is not streamed),
 * a zone each showing ai-core's prompt, and the lock state from GlobalState (set at join, changes as they come).
 */
class Doors {
  private readonly zones = new Zones();
  private list = new Map<string, Door>();
  private registered: number[] = [];

  rebuild(): void {
    for (const hash of this.registered) RemoveDoorFromSystem(hash);
    this.registered = [];
    this.zones.clear();
    this.list = readDoors(world.get("doors"));
    for (const door of this.list.values()) {
      if (!door.model) continue;
      this.register(`${door.id}:1`, door.model, door.coords);
      if (door.model2) this.register(`${door.id}:2`, door.model2, door.coords2);
      this.apply(door.id, GlobalState[doorKey(door.id)] === true);
      const id = `door:${door.id}`;
      this.zones.add(id, {
        shape: { type: "sphere", center: centreOf(door), radius: door.distance },
        interval: 500,
        onEnter: () => this.prompt(door.id),
        onExit: () => hidePrompt(id),
      });
    }
  }

  private register(name: string, model: string, at: { x: number; y: number; z: number }): void {
    const hash = GetHashKey(`ai-doorlock:${name}`);
    AddDoorToSystem(hash, GetHashKey(model), at.x, at.y, at.z, false, false, false);
    this.registered.push(hash);
  }

  apply(id: string, locked: boolean): void {
    const door = this.list.get(id);
    if (!door) return;
    for (const leaf of door.model2 ? ["1", "2"] : ["1"]) DoorSystemSetDoorState(GetHashKey(`ai-doorlock:${id}:${leaf}`), locked ? 1 : 0, false, false);
  }

  prompt(id: string): void {
    const door = this.list.get(id);
    if (door) showPrompt(`door:${id}`, Locale(GlobalState[doorKey(id)] === true ? "DOOR_PROMPT_UNLOCK" : "DOOR_PROMPT_LOCK", door.label));
  }
}

const doors = new Doors();
doors.rebuild();
world.onChange("doors", () => doors.rebuild());

AddStateBagChangeHandler("", "global", (_bag: string, key: string, value: unknown) => {
  if (!key.startsWith("door:")) return;
  const id = key.slice(5);
  doors.apply(id, value === true);
  doors.prompt(id);
});

onPromptPressed((id) => {
  if (!id.startsWith("door:")) return;
  void triggerServerCallback(EVENTS.toggle, [id.slice(5)])
    .catch(() => null)
    .then((r) => {
      if (!(isObj(r) && r.ok === true)) {
        const key = isObj(r) && typeof r.error === "string" ? r.error : "DOOR_ERR_FAR";
        notify(texts[key] ?? key, "error", 2500);
      }
    });
});
