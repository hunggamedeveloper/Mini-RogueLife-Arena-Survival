// ============================================================
// PlayerController.ts — Input abstraction layer.
// Reads WASD (web) and VirtualJoystick (mobile), produces
// a normalized Vec2 movement direction each frame.
// ============================================================

import { _decorator, Component, Vec2, Vec3, input, Input, KeyCode, EventKeyboard } from 'cc';
import { PlayerStats } from './PlayerStats';
import { GameState } from '../../../shared/scripts/types/GameTypes';
import { GameManager } from '../core/GameManager';

const { ccclass, property } = _decorator;

@ccclass('PlayerController')
export class PlayerController extends Component {

    @property(PlayerStats) stats: PlayerStats = null!;

    // Injected by VirtualJoystick when on mobile
    joystickDir: Vec2 = new Vec2(0, 0);

    private _keyDir: Vec2 = new Vec2(0, 0);
    private _keysDown: Set<KeyCode> = new Set();
    private _moveDir: Vec2 = new Vec2(0, 0);

    onLoad(): void {
        input.on(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.on(Input.EventType.KEY_UP,   this._onKeyUp,   this);
    }

    onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this._onKeyDown, this);
        input.off(Input.EventType.KEY_UP,   this._onKeyUp,   this);
    }

    update(dt: number): void {
        const gm = GameManager.instance;
        if (gm && gm.stateMachine.currentState !== GameState.Gameplay) return;

        this._computeKeyDir();

        // Joystick overrides keyboard if magnitude > 0
        if (this.joystickDir.lengthSqr() > 0.01) {
            this._moveDir.set(this.joystickDir);
        } else {
            this._moveDir.set(this._keyDir);
        }

        if (this._moveDir.lengthSqr() > 0.001) {
            this._moveDir.normalize();
            const speed = this.stats.moveSpeed;
            const pos   = this.node.position;
            this.node.setPosition(
                pos.x + this._moveDir.x * speed * dt,
                pos.y + this._moveDir.y * speed * dt,
                pos.z,
            );
        }
    }

    get moveDirection(): Readonly<Vec2> { return this._moveDir; }

    private _computeKeyDir(): void {
        let x = 0;
        let y = 0;
        if (this._keysDown.has(KeyCode.KEY_A) || this._keysDown.has(KeyCode.ARROW_LEFT))  x -= 1;
        if (this._keysDown.has(KeyCode.KEY_D) || this._keysDown.has(KeyCode.ARROW_RIGHT)) x += 1;
        if (this._keysDown.has(KeyCode.KEY_W) || this._keysDown.has(KeyCode.ARROW_UP))    y += 1;
        if (this._keysDown.has(KeyCode.KEY_S) || this._keysDown.has(KeyCode.ARROW_DOWN))  y -= 1;
        this._keyDir.set(x, y);
    }

    private _onKeyDown(evt: EventKeyboard): void {
        this._keysDown.add(evt.keyCode);
    }

    private _onKeyUp(evt: EventKeyboard): void {
        this._keysDown.delete(evt.keyCode);
    }
}
