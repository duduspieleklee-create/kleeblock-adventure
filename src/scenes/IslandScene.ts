import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { SunnysidePlayer } from '../objects/SunnysidePlayer';
import { InteractionManager } from '../managers/InteractionManager';
import { QuestManager, Quest } from '../managers/QuestManager';
import { QuestHUD } from '../ui/QuestHUD';

/** Depth convention (bottom → top) */
const DEPTH = {
  SEA: 0,
  GROUND: 1,
  DECOR: 2,
  ENTITIES: 10,
  HUD: 9999,
} as const;

export class IslandScene extends Phaser.Scene {
  private player!: SunnysidePlayer;
  private npcGroup!: Phaser.Physics.Arcade.StaticGroup;
  private hud!: Phaser.GameObjects.Container;
  private map!: Phaser.Tilemaps.Tilemap;

  // Visual layers – prefer TilemapGPULayer when available
  private seaLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private decorLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;

  // Collision must stay on CPU for Arcade Physics
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer;

  private interactionManager?: InteractionManager;
  private questManager?: QuestManager;
  private questHUD?: QuestHUD;

  private dialogueData: Record<string, { sequence: string[] }> = {};
  private questsData: Record<string, Quest> = {};

  constructor() {
    super({ key: 'IslandScene' });
  }

