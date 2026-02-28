# MiniRogueLifeArenaSurvival

Game Rogue-lite survival top-down, phong cách Vampire Survivors. Người chơi tự động bắn, né tránh quái vật, thu thập EXP để lên level và chọn upgrade.

## Yêu cầu

- **Cocos Creator**: 3.8.2
- **Node.js**: >= 16 (để chạy Cocos CLI nếu cần)

## Cách chạy trong Editor

1. Mở Cocos Creator 3.8.2
2. Chọn **Open Project** → chọn thư mục này
3. Đợi editor import assets (lần đầu có thể mất 1-2 phút)
4. Mở scene `assets/core/scenes/Boot.scene`
5. Nhấn **Play** (▶) để chạy trong Preview

## Cách build Web

1. Trong editor: **Project → Build**
2. Platform: **Web Mobile** (hoặc Web Desktop)
3. Start Scene: `Boot`
4. Nhấn **Build** → **Run**

## Cách build Android (bonus)

1. Cài Android Studio + NDK
2. **Project → Build → Android**
3. Điền Package Name: `com.yourname.mrlas`
4. Nhấn **Build** → mở project Android Studio để build APK

## Kiến trúc

```
assets/
├── core/          [Bundle: "core"]     Boot + Lobby scenes, Settings UI
├── game/          [Bundle: "gameplay"] Toàn bộ gameplay scripts + prefabs + data
├── audio/         [Bundle: "audio"]    BGM + SFX
└── shared/        [Compile vào main]   Types, Services (không phải bundle)
```

### State Machine
```
Boot → Lobby → Gameplay ⇄ Pause → Result → Lobby
```

### Luồng giao tiếp
- **UI ↔ Gameplay**: Hoàn toàn qua `EventBus` — không có component nào gọi trực tiếp component khác qua scene hierarchy.
- **Data config**: `game/data/upgrades.json`, `enemies.json`, `waves.json` — không hardcode logic gameplay.

### Các module chính

| Module | File | Mô tả |
|---|---|---|
| EventBus | `game/scripts/core/EventBus.ts` | Map<string, Set<Callback>>, singleton |
| StateMachine | `game/scripts/core/StateMachine.ts` | IState interface, enter/exit/update |
| GameManager | `game/scripts/core/GameManager.ts` | Root singleton, điều phối state |
| ObjectPool | `game/scripts/pool/ObjectPool.ts` | Generic typed pool wrapper |
| PoolManager | `game/scripts/pool/PoolManager.ts` | Khởi tạo và quản lý tất cả pool |
| PlayerStats | `game/scripts/player/PlayerStats.ts` | Stats container + `applyUpgrade()` |
| PlayerController | `game/scripts/player/PlayerController.ts` | WASD + Virtual Joystick → Vec2 |
| AutoShooter | `game/scripts/player/AutoShooter.ts` | Tìm enemy gần nhất, auto-fire |
| EnemyBase | `game/scripts/enemy/EnemyBase.ts` | HP/death/EXP, subclass override onUpdate() |
| WaveManager | `game/scripts/wave/WaveManager.ts` | Timeline từ waves.json + difficulty curve |
| UpgradeManager | `game/scripts/upgrade/UpgradeManager.ts` | Weighted random 3 options, apply qua PlayerStats |
| SaveService | `shared/scripts/services/SaveService.ts` | localStorage: volume + best scores |
| DebugOverlay | `game/scripts/debug/DebugOverlay.ts` | FPS + enemy count + pool sizes (toggle: backtick) |

## Các điểm tối ưu đã làm

### Performance
- **Object Pooling** toàn bộ: bullet player/enemy (50 each), enemy melee (80), ranged (40), tank (20), VFX (30+20). Không bao giờ `Instantiate` trong gameplay.
- **Không allocate trong update loop**: Pre-allocate `Vec3` cho movement, snapshot array khi iterate EventBus listeners.
- **Pool container node** tách khỏi active render tree → giảm batching overhead.
- **EnemySpawner.\_pruneInactive()**: Dùng in-place swap thay vì `filter()` → không tạo array mới.

