import Phaser from 'phaser';
import { QuestManager, Quest } from '../managers/QuestManager';

/**
 * Quest HUD with fully dynamic, crisp sizing.
 *
 * Rule: never scale a container that holds text.
 * Instead, derive all positions and sizes from viewport dimensions,
 * round to whole pixels, and rebuild elements when the viewport changes.
 */
export class QuestHUD {
  private readonly scene: Phaser.Scene;
  private readonly questManager: QuestManager;
  private readonly questsData: Record<string, Quest>;

  private trackerContainer!: Phaser.GameObjects.Container;
  private bookIcon!: Phaser.GameObjects.Container;
  private questLogContainer?: Phaser.GameObjects.Container;

  private isLogOpen = false;
  private toggleKey?: Phaser.Input.Keyboard.Key;
  private trackerChildren: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, questManager: QuestManager, questsData: Record<string, Quest>) {
    this.scene = scene;
    this.questManager = questManager;
    this.questsData = questsData;

    this.createTracker();
    this.createBookIcon();
    this.setupInput();
    this.setupEventListeners();
    this.refresh();
  }

  // =========================================================================
  // VIEWPORT HELPERS
  // =========================================================================

  private get refW(): number { return this.scene.cameras.main.width; }
  private get refH(): number { return this.scene.cameras.main.height; }

  /**
   * Scale factor relative to a 480×360 reference.
   * Values are clamped and rounded so we never leave fractional pixels.
   */
  private scale(v: number): number {
    const ref = 480;
    const raw = Math.max(0.5, Math.min(1.1, Math.min(this.refW, this.refH) / ref)) * v;
    return Math.round(raw);
  }

  // =========================================================================
  // LEFT TRACKER
  // =========================================================================

  private createTracker(): void {
    this.trackerContainer = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(9998);

    this.positionTracker();
  }

  private positionTracker(): void {
    const padX = this.scale(6);
    const padY = this.scale(6);
    const topY = padY + this.scale(8);

    this.trackerContainer.setPosition(padX, topY);
  }

  private refresh(): void {
    for (const child of this.trackerChildren) {
      this.trackerContainer.remove(child, true);
    }
    this.trackerChildren = [];

    const w = this.trackerWidth();
    const h = this.trackerHeight();
    const cx = w / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0xf5e6c8, 0.95);
    bg.fillRoundedRect(0, 0, w, h, this.scale(3));
    bg.lineStyle(this.scale(1), 0x8b6914, 1);
    bg.strokeRoundedRect(0, 0, w, h, this.scale(3));
    this.trackerContainer.add(bg);
    this.trackerChildren.push(bg);

    const header = this.scene.add.text(cx, this.scale(6), 'Active', {
      fontFamily: 'monospace',
      fontSize: `${this.scale(9)}px`,
      color: '#5c4033',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.trackerContainer.add(header);
    this.trackerChildren.push(header);

    const active = this.questManager.getActiveQuests();

    if (active.length === 0) {
      const t = this.scene.add.text(cx, this.scale(24), 'No active\nquests', {
        fontFamily: 'monospace',
        fontSize: `${this.scale(8)}px`,
        color: '#8b6914',
        align: 'center',
      }).setOrigin(0.5);
      this.trackerContainer.add(t);
      this.trackerChildren.push(t);
    } else {
      const status = active[0];
      const quest = this.questsData[status.questId];
      if (quest) {
        const title = this.scene.add.text(cx, this.scale(16), quest.title, {
          fontFamily: 'monospace',
          fontSize: `${this.scale(8)}px`,
          color: '#3d2914',
          fontStyle: 'bold',
          wordWrap: { width: w - this.scale(10) },
          align: 'center',
        }).setOrigin(0.5, 0);
        this.trackerContainer.add(title);
        this.trackerChildren.push(title);

        const currentObj = quest.objectives.find((o) => !status.objectives[o.id]);
        if (currentObj) {
          const objText = this.scene.add.text(cx, this.scale(30), `→ ${currentObj.description}`, {
            fontFamily: 'monospace',
            fontSize: `${this.scale(7)}px`,
            color: '#5c4033',
            wordWrap: { width: w - this.scale(10) },
            align: 'center',
          }).setOrigin(0.5, 0);
          this.trackerContainer.add(objText);
          this.trackerChildren.push(objText);
        }
      }
    }

    const hint = this.scene.add.text(cx, h - this.scale(8), 'Q / book', {
      fontFamily: 'monospace',
      fontSize: `${this.scale(7)}px`,
      color: '#8b6914',
      fontStyle: 'italic',
    }).setOrigin(0.5);
    this.trackerContainer.add(hint);
    this.trackerChildren.push(hint);

    this.positionTracker();
  }

  private trackerWidth(): number {
    const narrow = this.refW < this.refH;
    if (narrow) {
      return Math.min(this.refW - this.scale(12), this.scale(150));
    }
    return this.scale(110);
  }

  private trackerHeight(): number {
    const narrow = this.refW < this.refH;
    if (narrow) {
      return this.scale(30);
    }
    return this.scale(60);
  }

  // =========================================================================
  // BOOK ICON
  // =========================================================================

  private createBookIcon(): void {
    this.bookIcon = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(9999)
      .setInteractive(new Phaser.Geom.Rectangle(-10, -12, 20, 24), Phaser.Geom.Rectangle.Contains);

    this.rebuildBookIcon();

    this.bookIcon.on('pointerover', () => this.hoverBookIcon(true));
    this.bookIcon.on('pointerout', () => this.hoverBookIcon(false));
    this.bookIcon.on('pointerdown', () => this.toggleQuestLog());
  }

  private hoverBookIcon(over: boolean): void {
    // Slight visual feedback without scaling the text-bearing container.
    const icon = this.bookIcon.getAt(0) as Phaser.GameObjects.Graphics | undefined;
    if (icon) {
      icon.clear();
      const factor = over ? 1.15 : 1;
      const w = Math.round(this.scale(14) * factor);
      const h = Math.round(this.scale(18) * factor);
      bookBg(icon, w, h);
    }
    this.positionBookIcon();
  }

  private rebuildBookIcon(): void {
    this.bookIcon.removeAll(true);

    const w = this.scale(14);
    const h = this.scale(18);

    const icon = this.scene.add.graphics();
    bookBg(icon, w, h);
    this.bookIcon.add(icon);

    this.positionBookIcon();
  }

  private positionBookIcon(): void {
    const cam = this.scene.cameras.main;
    const margin = this.scale(8);
    const iconW = this.scale(12);
    const y = this.scale(22);

    this.bookIcon.setPosition(cam.width - margin - iconW / 2, y);
  }

  // =========================================================================
  // INPUT / EVENTS
  // =========================================================================

  private setupInput(): void {
    const keyboard = this.scene.input.keyboard;
    if (keyboard) {
      this.toggleKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
      this.toggleKey.on('down', this.toggleQuestLog, this);
    }
  }

  private setupEventListeners(): void {
    this.questManager.on('questStarted', () => this.refresh());
    this.questManager.on('objectiveCompleted', () => this.refresh());
    this.questManager.on('questCompleted', (data: any) => {
      this.showQuestCompletedNotification(data.quest);
      this.refresh();
    });
  }

  // =========================================================================
  // QUESTBOOK MODAL
  // =========================================================================

  private toggleQuestLog(): void {
    this.isLogOpen = !this.isLogOpen;
    if (this.isLogOpen) this.showQuestLog();
    else this.hideQuestLog();
  }

  private showQuestLog(): void {
    this.hideQuestLog();

    const cam = this.scene.cameras.main;
    const margin = this.scale(8);

    const maxW = cam.width - margin * 2;
    const maxH = cam.height - margin * 2;
    const bookW = Math.max(this.scale(180), Math.min(maxW, this.scale(280)));
    const bookH = Math.max(this.scale(110), Math.min(maxH, this.scale(180)));

    this.questLogContainer = this.scene.add
      .container(cam.width / 2, cam.height / 2)
      .setScrollFactor(0)
      .setDepth(10000);

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(-cam.width / 2, -cam.height / 2, cam.width, cam.height);
    this.questLogContainer.add(overlay);

    const book = this.scene.add.graphics();
    book.fillStyle(0xf5e6c8, 0.98);
    book.fillRoundedRect(-bookW / 2, -bookH / 2, bookW, bookH, this.scale(5));
    book.lineStyle(this.scale(1.5), 0x8b6914, 1);
    book.strokeRoundedRect(-bookW / 2, -bookH / 2, bookW, bookH, this.scale(5));
    book.lineStyle(this.scale(1), 0x5c4033, 0.4);
    book.lineBetween(0, -bookH / 2 + this.scale(6), 0, bookH / 2 - this.scale(6));
    this.questLogContainer.add(book);

    const contentPad = this.scale(8);
    const pageW = Math.max(1, bookW / 2 - contentPad * 2);

    const activeQuests = this.questManager.getActiveQuests();
    const completed = this.questManager.getCompletedQuests();

    const first = activeQuests[0];
    const detailQuest = first ? this.questsData[first.questId] : null;

    const leftX = -bookW / 2 + contentPad;
    let y = -bookH / 2 + contentPad;

    const addLeft = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle) => {
      const t = this.scene.add.text(Math.round(leftX), Math.round(y), text, style).setOrigin(0);
      this.questLogContainer!.add(t);
      y += this.scale(12);
    };

    addLeft('Active', { fontFamily: 'monospace', fontSize: `${this.scale(9)}px`, color: '#5c4033', fontStyle: 'bold' });

    if (activeQuests.length === 0) {
      addLeft('None', { fontFamily: 'monospace', fontSize: `${this.scale(8)}px`, color: '#8b6914' });
    } else {
      for (const qs of activeQuests) {
        const q = this.questsData[qs.questId];
        if (!q) continue;
        addLeft(`* ${q.title}`, { fontFamily: 'monospace', fontSize: `${this.scale(8)}px`, color: '#3d2914', wordWrap: { width: Math.round(pageW) } });
      }
    }

    y += this.scale(4);
    addLeft('Completed', { fontFamily: 'monospace', fontSize: `${this.scale(9)}px`, color: '#5c4033', fontStyle: 'bold' });

    if (completed.length === 0) {
      addLeft('None yet', { fontFamily: 'monospace', fontSize: `${this.scale(8)}px`, color: '#8b6914' });
    } else {
      for (const qs of completed) {
        const q = this.questsData[qs.questId];
        if (!q) continue;
        addLeft(`+ ${q.title}`, { fontFamily: 'monospace', fontSize: `${this.scale(8)}px`, color: '#2e7d32', wordWrap: { width: Math.round(pageW) } });
      }
    }

    const rightX = contentPad;
    y = -bookH / 2 + contentPad;

    const addRight = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle) => {
      const t = this.scene.add.text(Math.round(rightX), Math.round(y), text, style).setOrigin(0);
      this.questLogContainer!.add(t);
      y += this.scale(12);
    };

    if (detailQuest) {
      addRight(detailQuest.title, { fontFamily: 'monospace', fontSize: `${this.scale(9)}px`, color: '#3d2914', fontStyle: 'bold', wordWrap: { width: Math.round(pageW) } });
      if (detailQuest.description) {
        addRight(detailQuest.description, { fontFamily: 'monospace', fontSize: `${this.scale(8)}px`, color: '#5c4033', wordWrap: { width: Math.round(pageW) } });
      }
      addRight('Objectives', { fontFamily: 'monospace', fontSize: `${this.scale(9)}px`, color: '#5c4033', fontStyle: 'bold' });
      for (const obj of detailQuest.objectives) {
        const done = first.objectives[obj.id];
        const mark = done ? '+' : 'o';
        const color = done ? '#2e7d32' : '#5c4033';
        addRight(`${mark} ${obj.description}`, { fontFamily: 'monospace', fontSize: `${this.scale(8)}px`, color, wordWrap: { width: Math.round(pageW) } });
      }
    } else {
      addRight('No active quest', { fontFamily: 'monospace', fontSize: `${this.scale(8)}px`, color: '#8b6914' });
    }

    const closeBtn = this.scene.add
      .text(Math.round(0), Math.round(bookH / 2 - this.scale(12)), '[Close]  Q', {
        fontFamily: 'monospace',
        fontSize: `${this.scale(9)}px`,
        color: '#5c4033',
        backgroundColor: '#e8d5a3',
        padding: { x: this.scale(5), y: this.scale(2) },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.toggleQuestLog());
    this.questLogContainer.add(closeBtn);
  }

  private hideQuestLog(): void {
    if (this.questLogContainer) {
      this.questLogContainer.destroy(true);
      this.questLogContainer = undefined;
    }
  }

  // =========================================================================
  // NOTIFICATION
  // =========================================================================

  private showQuestCompletedNotification(quest: Quest): void {
    const cam = this.scene.cameras.main;
    const notif = this.scene.add
      .container(cam.width / 2, cam.height / 2 - this.scale(24))
      .setScrollFactor(0)
      .setDepth(10001);

    const w = this.scale(220);
    const h = this.scale(50);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a3a1a, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, this.scale(4));
    bg.lineStyle(this.scale(2), 0x00ff88, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, this.scale(4));
    notif.add(bg);

    notif.add(
      this.scene.add.text(0, this.scale(-10), 'Quest Completed!', {
        fontFamily: 'monospace',
        fontSize: `${this.scale(10)}px`,
        color: '#00ff88',
        fontStyle: 'bold',
      }).setOrigin(0.5),
    );
    notif.add(
      this.scene.add.text(0, this.scale(10), quest.title, {
        fontFamily: 'monospace',
        fontSize: `${this.scale(8)}px`,
        color: '#ffff88',
      }).setOrigin(0.5),
    );

    this.scene.time.delayedCall(2800, () => notif.destroy());
  }

  // =========================================================================
  // RESIZE / CLEANUP
  // =========================================================================

  resize(): void {
    this.rebuildBookIcon();
    this.refresh();
    if (this.isLogOpen) {
      this.hideQuestLog();
      this.showQuestLog();
    }
  }

  shutdown(): void {
    if (this.toggleKey) {
      this.toggleKey.off('down', this.toggleQuestLog, this);
    }
    this.trackerContainer?.destroy(true);
    this.bookIcon?.destroy(true);
    this.hideQuestLog();
  }
}

function bookBg(icon: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const r = Math.max(1, Math.round(w / 7));
  icon.fillStyle(0x8b4513, 1);
  icon.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  icon.lineStyle(Math.max(1, Math.round(w / 14)), 0x5c3317, 1);
  icon.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  icon.fillStyle(0xf5e6c8, 1);
  icon.fillRect(-w / 2 + Math.round(w / 7), -h / 2 + Math.round(h / 9), w - Math.round(w / 3.5), h - Math.round(h / 4.5));
  icon.lineStyle(Math.max(1, Math.round(w / 14)), 0x5c3317, 1);
  icon.lineBetween(0, -h / 2 + Math.round(h / 9), 0, h / 2 - Math.round(h / 9));
}
