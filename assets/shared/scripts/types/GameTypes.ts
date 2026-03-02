// ============================================================
// GameTypes.ts — All shared interfaces & enums
// ============================================================

export enum GameState {
    Boot     = 'Boot',
    Lobby    = 'Lobby',
    Gameplay = 'Gameplay',
    Pause    = 'Pause',
    Result   = 'Result',
}

export enum EnemyType {
    Melee  = 'melee',
    Ranged = 'ranged',
    Tank   = 'tank',
}

export enum UpgradeStat {
    Damage          = 'damage',
    FireRate        = 'fireRate',
    ProjectileCount = 'projectileCount',
    MoveSpeed       = 'moveSpeed',
    HPMax           = 'hpMax',
    ExpGain         = 'expGain',
}

// ---- State Machine ----

export interface IState {
    name: GameState;
    onEnter(prev: GameState | null): void;
    onExit(next: GameState): void;
    onUpdate(dt: number): void;
}

// ---- Player ----

export interface IPlayerStats {
    hpMax: number;
    hpCurrent: number;
    moveSpeed: number;
    damage: number;
    fireRate: number;           // shots per second
    projectileCount: number;
    expGain: number;            // multiplier (1.0 = baseline)
    expCurrent: number;
    expRequired: number;
    level: number;
    kills: number;
    survivalTime: number;
}

// ---- Enemy ----

export interface IEnemyDef {
    id: string;
    type: EnemyType;
    hp: number;
    moveSpeed: number;
    damage: number;
    expReward: number;
    fireRate?: number;          // Ranged only
    bulletSpeed?: number;       // Ranged only
    detectionRange?: number;
    attackRange: number;
    hitHalfW?: number;          // AABB half-width px, default 40
    hitHalfH?: number;          // AABB half-height px, default 22
}

// ---- Projectile ----

export interface IProjectileData {
    damage: number;
    speed: number;
    dirX: number;
    dirY: number;
    isPlayerOwned: boolean;
    maxRange: number;
    pierce: number;
}

// ---- Upgrade ----

export interface IUpgradeDef {
    id: string;
    stat: UpgradeStat;
    label: string;
    description: string;
    value: number;
    applyMode: 'add' | 'multiply';
    weight: number;
    maxStacks: number;          // -1 = unlimited
    iconKey: string;
}

// ---- Wave ----

export interface ISpawnEvent {
    time: number;               // seconds from wave trigger
    enemyType: EnemyType;
    count: number;
    spawnRadius: number;
}

export interface IWaveDef {
    waveId: number;
    triggerTime: number;        // game elapsed seconds
    spawnEvents: ISpawnEvent[];
}

// ---- Save ----

export interface ISaveData {
    volumeMaster: number;
    volumeSFX: number;
    volumeBGM: number;
    bestSurvivalTime: number;
    bestKillCount: number;
}

// ---- Object Pool ----

export interface IPoolable {
    onGetFromPool(): void;
    onReturnToPool(): void;
}

// ---- Game Result ----

export interface IGameResult {
    survivalTime: number;
    killCount: number;
    level: number;
    isNewBestTime: boolean;
    isNewBestKills: boolean;
}

// ---- Debug ----

export interface IDebugData {
    fps: number;
    enemyCount: number;
    bulletCount: number;
    poolSizes: { [poolName: string]: { active: number; free: number } };
}