### Architecture
- **EventBus dùng Set** thay vì Array → O(1) removal, tránh duplicate listeners.
- **Data-driven hoàn toàn**: Thêm enemy type mới chỉ cần thêm entry JSON, không sửa code.
- **Dependency injection qua Inspector**: GameManager giữ ref đến sub-managers qua @property, tránh `getComponent` trong update.

### Asset Loading
- **Boot scene preload** cả `core` và `gameplay` bundle trước khi vào Lobby → vào gameplay không bị đơ.
- **Audio bundle** lazy load riêng, không block gameplay bundle.

## Nếu có thêm thời gian

- [ ] **Collision system chính xác hơn**: Dùng PhysicsSystem 2D của Cocos thay vì distance check thủ công — tránh bullet miss enemy nhỏ ở tốc độ cao.
- [ ] **Enemy AI nâng cao**: Pathfinding A* đơn giản để enemy không bị kẹt tường; formation spawning (bao vây).
- [ ] **Thêm upgrade types**: Shield (absorb X damage), Piercing bullets, Area explosion on kill, Magnet (auto-collect EXP orbs).
- [ ] **EXP orb visual**: Spawn orb prefab tại vị trí enemy chết, player di chuyển lại để nhặt — gameplay loop hấp dẫn hơn.
- [ ] **Boss wave**: Wave đặc biệt mỗi 60 giây với 1 enemy boss (HP × 10, size × 3, reward × 5).
- [ ] **Particle VFX**: Thay placeholder sprite VFX bằng Particle System của Cocos.
- [ ] **Leaderboard**: Gửi score lên Firebase Realtime DB hoặc PlayFab.
- [ ] **Controller support**: Gamepad input cho desktop/Android TV.
- [ ] **Localization**: i18n system đơn giản cho UI text.
- [ ] **Unit tests**: Test logic UpgradeManager weighted random, WaveManager timeline, PlayerStats.applyUpgrade().

## Cấu trúc file đầy đủ

```
assets/
├── core/                    [Bundle: core]
│   ├── scenes/Boot.scene, Lobby.scene
│   └── scripts/boot/BootScene.ts, lobby/LobbyScene.ts, SettingsPanel.ts
│
├── game/                    [Bundle: gameplay]
│   ├── scenes/Gameplay.scene
│   ├── scripts/
│   │   ├── core/GameManager.ts, StateMachine.ts, EventBus.ts
│   │   ├── player/PlayerController.ts, PlayerStats.ts, AutoShooter.ts
│   │   ├── enemy/EnemyBase.ts, EnemyMelee.ts, EnemyRanged.ts, EnemyTank.ts, EnemySpawner.ts
│   │   ├── projectile/Projectile.ts
│   │   ├── wave/WaveManager.ts
│   │   ├── upgrade/UpgradeManager.ts, UpgradePanel.ts
│   │   ├── pool/ObjectPool.ts, PoolManager.ts
│   │   ├── ui/GameplayHUD.ts, PausePanel.ts, ResultPanel.ts, VirtualJoystick.ts
│   │   ├── map/ArenaMap.ts
│   │   └── debug/DebugOverlay.ts
│   └── data/upgrades.json, enemies.json, waves.json
│
├── audio/                   [Bundle: audio]
│   ├── bgm/lobby_bgm.mp3, gameplay_bgm.mp3
│   └── sfx/shoot.mp3, hit.mp3, enemy_death.mp3, player_hurt.mp3, level_up.mp3
│
└── shared/                  [Compile vào main bundle]
    └── scripts/
        ├── types/GameTypes.ts, EventTypes.ts
        └── services/AudioService.ts, SaveService.ts, AnalyticsService.ts
```
