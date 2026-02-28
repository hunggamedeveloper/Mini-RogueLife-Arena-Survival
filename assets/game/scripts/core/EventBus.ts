// ============================================================
// EventBus.ts — Typed singleton event system
// UI <-> Gameplay communicate exclusively through here.
// Using Map<string, Set<Function>> to prevent duplicate listeners
// and enable O(1) removal.
// ============================================================

type Callback<T = any> = (payload: T) => void;

class EventBusImpl {
    private _listeners: Map<string, Set<Callback>> = new Map();

    on<T>(event: string, cb: Callback<T>): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event)!.add(cb as Callback);
    }

    off<T>(event: string, cb: Callback<T>): void {
        this._listeners.get(event)?.delete(cb as Callback);
    }

    emit<T>(event: string, payload?: T): void {
        const set = this._listeners.get(event);
        if (!set) return;
        // Iterate over a snapshot to avoid issues if a callback calls off()
        for (const cb of Array.from(set)) {
            cb(payload);
        }
    }

    /** Remove all listeners for an event — use on scene unload */
    clear(event?: string): void {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }
}

export const EventBus = new EventBusImpl();
