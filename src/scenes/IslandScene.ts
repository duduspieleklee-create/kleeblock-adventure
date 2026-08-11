import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { SunnysidePlayer } from '../objects/SunnysidePlayer';
import { InteractionManager } from '../managers/InteractionManager';
import { GameState } from '../managers/GameState';

export class IslandScene extends Phaser.Scene {
  private player!: SunnysidePlayer;
  private npcGroup!: Phaser.Physics.Arcade.StaticGroup;
  private hud!: Phaser.GameObjects.Container;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
  private interactionManager?: InteractionManager;
  private gameState: GameState;
  private dialogueData: Record<string, { sequence: string[] }> = {};

  constructor() {
    super({ key: 'IslandScene' });
    this.gameState = GameState.getInstance();
  }

  create(): void {
    // Load dialogue data
    const dialoguesCache = this.cache.json.get('dialogues');
    this.dialogueData = dialoguesCache || {};

    const map = this.setupMap();
    this.setupPhysics(map);
    this.setupPlayer();
    this.setupNPCs();
    this.setupCamera(map);
    this.setupHUD();

    // Initialize interaction manager
    const npcs = this.npcGroup.getChildren() as NPC[];
    this.interactionManager = new InteractionManager(this, this.player, npcs, this.dialogueData);

    // ── Y-sorting ──
    this.events.on(Phaser.Scenes.Events.UPDATE, this.updateDepth, this);
  }

  private setupMap(): Phaser.Tilemaps.Tilemap {
    const map = this.make.tilemap({ key: 'island' });
    const sunnysideSet = map.addTilesetImage('sunnyside', 'sunnyside')!;

    // Render layers
    map.createLayer('sea', sunnysideSet, 0, 0);
    map.createLayer('ground', sunnysideSet, 0, 0);
    map.createLayer('ground_decoration', sunnysideSet, 0, 0);

    // Collision layer
    this.collisionLayer = map.createLayer('collision', sunnysideSet, 0, 0)!;
    this.collisionLayer.setVisible(false);
    this.collisionLayer.setCollisionByExclusion([-1]);

    return map;
  }

  private setupPhysics(map: Phaser.Tilemaps.Tilemap): void {
    const worldW = map.widthInPixels;
    const worldH = map.heightInPixels;
    this.physics.world.setBounds(0, 0, worldW, worldH);
  }

  private setupPlayer(): void {
    this.player = new SunnysidePlayer(this, 160, 180);
    this.physics.add.collider(this.player, this.collisionLayer);
  }

  private setupNPCs(): void {
    this.npcGroup = this.physics.add.staticGroup();

    // NPC data - in a full game, this would come from Tiled Object Layers
    const npcData = [
      { x: 160, y: 120, dialogueId: 'welcome_npc' },
      { x: 200, y: 180, dialogueId: 'vibes_npc' },
    ];

    npcData.forEach((data) => {
      const npc = new NPC(this, data.x, data.y, data.dialogueId);
      this.npcGroup.add(npc);
    });

    // Collisions for all NPCs in the group
    this.physics.add.collider(this.npcGroup, this.collisionLayer);
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    const worldW = map.widthInPixels;
    const worldH = map.heightInPixels;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
  }

  private setupHUD(): void {
    this.hud = this.add.container(0, 0).setScrollFactor(0);
    this.hud.setDepth(9999);

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
      this.add.text(4, this.cameras.main.height - 16, import.meta.env.GAME_VERSION, {
        fontSize: '9px',
        color: '#888888',
      }),
    );

    // Debug state display (optional)
    const debugText = this.add
      .text(4, 10, '', {
        fontSize: '8px',
        color: '#666666',
      })
      .setScrollFactor(0)
      .setDepth(9999);

    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      const state = this.gameState.getAll();
      const dialoguesRead = (state.totalDialoguesRead as number) || 0;
      debugText.setText(`Dialogues: ${dialoguesRead}`);
    });

    this.hud.add(debugText);
  }

  private updateDepth(): void {
    this.player.setDepth(this.player.y);
    this.npcGroup.getChildren().forEach((npc) => {
      const sprite = npc as Phaser.GameObjects.Sprite;
      sprite.setDepth(sprite.y);
    });
  }

  update(): void {
    this.player.update();

    // Update interaction manager
    if (this.interactionManager) {
      this.interactionManager.update({ x: this.player.x, y: this.player.y });
    }
  }

  shutdown(): void {
    if (this.interactionManager) {
      this.interactionManager.shutdown();
    }
    this.events.off(Phaser.Scenes.Events.UPDATE, this.updateDepth, this);
  }
}
