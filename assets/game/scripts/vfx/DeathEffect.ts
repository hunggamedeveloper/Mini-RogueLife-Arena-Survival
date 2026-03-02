// ============================================================
// DeathEffect.ts — Poolable VFX that plays its Animation clip
// then auto-returns to pool when finished.
// Attach to DeathEffect prefab alongside Animation component.
// ============================================================

import { _decorator, Component, Animation } from 'cc';
import { IPoolable } from '../../../shared/scripts/types/GameTypes';
import { PoolManager } from '../pool/PoolManager';

const { ccclass } = _decorator;

@ccclass('DeathEffect')
export class DeathEffect extends Component implements IPoolable {

    private _anim: Animation | null = null;

    onLoad(): void {
        this._anim = this.getComponent(Animation);
        this._anim?.on(Animation.EventType.FINISHED, this._onAnimFinished, this);
    }

    onGetFromPool(): void {
        this._anim?.play();
    }

    onReturnToPool(): void {
        this._anim?.stop();
    }

    private _onAnimFinished(): void {
        PoolManager.instance?.put('deathEffect', this);
    }
}
