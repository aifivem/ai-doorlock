# ai-doorlock

Door locks from the admin panel: door types (single, double, sliding, double sliding, garage / barrier), job / gang access, the lock state shared with everyone. Depends on ai-core (jobs, prompts, admin panel).

## Decisions

- The lock state of each door is one GlobalState key `door:<id>` (shared state everyone needs); the server seeds a new door from the panel's "locked at start" (lib `RecordObjects` on the `AdminPanel`: an edited door keeps its lock), removes the key of a deleted door (and at start the keys of doors deleted while it was down), and flips it after checking distance and the door's access rule (lib `online.allows`). Every flip goes to every player: `toggle` is rated 2/s per player and each door flips at most every 500 ms (lib `KeyedCooldowns` by door id, `DOOR_ERR_BUSY`).
- Who may lock a door is the record's access fields (lib `ACCESS_FIELDS` / `readAccess`: `jobs`, `gangs`, `onDuty`); a locked door's point shows only to who passes them (`canShow` with lib `allows`, refreshed on `onMembershipChange`), the server decides with `online.allows` on the same rule.
- A door record is `type` + `door` + `door2` (each `{ model, coords }`, model "" = not picked) + lib access fields. The type decides how many objects count (`door2` only for `double` / `doubleSliding`; other types ignore it) and how it locks (`common/doors.ts` `isDouble` / `isSwinging`). Same type set and lock behaviour as tgiann-doorlock (`normal` / `sliding` + one or two objects + automatic doors).
- Clients register every picked object in the game's door system (`AddDoorToSystem`, hash `ai-doorlock:<id>:<n>`, `client/doorSystem.ts`), so a lock holds even when the door is not streamed. Doors are lib `RecordObjects`: an edited door removes and adds only its own objects and point. Lock behaviour per type: swinging doors (single, double) stay unlocked until their open ratio is under 0.1, then snap shut and lock (forced after 15 s): locking an open swinging door freezes it open. Sliding doors and gates lock at once. Every type except garage gets `DoorSystemSetAutomaticRate` 1.0; garage doors and barriers keep the game's own rate (setting one stalls them).
- Each door is a lib `Points` entry at its centre (between both objects of a double type) whose label (lock / unlock) reads the lib `GlobalGroup` mirror of `door:<id>`; its `onChange` locks the door system and refreshes the point. The prompt floats on the door like tgiann-doorlock's (`client/promptAt.ts`, lib `world` anchors): the middle of each leaf object's model box, riding the leaf as it swings, the leaf nearest the player shown. A door whose objects the game does not have (`GetClosestObjectOfType` finds none) has no prompt or target (`canShow`).
- Door system registration follows tgiann-doorlock: `AddDoorToSystem(..., true, true, true)` and state 4 (force locked) for the first frame; with all false the game's own entry for the object could keep one leaf of a double door unlocked (owner saw one leaf of double doors lock).
- The panel picks each object with the `entity` widget (free camera, the aimed door is outlined) on the nested paths `door.coords` / `door.model`. The picker writes the unsigned model hash as digits when the game has no name for a model: `modelHash` in `client/doorSystem.ts` reads both.
- Records in the shape before door types (`model` / `coords` / `model2` / `coords2`) are upgraded at server start (`upgradeOldDoors`, `panel.commit`).

## Contracts

- Callback: `resource/common/doors.ts`. GlobalState `door:<id>`. Exports `SetDoorState(id, locked)`, `IsLocked(id)`; it `provide`s ox_doorlock and answers its `setDoorState` and `getDoor` (a provided name takes effect after a full server start).

## Entry points

- Panel schema: `resource/server/schema.ts`. Server: `resource/server/index.ts`. Client: `resource/client/index.ts` (points, lock state), `resource/client/doorSystem.ts` (game door system).

## Pitfalls

- "Second door" shows only for the double types (`showIf` on the `door2` widget).
- The panel's `entity` widget has a teleport button that stands the admin on the floor at the door.
- An edited door is removed from the door system and added back in the same frame; tgiann-doorlock found that a re-add in the same frame sometimes leaves a door unregistered (it waits a few frames). Not seen here yet.
