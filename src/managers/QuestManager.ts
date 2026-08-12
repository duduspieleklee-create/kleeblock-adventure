import Phaser from 'phaser';
import { GameState } from './GameState';

export interface Objective {
  id: string;
  description: string;
  type: 'dialogue' | 'location' | 'item' | 'custom';
  targetId: string;
  completed?: boolean;
  /** For item objectives: how many to collect */
  requiredCount?: number;
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
  /** Optional spawn metadata for item quests */
  itemKey?: string;
  requiredCount?: number;
}

export interface QuestStatus {
  questId: string;
  status: 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED' | 'FAILED';
  objectives: Record<string, boolean>;
  /** Item collection counts per objective id */
  itemCounts: Record<string, number>;
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
    const raw = this.gameState.get('quests');
    if (!raw) return;

    try {
      const saved =
        typeof raw === 'string'
          ? (JSON.parse(raw) as Record<string, QuestStatus>)
          : (raw as Record<string, QuestStatus>);
      this.activeQuests = saved;
      // Backfill itemCounts for older saves
      for (const status of Object.values(this.activeQuests)) {
        if (!status.itemCounts) status.itemCounts = {};
      }
    } catch {
      console.warn('[QuestManager] Failed to parse saved quests');
    }
  }

  startQuest(questId: string): boolean {
    if (!this.questsData[questId]) {
      console.warn(`[QuestManager] Quest not found: ${questId}`);
      return false;
    }

    if (this.activeQuests[questId]?.status === 'ACTIVE') {
      console.warn(`[QuestManager] Quest already active: ${questId}`);
      return false;
    }

    // Allow restart if previously completed only when explicitly cleared; block re-start if still active
    if (this.activeQuests[questId]?.status === 'COMPLETED') {
      console.warn(`[QuestManager] Quest already completed: ${questId}`);
      return false;
    }

    const quest = this.questsData[questId];
    const questStatus: QuestStatus = {
      questId,
      status: 'ACTIVE',
      objectives: {},
      itemCounts: {},
      startedAt: Date.now(),
    };

    quest.objectives.forEach((obj) => {
      questStatus.objectives[obj.id] = false;
      if (obj.type === 'item') {
        questStatus.itemCounts[obj.id] = 0;
      }
    });

    this.activeQuests[questId] = questStatus;
    this.saveQuestStates();

    console.log(`[QuestManager] Quest started: ${questId}`);
    this.questEvents.emit('questStarted', { questId, quest });

    return true;
  }

  /**
   * Handle item:collected — increments count for matching item objectives.
   */
  onItemCollected(questId: string, itemId: string): boolean {
    const questStatus = this.activeQuests[questId];
    if (!questStatus || questStatus.status !== 'ACTIVE') {
      return false;
    }

    const quest = this.questsData[questId];
    if (!quest) return false;

    let progressed = false;

    for (const objective of quest.objectives) {
      if (objective.type !== 'item') continue;
      if (objective.targetId !== itemId) continue;
      if (questStatus.objectives[objective.id]) continue;

      const required = objective.requiredCount ?? quest.requiredCount ?? 1;
      const current = (questStatus.itemCounts[objective.id] ?? 0) + 1;
      questStatus.itemCounts[objective.id] = current;
      progressed = true;

      this.questEvents.emit('itemProgress', {
        questId,
        objectiveId: objective.id,
        current,
        required,
      });

      if (current >= required) {
        this.completeObjective(questId, objective.id);
      }
    }

    if (progressed) this.saveQuestStates();
    return progressed;
  }

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

    if (questStatus.objectives[objectiveId]) {
      return false;
    }

    questStatus.objectives[objectiveId] = true;
    console.log(`[QuestManager] Objective completed: ${questId} -> ${objectiveId}`);
    this.questEvents.emit('objectiveCompleted', { questId, objectiveId });

    if (this.areAllObjectivesComplete(questId)) {
      this.completeQuest(questId);
    }

    this.saveQuestStates();
    return true;
  }

  completeQuest(questId: string): boolean {
    const questStatus = this.activeQuests[questId];
    if (!questStatus) {
      console.warn(`[QuestManager] Quest not found: ${questId}`);
      return false;
    }

    questStatus.status = 'COMPLETED';
    questStatus.completedAt = Date.now();

    const quest = this.questsData[questId];
    if (quest?.reward.stateFlag) {
      this.gameState.set(quest.reward.stateFlag, true);
    }

    console.log(`[QuestManager] Quest completed: ${questId}`);
    console.log(`[QuestManager] Reward: ${quest?.reward.message}`);
    this.questEvents.emit('questCompleted', { questId, quest });

    this.saveQuestStates();
    return true;
  }

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

  getQuestStatus(questId: string): QuestStatus | undefined {
    return this.activeQuests[questId];
  }

  getActiveQuests(): QuestStatus[] {
    return Object.values(this.activeQuests).filter((q) => q.status === 'ACTIVE');
  }

  getCompletedQuests(): QuestStatus[] {
    return Object.values(this.activeQuests).filter((q) => q.status === 'COMPLETED');
  }

  getQuestDefinition(questId: string): Quest | undefined {
    return this.questsData[questId];
  }

  private areAllObjectivesComplete(questId: string): boolean {
    const questStatus = this.activeQuests[questId];
    if (!questStatus) return false;

    return Object.values(questStatus.objectives).every((completed) => completed === true);
  }

  getQuestProgress(questId: string): number {
    const questStatus = this.activeQuests[questId];
    if (!questStatus) return 0;

    const objectives = Object.values(questStatus.objectives);
    if (objectives.length === 0) return 0;

    const completed = objectives.filter((obj) => obj === true).length;
    return completed / objectives.length;
  }

  on(
    event:
      | 'questStarted'
      | 'objectiveCompleted'
      | 'questCompleted'
      | 'questFailed'
      | 'itemProgress',
    callback: (data: any) => void,
  ): void {
    this.questEvents.on(event, callback);
  }

  private saveQuestStates(): void {
    this.gameState.set('quests', JSON.stringify(this.activeQuests));
  }

  resetAllQuests(): void {
    this.activeQuests = {};
    this.saveQuestStates();
    console.log('[QuestManager] All quests reset');
  }

  getDebugInfo(): Record<string, any> {
    return {
      activeQuests: this.getActiveQuests().length,
      completedQuests: this.getCompletedQuests().length,
      quests: this.activeQuests,
    };
  }
}
