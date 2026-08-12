import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { SunnysidePlayer } from '../objects/SunnysidePlayer';
import { CollectibleItem } from '../objects/CollectibleItem';
import { buildSceneryColliders } from '../objects/SceneryCollider';
import { InteractionManager } from '../managers/InteractionManager';
import { QuestManager, Quest } from '../managers/QuestManager';
import { SpawnManager } from '../managers/SpawnManager';
import { InputManager } from '../input/InputManager';
import { InputEvents, InteractTargetPayload, ItemEvents } from '../input/InputEvents';
import {
  loadIslandMap,
  getNpcSpawns,
  getPlayerSpawn,
  MAP_DEPTH,
} from '../maps/MapLoader';
import { isFootprintWalkable } from '../maps/Walkability';

const DEFAULT_SCENERY = [
  { x: 120, y: 100, width: 12, height: 10, name: 'trunk_nw' },
  { x: 248, y: 100, width: 12, height: 10, name: 'trunk_ne' },
  { x: 100, y: 200, width: 12, height: 10, name: 'trunk_sw' },
  { x: 240, y: 210, width: 14, height: 10, name: 'rock_se' },
];

export class IslandScene extends Phaser.Scene {
  private player!: SunnysidePlayer;
  private npcGroup!: Phaser.Physics.Arcade.StaticGroup;
  private sceneryGroup?: Phaser.Physics.Arcade.StaticGroup;
  private map!: Phaser.Tilemaps.Tilemap;

  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;

  private interactionManager?: InteractionManager;
  private questManager?: QuestManager;
  private spawnManager?: SpawnManager;
  private inputManager?: InputManager;

  private dialogueData: Record<string, { sequence: string[] }> = {};
  private questsData: Record<string, Quest> = {};

  constructor() {
    super({ key: 'IslandScene' });
  }

