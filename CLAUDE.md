# ai-doorlock

Door locks from the admin panel: single and double doors, job access, the lock state shared with everyone. Depends on ai-core (jobs, prompts, admin panel).

## Decisions

- The lock state of each door is one GlobalState key `door:<id>` (shared state everyone needs); the server seeds it from the panel's "locked at start" and flips it after checking distance and jobs.
- Clients register every door in the game's door system (`AddDoorToSystem`, hash `ai-doorlock:<id>:<leaf>`), so a lock holds even when the door is not streamed, and follow the GlobalState change handler. Each door is a lib `Points` entry at its centre whose label (lock / unlock) is a function of the lock state the client keeps from the change handler (the bag still holds the old value there); a change refreshes the point.
- A door is found by its model and position; the panel asks for the model name (no door picker in the panel yet).

## Contracts

- Callback: `resource/common/doors.ts`. GlobalState `door:<id>`. Exports `SetDoorState(id, locked)`, `IsLocked(id)`; `ox_doorlock` `setDoorState`, `getDoor`.

## Entry points

- Server and panel schema: `resource/server/index.ts`. Client: `resource/client/index.ts`.
