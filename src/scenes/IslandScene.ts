import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { SunnysidePlayer } from '../objects/SunnysidePlayer';
import { InteractionManager } from '../managers/InteractionManager';
import { QuestManager, Quest } from '../managers/QuestManager';
import { InputManager } from '../input/InputManager';
import { InputEvents, InteractTargetPayload } from '../input/InputEvents';

/** Depth convention (bottom → top) — world only; UI lives in UIScene */
const DEPTH = {
  SEA: 0,
  GROUND: 1,
  DECOR: 2,
  ENTITIES: 10,
} as const;

export class IslandScene extends Phaser.Scene {
  private player!: SunnysidePlayer;
  private npcGroup!: Phaser.Physics.Arcade.StaticGroup;
  private map!: Phaser.Tilemaps.Tilemap;

  private seaLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private decorLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;

  private interactionManager?: InteractionManager;
  private questManager?: QuestManager;
  private inputManager?: InputManager;

  private dialogueData: Record<string, { sequence: string[] }> = {};
  private questsData: Record<string, Quest> = {};

  constructor() {
    super({ key: 'IslandScene' });
  }

  create(): void {
    this.dialogueData = this.cache.json.get('dialogues') ?? {};
    this.questsData = this.cache.json.get('quests') ?? {};

    const map = this.setupMap();
    if (!map) {
      console.error('[IslandScene] Map setup failed – aborting scene');
      this.scene.start('MainMenuScene');
      return;
    }
    this.map = map;

    this.setupPhysics(map);
    this.setupPlayer();
    this.setupNPCs();
    this.setupCamera(map);
    this.setupDebug();
    this.setupInput();

    const npcs = this.npcGroup.getChildren() as NPC[];
    this.interactionManager = new InteractionManager(this, this.player, npcs, this.dialogueData);

    this.questManager = new QuestManager(this, this.questsData);
    this.setupQuestTriggers();

    // Screen-space UI lives in UIScene (Milestone 4)
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene', {
        questManager: this.questManager,
        questsData: this.questsData,
        worldSceneKey: 'IslandScene',
      });
    }

    this.questManager.startQuest('island_explorer');
    this.updateQuestMarkers();

    this.questManager.on('questStarted', () => this.updateQuestMarkers());
    this.questManager.on('objectiveCompleted', () => this.updateQuestMarkers());
    this.questManager.on('questCompleted', () => this.updateQuestMarkers());

    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateDepth, this);
  }

  private setupInput(): void {
    this.inputManager = new InputManager(this, {
      player: this.player,
      speed: 80,
      pointer: {
        isPointerOnUI: (pointer) => this.isPointerOnUI(pointer),
        isWalkable: (x, y) => this.isWalkable(x, y),
        findTargets: () => this.getInteractiveTargets(),
        interactPickRadius: 40,
      },
    });

    this.events.on(InputEvents.INTERACT, this.onInputInteract, this);
    this.events.on(InputEvents.INTERACT_TARGET, this.onInputInteractTarget, this);
    this.events.on(InputEvents.OPEN_QUESTBOOK, this.onOpenQuestbook, this);
    this.events.on(InputEvents.CANCEL, this.onInputCancel, this);
  }

  private getInteractiveTargets() {
    const npcs = this.npcGroup.getChildren() as NPC[];
    return npcs.map((npc) => ({
      id: npc.dialogueId,
      x: npc.x,
      y: npc.y,
      radius: 36,
    }));
  }

  /**
   * Prefer UIScene input objects. Also treat scrollFactor 0 hits in this scene
   * (legacy) and any active UIScene interactive as UI.
   */
  private isPointerOnUI(pointer: Phaser.Input.Pointer): boolean {
    const uiScene = this.scene.get('UIScene');
    if (uiScene && uiScene.scene.isActive()) {
      const uiHits = uiScene.input.hitTestPointer(pointer);
      if (uiHits.length > 0) return true;
    }

    const hits = this.input.hitTestPointer(pointer);
    return hits.some((obj) => {
      const go = obj as Phaser.GameObjects.GameObject & { scrollFactorX?: number };
      return typeof go.scrollFactorX === 'number' && go.scrollFactorX === 0;
    });
  }

  private isWalkable(worldX: number, worldY: number): boolean {
    if (!this.collisionLayer || !this.map) return false;

    if (
      worldX < 0 ||
      worldY < 0 ||
      worldX >= this.map.widthInPixels ||
      worldY >= this.map.heightInPixels
    ) {
      return false;
    }

    const tile = this.collisionLayer.getTileAtWorldXY(worldX, worldY, true);
    if (!tile || tile.index === -1) {
      return true;
    }

    return !tile.collides;
  }

  private onInputInteract(): void {
    // InteractionManager listens for input:interact
  }

  private onInputInteractTarget(payload: InteractTargetPayload): void {
    if (import.meta.env.DEV) {
      console.log('[IslandScene] interactTarget', payload.targetId);
    }
  }

  private onOpenQuestbook(): void {
    // UIScene listens on world.events for input:openQuestbook
  }

  private onInputCancel(): void {
    // UIScene closes questbook; movement already cleared by keyboard controller
  }

  private setupMap(): Phaser.Tilemaps.Tilemap | null {
    const map = this.make.tilemap({ key: 'island' });

    const tileset = map.addTilesetImage('sunnyside', 'sunnyside');
    if (!tileset) {
      console.error('[IslandScene] Tileset "sunnyside" failed to load');
      return null;
    }

    const useGPU = this.game.renderer.type === Phaser.WEBGL;

    this.seaLayer = map.createLayer('sea', tileset, 0, 0, useGPU)!;
    this.seaLayer.setDepth(DEPTH.SEA);

    this.groundLayer = map.createLayer('ground', tileset, 0, 0, useGPU)!;
    this.groundLayer.setDepth(DEPTH.GROUND);

    this.decorLayer = map.createLayer('ground_decoration', tileset, 0, 0, useGPU)!;
    this.decorLayer.setDepth(DEPTH.DECOR);

    this.collisionLayer = map.createLayer('collision', tileset, 0, 0, false)! as Phaser.Tilemaps.TilemapLayer;
    this.collisionLayer.setVisible(false).setDepth(-1);
    this.collisionLayer.setCollisionByProperty({ collides: true });

    return map;
  }

  private setupPhysics(map: Phaser.Tilemaps.Tilemap): void {
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    if (this.isPhysicsDebugEnabled()) {
      this.physics.world.createDebugGraphic();
      this.physics.world.drawDebug = true;
    }
  }

  private isPhysicsDebugEnabled(): boolean {
    try {
      const value = new URLSearchParams(window.location.search).get('debug');
      return value === '1' || value === 'true';
    } catch {
      return false;
    }
  }

  private getObjectProperty(obj: Phaser.Types.Tilemaps.TiledObject, key: string): string | undefined {
    const props = obj.properties as Array<{ name: string; value: unknown }> | undefined;
    if (!props) return undefined;
    const found = props.find((p) => p.name === key);
    return found ? String(found.value) : undefined;
  }

  private setupPlayer(): void {
    let x = 160;
    let y = 180;

    const objectLayer = this.map.getObjectLayer('objects');
    if (objectLayer) {
      const spawn = objectLayer.objects.find(
        (o) => o.type === 'spawn' || o.name === 'player_spawn',
      );
      if (spawn && spawn.x !== undefined && spawn.y !== undefined) {
        x = spawn.x;
        y = spawn.y;
      }
    }

    this.player = new SunnysidePlayer(this, x, y);
    this.player.setDepth(DEPTH.ENTITIES);
    this.physics.add.collider(this.player, this.collisionLayer);
  }

  private setupNPCs(): void {
    this.npcGroup = this.physics.add.staticGroup();

    const objectLayer = this.map.getObjectLayer('objects');
    const npcObjects =
      objectLayer?.objects.filter((o) => o.type === 'npc' || this.getObjectProperty(o, 'dialogueId')) ??
      [];

    if (npcObjects.length === 0) {
      console.warn('[IslandScene] No NPCs found in objects layer – using fallback positions');
      const fallback = [
        { x: 160, y: 120, dialogueId: 'welcome_npc' },
        { x: 200, y: 180, dialogueId: 'vibes_npc' },
      ];
      for (const data of fallback) {
        const npc = new NPC(this, data.x, data.y, data.dialogueId);
        npc.setDepth(DEPTH.ENTITIES);
        this.npcGroup.add(npc);
      }
    } else {
      for (const obj of npcObjects) {
        const dialogueId =
          this.getObjectProperty(obj, 'dialogueId') || obj.name || 'unknown';
        const x = obj.x ?? 0;
        const y = obj.y ?? 0;
        const npc = new NPC(this, x, y, dialogueId);
        npc.setDepth(DEPTH.ENTITIES);
        this.npcGroup.add(npc);
      }
    }

    this.physics.add.collider(this.npcGroup, this.collisionLayer);
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    const cam = this.cameras.main;

    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.1, 0.1);
    cam.setZoom(2);
    cam.setRoundPixels(true);
  }

  private setupDebug(): void {
    const params = new URLSearchParams(window.location.search);
    const debugEnabled =
      params.get('debug') === '1' || params.get('debug') === 'true';

    if (!debugEnabled) return;

    const debugGraphics = this.add.graphics().setAlpha(0.6).setDepth(50);
    this.collisionLayer.renderDebug(debugGraphics, {
      tileColor: null,
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    });

    this.physics.world.createDebugGraphic();
    this.physics.world.drawDebug = true;

    console.log('[IslandScene] Physics debug enabled (?debug=1)');
  }

  private setupQuestTriggers(): void {
    if (!this.questManager) return;

    this.events.on('dialogueSequenceCompleted', (data: { dialogueId: string }) => {
      const { dialogueId } = data;
      const activeQuests = this.questManager!.getActiveQuests();

      for (const questStatus of activeQuests) {
        const quest = this.questsData[questStatus.questId];
        if (!quest) continue;

        for (const objective of quest.objectives) {
          if (objective.type === 'dialogue' && objective.targetId === dialogueId) {
            this.questManager!.completeObjective(questStatus.questId, objective.id);
          }
        }
      }
    });
  }

  private updateQuestMarkers(): void {
    if (!this.questManager || !this.npcGroup) return;

    const activeQuests = this.questManager.getActiveQuests();
    const targetDialogueIds = new Set<string>();

    for (const status of activeQuests) {
      const quest = this.questsData[status.questId];
      if (!quest) continue;

      for (const obj of quest.objectives) {
        if (obj.type === 'dialogue' && !status.objectives[obj.id]) {
          targetDialogueIds.add(obj.targetId);
        }
      }
    }

    this.npcGroup.getChildren().forEach((child) => {
      const npc = child as NPC;
      const shouldShow = targetDialogueIds.has(npc.dialogueId);
      npc.setQuestMarker(shouldShow, '#ffcc00');
    });
  }

  private updateDepth = (): void => {
    this.player.setDepth(DEPTH.ENTITIES + this.player.y * 0.01);

    this.npcGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      sprite.setDepth(DEPTH.ENTITIES + sprite.y * 0.01);
    });
  };

  update(): void {
    if (this.inputManager) {
      const result = this.inputManager.update();
      this.player.applyMovementResult(result);
    }

    if (this.interactionManager) {
      this.interactionManager.update({ x: this.player.x, y: this.player.y });
    }
  }

  shutdown(): void {
    this.inputManager?.shutdown();
    this.interactionManager?.shutdown();

    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }

    this.events.off(Phaser.Scenes.Events.UPDATE, this.updateDepth, this);
    this.events.off('dialogueSequenceCompleted');
    this.events.off(InputEvents.INTERACT, this.onInputInteract, this);
    this.events.off(InputEvents.INTERACT_TARGET, this.onInputInteractTarget, this);
    this.events.off(InputEvents.OPEN_QUESTBOOK, this.onOpenQuestbook, this);
    this.events.off(InputEvents.CANCEL, this.onInputCancel, this);
  }
}
