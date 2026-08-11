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
    // Initialize default state values
    this.state = {
      hasSpokenToWelcomeNPC: false,
      hasSpokenToVibesNPC: false,
      totalDialoguesRead: 0,
    };
  }

  /**
   * Get a state value by key.
   */
  get(key: string): boolean | number | string | undefined {
    return this.state[key];
  }

  /**
   * Set a state value.
   */
  set(key: string, value: boolean | number | string): void {
    this.state[key] = value;
    console.log(`[GameState] Set ${key} = ${value}`);
  }

  /**
   * Mark that a dialogue has been read.
   */
  markDialogueRead(dialogueId: string): void {
    const key = `read_${dialogueId}`;
    this.set(key, true);
    const total = (this.get('totalDialoguesRead') as number) || 0;
    this.set('totalDialoguesRead', total + 1);
  }

  /**
   * Check if a dialogue has been read.
   */
  hasReadDialogue(dialogueId: string): boolean {
    return (this.get(`read_${dialogueId}`) as boolean) || false;
  }

  /**
   * Mark that a quest has been started.
   */
  markQuestStarted(questId: string): void {
    this.set(`quest_${questId}_started`, true);
  }

  /**
   * Check if a quest has been started.
   */
  hasQuestStarted(questId: string): boolean {
    return (this.get(`quest_${questId}_started`) as boolean) || false;
  }

  /**
   * Reset all state (useful for testing or new game).
   */
  reset(): void {
    this.initializeState();
    console.log('[GameState] State reset to defaults');
  }

  /**
   * Get all state as an object (for debugging).
   */
  getAll(): Record<string, boolean | number | string> {
    return { ...this.state };
  }
}
