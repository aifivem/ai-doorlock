import { ACCESS_FIELDS, accessFields } from "@aicore-fivem/lib/shared";
import type { DataSpec, PanelSchema } from "@aicore-fivem/shared";
import { DOOR_TYPES } from "common/doors";

/** One door object: picked in the world, model "" until then. */
const leaf: DataSpec = {
  type: "object",
  fields: {
    model: { type: "text", min: 0, max: 64 },
    coords: { type: "vec3" },
  },
};
const unpicked = { model: "", coords: { x: 0, y: 0, z: 0 } };

/** ai-doorlock's panel: one record per door; its type says how many objects it has and how it locks. */
export const schema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "lock",
  files: {
    doors: {
      kind: "records",
      sync: "all",
      labelPath: "label",
      newRecord: {
        label: "",
        type: "single",
        door: unpicked,
        door2: unpicked,
        locked: true,
        jobs: [],
        gangs: [],
        distance: 2.5,
      },
      sections: {
        label: { type: "text", min: 1, max: 48 },
        type: { type: "enum", values: [...DOOR_TYPES] },
        door: leaf,
        door2: leaf,
        locked: { type: "bool" },
        ...ACCESS_FIELDS,
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
            {
              widget: "text",
              path: "label",
              label: "ADMIN_F_LABEL",
              placeholder: "ADMIN_P_LABEL",
            },
            {
              widget: "select",
              path: "type",
              label: "ADMIN_F_TYPE",
              hint: "ADMIN_H_TYPE",
              options: [
                { value: "single", label: "ADMIN_TYPE_SINGLE" },
                { value: "double", label: "ADMIN_TYPE_DOUBLE" },
                { value: "sliding", label: "ADMIN_TYPE_SLIDING" },
                { value: "doubleSliding", label: "ADMIN_TYPE_DOUBLE_SLIDING" },
                { value: "garage", label: "ADMIN_TYPE_GARAGE" },
              ],
            },
            {
              widget: "entity",
              path: "door.coords",
              modelPath: "door.model",
              label: "ADMIN_F_DOOR",
              hint: "ADMIN_H_DOOR",
            },
            {
              widget: "entity",
              path: "door2.coords",
              modelPath: "door2.model",
              label: "ADMIN_F_DOOR2",
              hint: "ADMIN_H_DOOR2",
              // Only the two-object types have a second door.
              showIf: { path: "type", values: ["double", "doubleSliding"] },
            },
          ],
        },
        {
          icon: "key",
          title: "ADMIN_C_ACCESS",
          desc: "ADMIN_C_ACCESS_DESC",
          fields: [
            {
              widget: "switch",
              path: "locked",
              label: "ADMIN_F_LOCKED",
              hint: "ADMIN_H_LOCKED",
            },
            ...accessFields(),
            {
              widget: "number",
              path: "distance",
              label: "ADMIN_F_DISTANCE",
              hint: "ADMIN_H_DISTANCE",
              min: 1,
              max: 15,
              step: 0.5,
              unit: "m",
            },
          ],
        },
      ],
    },
  ],
};