  create(): void {
    // Cache data (loaded in PreloaderScene via pack.json)
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
    this.setupHUD();
    this.setupDebug();

    // Interaction + quest systems
    const npcs = this.npcGroup.getChildren() as NPC[];
    this.interactionManager = new InteractionManager(this, this.player, npcs, this.dialogueData);

    this.questManager = new QuestManager(this, this.questsData);
    this.setupQuestTriggers();
    this.questHUD = new QuestHUD(this, this.questManager, this.questsData);

    // Start the default quest
    this.questManager.startQuest('island_explorer');

    // Initial spatial markers
    this.updateQuestMarkers();

    // Listen for quest changes to refresh markers
    this.questManager.on('questStarted', () => this.updateQuestMarkers());
    this.questManager.on('objectiveCompleted', () => this.updateQuestMarkers());
    this.questManager.on('questCompleted', () => this.updateQuestMarkers());

    // Y-sorting for characters
    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateDepth, this);
  }

  // ---------------------------------------------------------------------------
  // Map
  // ---------------------------------------------------------------------------

  private setupMap(): Phaser.Tilemaps.Tilemap | null {
    const map = this.make.tilemap({ key: 'island' });

    const tileset = map.addTilesetImage('sunnyside', 'sunnyside');
    if (!tileset) {
      console.error('[IslandScene] Tileset "sunnyside" failed to load');
      return null;
    }

    // Use GPU layers for static visual content when WebGL is available
    const useGPU = this.game.renderer.type === Phaser.WEBGL;

    this.seaLayer = map.createLayer('sea', tileset, 0, 0, useGPU)!;
    this.seaLayer.setDepth(DEPTH.SEA);

    this.groundLayer = map.createLayer('ground', tileset, 0, 0, useGPU)!;
    this.groundLayer.setDepth(DEPTH.GROUND);

    this.decorLayer = map.createLayer('ground_decoration', tileset, 0, 0, useGPU)!;
    this.decorLayer.setDepth(DEPTH.DECOR);

    // Collision layer – MUST remain a regular TilemapLayer (physics reads CPU tile data)
    // Uses Tiled custom property collides=true on solid tiles (tileset local id 0 / GID 1)
    this.collisionLayer = map.createLayer('collision', tileset, 0, 0, false)!;
    this.collisionLayer.setVisible(false).setDepth(-1);
    this.collisionLayer.setCollisionByProperty({ collides: true });

    return map;
  }

  private setupPhysics(map: Phaser.Tilemaps.Tilemap): void {
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
  }

  // ---------------------------------------------------------------------------
  // Player & NPCs (from Tiled objects layer)
  // ---------------------------------------------------------------------------

  private getObjectProperty(obj: Phaser.Types.Tilemaps.TiledObject, key: string): string | undefined {
    const props = obj.properties as Array<{ name: string; value: unknown }> | undefined;
    if (!props) return undefined;
    const found = props.find((p) => p.name === key);
    return found ? String(found.value) : undefined;
  }

  private setupPlayer(): void {
    // Prefer spawn point from Tiled objects layer
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
      // Fallback to hard-coded positions if objects layer is missing
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

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    const cam = this.cameras.main;

    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.startFollow(this.player, true, 0.1, 0.1);
    cam.setZoom(2);
    cam.setRoundPixels(true); // crisp 16 px tiles + character sprites
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private setupHUD(): void {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD);

    const backBtn = this.add
      .text(this.cameras.main.width - 60, 10, '← Menu', {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 6, y: 3 },
      })
      .setAlpha(0.8)
      .setInteractive({ useHandCursor: true });

    backBtn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.stop('IslandScene');
      this.scene.start('MainMenuScene');
    });

    this.hud.add(backBtn);

    this.hud.add(
      this.add.text(4, this.cameras.main.height - 16, import.meta.env.GAME_VERSION ?? '', {
        fontSize: '9px',
        color: '#888888',
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Physics Debug (?debug=1)
  // ---------------------------------------------------------------------------

  private setupDebug(): void {
    const params = new URLSearchParams(window.location.search);
    const debugEnabled =
      params.get('debug') === '1' || params.get('debug') === 'true';

    if (!debugEnabled) return;

    // Show colliding tiles
    const debugGraphics = this.add.graphics().setAlpha(0.6).setDepth(50);
    this.collisionLayer.renderDebug(debugGraphics, {
      tileColor: null,
      collidingTileColor: new Phaser.Display.Color(243, 134, 48, 200),
      faceColor: new Phaser.Display.Color(40, 39, 37, 255),
    });

    // Enable Arcade Physics body outlines
    this.physics.world.createDebugGraphic();
    this.physics.world.drawDebug = true;

    console.log('[IslandScene] Physics debug enabled (?debug=1)');
  }

  // ---------------------------------------------------------------------------
  // Quests + Spatial Markers
  // ---------------------------------------------------------------------------

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

  /**
   * Update spatial ! markers above NPCs based on active quest objectives.
   * Shows a golden ! when an NPC is the target of an incomplete dialogue objective.
   */
  private updateQuestMarkers(): void {
    if (!this.questManager || !this.npcGroup) return;

    const activeQuests = this.questManager.getActiveQuests();
    const targetDialogueIds = new Set<string>();

    // Collect all dialogue targets from incomplete objectives
    for (const status of activeQuests) {
      const quest = this.questsData[status.questId];
      if (!quest) continue;

      for (const obj of quest.objectives) {
        if (obj.type === 'dialogue' && !status.objectives[obj.id]) {
          targetDialogueIds.add(obj.targetId);
        }
      }
    }

    // Apply markers to NPCs
    this.npcGroup.getChildren().forEach((child) => {
      const npc = child as NPC;
      const shouldShow = targetDialogueIds.has(npc.dialogueId);
      npc.setQuestMarker(shouldShow, '#ffcc00');
    });
  }

  // ---------------------------------------------------------------------------
  // Y-sorting
  // ---------------------------------------------------------------------------

  private updateDepth = (): void => {
    this.player.setDepth(DEPTH.ENTITIES + this.player.y * 0.01);

    this.npcGroup.getChildren().forEach((child) => {
      const sprite = child as Phaser.GameObjects.Sprite;
      sprite.setDepth(DEPTH.ENTITIES + sprite.y * 0.01);
    });
  };

  // ---------------------------------------------------------------------------
  // Update / Shutdown
  // ---------------------------------------------------------------------------

  update(): void {
    this.player.update();

    if (this.interactionManager) {
      this.interactionManager.update({ x: this.player.x, y: this.player.y });
    }
  }

  shutdown(): void {
    this.interactionManager?.shutdown();
    this.questHUD?.shutdown();

    this.events.off(Phaser.Scenes.Events.UPDATE, this.updateDepth, this);
    this.events.off('dialogueSequenceCompleted');
  }
}
