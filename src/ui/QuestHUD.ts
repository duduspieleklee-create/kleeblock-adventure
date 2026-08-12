import Phaser from 'phaser';
import { QuestManager, Quest, QuestStatus } from '../managers/QuestManager';
import { UI_CONFIG } from './UIConstants';

/**
 * Quest HUD (screen-space). Hosted by UIScene.
 * Displays state from QuestManager only — no quest logic here.
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

  private get refW(): number {
    return this.scene.scale.gameSize.width;
  }

  private get refH(): number {
    return this.scene.scale.gameSize.height;
  }

  private scale(v: number): number {
    const ref = 1280;
    const factor = Math.max(0.75, Math.min(1.25, this.refW / ref));
    return Math.round(factor * v);
  }

  toggleQuestbook(): void {
    this.toggleQuestLog();
  }

  closeQuestbook(): void {
    if (this.isLogOpen) {
      this.isLogOpen = false;
      this.hideQuestLog();
    }
  }

  isQuestbookOpen(): boolean {
    return this.isLogOpen;
  }

  private createTracker(): void {
    this.trackerContainer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(9998);

    this.positionTracker();
  }

  private positionTracker(): void {
    const padX = this.scale(16);
    const padY = this.scale(16);
    this.trackerContainer.setPosition(padX, padY);
  }

  private formatObjectiveLine(
    quest: Quest,
    status: QuestStatus,
    obj: Quest['objectives'][0],
  ): string {
    if (obj.type === 'item') {
      const required = obj.requiredCount ?? quest.requiredCount ?? 1;
      const current = status.itemCounts?.[obj.id] ?? 0;
      return `> ${obj.description} (${current}/${required})`;
    }
    return `> ${obj.description}`;
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
    bg.fillStyle(UI_CONFIG.PARCHMENT_BG, 0.95);
    bg.fillRoundedRect(0, 0, w, h, this.scale(6));
    bg.lineStyle(this.scale(2), UI_CONFIG.PARCHMENT_BORDER, 1);
    bg.strokeRoundedRect(0, 0, w, h, this.scale(6));
    this.trackerContainer.add(bg);
    this.trackerChildren.push(bg);

    const header = this.scene.add
      .text(cx, this.scale(10), 'Active', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: `${this.scale(14)}px`,
        color: '#5c4033',
      })
      .setOrigin(0.5, 0);
    this.trackerContainer.add(header);
    this.trackerChildren.push(header);

    const active = this.questManager.getActiveQuests();

    if (active.length === 0) {
      const t = this.scene.add
        .text(cx, this.scale(40), 'No active quests', {
          fontFamily: UI_CONFIG.FONT_FAMILY,
          fontSize: `${this.scale(12)}px`,
          color: UI_CONFIG.PARCHMENT_MUTED,
          align: 'center',
        })
        .setOrigin(0.5);
      this.trackerContainer.add(t);
      this.trackerChildren.push(t);
    } else {
      // Prefer item quest in tracker when multiple active
      const status =
        active.find((s) => {
          const q = this.questsData[s.questId];
          return q?.objectives.some((o) => o.type === 'item');
        }) ?? active[0];

      const quest = this.questsData[status.questId];
      if (quest) {
        const title = this.scene.add
          .text(cx, this.scale(32), quest.title, {
            fontFamily: UI_CONFIG.FONT_FAMILY,
            fontSize: `${this.scale(13)}px`,
            color: UI_CONFIG.PARCHMENT_TEXT,
            wordWrap: { width: w - this.scale(20) },
            align: 'center',
          })
          .setOrigin(0.5, 0);
        this.trackerContainer.add(title);
        this.trackerChildren.push(title);

        const currentObj = quest.objectives.find((o) => !status.objectives[o.id]);
        if (currentObj) {
          const line = this.formatObjectiveLine(quest, status, currentObj);
          const objText = this.scene.add
            .text(cx, this.scale(58), line, {
              fontFamily: UI_CONFIG.FONT_FAMILY,
              fontSize: `${this.scale(11)}px`,
              color: '#5c4033',
              wordWrap: { width: w - this.scale(20) },
              align: 'center',
            })
            .setOrigin(0.5, 0);
          this.trackerContainer.add(objText);
          this.trackerChildren.push(objText);
        }
      }
    }

    const hint = this.scene.add
      .text(cx, h - this.scale(14), 'Q / I / book', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: `${this.scale(10)}px`,
        color: UI_CONFIG.PARCHMENT_MUTED,
      })
      .setOrigin(0.5);
    this.trackerContainer.add(hint);
    this.trackerChildren.push(hint);

    this.positionTracker();
  }

  private trackerWidth(): number {
    return Math.min(this.refW - this.scale(32), this.scale(280));
  }

  private trackerHeight(): number {
    return this.scale(110);
  }

  private createBookIcon(): void {
    this.bookIcon = this.scene.add
      .container(0, 0)
      .setScrollFactor(0)
      .setDepth(9999)
      .setInteractive(new Phaser.Geom.Rectangle(-20, -24, 40, 48), Phaser.Geom.Rectangle.Contains);

    this.rebuildBookIcon();

    this.bookIcon.on('pointerover', () => this.hoverBookIcon(true));
    this.bookIcon.on('pointerout', () => this.hoverBookIcon(false));
    this.bookIcon.on('pointerdown', () => this.toggleQuestLog());
  }

  private hoverBookIcon(over: boolean): void {
    const icon = this.bookIcon.getAt(0) as Phaser.GameObjects.Graphics | undefined;
    if (icon) {
      icon.clear();
      const factor = over ? 1.12 : 1;
      const w = Math.round(this.scale(28) * factor);
      const h = Math.round(this.scale(36) * factor);
      bookBg(icon, w, h);
    }
    this.positionBookIcon();
  }

  private rebuildBookIcon(): void {
    this.bookIcon.removeAll(true);

    const w = this.scale(28);
    const h = this.scale(36);

    const icon = this.scene.add.graphics();
    bookBg(icon, w, h);
    this.bookIcon.add(icon);

    this.positionBookIcon();
  }

  private positionBookIcon(): void {
    const margin = this.scale(24);
    const iconW = this.scale(28);
    const y = this.scale(40);

    this.bookIcon.setPosition(this.refW - margin - iconW / 2, y);
  }

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
    this.questManager.on('itemProgress', () => this.refresh());
    this.questManager.on('questCompleted', (data: { quest: Quest }) => {
      this.showQuestCompletedNotification(data.quest);
      this.refresh();
    });
  }

  private toggleQuestLog(): void {
    this.isLogOpen = !this.isLogOpen;
    if (this.isLogOpen) this.showQuestLog();
    else this.hideQuestLog();
  }

  private showQuestLog(): void {
    this.hideQuestLog();

    const margin = this.scale(24);
    const maxW = this.refW - margin * 2;
    const maxH = this.refH - margin * 2;
    const bookW = Math.max(this.scale(420), Math.min(maxW, this.scale(720)));
    const bookH = Math.max(this.scale(280), Math.min(maxH, this.scale(420)));

    this.questLogContainer = this.scene.add
      .container(this.refW / 2, this.refH / 2)
      .setScrollFactor(0)
      .setDepth(10000);

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(-this.refW / 2, -this.refH / 2, this.refW, this.refH);
    this.questLogContainer.add(overlay);

    const book = this.scene.add.graphics();
    book.fillStyle(UI_CONFIG.PARCHMENT_BG, 0.98);
    book.fillRoundedRect(-bookW / 2, -bookH / 2, bookW, bookH, this.scale(8));
    book.lineStyle(this.scale(3), UI_CONFIG.PARCHMENT_BORDER, 1);
    book.strokeRoundedRect(-bookW / 2, -bookH / 2, bookW, bookH, this.scale(8));
    book.lineStyle(this.scale(1), 0x5c4033, 0.4);
    book.lineBetween(0, -bookH / 2 + this.scale(12), 0, bookH / 2 - this.scale(12));
    this.questLogContainer.add(book);

    const contentPad = this.scale(16);
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
      y += this.scale(20);
    };

    addLeft('Active', {
      fontFamily: UI_CONFIG.FONT_FAMILY,
      fontSize: `${this.scale(14)}px`,
      color: '#5c4033',
    });

    if (activeQuests.length === 0) {
      addLeft('None', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: `${this.scale(12)}px`,
        color: UI_CONFIG.PARCHMENT_MUTED,
      });
    } else {
      for (const qs of activeQuests) {
        const q = this.questsData[qs.questId];
        if (!q) continue;
        addLeft(`* ${q.title}`, {
          fontFamily: UI_CONFIG.FONT_FAMILY,
          fontSize: `${this.scale(12)}px`,
          color: UI_CONFIG.PARCHMENT_TEXT,
          wordWrap: { width: Math.round(pageW) },
        });
      }
    }

    y += this.scale(8);
    addLeft('Completed', {
      fontFamily: UI_CONFIG.FONT_FAMILY,
      fontSize: `${this.scale(14)}px`,
      color: '#5c4033',
    });

    if (completed.length === 0) {
      addLeft('None yet', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: `${this.scale(12)}px`,
        color: UI_CONFIG.PARCHMENT_MUTED,
      });
    } else {
      for (const qs of completed) {
        const q = this.questsData[qs.questId];
        if (!q) continue;
        addLeft(`+ ${q.title}`, {
          fontFamily: UI_CONFIG.FONT_FAMILY,
          fontSize: `${this.scale(12)}px`,
          color: '#2e7d32',
          wordWrap: { width: Math.round(pageW) },
        });
      }
    }

    const rightX = contentPad;
    y = -bookH / 2 + contentPad;

    const addRight = (text: string, style: Phaser.Types.GameObjects.Text.TextStyle) => {
      const t = this.scene.add.text(Math.round(rightX), Math.round(y), text, style).setOrigin(0);
      this.questLogContainer!.add(t);
      y += this.scale(20);
    };

    if (detailQuest && first) {
      addRight(detailQuest.title, {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: `${this.scale(14)}px`,
        color: UI_CONFIG.PARCHMENT_TEXT,
        wordWrap: { width: Math.round(pageW) },
      });
      if (detailQuest.description) {
        addRight(detailQuest.description, {
          fontFamily: UI_CONFIG.FONT_FAMILY,
          fontSize: `${this.scale(12)}px`,
          color: '#5c4033',
          wordWrap: { width: Math.round(pageW) },
        });
      }
      addRight('Objectives', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: `${this.scale(14)}px`,
        color: '#5c4033',
      });
      for (const obj of detailQuest.objectives) {
        const done = first.objectives[obj.id];
        const mark = done ? '+' : 'o';
        const color = done ? '#2e7d32' : '#5c4033';
        let line = `${mark} ${obj.description}`;
        if (obj.type === 'item') {
          const required = obj.requiredCount ?? detailQuest.requiredCount ?? 1;
          const current = first.itemCounts?.[obj.id] ?? 0;
          line = `${mark} ${obj.description} (${current}/${required})`;
        }
        addRight(line, {
          fontFamily: UI_CONFIG.FONT_FAMILY,
          fontSize: `${this.scale(12)}px`,
          color,
          wordWrap: { width: Math.round(pageW) },
        });
      }
    } else {
      addRight('No active quest', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: `${this.scale(12)}px`,
        color: UI_CONFIG.PARCHMENT_MUTED,
      });
    }

    const closeBtn = this.scene.add
      .text(0, Math.round(bookH / 2 - this.scale(28)), '[Close]  Q / Esc', {
        fontFamily: UI_CONFIG.FONT_FAMILY,
        fontSize: `${this.scale(12)}px`,
        color: '#5c4033',
        backgroundColor: '#e8d5a3',
        padding: { x: this.scale(8), y: this.scale(4) },
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

  private showQuestCompletedNotification(quest: Quest): void {
    const notif = this.scene.add
      .container(this.refW / 2, this.refH / 2 - this.scale(40))
      .setScrollFactor(0)
      .setDepth(10001);

    const w = this.scale(420);
    const h = this.scale(80);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a3a1a, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, this.scale(6));
    bg.lineStyle(this.scale(3), 0x00ff88, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, this.scale(6));
    notif.add(bg);

    notif.add(
      this.scene.add
        .text(0, this.scale(-16), 'Quest Completed!', {
          fontFamily: UI_CONFIG.FONT_FAMILY,
          fontSize: `${this.scale(16)}px`,
          color: '#00ff88',
        })
        .setOrigin(0.5),
    );
    notif.add(
      this.scene.add
        .text(0, this.scale(16), quest.title, {
          fontFamily: UI_CONFIG.FONT_FAMILY,
          fontSize: `${this.scale(13)}px`,
          color: '#ffff88',
        })
        .setOrigin(0.5),
    );

    this.scene.time.delayedCall(2800, () => notif.destroy());
  }

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
  icon.fillRect(
    -w / 2 + Math.round(w / 7),
    -h / 2 + Math.round(h / 9),
    w - Math.round(w / 3.5),
    h - Math.round(h / 4.5),
  );
  icon.lineStyle(Math.max(1, Math.round(w / 14)), 0x5c3317, 1);
  icon.lineBetween(0, -h / 2 + Math.round(h / 9), 0, h / 2 - Math.round(h / 9));
}
