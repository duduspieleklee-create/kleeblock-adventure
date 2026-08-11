import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { SunnysidePlayer } from '../objects/SunnysidePlayer';
import { DialogBox } from '../objects/DialogBox';

export class IslandScene extends Phaser.Scene {
  private player!: SunnysidePlayer;
  private npcGroup!: Phaser.Physics.Arcade.StaticGroup;
  private hud!: Phaser.GameObjects.Container;
  private currentDialog?: DialogBox;
  private dialogTimer?: Phaser.Time.TimerEvent;
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;

  constructor() {
    super({ key: 'IslandScene' });
  }

  create(): void {
    const map = this.setupMap();
    this.setupPhysics(map);
    this.setupPlayer();
    this.setupNPCs();
    this.setupCamera(map);
    this.setupHUD();

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
    
    // Performance optimization: only set collision for tiles that actually exist
    this.collisionLayer.setCollisionByExclusion([-1]);

    return map;
  }

  private setupPhysics(map: Phaser.Tilemaps.Tilemap): void {
    const worldW = map.widthInPixels;
    const worldH = map.heightInPixels;
    this.physics.world.setBounds(0, 0, worldW, worldH);
  }

  private setupPlayer(): void {
    // TODO: Load from Object Layer if available
    this.player = new SunnysidePlayer(this, 160, 180);
    this.physics.add.collider(this.player, this.collisionLayer);
  }

  private setupNPCs(): void {
    this.npcGroup = this.physics.add.staticGroup();

    // Data for NPCs - ideally this would come from an Object Layer in Tiled
    const npcData = [
      { x: 160, y: 120, text: 'Welcome to Sunny Side Island! Watch out for the ocean!' },
      { x: 200, y: 180, text: 'The sun always shines here. No monsters, just good vibes!' },
    ];

    npcData.forEach(data => {
      const npc = new NPC(this, data.x, data.y, data.text);
      this.npcGroup.add(npc);
    });

    // Collisions for all NPCs in the group
    this.physics.add.collider(this.npcGroup, this.collisionLayer);
    this.physics.add.overlap(this.player, this.npcGroup, (_p, npc) => {
      this.showNPCDialog(npc as NPC);
    });
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

    const hintText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height - 30, 'Approach NPCs to talk', {
        fontSize: '11px',
        color: '#aaaaaa',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0.6);
    this.hud.add(hintText);
  }

  private updateDepth(): void {
    this.player.setDepth(this.player.y);
    this.npcGroup.getChildren().forEach(npc => {
      const sprite = npc as Phaser.GameObjects.Sprite;
      sprite.setDepth(sprite.y);
    });
  }

  private showNPCDialog(npc: NPC): void {
    if (this.currentDialog) return;

    this.currentDialog = new DialogBox(this, npc.dialogText);
    this.currentDialog.positionAtNPC(npc, this.cameras.main);

    if (this.dialogTimer) this.dialogTimer.remove();
    this.dialogTimer = this.time.addEvent({
      delay: 4000,
      callback: () => this.dismissDialog(),
    });
  }

  private dismissDialog(): void {
    if (this.currentDialog) {
      this.currentDialog.destroy();
      this.currentDialog = undefined;
    }
    if (this.dialogTimer) {
      this.dialogTimer.remove();
      this.dialogTimer = undefined;
    }
  }

  update(): void {
    this.player.update();

    if (this.currentDialog) {
      // Reposition dialog relative to the NPC it belongs to
      // For simplicity, we just reposition it in the center of the camera if needed
      // or track which NPC it's attached to.
    }
  }

  shutdown(): void {
    this.dismissDialog();
    this.events.off(Phaser.Scenes.Events.UPDATE, this.updateDepth, this);
  }
}
