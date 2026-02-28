// ============================================================
// StateMachine.ts — Generic finite state machine
// Owns state transitions and calls enter/exit/update hooks.
// ============================================================

import { GameState, IState } from '../../../shared/scripts/types/GameTypes';
import { EventBus } from './EventBus';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';

export class StateMachine {
    private _states: Map<GameState, IState> = new Map();
    private _current: IState | null = null;

    get currentState(): GameState | null {
        return this._current?.name ?? null;
    }

    register(state: IState): void {
        this._states.set(state.name, state);
    }

    start(initial: GameState): void {
        const state = this._states.get(initial);
        if (!state) {
            console.error(`[StateMachine] State not registered: ${initial}`);
            return;
        }
        this._current = state;
        this._current.onEnter(null);
    }

    transition(to: GameState): void {
        if (!this._current) {
            console.error('[StateMachine] Not started yet');
            return;
        }
        const next = this._states.get(to);
        if (!next) {
            console.error(`[StateMachine] State not registered: ${to}`);
            return;
        }
        const from = this._current.name;
        this._current.onExit(to);
        this._current = next;
        this._current.onEnter(from);

        EventBus.emit(GameEvents.STATE_CHANGE, { from, to });
    }

    update(dt: number): void {
        this._current?.onUpdate(dt);
    }
}
