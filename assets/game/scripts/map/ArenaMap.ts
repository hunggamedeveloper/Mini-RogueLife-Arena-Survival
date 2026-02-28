// ============================================================
// ArenaMap.ts — Defines arena bounds and enforces them on the player.
// Enemies are allowed to go slightly beyond edge before wrapping.
// ============================================================

import { _decorator, Component, Node, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ArenaMap')
export class ArenaMap extends Component {

    @property halfWidth:  number = 800;   // half-width  of playfield in world units
    @property halfHeight: number = 450;   // half-height of playfield in world units

    @property(Node) playerNode: Node = null!;

    private _min: Vec3 = new Vec3();
    private _max: Vec3 = new Vec3();

    onLoad(): void {
        Vec3.set(this._min, -this.halfWidth,  -this.halfHeight, 0);
        Vec3.set(this._max,  this.halfWidth,   this.halfHeight, 0);
    }

    update(_dt: number): void {
        if (!this.playerNode) return;
        const pos = this.playerNode.position;
        let x = pos.x;
        let y = pos.y;
        let clamped = false;

        if (x < this._min.x) { x = this._min.x; clamped = true; }
        if (x > this._max.x) { x = this._max.x; clamped = true; }
        if (y < this._min.y) { y = this._min.y; clamped = true; }
        if (y > this._max.y) { y = this._max.y; clamped = true; }

        if (clamped) {
            this.playerNode.setPosition(x, y, pos.z);
        }
    }

    /** Returns a random point on the edge of the arena at the given inset distance */
    randomEdgePoint(inset: number = 0): { x: number; y: number } {
        const side = Math.floor(Math.random() * 4);
        const hw   = this.halfWidth  - inset;
        const hh   = this.halfHeight - inset;
        switch (side) {
            case 0: return { x: (Math.random() * 2 - 1) * hw, y:  hh };
            case 1: return { x: (Math.random() * 2 - 1) * hw, y: -hh };
            case 2: return { x:  hw, y: (Math.random() * 2 - 1) * hh };
            default:return { x: -hw, y: (Math.random() * 2 - 1) * hh };
        }
    }

    isInsideBounds(x: number, y: number): boolean {
        return x >= this._min.x && x <= this._max.x &&
               y >= this._min.y && y <= this._max.y;
    }
}
