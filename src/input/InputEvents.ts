/**
 * Stable event names for world ↔ UI and input commands.
 * Keep payloads small; avoid passing full game objects to UI listeners.
 */
export const InputEvents = {
  INTERACT: 'input:interact',
  INTERACT_TARGET: 'input:interactTarget',
  OPEN_QUESTBOOK: 'input:openQuestbook',
  CANCEL: 'input:cancel',
} as const;

export const QuestEvents = {
  UPDATE: 'quest:update',
  PROGRESS_CHANGED: 'quest:progressChanged',
  COMPLETED: 'quest:completed',
} as const;

export const ItemEvents = {
  COLLECTED: 'item:collected',
} as const;

export type InteractTargetPayload = {
  targetId: string;
  x: number;
  y: number;
};

export type ItemCollectedPayload = {
  itemId: string;
  questId: string;
};
