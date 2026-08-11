import Phaser from 'phaser';
import { GameState } from './GameState';

export interface Objective {
  id: string;
  description: string;
  type: 'dialogue' | 'location' | 'item' | 'custom';
  targetId: string;
  completed?: boolean;
}

export interface QuestReward {
  stateFlag?: string;
  message: string;
  items?: Record<string, number>;
}

export interface Quest {
  title: string;
  description: string;
  objectives: Objective[];
  reward: QuestReward;
}

export interface QuestStatus {
  questId: string;
  status: 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  objectives: Record<string, boolean>;
  startedAt?: number;
  completedAt?: number;
}

export class QuestManager {
  private gameState: GameState;
  private questsData: Record<string, Quest> = {};
  private activeQuests: Record<string, QuestStatus> = {};
  private questEvents: Phaser.Events.EventEmitter;

  constructor(_scene: Phaser.Scene, questsData: Record<string, Quest>) {
    this.gameState = GameState.getInstance();
    this.questsData = questsData;
    this.questEvents = new Phaser.Events.EventEmitter();

    this.loadQuestStates();
  }

  private loadQuestStates(): void {
    // Load quest states from GameState
    const savedQuests = this.gameState.get('quests') as Record<string, QuestStatus> | undefined;
    if (savedQuests) {
      this.activeQuests = savedQuests;
    }
  }

  /**
   * Start a new quest
   */
  startQuest(questId: string): boolean {
    if (!this.questsData[questId]) {
      console.warn(`[QuestManager] Quest not found: ${questId}`);
      return false;
    }

    if (this.activeQuests[questId]) {
      console.warn(`[QuestManager] Quest already started: ${questId}`);
      return false;
    }

    const quest = this.questsData[questId];
    const questStatus: QuestStatus = {
      questId,
      status: 'ACTIVE',
      objectives: {},
      startedAt: Date.now(),
    };

    // Initialize objectives
    quest.objectives.forEach((obj) => {
      questStatus.objectives[obj.id] = false;
    });

    this.activeQuests[questId] = questStatus;
    this.saveQuestStates();

    console.log(`[QuestManager] Quest started: ${questId}`);
    this.questEvents.emit('questStarted', { questId, quest });

    return true;
  }

  /**
   * Complete an objective within a quest
   */
  completeObjective(questId: string, objectiveId: string): boolean {
    const questStatus = this.activeQuests[questId];
    if (!questStatus) {
      console.warn(`[QuestManager] Quest not active: ${questId}`);
      return false;
    }

    if (questStatus.status !== 'ACTIVE') {
      console.warn(`[QuestManager] Quest is not active: ${questId}`);
      return false;
    }

    if (!(objectiveId in questStatus.objectives)) {
      console.warn(`[QuestManager] Objective not found: ${objectiveId}`);
      return false;
    }

    questStatus.objectives[objectiveId] = true;
    console.log(`[QuestManager] Objective completed: ${questId} -> ${objectiveId}`);
    this.questEvents.emit('objectiveCompleted', { questId, objectiveId });

    // Check if all objectives are complete
    if (this.areAllObjectivesComplete(questId)) {
      this.completeQuest(questId);
    }

    this.saveQuestStates();
    return true;
  }

  /**
   * Complete an entire quest
   */
  completeQuest(questId: string): boolean {
    const questStatus = this.activeQuests[questId];
    if (!questStatus) {
      console.warn(`[QuestManager] Quest not found: ${questId}`);
      return false;
    }

    questStatus.status = 'COMPLETED';
    questStatus.completedAt = Date.now();

    const quest = this.questsData[questId];
    if (quest.reward.stateFlag) {
      this.gameState.set(quest.reward.stateFlag, true);
    }

    console.log(`[QuestManager] Quest completed: ${questId}`);
    console.log(`[QuestManager] Reward: ${quest.reward.message}`);
    this.questEvents.emit('questCompleted', { questId, quest });

    this.saveQuestStates();
    return true;
  }

  /**
   * Fail a quest
   */
  failQuest(questId: string): boolean {
    const questStatus = this.activeQuests[questId];
    if (!questStatus) {
      console.warn(`[QuestManager] Quest not found: ${questId}`);
      return false;
    }

    questStatus.status = 'FAILED';
    console.log(`[QuestManager] Quest failed: ${questId}`);
    this.questEvents.emit('questFailed', { questId });

    this.saveQuestStates();
    return true;
  }

  /**
   * Get a specific quest status
   */
  getQuestStatus(questId: string): QuestStatus | undefined {
    return this.activeQuests[questId];
  }

  /**
   * Get all active quests
   */
  getActiveQuests(): QuestStatus[] {
    return Object.values(this.activeQuests).filter((q) => q.status === 'ACTIVE');
  }

  /**
   * Get all completed quests
   */
  getCompletedQuests(): QuestStatus[] {
    return Object.values(this.activeQuests).filter((q) => q.status === 'COMPLETED');
  }

  /**
   * Check if all objectives are complete
   */
  private areAllObjectivesComplete(questId: string): boolean {
    const questStatus = this.activeQuests[questId];
    if (!questStatus) return false;

    return Object.values(questStatus.objectives).every((completed) => completed === true);
  }

  /**
   * Get progress of a quest (0-1)
   */
  getQuestProgress(questId: string): number {
    const questStatus = this.activeQuests[questId];
    if (!questStatus) return 0;

    const objectives = Object.values(questStatus.objectives);
    if (objectives.length === 0) return 0;

    const completed = objectives.filter((obj) => obj === true).length;
    return completed / objectives.length;
  }

  /**
   * Listen to quest events
   */
  on(
    event: 'questStarted' | 'objectiveCompleted' | 'questCompleted' | 'questFailed',
    callback: (data: any) => void,
  ): void {
    this.questEvents.on(event, callback);
  }

  /**
   * Save quest states to GameState
   */
  private saveQuestStates(): void {
    this.gameState.set('quests', JSON.stringify(this.activeQuests));
  }

  /**
   * Reset all quests (for debugging)
   */
  resetAllQuests(): void {
    this.activeQuests = {};
    this.saveQuestStates();
    console.log('[QuestManager] All quests reset');
  }

  /**
   * Get debug info
   */
  getDebugInfo(): Record<string, any> {
    return {
      activeQuests: this.getActiveQuests().length,
      completedQuests: this.getCompletedQuests().length,
      quests: this.activeQuests,
    };
  }
}
