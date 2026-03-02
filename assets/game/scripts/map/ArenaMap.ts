// ============================================================
// ArenaMap.ts — Defines arena bounds and enforces them on the player.
// Enemies are allowed to go slightly beyond edge before wrapping.
// ============================================================

import { _decorator, Component, Node, Vec3, view } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ArenaMap')
export class ArenaMap extends Component {

    @property({ tooltip: 'Auto-detect bounds from visible screen size' })
    autoDetectBounds: boolean = true;

    @property({ tooltip: 'Manual half-width (used when autoDetect is off)' })
    halfWidth:  number = 800;

    @property({ tooltip: 'Manual half-height (used when autoDetect is off)' })
    halfHeight: number = 450;

    @property(Node) playerNode: Node = null!;

    private _min: Vec3 = new Vec3();
    private _max: Vec3 = new Vec3();

    onLoad(): void {
        if (this.autoDetectBounds) {
            const visibleSize = view.getVisibleSize();
            this.halfWidth  = visibleSize.width  / 2;
            this.halfHeight = visibleSize.height / 2;
        }
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

    /**
     * Returns a random point OUTSIDE the visible area from top, left, or right edges.
     * @param margin distance beyond the screen edge (default 80)
     */
    randomEdgePoint(margin: number = 80): { x: number; y: number } {
        const hw = this.halfWidth;
        const hh = this.halfHeight;

        // 0 = top, 1 = left, 2 = right (no bottom)
        const side = Math.floor(Math.random() * 3);
        switch (side) {
            // Top: above screen, random x spanning full width + margin
            case 0: return { x: (Math.random() * 2 - 1) * (hw + margin), y: hh + margin };
            // Left: left of screen, random y from bottom to top
            case 1: return { x: -(hw + margin), y: (Math.random() * 2 - 1) * hh };
            // Right: right of screen, random y from bottom to top
            default: return { x: hw + margin, y: (Math.random() * 2 - 1) * hh };
        }
    }

    isInsideBounds(x: number, y: number): boolean {
        return x >= this._min.x && x <= this._max.x &&
               y >= this._min.y && y <= this._max.y;
    }
}
