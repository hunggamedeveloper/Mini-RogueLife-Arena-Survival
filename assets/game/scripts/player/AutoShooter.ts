// ============================================================
// AutoShooter.ts — Auto-fire targeting nearest enemy.
// Falls back to player movement direction when no enemies.
// Requests bullet spawn from PoolManager via EventBus.
// ============================================================

import { _decorator, Component, Vec2, Vec3 } from 'cc';
import { PlayerStats } from './PlayerStats';
import { PlayerController } from './PlayerController';
import { PoolManager } from '../pool/PoolManager';
import { GameState, IProjectileData } from '../../../shared/scripts/types/GameTypes';
import { GameEvents } from '../../../shared/scripts/types/EventTypes';
import { EventBus } from '../core/EventBus';
import { GameManager } from '../core/GameManager';
import { EnemyBase } from '../enemy/EnemyBase';

const { ccclass, property } = _decorator;

@ccclass('AutoShooter')
export class AutoShooter extends Component {

    @property(PlayerStats)      stats:      PlayerStats      = null!;
    @property(PlayerController) controller: PlayerController = null!;

    // Node to parent spawned bullets
    @property bulletParent: import('cc').Node = null!;

    private _cooldown: number = 0;

    update(dt: number): void {
        const gm = GameManager.instance;
        if (gm && gm.stateMachine.currentState !== GameState.Gameplay) return;

        this._cooldown -= dt;
        if (this._cooldown > 0) return;

        this._cooldown = 1 / this.stats.fireRate;
        this._fire();
    }

    private _fire(): void {
        const dir = this._getFireDirection();
        if (!dir) return;

        const count  = this.stats.projectileCount;
        const spread = count > 1 ? 15 : 0;     // degrees between projectiles

        for (let i = 0; i < count; i++) {
            const angle  = (i - (count - 1) / 2) * spread;
            const rad    = angle * Math.PI / 180;
            const cos    = Math.cos(rad);
            const sin    = Math.sin(rad);
            const rotDir = {
                x: dir.x * cos - dir.y * sin,
                y: dir.x * sin + dir.y * cos,
            };

            const projData: IProjectileData = {
                damage:        this.stats.damage,
                speed:         400,
                dirX:          rotDir.x,
                dirY:          rotDir.y,
                isPlayerOwned: true,
                maxRange:      600,
                pierce:        0,
            };

            const proj = PoolManager.instance?.get<import('../projectile/Projectile').Projectile>(
                'bulletPlayer',
                this.bulletParent,
            );
            if (proj) {
                proj.node.setWorldPosition(this.node.worldPosition);
                proj.init(projData);
            }
        }

        EventBus.emit(GameEvents.AUDIO_PLAY_SFX, { key: 'shoot' });
    }

    private _getFireDirection(): { x: number; y: number } | null {
        const nearest = this._findNearestEnemy();
        if (nearest) {
            const myPos  = this.node.worldPosition;
            const enPos  = nearest.node.worldPosition;
            const dx     = enPos.x - myPos.x;
            const dy     = enPos.y - myPos.y;
            const len    = Math.sqrt(dx * dx + dy * dy);
            if (len > 0) return { x: dx / len, y: dy / len };
        }

        // Fall back to movement direction
        const md = this.controller.moveDirection;
        if (md.lengthSqr() > 0.01) return { x: md.x, y: md.y };

        // Default: shoot right
        return { x: 1, y: 0 };
    }

    private _findNearestEnemy(): EnemyBase | null {
        const gm = GameManager.instance;
        if (!gm) return null;

        const enemies = gm.activeEnemies;
        if (!enemies || enemies.length === 0) return null;

        const myPos = this.node.worldPosition;
        let nearest: EnemyBase | null = null;
        let minDistSq = Infinity;

        for (const e of enemies) {
            if (!e.isValid || !e.node.active) continue;
            const ep = e.node.worldPosition;
            const dx = ep.x - myPos.x;
            const dy = ep.y - myPos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearest   = e;
            }
        }
        return nearest;
    }
}
