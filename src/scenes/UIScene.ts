import Phaser from 'phaser';
import { QuestManager, Quest } from '../managers/QuestManager';
import { QuestHUD } from '../ui/QuestHUD';
import { TEXT_STYLES, UI_CONFIG } from '../ui/UIConstants';
import { InputEvents } from '../input/InputEvents';

export type UISceneInitData = {
  questManager: QuestManager;
  questsData: Record<string, Quest>;
  /** Scene key that owns the world (for returning to menu). */
  worldSceneKey?: string;
};

/**
 * Screen-space UI only — never follows the world camera.
 * Owns Quest HUD, chrome (menu button, version), resize layout.
 * Communicates with IslandScene via events only.
 */
export class UIScene extends Phaser.Scene {
  private questHUD?: QuestHUD;
  private backBtn?: Phaser.GameObjects.Text;
  private versionText?: Phaser.GameObjects.Text;
  private worldSceneKey = 'IslandScene';
  private questManager?: QuestManager;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: UISceneInitData): void {
    this.questManager = data.questManager;
    this.worldSceneKey = data.worldSceneKey ?? 'IslandScene';
  }

  create(data: UISceneInitData): void {
    const questManager = data.questManager ?? this.questManager;
    const questsData = data.questsData ?? {};

    if (!questManager) {
      console.error('[UIScene] Missing questManager — aborting UI');
      return;
    }

    // Independent camera: identity view so UI is screen-fixed
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);

    this.questHUD = new QuestHUD(this, questManager, questsData);

    this.createChrome();
    this.relayout();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);

    // World may emit input commands on the game-wide registry or world scene;
    // listen on this scene AND forward from world via events.
    this.events.on(InputEvents.OPEN_QUESTBOOK, this.onOpenQuestbook, this);
    this.events.on(InputEvents.CANCEL, this.onCancel, this);

    // Bridge: IslandScene emits on its own event bus — also listen on the world scene
    const world = this.scene.get(this.worldSceneKey);
    if (world) {
      world.events.on(InputEvents.OPEN_QUESTBOOK, this.onOpenQuestbook, this);
      world.events.on(InputEvents.CANCEL, this.onCancel, this);
    }

    if (import.meta.env.DEV) {
      console.log('[UIScene] ready (screen-fixed UI)');
    }
  }

  private createChrome(): void {
    this.backBtn = this.add
      .text(0, 0, '← Menu', {
        ...TEXT_STYLES.small,
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 8, y: 4 },
      })
      .setAlpha(0.85)
      .setScrollFactor(0)
      .setDepth(10002)
      .setInteractive({ useHandCursor: true });

    this.backBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.leaveToMenu();
    });

    this.versionText = this.add
      .text(0, 0, String(import.meta.env.GAME_VERSION ?? ''), {
        ...TEXT_STYLES.small,
        fontSize: '11px',
        color: '#888888',
      })
      .setScrollFactor(0)
      .setDepth(10002)
      .setAlpha(0.8);
  }

  private relayout = (): void => {
    const { width, height } = this.scale.gameSize;
    const margin = UI_CONFIG.MARGIN;

    if (this.backBtn) {
      this.backBtn.setPosition(
        Math.round(width - margin - this.backBtn.width),
        Math.round(margin / 2),
      );
    }

    if (this.versionText) {
      this.versionText.setPosition(Math.round(8), Math.round(height - 20));
    }

    this.questHUD?.resize();
  };

  private onOpenQuestbook(): void {
    this.questHUD?.toggleQuestbook();
  }

  private onCancel(): void {
    this.questHUD?.closeQuestbook();
  }

  private leaveToMenu(): void {
    this.scene.stop('UIScene');
    if (this.scene.isActive(this.worldSceneKey)) {
      this.scene.stop(this.worldSceneKey);
    }
    this.scene.start('MainMenuScene');
  }

  shutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this);
    this.events.off(InputEvents.OPEN_QUESTBOOK, this.onOpenQuestbook, this);
    this.events.off(InputEvents.CANCEL, this.onCancel, this);

    const world = this.scene.get(this.worldSceneKey);
    if (world) {
      world.events.off(InputEvents.OPEN_QUESTBOOK, this.onOpenQuestbook, this);
      world.events.off(InputEvents.CANCEL, this.onCancel, this);
    }

    this.questHUD?.shutdown();
    this.questHUD = undefined;
    this.backBtn?.destroy();
    this.versionText?.destroy();
  }
}
