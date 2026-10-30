import { waitFor } from "@aicore-fivem/lib/shared";
import type { DoorType, Leaf } from "common/doors";

/** Close speed the game uses when a script set none. */
const CLOSE_RATE = 1.0;
/** Open ratio under which a swinging door counts as shut. */
const SHUT_RATIO = 0.1;
/** A swinging door still open after this long is locked anyway. */
const FORCE_LOCK_MS = 15_000;

/** A picked model: its name, or the unsigned hash the panel writes as digits for models without a name. */
const modelHash = (model: string): number =>
  /^\d+$/.test(model) ? Number(model) : GetHashKey(model);

const isShut = (hash: number): boolean =>
  Math.abs(DoorSystemGetOpenRatio(hash)) <= SHUT_RATIO;

function lockNow(hash: number): void {
  DoorSystemSetOpenRatio(hash, 0, false, true);
  DoorSystemSetDoorState(hash, 1, false, true);
}

/** The door objects this client holds in the game's door system (hash `ai-doorlock:<id>:<n>`). */
export class DoorSystem {
  private readonly registered = new Set<number>();
  /** Per object, the latest lock request: an older pending lock gives up. */
  private readonly requests = new Map<number, number>();

  add(name: string, leaf: Leaf, type: DoorType): void {
    const hash = GetHashKey(`ai-doorlock:${name}`);
    const { x, y, z } = leaf.coords;
    AddDoorToSystem(hash, modelHash(leaf.model), x, y, z, false, false, false);
    // Garage doors and barriers keep the game's own speed: setting one stalls them.
    if (type !== "garage")
      DoorSystemSetAutomaticRate(hash, CLOSE_RATE, false, false);
    this.registered.add(hash);
  }

  clear(): void {
    for (const hash of this.registered) {
      DoorSystemSetDoorState(hash, 0, false, true);
      RemoveDoorFromSystem(hash);
    }
    // `requests` is kept: a lock still waiting from before must not match a new request number.
    this.registered.clear();
  }

  /**
   * Sliding doors, gates and garage doors lock at once (they close by themselves). A swinging door locked while
   * open would freeze open: it stays unlocked until it has swung shut, then locks.
   */
  setLocked(name: string, locked: boolean, swinging: boolean): void {
    const hash = GetHashKey(`ai-doorlock:${name}`);
    const request = (this.requests.get(hash) ?? 0) + 1;
    this.requests.set(hash, request);
    if (!locked || !swinging) {
      DoorSystemSetDoorState(hash, locked ? 1 : 0, false, true);
      return;
    }
    if (isShut(hash)) return lockNow(hash);
    DoorSystemSetDoorState(hash, 0, false, true);
    const current = () =>
      this.requests.get(hash) === request && this.registered.has(hash);
    void waitFor(
      () => (!current() || isShut(hash) ? true : undefined),
      FORCE_LOCK_MS,
      100,
    )
      .catch(() => true)
      .then(() => {
        if (current()) lockNow(hash);
      });
  }
}
