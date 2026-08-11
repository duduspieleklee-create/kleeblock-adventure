import Phaser from 'phaser';
import { QuestManager, QuestStatus, Quest } from '../managers/QuestManager';

/**
 * Quest HUD tuned for the game canvas (480×360).
 * All sizes are derived from the camera so text no longer clips.
 */
export class QuestHUD {
  private scene: Phaser.Scene;
  private questManager: QuestManager;
  private questsData: Record<string, Quest>;

  private trackerContainer!: Phaser.GameObjects.Container;
  private bookIcon!: Phaser.GameObjects.Container;
  private questLogContainer?: Phaser.GameObjects.Container;

  private isLogOpen = false;
  private toggleKey?: Phaser.Input.Keyboard.Key;

  // Layout constants for 480×360 (also scales if camera size changes)
  private readonly TRACKER_W = 112;
  private readonly TRACKER_H = 88;

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

  // ---------------------------------------------------------------------------
  // LEFT-SIDE TRACKER
  // ---------------------------------------------------------------------------
  private createTracker(): void {
    this.trackerContainer = this.scene.add
      .container(8, 40)
      .setScrollFactor(0)
      .setDepth(9998);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0xf5e6c8, 0.95);
    bg.fillRoundedRect(0, 0, this.TRACKER_W, this.TRACKER_H, 4);
    bg.lineStyle(2, 0x8b6914, 1);
    bg.strokeRoundedRect(0, 0, this.TRACKER_W, this.TRACKER_H, 4);
    this.trackerContainer.add(bg);

    const header = this.scene.add
      .text(this.TRACKER_W / 2, 8, 'Active', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#5c4033',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    this.trackerContainer.add(header);
  }

  // ---------------------------------------------------------------------------
  // BOOK ICON
  // ---------------------------------------------------------------------------
  private createBookIcon(): void {
    const cam = this.scene.cameras.main;
    const x = cam.width - 22;
    const y = 52;

    this.bookIcon = this.scene.add
      .container(x, y)
      .setScrollFactor(0)
      .setDepth(9999)
      .setInteractive(new Phaser.Geom.Rectangle(-10, -12, 20, 24), Phaser.Geom.Rectangle.Contains);

    const bookBg = this.scene.add.graphics();
    bookBg.fillStyle(0x8b4513, 1);
    bookBg.fillRoundedRect(-8, -10, 16, 20, 2);
    bookBg.lineStyle(1, 0x5c3317, 1);
    bookBg.strokeRoundedRect(-8, -10, 16, 20, 2);
    bookBg.fillStyle(0xf5e6c8, 1);
    bookBg.fillRect(-5, -7, 10, 14);
    bookBg.lineStyle(1, 0x5c3317, 1);
    bookBg.lineBetween(-8, -3, 8, -3);
    this.bookIcon.add(bookBg);

    this.bookIcon.on('pointerover', () => this.bookIcon.setScale(1.12));
    this.bookIcon.on('pointerout', () => this.bookIcon.setScale(1));
    this.bookIcon.on('pointerdown', () => this.toggleQuestLog());
  }

  // ---------------------------------------------------------------------------
  // INPUT / EVENTS
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // TRACKER CONTENT
  // ---------------------------------------------------------------------------
  private refresh(): void {
    this.trackerContainer.removeBetween(1, this.trackerContainer.length, true);

    const active = this.questManager.getActiveQuests();
    const cx = this.TRACKER_W / 2;

    if (active.length === 0) {
      this.trackerContainer.add(
        this.scene.add
          .text(cx, 44, 'No active\nquests', {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#8b6914',
            align: 'center',
          })
          .setOrigin(0.5),
      );
      return;
    }

    const status = active[0];
    const quest = this.questsData[status.questId];
    if (!quest) return;

    this.trackerContainer.add(
      this.scene.add
        .text(cx, 24, quest.title, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#3d2914',
          fontStyle: 'bold',
          wordWrap: { width: this.TRACKER_W - 12 },
          align: 'center',
        })
        .setOrigin(0.5, 0),
    );

    const currentObj = quest.objectives.find((o) => !status.objectives[o.id]);
    if (currentObj) {
      this.trackerContainer.add(
        this.scene.add
          .text(cx, 48, `→ ${currentObj.description}`, {
            fontFamily: 'monospace',
            fontSize: '7px',
            color: '#5c4033',
            wordWrap: { width: this.TRACKER_W - 12 },
            align: 'center',
          })
          .setOrigin(0.5, 0),
      );
    }

