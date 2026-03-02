# MiniRogueLifeArenaSurvival

Game Rogue-lite survival top-down, phong cách Vampire Survivors. Người chơi tự động bắn, né tránh quái vật, thu thập EXP để lên level và chọn upgrade.

## Yêu cầu

- **Cocos Creator**: 3.8.2
- **Node.js**: >= 16 (để chạy Cocos CLI nếu cần)

## Cách chạy trong Editor

1. Mở Cocos Creator 3.8.2
2. Chọn **Open Project** → chọn thư mục này
3. Đợi editor import assets (lần đầu có thể mất 1-2 phút)
4. Mở scene `assets/start/Start.scene`
5. Nhấn **Play** (▶) để chạy trong Preview

## Cách build Web

### Cách 1: Qua Editor UI

1. Trong editor: **Project → Build**
2. Platform: **Web Mobile** (hoặc Web Desktop)
3. Start Scene: `Start`
4. Thêm tất cả scenes vào build: `Start`, `Boot`, `Lobby`, `Gameplay`
5. Nhấn **Build** → **Run**
6. Mở browser tại `http://localhost:7456` (hoặc port hiển thị)

### Cách 2: Qua CLI (không cần mở editor)

```bash
# Build Web Mobile
/Applications/Cocos/Creator/3.8.2/CocosCreator.app/Contents/MacOS/CocosCreator \
  --project /path/to/MiniRogueLifeArenaSurvival \
  --build "platform=web-mobile;buildPath=build"

# Kết quả build nằm trong: build/web-mobile/
# Mở file index.html hoặc serve bằng http-server
npx http-server build/web-mobile -p 8080
```

### Build output

```
build/
└── web-mobile/
    ├── index.html          ← Entry point
    ├── application.js
    ├── assets/             ← Bundled assets (core, gameplay, audio)
    └── cocos-js/           ← Engine runtime
```

## Cách build Android (bonus)

1. Cài Android Studio + NDK
2. **Project → Build → Android**
3. Điền Package Name: `com.yourname.mrlas`
4. Nhấn **Build** → mở project Android Studio để build APK

## Kiến trúc

```
assets/
├── start/         [Main bundle]        Start scene — load bundles, entry point
├── core/          [Bundle: "core"]     Boot + Lobby + Gameplay scenes, Settings UI
├── game/          [Bundle: "gameplay"] Gameplay scripts + prefabs + data
├── audio/         [Bundle: "audio"]    BGM + SFX
└── shared/        [Compile vào main]   EventBus, Types, Services (không phải bundle)
```

### State Machine
```
Start → Boot → Lobby → Gameplay ⇄ Pause → Result → Lobby
```

### Luồng giao tiếp
- **UI ↔ Gameplay**: Hoàn toàn qua `EventBus` — không có component nào gọi trực tiếp component khác qua scene hierarchy.
- **Data config**: `game/data/upgrades.json`, `enemies.json`, `waves.json` — không hardcode logic gameplay.

### Các module chính

| Module | File | Mô tả |
|---|---|---|
| EventBus | `shared/scripts/core/EventBus.ts` | Map<string, Set<Callback>>, singleton + `playing` flag |
| StateMachine | `game/scripts/core/StateMachine.ts` | IState interface, enter/exit/update |
| GameManager | `game/scripts/core/GameManager.ts` | Root singleton, state + collision loop |
| ObjectPool | `game/scripts/pool/ObjectPool.ts` | Generic typed pool, componentName lookup |
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
- **Collision loop tập trung**: `GameManager._checkCollisions()` xử lý toàn bộ bullet↔enemy và bullet↔player mỗi frame — dùng reusable cache arrays (`_bulletCache`, `_enemyBulletCache`) thay vì allocate mới.
- **Không allocate trong update loop**: Pre-allocate `Vec3` cho movement, snapshot array khi iterate EventBus listeners, reuse collision arrays.
- **Pool container node** tách khỏi active render tree → giảm batching overhead.
- **EnemySpawner.\_pruneInactive()**: Dùng in-place swap thay vì `filter()` → không tạo array mới.
- **ObjectPool.get()** lookup component bằng `componentName` (truyền lúc khởi tạo) thay vì `node.name`.

### Architecture
- **EventBus ở shared/** (ngoài mọi bundle): `core/` và `game/` bundle đều import được — tránh circular bundle dependency.
- **EventBus.playing flag**: Global pause control — tất cả gameplay components check `EventBus.playing` trước khi xử lý logic, đơn giản hóa pause/resume.
- **EventBus dùng Set** thay vì Array → O(1) removal, tránh duplicate listeners.
- **UI Panel visibility pattern**: Không dùng `this.node.active = false` trên script có `EventBus.on()`. Thay vào đó toggle `content` child node → tránh mất event listeners khi node bị disable.
- **Data-driven hoàn toàn**: Thêm enemy type mới chỉ cần thêm entry JSON, không sửa code.
- **Dependency injection qua Inspector**: GameManager giữ ref đến sub-managers qua @property, tránh `getComponent` trong update.
- **Upgrade panel pause riêng**: `UI_UPGRADE_PANEL_OPEN/CLOSE` tạm dừng gameplay time mà không cần transition sang Pause state.

### Asset Loading
- **Start scene** (ngoài bundle) là entry point — load `core` + `gameplay` bundle → chuyển vào Boot scene. Giải quyết limitation "scene trong bundle không thể set làm Start Scene".
- **Boot scene** init services (SaveService) → chuyển vào Lobby.
- **Audio bundle** lazy load riêng, không block gameplay bundle.

## Nếu có thêm thời gian

- [ ] **Collision system chính xác hơn**: Dùng PhysicsSystem 2D của Cocos thay vì AABB distance check thủ công — tránh bullet miss enemy nhỏ ở tốc độ cao.
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
├── start/                   [Main bundle — Build Start Scene]
│   ├── Start.scene
│   └── scripts/Start.ts         ← Load core+gameplay bundles → Boot
│
├── core/                    [Bundle: core]
│   ├── scenes/Boot.scene, Lobby.scene, Gameplay.scene
│   └── scripts/boot/BootScene.ts, lobby/LobbyScene.ts, SettingsPanel.ts
│
├── game/                    [Bundle: gameplay]
│   ├── scripts/
│   │   ├── core/GameManager.ts, StateMachine.ts
│   │   ├── player/PlayerController.ts, PlayerStats.ts, AutoShooter.ts
│   │   ├── enemy/EnemyBase.ts, EnemyMelee.ts, EnemyRanged.ts, EnemyTank.ts, EnemySpawner.ts
│   │   ├── projectile/Projectile.ts
│   │   ├── wave/WaveManager.ts
│   │   ├── upgrade/UpgradeManager.ts, UpgradePanel.ts
│   │   ├── pool/ObjectPool.ts, PoolManager.ts
│   │   ├── ui/GameplayHUD.ts, PausePanel.ts, ResultPanel.ts, VirtualJoystick.ts
│   │   ├── map/ArenaMap.ts
│   │   └── debug/DebugOverlay.ts
│   ├── prefabs/player/, enemy/, vfx/
│   └── data/upgrades.json, enemies.json, waves.json
│
├── audio/                   [Bundle: audio]
│   ├── bgm/
│   └── sfx/
│
└── shared/                  [Compile vào main bundle]
    └── scripts/
        ├── core/EventBus.ts
        ├── types/GameTypes.ts, EventTypes.ts
        └── services/AudioService.ts, SaveService.ts, AnalyticsService.ts
```
