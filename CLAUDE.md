# ai-doorlock

Door locks from the admin panel: door types (single, double, sliding, double sliding, garage / barrier), job access, the lock state shared with everyone. Depends on ai-core (jobs, prompts, admin panel).

## Decisions

- The lock state of each door is one GlobalState key `door:<id>` (shared state everyone needs); the server seeds it from the panel's "locked at start" and flips it after checking distance and jobs.
- A door record is `type` + `door` + `door2` (each `{ model, coords }`, model "" = not picked) + access fields. The type decides how many objects count (`door2` only for `double` / `doubleSliding`; other types ignore it) and how it locks (`common/doors.ts` `isDouble` / `isSwinging`). Same type set and lock behaviour as tgiann-doorlock (`normal` / `sliding` + one or two objects + automatic doors).
- Clients register every picked object in the game's door system (`AddDoorToSystem`, hash `ai-doorlock:<id>:<n>`, `client/doorSystem.ts`), so a lock holds even when the door is not streamed. Lock behaviour per type: swinging doors (single, double) stay unlocked until their open ratio is under 0.1, then snap shut and lock (forced after 15 s): locking an open swinging door freezes it open. Sliding doors and gates lock at once. Every type except garage gets `DoorSystemSetAutomaticRate` 1.0; garage doors and barriers keep the game's own rate (setting one stalls them).
- Each door is a lib `Points` entry at its centre (between both objects of a double type) whose label (lock / unlock) reads the lib `GlobalGroup` mirror of `door:<id>`; its `onChange` locks the door system and refreshes the point.
- The panel picks each object with the `entity` widget (free camera, the aimed door is outlined) on the nested paths `door.coords` / `door.model`. The picker writes the unsigned model hash as digits when the game has no name for a model: `modelHash` in `client/doorSystem.ts` reads both.
- Records in the shape before door types (`model` / `coords` / `model2` / `coords2`) are upgraded at server start (`upgradeOldDoors`, `panel.commit`).

## Contracts

- Callback: `resource/common/doors.ts`. GlobalState `door:<id>`. Exports `SetDoorState(id, locked)`, `IsLocked(id)`; `ox_doorlock` `setDoorState`, `getDoor`.

## Entry points

- Panel schema: `resource/server/schema.ts`. Server: `resource/server/index.ts`. Client: `resource/client/index.ts` (points, lock state), `resource/client/doorSystem.ts` (game door system).

## Pitfalls

- "Second door" shows only for the double types (`showIf` on the `door2` widget).
- The panel's `entity` widget has a teleport button that stands the admin on the floor at the door.
- A panel change removes every door from the door system and adds them back in the same frame; tgiann-doorlock found that a re-add in the same frame sometimes leaves a door unregistered (it waits a few frames). Not seen here yet.
- The Jobs field picks from the job list (`lookup: "job"`).
