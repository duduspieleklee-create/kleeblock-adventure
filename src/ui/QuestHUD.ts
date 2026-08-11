import Phaser from 'phaser';
import { QuestManager, QuestStatus, Quest } from '../managers/QuestManager';

export class QuestHUD {
  private scene: Phaser.Scene;
  private questManager: QuestManager;
  private questsData: Record<string, Quest>;

  // Containers
  private trackerContainer!: Phaser.GameObjects.Container;   // left side
  private bookIcon!: Phaser.GameObjects.Container;           // small toggle icon
  private questLogContainer?: Phaser.GameObjects.Container;  // full modal

  private isLogOpen = false;
  private toggleKey?: Phaser.Input.Keyboard.Key;

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
  // LEFT-SIDE TRACKER (styled like "Active" section)
  // ---------------------------------------------------------------------------
  private createTracker(): void {
    this.trackerContainer = this.scene.add
      .container(12, 60)
      .setScrollFactor(0)
      .setDepth(9998);

    // Parchment-style background (matches Questbook Active panel)
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xf5e6c8, 0.95);          // warm parchment
    bg.fillRoundedRect(0, 0, 140, 110, 6);
    bg.lineStyle(2, 0x8b6914, 1);          // wood border
    bg.strokeRoundedRect(0, 0, 140, 110, 6);
    this.trackerContainer.add(bg);