  create(): void {
    this.dialogueData = this.cache.json.get('dialogues') ?? {};
    this.questsData = this.cache.json.get('quests') ?? {};

    const loaded = loadIslandMap(this);
    if (!loaded) {
      console.error('[IslandScene] Map setup failed – aborting scene');
      this.scene.start('MainMenuScene');
      return;
    }

    this.map = loaded.map;
    this.collisionLayer = loaded.layers.collision;

    this.setupPhysics(loaded.map);
    this.setupPlayer();
    this.setupNPCs();
    this.setupScenery();
    this.setupCamera(loaded.map);
    this.setupDebug();
    this.setupInput();

    const npcs = this.npcGroup.getChildren() as NPC[];
    this.interactionManager = new InteractionManager(this, this.player, npcs, this.dialogueData);

    this.questManager = new QuestManager(this, this.questsData);
    this.spawnManager = new SpawnManager(this, this.map, this.collisionLayer);
    this.setupItemCollection();
    this.setupQuestTriggers();

    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene', {
        questManager: this.questManager,
        questsData: this.questsData,
        worldSceneKey: 'IslandScene',
      });
    }

    this.questManager.startQuest('island_explorer');

    if (this.questManager.startQuest('find_supplies')) {
      const def = this.questManager.getQuestDefinition('find_supplies');
      const itemKey = def?.itemKey ?? 'supply_crate';
      const count = def?.requiredCount ?? 3;
      this.spawnManager.spawnForQuest('find_supplies', itemKey, count, {
        x: this.player.x,
        y: this.player.y,
      }, { minPlayerDistance: 40 });
    }

    this.updateQuestMarkers();

    this.questManager.on('questStarted', () => this.updateQuestMarkers());
    this.questManager.on('objectiveCompleted', () => this.updateQuestMarkers());
    this.questManager.on('questCompleted', () => this.updateQuestMarkers());

    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateDepth, this);
  }

  private setupItemCollection(): void {
    if (!this.spawnManager) return;

    this.physics.add.overlap(
      this.player,
      this.spawnManager.getGroup(),
      (_player, obj) => {
        const item = obj as CollectibleItem;
        if (!(item instanceof CollectibleItem) || item.isCollected()) return;

        if (!item.collect()) return;

        this.spawnManager?.removeItem(item);

        this.events.emit(ItemEvents.COLLECTED, {
          itemId: item.itemId,
          questId: item.questId,
        });

        this.questManager?.onItemCollected(item.questId, item.itemId);
      },
      undefined,
      this,
    );
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
    return isFootprintWalkable(this.map, this.collisionLayer, worldX, worldY);
  }

  private onInputInteract(): void {}
  private onInputInteractTarget(payload: InteractTargetPayload): void {
    if (import.meta.env.DEV) {
      console.log('[IslandScene] interactTarget', payload.targetId);
    }
  }
  private onOpenQuestbook(): void {}
  private onInputCancel(): void {}

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

  private setupPlayer(): void {
    const spawn = getPlayerSpawn(this.map);
    const x = spawn?.x ?? 160;
    const y = spawn?.y ?? 180;

    this.player = new SunnysidePlayer(this, x, y);
    this.player.setDepth(MAP_DEPTH.ENTITIES);
    this.physics.add.collider(this.player, this.collisionLayer);
  }

  private setupNPCs(): void {
    this.npcGroup = this.physics.add.staticGroup();

    const npcSpawns = getNpcSpawns(this.map);

    if (npcSpawns.length === 0) {
      console.warn('[IslandScene] No NPCs in NPCSpawns/objects – using fallback');
      const fallback = [
        { x: 160, y: 120, dialogueId: 'welcome_npc' },
        { x: 200, y: 180, dialogueId: 'vibes_npc' },
      ];
      for (const data of fallback) {
        const npc = new NPC(this, data.x, data.y, data.dialogueId);
        npc.setDepth(MAP_DEPTH.ENTITIES);
        this.npcGroup.add(npc);
      }
    } else {
      for (const obj of npcSpawns) {
        const dialogueId =
          (typeof obj.properties.dialogueId === 'string'
            ? obj.properties.dialogueId
            : null) ||
          obj.name ||
          'unknown';
        const npc = new NPC(this, obj.x, obj.y, dialogueId);
        npc.setDepth(MAP_DEPTH.ENTITIES);
        this.npcGroup.add(npc);
      }
    }

    this.physics.add.collider(this.npcGroup, this.collisionLayer);
    this.physics.add.collider(this.player, this.npcGroup);
  }

  private setupScenery(): void {
    this.sceneryGroup = buildSceneryColliders(this, this.map, DEFAULT_SCENERY);
    this.physics.add.collider(this.player, this.sceneryGroup);
    this.physics.add.collider(this.npcGroup, this.sceneryGroup);
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.1, 0.1);
    cam.setZoom(2);
    cam.setRoundPixels(true);
  }

  private setupDebug(): void {
    if (!this.isPhysicsDebugEnabled()) return;

    const debugGraphics = this.add.graphics().setAlpha(0.6).setDepth(50);
    this.collisionLayer.renderDebug(debugGraphics, {
      tileColor: null,
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    });
    this.collisionLayer.setVisible(true).setAlpha(0.35);

    this.sceneryGroup?.getChildren().forEach((child) => {
      const r = child as Phaser.GameObjects.Rectangle;
      r.setVisible(true);
      r.setFillStyle(0x00aaff, 0.35);
      r.setStrokeStyle(1, 0x00ffff, 0.9);
    });

    this.physics.world.createDebugGraphic();
    this.physics.world.drawDebug = true;

    console.log('[IslandScene] Physics + collision + scenery debug (?debug=1)');
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
      npc.setQuestMarker(targetDialogueIds.has(npc.dialogueId), '#ffcc00');
    });
  }

  private updateDepth = (): void => {
    this.player.setDepth(MAP_DEPTH.ENTITIES + this.player.y * 0.01);

    this.npcGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      sprite.setDepth(MAP_DEPTH.ENTITIES + sprite.y * 0.01);
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
    this.spawnManager?.shutdown();

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
