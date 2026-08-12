import { log } from '../utils/logger';

/**
 * Global game state manager for tracking player progress and NPC interactions.
 */
export class GameState {
  private static instance: GameState;
  private state: Record<string, boolean | number | string> = {};

  private constructor() {
    this.initializeState();
  }

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  private initializeState(): void {
    this.state = {
      hasSpokenToWelcomeNPC: false,
      hasSpokenToVibesNPC: false,
      totalDialoguesRead: 0,
    };
  }

  get(key: string): boolean | number | string | undefined {
    return this.state[key];
  }

  set(key: string, value: boolean | number | string): void {
    this.state[key] = value;
    log.debug(`[GameState] Set ${key} = ${value}`);
  }

  markDialogueRead(dialogueId: string): void {
    const key = `read_${dialogueId}`;
    this.set(key, true);
    const total = (this.get('totalDialoguesRead') as number) || 0;
    this.set('totalDialoguesRead', total + 1);
  }

  hasReadDialogue(dialogueId: string): boolean {
    return (this.get(`read_${dialogueId}`) as boolean) || false;
  }

  markQuestStarted(questId: string): void {
    this.set(`quest_${questId}_started`, true);
  }

  hasQuestStarted(questId: string): boolean {
    return (this.get(`quest_${questId}_started`) as boolean) || false;
  }

  reset(): void {
    this.initializeState();
    log.debug('[GameState] State reset to defaults');
  }

  getAll(): Record<string, boolean | number | string> {
    return { ...this.state };
  }
}