    // "Active" header
    const header = this.scene.add
      .text(70, 12, 'Active', {
        fontSize: '11px',
        color: '#5c4033',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.trackerContainer.add(header);

    // Content will be filled in refresh()
  }

  // ---------------------------------------------------------------------------
  // SMALL QUESTBOOK ICON (toggle)
  // ---------------------------------------------------------------------------
  private createBookIcon(): void {
    const x = this.scene.cameras.main.width - 28;
    const y = 80;

    this.bookIcon = this.scene.add
      .container(x, y)
      .setScrollFactor(0)
      .setDepth(9999)
      .setInteractive(
        new Phaser.Geom.Rectangle(-12, -14, 24, 28),
        Phaser.Geom.Rectangle.Contains,
      );

    // Simple closed book icon
    const bookBg = this.scene.add.graphics();
    bookBg.fillStyle(0x8b4513, 1);
    bookBg.fillRoundedRect(-10, -12, 20, 24, 2);
    bookBg.lineStyle(1, 0x5c3317, 1);
    bookBg.strokeRoundedRect(-10, -12, 20, 24, 2);

    // Pages
    bookBg.fillStyle(0xf5e6c8, 1);
    bookBg.fillRect(-7, -9, 14, 18);

    // Spine detail
    bookBg.lineStyle(1, 0x5c3317, 1);
    bookBg.lineBetween(-10, -4, 10, -4);

    this.bookIcon.add(bookBg);

    // Hover feedback
    this.bookIcon.on('pointerover', () => {
      this.bookIcon.setScale(1.15);
    });
    this.bookIcon.on('pointerout', () => {
      this.bookIcon.setScale(1);
    });
    this.bookIcon.on('pointerdown', () => {
      this.toggleQuestLog();
    });
  }

  // ---------------------------------------------------------------------------
  // INPUT
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
  // REFRESH TRACKER CONTENT
  // ---------------------------------------------------------------------------
  private refresh(): void {
    // Clear previous content (keep background)
    this.trackerContainer.removeBetween(1, this.trackerContainer.length, true);

    const active = this.questManager.getActiveQuests();

    if (active.length === 0) {
      const empty = this.scene.add
        .text(70, 55, 'No active\nquests', {
          fontSize: '10px',
          color: '#8b6914',
          align: 'center',
        })
        .setOrigin(0.5);
      this.trackerContainer.add(empty);
      return;
    }

    // Show first active quest (can be extended later)
    const status = active[0];
    const quest = this.questsData[status.questId];
    if (!quest) return;

    // Icon
    const icon = this.scene.add
      .text(18, 32, '📜', { fontSize: '14px' })
      .setOrigin(0.5);
    this.trackerContainer.add(icon);

    // Title (truncated)
    const title = this.scene.add
      .text(70, 32, quest.title, {
        fontSize: '10px',
        color: '#3d2914',
        fontStyle: 'bold',
        wordWrap: { width: 100 },
      })
      .setOrigin(0.5, 0.5);
    this.trackerContainer.add(title);

    // Current objective
    const currentObj = quest.objectives.find((o) => !status.objectives[o.id]);
    if (currentObj) {
      const objText = this.scene.add
        .text(70, 68, `→ ${currentObj.description}`, {
          fontSize: '9px',
          color: '#5c4033',
          wordWrap: { width: 120 },
        })
        .setOrigin(0.5);
      this.trackerContainer.add(objText);
    }

    // Hint
    const hint = this.scene.add
      .text(70, 98, 'Q or 📖 to open', {
        fontSize: '8px',
        color: '#8b6914',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
    this.trackerContainer.add(hint);
  }

  // ---------------------------------------------------------------------------
  // FULL QUESTBOOK MODAL
  // ---------------------------------------------------------------------------
  private toggleQuestLog(): void {
    this.isLogOpen = !this.isLogOpen;
    if (this.isLogOpen) {
      this.showQuestLog();
    } else {
      this.hideQuestLog();
    }
  }

  private showQuestLog(): void {
    if (this.questLogContainer) return;

    const cam = this.scene.cameras.main;
    this.questLogContainer = this.scene.add
      .container(cam.width / 2, cam.height / 2)
      .setScrollFactor(0)
      .setDepth(10000);

    // Dark overlay
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(-cam.width / 2, -cam.height / 2, cam.width, cam.height);
    this.questLogContainer.add(overlay);

    // Book background (two pages)
    const bookW = 420;
    const bookH = 280;
    const book = this.scene.add.graphics();
    book.fillStyle(0xf5e6c8, 0.98);
    book.fillRoundedRect(-bookW / 2, -bookH / 2, bookW, bookH, 8);
    book.lineStyle(3, 0x8b6914, 1);
    book.strokeRoundedRect(-bookW / 2, -bookH / 2, bookW, bookH, 8);

    // Center spine
    book.lineStyle(2, 0x5c4033, 0.6);
    book.lineBetween(0, -bookH / 2 + 10, 0, bookH / 2 - 10);
    this.questLogContainer.add(book);

    // LEFT PAGE – Active + Completed
    const leftX = -bookW / 2 + 20;
    let y = -bookH / 2 + 25;

    const activeTitle = this.scene.add
      .text(leftX, y, 'Active', {
        fontSize: '13px',
        color: '#5c4033',
        fontStyle: 'bold',
      });
    this.questLogContainer.add(activeTitle);
    y += 22;

    const activeQuests = this.questManager.getActiveQuests();
    if (activeQuests.length === 0) {
      this.questLogContainer.add(
        this.scene.add.text(leftX, y, 'None', { fontSize: '10px', color: '#8b6914' }),
      );
      y += 18;
    } else {
      activeQuests.forEach((qs) => {
        const q = this.questsData[qs.questId];
        if (!q) return;
        this.questLogContainer!.add(
          this.scene.add.text(leftX, y, `📜 ${q.title}`, {
            fontSize: '11px',
            color: '#3d2914',
          }),
        );
        y += 18;
      });
    }

    y += 12;
    const completedTitle = this.scene.add
      .text(leftX, y, 'Completed', {
        fontSize: '13px',
        color: '#5c4033',
        fontStyle: 'bold',
      });
    this.questLogContainer.add(completedTitle);
    y += 22;

    const completed = this.questManager.getCompletedQuests();
    if (completed.length === 0) {
      this.questLogContainer.add(
        this.scene.add.text(leftX, y, 'None yet', { fontSize: '10px', color: '#8b6914' }),
      );
    } else {
      completed.forEach((qs) => {
        const q = this.questsData[qs.questId];
        if (!q) return;
        this.questLogContainer!.add(
          this.scene.add.text(leftX, y, `✓ ${q.title}`, {
            fontSize: '11px',
            color: '#2e7d32',
          }),
        );
        y += 18;
      });
    }

    // RIGHT PAGE – Details of first active quest
    const rightX = 20;
    y = -bookH / 2 + 25;

    const first = activeQuests[0];
    if (first) {
      const q = this.questsData[first.questId];
      if (q) {
        this.questLogContainer.add(
          this.scene.add
            .text(rightX, y, q.title, {
              fontSize: '13px',
              color: '#3d2914',
              fontStyle: 'bold',
              wordWrap: { width: 180 },
            }),
        );
        y += 30;

        this.questLogContainer.add(
          this.scene.add
            .text(rightX, y, q.description || '', {
              fontSize: '10px',
              color: '#5c4033',
              wordWrap: { width: 180 },
            }),
        );
        y += 50;

        this.questLogContainer.add(
          this.scene.add.text(rightX, y, 'Objectives', {
            fontSize: '11px',
            color: '#5c4033',
            fontStyle: 'bold',
          }),
        );
        y += 18;

        q.objectives.forEach((obj) => {
          const done = first.objectives[obj.id];
          const icon = done ? '✓' : '○';
          const color = done ? '#2e7d32' : '#5c4033';
          this.questLogContainer!.add(
            this.scene.add.text(rightX, y, `${icon} ${obj.description}`, {
              fontSize: '10px',
              color,
              wordWrap: { width: 180 },
            }),
          );
          y += 18;
        });
      }
    }

    // Close button
    const closeBtn = this.scene.add
      .text(0, bookH / 2 - 22, '[Close]  or press Q', {
        fontSize: '11px',
        color: '#5c4033',
        backgroundColor: '#e8d5a3',
        padding: { x: 8, y: 4 },
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
      .container(cam.width / 2, cam.height / 2 - 40)
      .setScrollFactor(0)
      .setDepth(10001);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a3a1a, 0.95);
    bg.fillRoundedRect(-140, -40, 280, 80, 6);
    bg.lineStyle(2, 0x00ff88, 1);
    bg.strokeRoundedRect(-140, -40, 280, 80, 6);
    notif.add(bg);

    notif.add(
      this.scene.add
        .text(0, -15, '🎉 Quest Completed!', {
          fontSize: '14px',
          color: '#00ff88',
          fontStyle: 'bold',
        })
        .setOrigin(0.5),
    );
    notif.add(
      this.scene.add
        .text(0, 10, quest.title, {
          fontSize: '12px',
          color: '#ffff88',
        })
        .setOrigin(0.5),
    );

    this.scene.time.delayedCall(2800, () => notif.destroy());
  }

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------
  shutdown(): void {
    if (this.toggleKey) {
      this.toggleKey.off('down', this.toggleQuestLog, this);
    }
    this.trackerContainer?.destroy(true);
    this.bookIcon?.destroy(true);
    this.hideQuestLog();
  }
}
