import Phaser from 'phaser';
import { QuestManager, Quest } from '../managers/QuestManager';
import { QuestHUD } from '../ui/QuestHUD';
import { TEXT_STYLES, UI_CONFIG } from '../ui/UIConstants';
import { InputEvents } from '../input/InputEvents';
import { DeviceDetector } from '../input/DeviceDetector';
import { TouchButton } from '../ui/TouchButton';
import { getUIAnchors, TOUCH_TARGET_MIN } from '../ui/UIScale';

export type UISceneInitData = {
  questManager: QuestManager;
  questsData: Record<string, Quest>;
  worldSceneKey?: string;
};

/**
 * Screen-space UI — QuestHUD, chrome, mobile action buttons.
 * Layout only on RESIZE (no per-frame scaling).
 */
export class UIScene extends Phaser.Scene {
  private questHUD?: QuestHUD;
  private backBtn?: Phaser.GameObjects.Text;
  private versionText?: Phaser.GameObjects.Text;
  private interactBtn?: TouchButton;
  private questbookBtn?: TouchButton;
  private worldSceneKey = 'IslandScene';
  private questManager?: QuestManager;
  private showMobileControls = false;

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

    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);

    this.showMobileControls = DeviceDetector.isTouchCapable(this.game);

    this.questHUD = new QuestHUD(this, questManager, questsData);
    this.createChrome();
    this.createMobileControls();
    this.relayout();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);

    this.events.on(InputEvents.OPEN_QUESTBOOK, this.onOpenQuestbook, this);
    this.events.on(InputEvents.CANCEL, this.onCancel, this);

    const world = this.scene.get(this.worldSceneKey);
    if (world) {
      world.events.on(InputEvents.OPEN_QUESTBOOK, this.onOpenQuestbook, this);
      world.events.on(InputEvents.CANCEL, this.onCancel, this);
    }

    if (import.meta.env.DEV) {
      console.log('[UIScene] ready; mobile controls:', this.showMobileControls);
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

    this.backBtn.on(Phaser.Input.Events.POINTER_DOWN, () => this.leaveToMenu());

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

  private createMobileControls(): void {
    if (!this.showMobileControls) return;

    this.questbookBtn = new TouchButton(this, 0, 0, {
      label: 'Quests',
      width: 100,
      height: TOUCH_TARGET_MIN,
      onPress: () => this.onOpenQuestbook(),
    });

    this.interactBtn = new TouchButton(this, 0, 0, {
      label: 'Talk',
      width: 100,
      height: TOUCH_TARGET_MIN,
      onPress: () => this.emitInteractToWorld(),
    });
  }

  private emitInteractToWorld(): void {
    const world = this.scene.get(this.worldSceneKey);
    if (world) {
      world.events.emit(InputEvents.INTERACT);
    }
  }

  private relayout = (): void => {
    const { width, height } = this.scale.gameSize;
    const anchors = getUIAnchors(width, height);

    if (this.backBtn) {
      this.backBtn.setPosition(
        Math.round(anchors.topRight.x - this.backBtn.width),
        Math.round(anchors.topRight.y / 2),
      );
    }

    if (this.versionText) {
      this.versionText.setPosition(
        Math.round(UI_CONFIG.MARGIN / 2),
        Math.round(height - 18),
      );
    }

    // Action buttons bottom-right with spacing (Milestone 5.5)
    const gap = 12;
    if (this.interactBtn) {
      this.interactBtn.setPosition(
        Math.round(anchors.bottomRight.x - 50),
        Math.round(anchors.bottomRight.y - TOUCH_TARGET_MIN),
      );
      this.interactBtn.setVisible(this.showMobileControls);
    }
    if (this.questbookBtn) {
      this.questbookBtn.setPosition(
        Math.round(anchors.bottomRight.x - 50),
        Math.round(anchors.bottomRight.y - TOUCH_TARGET_MIN * 2 - gap),
      );
      this.questbookBtn.setVisible(this.showMobileControls);
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
    this.interactBtn?.destroy();
    this.questbookBtn?.destroy();
  }
}
