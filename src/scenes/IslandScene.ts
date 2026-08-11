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
    const map = this.make.tilemap({ key: 'island' });
    const sunnysideSet = map.addTilesetImage('sunnyside', 'sunnyside')!;;

    // Render order: sea (bottom) → ground → decorations (top)
    const seaLayer = map.createLayer('sea', sunnysideSet, 0, 0);
    const groundLayer = map.createLayer('ground', sunnysideSet, 0, 0);
    const decorLayer = map.createLayer('ground_decoration', sunnysideSet, 0, 0);

    // --- Collision ---
    // Ground: every non-empty tile is solid
    groundLayer.setCollisionByExclusion([-1, 0]);

    // Sea: build walkable set from ground layer, then only collide on ocean
    const walkable = new Set<string>();
    groundLayer.forEachTile((tile, x, y) => {
      if (tile.index > 0) walkable.add(`${x},${y}`);
    });
    seaLayer.forEachTile((tile, x, y) => {
      if (!walkable.has(`${x},${y}`)) {
        tile.setCollision(true);
      }
    });
    console.log('[Island] walkable:', walkable.size, '/', seaLayer.layerWidth * seaLayer.layerHeight);
    console.log('[Island] ground non-empty:', (() => { let c=0; groundLayer.forEachTile(t=>{if(t.index>0)c++}); return c; })());

    // World bounds (20×20 × 16px)
    this.physics.world.setBounds(0, 0, 320, 320);

    // Player spawns on grass
    this.player = new SunnysidePlayer(this, 160, 180);
    this.physics.add.collider(this.player, groundLayer);
    this.physics.add.collider(this.player, seaLayer);

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);

    // NPCs
    this.npcs = [
      new NPC(this, 160, 120, 'Welcome to Sunny Side Island! Watch out for the ocean!'),
      new NPC(this, 200, 180, 'The sun always shines here. No monsters, just good vibes!'),
    ];
    this.npcs.forEach(npc => this.physics.add.collider(this.player, npc));

    // Interaction
    this.interactionKey = this.input.keyboard!.addKey('E');

    // HUD
    const hint = this.add.text(10, 10, 'E: Interact', {
      fontSize: '10px', color: '#ffffff', backgroundColor: '#000000', padding: { x: 4, y: 2 },
    }).setAlpha(0.7).setScrollFactor(0);

    const backBtn = this.add.text(this.cameras.main.width - 60, 10, '← Menu', {
      fontSize: '12px', color: '#ffffff', backgroundColor: '#000000', padding: { x: 6, y: 3 },
    }).setScrollFactor(0).setAlpha(0.8).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.scene.stop('IslandScene');
      this.scene.start('MainMenuScene');
    });

    this.add.text(4, this.cameras.main.height - 16, import.meta.env.GAME_VERSION, {
      fontSize: '9px', color: '#888888',
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
        for (const npc of this.npcs) {
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < 48) {
            this.dialogBox = new DialogBox(this, 160, 240, npc.dialogText);
            this.isDialogOpen = true;
            break;
          }
        }
      }
    }
  }
}