    this.trackerContainer.add(
      this.scene.add
        .text(cx, this.TRACKER_H - 10, 'Q / book', {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: '#8b6914',
          fontStyle: 'italic',
        })
        .setOrigin(0.5),
    );
  }

  // ---------------------------------------------------------------------------
  // QUESTBOOK MODAL — sized to fit 480×360
  // ---------------------------------------------------------------------------
  private toggleQuestLog(): void {
    this.isLogOpen = !this.isLogOpen;
    if (this.isLogOpen) this.showQuestLog();
    else this.hideQuestLog();
  }

  private showQuestLog(): void {
    if (this.questLogContainer) return;

    const cam = this.scene.cameras.main;
    // Fit inside canvas with margin (game is 480×360)
    const bookW = Math.min(cam.width - 32, 400);
    const bookH = Math.min(cam.height - 28, 260);
    const pagePad = 12;
    const pageW = bookW / 2 - pagePad * 2;

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
    book.fillRoundedRect(-bookW / 2, -bookH / 2, bookW, bookH, 6);
    book.lineStyle(2, 0x8b6914, 1);
    book.strokeRoundedRect(-bookW / 2, -bookH / 2, bookW, bookH, 6);
    book.lineStyle(1, 0x5c4033, 0.5);
    book.lineBetween(0, -bookH / 2 + 8, 0, bookH / 2 - 8);
    this.questLogContainer.add(book);

    // ---- LEFT PAGE: lists ----
    const leftX = -bookW / 2 + pagePad;
    let y = -bookH / 2 + pagePad;

    this.questLogContainer.add(
      this.scene.add.text(leftX, y, 'Active', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#5c4033',
        fontStyle: 'bold',
      }),
    );
    y += 16;

    const activeQuests = this.questManager.getActiveQuests();
    if (activeQuests.length === 0) {
      this.questLogContainer.add(
        this.scene.add.text(leftX, y, 'None', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#8b6914',
        }),
      );
      y += 14;
    } else {
      for (const qs of activeQuests) {
        const q = this.questsData[qs.questId];
        if (!q) continue;
        this.questLogContainer.add(
          this.scene.add.text(leftX, y, `* ${q.title}`, {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#3d2914',
            wordWrap: { width: pageW },
          }),
        );
        y += 14;
      }
    }

    y += 10;
    this.questLogContainer.add(
      this.scene.add.text(leftX, y, 'Completed', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#5c4033',
        fontStyle: 'bold',
      }),
    );
    y += 16;

    const completed = this.questManager.getCompletedQuests();
    if (completed.length === 0) {
      this.questLogContainer.add(
        this.scene.add.text(leftX, y, 'None yet', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#8b6914',
        }),
      );
    } else {
      for (const qs of completed) {
        const q = this.questsData[qs.questId];
        if (!q) continue;
        this.questLogContainer.add(
          this.scene.add.text(leftX, y, `+ ${q.title}`, {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#2e7d32',
            wordWrap: { width: pageW },
          }),
        );
        y += 14;
      }
    }

    // ---- RIGHT PAGE: details ----
    const rightX = pagePad;
    y = -bookH / 2 + pagePad;

    const first = activeQuests[0];
    if (first) {
      const q = this.questsData[first.questId];
      if (q) {
        this.questLogContainer.add(
          this.scene.add.text(rightX, y, q.title, {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#3d2914',
            fontStyle: 'bold',
            wordWrap: { width: pageW },
          }),
        );
        y += 20;

        this.questLogContainer.add(
          this.scene.add.text(rightX, y, q.description || '', {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#5c4033',
            wordWrap: { width: pageW },
          }),
        );
        y += 36;

        this.questLogContainer.add(
          this.scene.add.text(rightX, y, 'Objectives', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#5c4033',
            fontStyle: 'bold',
          }),
        );
        y += 14;

        for (const obj of q.objectives) {
          const done = first.objectives[obj.id];
          const mark = done ? '+' : 'o';
          const color = done ? '#2e7d32' : '#5c4033';
          this.questLogContainer.add(
            this.scene.add.text(rightX, y, `${mark} ${obj.description}`, {
              fontFamily: 'monospace',
              fontSize: '8px',
              color,
              wordWrap: { width: pageW },
            }),
          );
          y += 16;
        }
      }
    } else {
      this.questLogContainer.add(
        this.scene.add.text(rightX, y, 'No active quest', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#8b6914',
        }),
      );
    }

    // Close
    const closeBtn = this.scene.add
      .text(0, bookH / 2 - 14, '[Close]  Q', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#5c4033',
        backgroundColor: '#e8d5a3',
        padding: { x: 6, y: 3 },
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

  // ---------------------------------------------------------------------------
  // NOTIFICATION
  // ---------------------------------------------------------------------------
  private showQuestCompletedNotification(quest: Quest): void {
    const cam = this.scene.cameras.main;
    const notif = this.scene.add
      .container(cam.width / 2, cam.height / 2 - 30)
      .setScrollFactor(0)
      .setDepth(10001);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a3a1a, 0.95);
    bg.fillRoundedRect(-120, -28, 240, 56, 4);
    bg.lineStyle(2, 0x00ff88, 1);
    bg.strokeRoundedRect(-120, -28, 240, 56, 4);
    notif.add(bg);

    notif.add(
      this.scene.add
        .text(0, -10, 'Quest Completed!', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#00ff88',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    notif.add(
      this.scene.add
        .text(0, 10, quest.title, {
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#ffff88',
        })
        .setOrigin(0.5),
    );

    this.scene.time.delayedCall(2800, () => notif.destroy());
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
