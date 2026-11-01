import { AdminPanel } from "@aicore-fivem/lib/server";
import { record } from "@aicore-fivem/lib/shared";
import { schema } from "./schema";

export const panel = new AdminPanel(schema);

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
