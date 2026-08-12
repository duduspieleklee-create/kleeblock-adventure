import Phaser from 'phaser';
import { QuestManager } from '../managers/QuestManager';
import { GameState } from '../managers/GameState';

export type DebugOverlaySources = {
  getPlayerPos: () => { x: number; y: number };
  getFPS?: () => number;
  questManager?: QuestManager;
};

/**
 * Screen-space debug panel (DEV / ?debug=1 only).
 * Toggle with F1. Does not affect production builds when never constructed.
 */
export class DebugOverlay {
  private readonly scene: Phaser.Scene;
  private readonly sources: DebugOverlaySources;
  private container!: Phaser.GameObjects.Container;
  private text!: Phaser.GameObjects.Text;
  private visible = true;
  private keyF1?: Phaser.Input.Keyboard.Key;
  private keyF2?: Phaser.Input.Keyboard.Key;
  private keyF3?: Phaser.Input.Keyboard.Key;
  private collisionVisible = false;
  private onToggleCollision?: (show: boolean) => void;

  constructor(
    scene: Phaser.Scene,
    sources: DebugOverlaySources,
    opts?: { onToggleCollision?: (show: boolean) => void },
  ) {
    this.scene = scene;
    this.sources = sources;
    this.onToggleCollision = opts?.onToggleCollision;

    this.container = scene.add.container(8, 8).setScrollFactor(0).setDepth(20000);

    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.72);
    bg.fillRoundedRect(0, 0, 280, 160, 6);
    this.container.add(bg);

    this.text = scene.add
      .text(10, 8, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#aaffaa',
        lineSpacing: 4,
      })
      .setOrigin(0);
    this.container.add(this.text);

    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.keyF1 = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
      this.keyF2 = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2);
      this.keyF3 = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F3);
      this.keyF1.on('down', this.toggle, this);
      this.keyF2.on('down', this.toggleCollision, this);
      this.keyF3.on('down', this.resetQuests, this);
    }

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.refresh, this);
  }

  private toggle = (): void => {
    this.visible = !this.visible;
    this.container.setVisible(this.visible);
  };

  private toggleCollision = (): void => {
    this.collisionVisible = !this.collisionVisible;
    this.onToggleCollision?.(this.collisionVisible);
  };

  private resetQuests = (): void => {
    this.sources.questManager?.resetAllQuests();
    GameState.getInstance().reset();
    console.log('[Debug] Quests + GameState reset (reload scene for full clean spawn)');
  };

  private refresh = (): void => {
    if (!this.visible) return;

    const pos = this.sources.getPlayerPos();
    const fps = this.sources.getFPS?.() ?? Math.round(this.scene.game.loop.actualFps);
    const qm = this.sources.questManager;
    const active = qm?.getActiveQuests() ?? [];
    const completed = qm?.getCompletedQuests() ?? [];

    const lines = [
      'DEBUG  F1 hide · F2 collision · F3 reset quests',
      `pos  ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}`,
      `fps  ${fps}`,
      `quests active ${active.length}  done ${completed.length}`,
    ];

    for (const s of active.slice(0, 3)) {
      const counts = Object.entries(s.itemCounts ?? {})
        .map(([k, v]) => `${k}:${v}`)
        .join(' ');
      lines.push(`  · ${s.questId}${counts ? ` [${counts}]` : ''}`);
    }

    this.text.setText(lines.join('\n'));
  };

  shutdown(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.refresh, this);
    this.keyF1?.off('down', this.toggle, this);
    this.keyF2?.off('down', this.toggleCollision, this);
    this.keyF3?.off('down', this.resetQuests, this);
    this.container.destroy(true);
  }
}

/** True when debug tooling should load. */
export function isDebugMode(): boolean {
  if (import.meta.env.DEV) {
    try {
      const v = new URLSearchParams(window.location.search).get('debug');
      return v === '1' || v === 'true';
    } catch {
      return false;
    }
  }
  return false;
}
