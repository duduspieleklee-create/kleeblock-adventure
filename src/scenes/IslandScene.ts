import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { DialogBox } from '../objects/DialogBox';
import { SunnysidePlayer } from '../objects/SunnysidePlayer';

export class IslandScene extends Phaser.Scene {
  private player!: SunnysidePlayer;
  private npcs!: NPC[];
  private dialogBox: DialogBox | null = null;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private isDialogOpen = false;

  constructor() {
    super({ key: 'IslandScene' });
  }

  create(): void {
    // Load tilemap
    const map = this.make.tilemap({ key: 'island' });
    const sunnysideSet = map.addTilesetImage('sunnyside', 'sunnyside')!;;

    // Create layers (sea background, then ground, then decorations on top)
    const seaLayer = map.createLayer('sea', sunnysideSet, 0, 0);
    const groundLayer = map.createLayer('ground', sunnysideSet, 0, 0);
    const decorLayer = map.createLayer('ground_decoration', sunnysideSet, 0, 0);

    // Collision on ground layer only (exclude empty tiles)
    groundLayer.setCollisionByExclusion([0, -1]);

    // Sea is solid — carve out only where ground exists
    seaLayer.setCollision([]); // start with nothing colliding
    seaLayer.forEachTile((tile, x, y) => {
      const groundTile = groundLayer.getTileAt(x, y);
      if (!groundTile || groundTile.index === 0) {
        tile.setCollision(true); // water blocks movement
      }
    });

    // Set world bounds to match tilemap (20×20 tiles × 16px = 320×320)
    this.physics.world.setBounds(0, 0, 320, 320);

    // Create player on the island center (grass area around tile 10,10 ≈ 160,160)
    this.player = new SunnysidePlayer(this, 160, 180);
    this.physics.add.collider(this.player, groundLayer);
    this.physics.add.collider(this.player, seaLayer);

    // Camera follow player with zoom
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);

    // Create NPCs on the island
    this.npcs = [
      new NPC(this, 160, 120, 'Welcome to Sunny Side Island! Watch out for the ocean!'),
      new NPC(this, 200, 180, 'The sun always shines here. No monsters, just good vibes!'),
    ];

    // NPC collision
    this.npcs.forEach(npc => {
      this.physics.add.collider(this.player, npc);
    });

    // Interaction key
    this.interactionKey = this.input.keyboard!.addKey('E');

    // HUD: interaction hint
    const hint = this.add.text(10, 10, 'E: Interact', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    }).setAlpha(0.7);
    hint.setScrollFactor(0);

    // Back button — fixed to screen
    const backBtn = this.add.text(this.cameras.main.width - 60, 10, '← Menu', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setAlpha(0.8).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.scene.stop('IslandScene');
      this.scene.start('MainMenuScene');
    });

    // Version badge
    this.add.text(4, this.cameras.main.height - 16, import.meta.env.GAME_VERSION, {
      fontSize: '9px',
      color: '#888888',
    }).setScrollFactor(0);
  }

  update(): void {
    this.player.update();

    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      if (this.isDialogOpen && this.dialogBox) {
        this.dialogBox.destroy();
        this.dialogBox = null;
        this.isDialogOpen = false;
      } else {
        const interactRange = 48;
        for (const npc of this.npcs) {
          const dist = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, npc.x, npc.y
          );
          if (dist < interactRange) {
            this.dialogBox = new DialogBox(this, 160, 240, npc.dialogText);
            this.isDialogOpen = true;
            break;
          }
        }
      }
    }
  }
}