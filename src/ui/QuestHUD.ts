import Phaser from 'phaser';
import { QuestManager, QuestStatus, Quest } from '../managers/QuestManager';

export class QuestHUD {
  private scene: Phaser.Scene;
  private questManager: QuestManager;
  private container!: Phaser.GameObjects.Container;
  private questsData: Record<string, Quest>;
  private questDisplays: Map<string, Phaser.GameObjects.Container> = new Map();
  private isOpen: boolean = false;
  private toggleKey?: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, questManager: QuestManager, questsData: Record<string, Quest>) {
    this.scene = scene;
    this.questManager = questManager;
    this.questsData = questsData;

    this.setupUI();
    this.setupInput();
    this.setupEventListeners();
  }

  private setupUI(): void {
    // Main container
    this.container = this.scene.add
      .container(this.scene.cameras.main.width / 2, 60)
      .setScrollFactor(0)
      .setDepth(9998);

    this.updateQuestDisplay();
  }

  private setupInput(): void {
    const keyboard = this.scene.input.keyboard;
    if (keyboard) {
      this.toggleKey = keyboard.addKey('Q');
      this.toggleKey.on(Phaser.Input.Keyboard.Events.DOWN, this.toggleQuestLog, this);
    }
  }

  private setupEventListeners(): void {
    this.questManager.on('questStarted', (data: any) => {
      console.log(`[QuestHUD] Quest started: ${data.questId}`);
      this.updateQuestDisplay();
    });

    this.questManager.on('objectiveCompleted', (data: any) => {
      console.log(`[QuestHUD] Objective completed: ${data.objectiveId}`);
      this.updateQuestDisplay();
    });

    this.questManager.on('questCompleted', (data: any) => {
      console.log(`[QuestHUD] Quest completed: ${data.questId}`);
      this.showQuestCompletedNotification(data.quest);
      this.updateQuestDisplay();
    });
  }

  private updateQuestDisplay(): void {
    // Clear existing displays
    this.container.removeAll(true);
    this.questDisplays.clear();

    const activeQuests = this.questManager.getActiveQuests();

    if (activeQuests.length === 0) {
      const noQuestText = this.scene.add
        .text(0, 0, 'No active quests. Press Q for log.', {
          fontSize: '11px',
          color: '#aaaaaa',
        })
        .setOrigin(0.5);
      this.container.add(noQuestText);
      return;
    }

    // Display first active quest
    const firstQuest = activeQuests[0];
    this.displayQuestPreview(firstQuest);
  }

  private displayQuestPreview(questStatus: QuestStatus): void {
    const quest = this.questsData[questStatus.questId];
    if (!quest) return;

    const yOffset = 0;
    const width = 300;

    // Title
    const titleText = this.scene.add
      .text(0, yOffset, `📋 ${quest.title}`, {
        fontSize: '12px',
        color: '#ffff88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.container.add(titleText);

    // Objectives
    let objectiveY = yOffset + 20;
    const completedCount = Object.values(questStatus.objectives).filter((c) => c).length;
    const totalCount = quest.objectives.length;

    const progressText = this.scene.add
      .text(0, objectiveY, `Progress: ${completedCount}/${totalCount}`, {
        fontSize: '10px',
        color: '#cccccc',
      })
      .setOrigin(0.5);
    this.container.add(progressText);

    // Progress bar
    objectiveY += 15;
    const barWidth = 200;
    const barHeight = 8;
    const progress = this.questManager.getQuestProgress(questStatus.questId);

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x333333, 0.8);
    barBg.fillRect(-barWidth / 2, objectiveY - barHeight / 2, barWidth, barHeight);
    this.container.add(barBg);

    const barFill = this.scene.add.graphics();
    barFill.fillStyle(0x00ff88, 1);
    barFill.fillRect(-barWidth / 2, objectiveY - barHeight / 2, barWidth * progress, barHeight);
    this.container.add(barFill);

    // Current objective
    objectiveY += 20;
    const currentObjective = quest.objectives.find((obj) => !questStatus.objectives[obj.id]);
    if (currentObjective) {
      const objText = this.scene.add
        .text(0, objectiveY, `→ ${currentObjective.description}`, {
          fontSize: '10px',
          color: '#ffcccc',
          wordWrap: { width: width - 20 },
        })
        .setOrigin(0.5);
      this.container.add(objText);
    }

    // Hint
    const hintY = objectiveY + 25;
    const hintText = this.scene.add
      .text(0, hintY, 'Press Q to open full quest log', {
        fontSize: '9px',
        color: '#666666',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
    this.container.add(hintText);
  }

  private toggleQuestLog(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.showQuestLog();
    } else {
      this.hideQuestLog();
    }
  }

  private showQuestLog(): void {
    console.log('[QuestHUD] Opening quest log');

    // Create full quest log overlay
    const logContainer = this.scene.add
      .container(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2)
      .setScrollFactor(0)
      .setDepth(10000);

    // Semi-transparent background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(
      -this.scene.cameras.main.width / 2,
      -this.scene.cameras.main.height / 2,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
    );
    logContainer.add(bg);

    // Quest log panel
    const panelWidth = 400;
    const panelHeight = 500;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x1a1a2e, 0.95);
    panel.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 5);
    panel.lineStyle(2, 0x5a5a7a, 1);
    panel.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 5);
    logContainer.add(panel);

    // Title
    const titleText = this.scene.add
      .text(0, -panelHeight / 2 + 20, 'Quest Log', {
        fontSize: '16px',
        color: '#ffff88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    logContainer.add(titleText);

    // Active quests
    let yPos = -panelHeight / 2 + 50;
    const activeQuests = this.questManager.getActiveQuests();

    if (activeQuests.length === 0) {
      const noQuestText = this.scene.add
        .text(0, yPos, 'No active quests', {
          fontSize: '11px',
          color: '#aaaaaa',
        })
        .setOrigin(0.5);
      logContainer.add(noQuestText);
    } else {
      activeQuests.forEach((questStatus) => {
        const quest = this.questsData[questStatus.questId];
        if (quest) {
          const questTitle = this.scene.add
            .text(-panelWidth / 2 + 20, yPos, `📋 ${quest.title}`, {
              fontSize: '11px',
              color: '#ffff88',
              fontStyle: 'bold',
            })
            .setOrigin(0, 0.5);
          logContainer.add(questTitle);

          yPos += 25;

          // Objectives
          Object.entries(questStatus.objectives).forEach(([objectiveId, completed]) => {
            const objective = quest.objectives.find((o) => o.id === objectiveId);
            if (objective) {
              const icon = (completed as boolean) ? '✓' : '○';
              const color = (completed as boolean) ? '#88ff88' : '#ffcccc';
              const objText = this.scene.add
                .text(-panelWidth / 2 + 30, yPos, `${icon} ${objective.description}`, {
                  fontSize: '10px',
                  color: color,
                })
                .setOrigin(0, 0.5);
              logContainer.add(objText);
              yPos += 20;
            }
          });

          yPos += 15;
        }
      });
    }

    // Close hint
    const closeHintText = this.scene.add
      .text(0, panelHeight / 2 - 15, 'Press Q to close', {
        fontSize: '9px',
        color: '#666666',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
    logContainer.add(closeHintText);

    // Store for cleanup
    (this.scene as any)._questLogContainer = logContainer;
  }

  private hideQuestLog(): void {
    console.log('[QuestHUD] Closing quest log');
    const logContainer = (this.scene as any)._questLogContainer;
    if (logContainer) {
      logContainer.destroy();
      (this.scene as any)._questLogContainer = undefined;
    }
  }

  private showQuestCompletedNotification(quest: Quest): void {
    const notifContainer = this.scene.add
      .container(this.scene.cameras.main.width / 2, this.scene.cameras.main.height / 2)
      .setScrollFactor(0)
      .setDepth(10001);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a3a1a, 0.9);
    bg.fillRoundedRect(-150, -60, 300, 120, 5);
    bg.lineStyle(2, 0x00ff88, 1);
    bg.strokeRoundedRect(-150, -60, 300, 120, 5);
    notifContainer.add(bg);

    // Text
    const titleText = this.scene.add
      .text(0, -30, '🎉 Quest Completed!', {
        fontSize: '14px',
        color: '#00ff88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    notifContainer.add(titleText);

    const questText = this.scene.add
      .text(0, 0, quest.title, {
        fontSize: '12px',
        color: '#ffff88',
      })
      .setOrigin(0.5);
    notifContainer.add(questText);

    const rewardText = this.scene.add
      .text(0, 25, quest.reward.message, {
        fontSize: '10px',
        color: '#cccccc',
      })
      .setOrigin(0.5);
    notifContainer.add(rewardText);

    // Auto-destroy after 3 seconds
    this.scene.time.addEvent({
      delay: 3000,
      callback: () => {
        notifContainer.destroy();
      },
    });
  }

  shutdown(): void {
    if (this.toggleKey) {
      this.toggleKey.off(Phaser.Input.Keyboard.Events.DOWN, this.toggleQuestLog, this);
    }
    this.container.destroy();
  }
}
