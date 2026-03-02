// ============================================================
// VirtualJoystick.ts — Mobile touch joystick.
// Writes normalized Vec2 into PlayerController.joystickDir.
// ============================================================

import { _decorator, Component, Node, Vec2, v3, EventTouch,
         UITransform, Input } from 'cc';
import { PlayerController } from '../player/PlayerController';

const { ccclass, property } = _decorator;

@ccclass('VirtualJoystick')
export class VirtualJoystick extends Component {

    @property(Node)             stickNode:  Node             = null!;
    @property(PlayerController) controller: PlayerController = null!;
    @property                   radius:     number           = 80;

    private _touching:   boolean = false;
    private _touchId:    number  = -1;
    private _center:     Vec2    = new Vec2();
    private _dir:        Vec2    = new Vec2();
    private _stickOffset:Vec2    = new Vec2();

    onLoad(): void {
        this.node.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Input.EventType.TOUCH_MOVE,  this._onTouchMove,  this);
        this.node.on(Input.EventType.TOUCH_END,   this._onTouchEnd,   this);
        this.node.on(Input.EventType.TOUCH_CANCEL,this._onTouchEnd,   this);
    }

    onDestroy(): void {
        this.node.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE,  this._onTouchMove,  this);
        this.node.off(Input.EventType.TOUCH_END,   this._onTouchEnd,   this);
        this.node.off(Input.EventType.TOUCH_CANCEL,this._onTouchEnd,   this);
    }

    private _onTouchStart(evt: EventTouch): void {
        if (this._touching) return;
        const touch = evt.touch!;
        this._touching = true;
        this._touchId  = touch.getID();

        const uiLoc = touch.getUILocation();
        const uiPos = this.node.getComponent(UITransform)!
            .convertToNodeSpaceAR(v3(uiLoc.x, uiLoc.y, 0));
        this._center.set(uiPos.x, uiPos.y);
        this._stickOffset.set(0, 0);
        if (this.stickNode) this.stickNode.setPosition(0, 0, 0);
        evt.propagationStopped = true;
    }

    private _onTouchMove(evt: EventTouch): void {
        if (!this._touching) return;
        const touch = evt.touch!;
        if (touch.getID() !== this._touchId) return;

        const uiLoc = touch.getUILocation();
        const uiPos = this.node.getComponent(UITransform)!
            .convertToNodeSpaceAR(v3(uiLoc.x, uiLoc.y, 0));

        let dx = uiPos.x - this._center.x;
        let dy = uiPos.y - this._center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.radius) {
            dx = (dx / dist) * this.radius;
            dy = (dy / dist) * this.radius;
        }

        this._stickOffset.set(dx, dy);
        if (this.stickNode) this.stickNode.setPosition(dx, dy, 0);

        this._dir.set(dx / this.radius, dy / this.radius);
        if (this.controller) this.controller.joystickDir.set(this._dir);

        evt.propagationStopped = true;
    }

    private _onTouchEnd(evt: EventTouch): void {
        if (!this._touching) return;
        const touch = evt.touch!;
        if (touch.getID() !== this._touchId) return;

        this._touching = false;
        this._touchId  = -1;
        this._dir.set(0, 0);
        if (this.controller) this.controller.joystickDir.set(0, 0);
        if (this.stickNode) this.stickNode.setPosition(0, 0, 0);
        evt.propagationStopped = true;
    }
}
