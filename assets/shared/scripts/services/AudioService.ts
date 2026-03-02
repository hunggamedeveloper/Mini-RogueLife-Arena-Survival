// ============================================================
// AudioService.ts — Wraps Cocos AudioSource for BGM + SFX.
// Listen to EventBus audio events and play sounds.
// ============================================================

import { AudioClip, AudioSource, Node, resources, assetManager } from 'cc';
import { EventBus } from '../core/EventBus';
import { GameEvents } from '../types/EventTypes';
import { SaveService } from './SaveService';

class AudioServiceImpl {
    private _bgmSource: AudioSource | null = null;
    private _sfxSources: AudioSource[] = [];
    private _sfxIndex: number = 0;
    private readonly SFX_POOL_SIZE = 8;

    private _clips: Map<string, AudioClip> = new Map();
    private _eventsRegistered: boolean = false;

    /** Call once per scene after AudioSource nodes are ready */
    init(bgmNode: Node, sfxPoolNode: Node): void {
        this._bgmSource = bgmNode.getComponent(AudioSource) ?? bgmNode.addComponent(AudioSource);
        this._sfxSources = [];
        this._sfxIndex = 0;

        for (let i = 0; i < this.SFX_POOL_SIZE; i++) {
            const child = sfxPoolNode.children[i] ?? new Node(`sfx_${i}`);
            if (!child.parent) sfxPoolNode.addChild(child);
            const src = child.getComponent(AudioSource) ?? child.addComponent(AudioSource);
            this._sfxSources.push(src);
        }

        this._applyVolumes();
        if (!this._eventsRegistered) {
            this._registerEvents();
            this._eventsRegistered = true;
        }
    }

    preloadBundle(bundleName: string, keys: string[]): void {
        assetManager.loadBundle(bundleName, (err, bundle) => {
            // Skip silently — audio bundle chưa có trong project
            if (err) return;
            keys.forEach(key => {
                bundle.load(key, AudioClip, (e, clip) => {
                    // Skip — clip chưa có, audio sẽ bị bỏ qua
                    if (e) return;
                    this._clips.set(key, clip);
                });
            });
        });
    }

    private _registerEvents(): void {
        EventBus.on<{ key: string }>(GameEvents.AUDIO_PLAY_SFX, ({ key }) => this.playSFX(key));
        EventBus.on<{ key: string; loop: boolean }>(GameEvents.AUDIO_PLAY_BGM, ({ key, loop }) => this.playBGM(key, loop));
        EventBus.on(GameEvents.AUDIO_STOP_BGM, () => this.stopBGM());
        EventBus.on<{ master: number; sfx: number; bgm: number }>(
            GameEvents.AUDIO_SETTINGS_CHANGED,
            ({ master, sfx, bgm }) => {
                SaveService.setVolume(master, sfx, bgm);
                this._applyVolumes();
            }
        );
    }

    playBGM(key: string, loop: boolean = true): void {
        if (!this._bgmSource) return;
        const clip = this._clips.get(key);
        if (!clip) return; // Skip — BGM clip chưa được load
        this._bgmSource.clip = clip;
        this._bgmSource.loop = loop;
        this._bgmSource.play();
    }

    stopBGM(): void {
        this._bgmSource?.stop();
    }

    playSFX(key: string): void {
        const clip = this._clips.get(key);
        if (!clip) return; // Skip — SFX clip chưa được load
        const src = this._sfxSources[this._sfxIndex % this.SFX_POOL_SIZE];
        this._sfxIndex++;
        src.playOneShot(clip, SaveService.data.volumeSFX * SaveService.data.volumeMaster);
    }

    private _applyVolumes(): void {
        const d = SaveService.data;
        if (this._bgmSource) {
            this._bgmSource.volume = d.volumeBGM * d.volumeMaster;
        }
    }
}

export const AudioService = new AudioServiceImpl();
