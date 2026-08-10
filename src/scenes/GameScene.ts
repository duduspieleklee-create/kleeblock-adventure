import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { NPC } from '../objects/NPC';
import { DialogBox } from '../objects/DialogBox';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private npcs!: NPC[];
  private dialogBox: DialogBox | null = null;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private isDialogOpen = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Load tilemap
    const map = this.make.tilemap({ key: 'forest' });
    const floorSet = map.addTilesetImage('floors', 'floors')!;
    const groundLayer = map.createLayer('ground', floorSet, 0, 0);
    groundLayer.setCollisionByExclusion([-1]);

    // Set world bounds to match tilemap (30×22 tiles × 16px = 480×360)
    this.physics.world.setBounds(0, 0, 480, 360);

    // Create player
    this.player = new Player(this, 240, 200);
    this.physics.add.collider(this.player, groundLayer);

    // Camera follow player with zoom
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);

    // Scatter trees around the map (avoiding paths and pond)
    const treeTextures = ['tree1_s3', 'tree2_s3', 'tree3_s3'];
    const treePositions = [
      { x: 20, y: 20 }, { x: 50, y: 40 }, { x: 80, y: 30 },
      { x: 120, y: 20 }, { x: 160, y: 50 }, { x: 200, y: 30 },
      { x: 240, y: 20 }, { x: 280, y: 40 }, { x: 320, y: 25 },
      { x: 360, y: 50 }, { x: 400, y: 30 }, { x: 440, y: 40 },
      { x: 20, y: 80 }, { x: 60, y: 100 }, { x: 100, y: 70 },
      { x: 140, y: 90 }, { x: 180, y: 80 }, { x: 220, y: 100 },
      { x: 260, y: 70 }, { x: 300, y: 90 }, { x: 340, y: 80 },
      { x: 380, y: 100 }, { x: 420, y: 70 }, { x: 460, y: 90 },
      { x: 30, y: 280 }, { x: 70, y: 300 }, { x: 110, y: 270 },
      { x: 150, y: 290 }, { x: 190, y: 280 }, { x: 230, y: 300 },
      { x: 270, y: 270 }, { x: 310, y: 290 }, { x: 350, y: 280 },
      { x: 390, y: 300 }, { x: 430, y: 270 }, { x: 470, y: 290 },
      // Extra clusters for forest density
      { x: 40, y: 140 }, { x: 100, y: 160 }, { x: 160, y: 140 },
      { x: 220, y: 170 }, { x: 280, y: 150 }, { x: 340, y: 160 },
      { x: 400, y: 140 }, { x: 460, y: 150 },
    ];

    treePositions.forEach((pos, i) => {
      const texture = treeTextures[i % treeTextures.length];
      const tree = this.add.sprite(pos.x, pos.y, texture);
      tree.setDisplaySize(32, 32);
      tree.setOrigin(0.5, 0.5);
      tree.setDepth(1);
    });

    // Create NPCs
    this.npcs = [
      new NPC(this, 180, 160, 'Welcome to KleeBlock Adventure! Explore the forest and find hidden treasure!'),
      new NPC(this, 300, 200, 'I heard there are monsters in the deeper parts of the forest...'),
    ];

    // Add collision for NPCs
    this.npcs.forEach(npc => {
      this.physics.add.collider(this.player, npc);
    });

    // Interaction key
    this.interactionKey = this.input.keyboard!.addKey('E');

    // Trees collision
    const treeCollider = this.physics.add.staticGroup();
    treePositions.forEach(pos => {
      const collider = treeCollider.create(pos.x, pos.y);
      if (collider.body) {
        collider.body.setCircle(16);
      }
    });
    this.physics.add.collider(this.player, treeCollider);

    // HUD: interaction hint
    const hint = this.add.text(10, 10, 'E: Interact', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    }).setAlpha(0.7);
    hint.setScrollFactor(0);

    // Version badge — bottom-left, fixed to screen
    this.add.text(4, this.cameras.main.height - 16, import.meta.env.GAME_VERSION, {
      fontSize: '9px',
      color: '#888888',
    }).setScrollFactor(0);
  }

  update(): void {
    // Player movement
    this.player.update();

    // NPC interaction
    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      if (this.isDialogOpen && this.dialogBox) {
        this.dialogBox.destroy();
        this.dialogBox = null;
        this.isDialogOpen = false;
      } else {
        // Check proximity to NPCs
        const interactRange = 48;
        for (const npc of this.npcs) {
          const dist = Phaser.Math.Distance.Between(
            this.player.x, this.player.y, npc.x, npc.y
          );
          if (dist < interactRange) {
            this.dialogBox = new DialogBox(this, 240, 280, npc.dialogText);
            this.isDialogOpen = true;
            break;
          }
        }
      }
    }
  }
}