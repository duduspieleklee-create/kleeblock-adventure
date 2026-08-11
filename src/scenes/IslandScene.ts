import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { SunnysidePlayer } from '../objects/SunnysidePlayer';

export class IslandScene extends Phaser.Scene {
  private player!: SunnysidePlayer;
  private npcs!: NPC[];
  private hud!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'IslandScene' });
  }

  create(): void {
    const map = this.make.tilemap({ key: 'island' });
    const sunnysideSet = map.addTilesetImage('sunnyside', 'sunnyside')!;

    // ── Render layers (GPU) ──
    map.createLayer('sea', sunnysideSet, 0, 0, true);
    map.createLayer('ground', sunnysideSet, 0, 0, true);
    map.createLayer('ground_decoration', sunnysideSet, 0, 0, true);

    // ── Dedicated collision layer (invisible) ──
    const collisionLayer = map.createLayer('collision', sunnysideSet, 0, 0);
    collisionLayer.setVisible(false);
    collisionLayer.setCollisionByExclusion([-1]);

    // ── World & camera bounds ──
    const worldW = map.widthInPixels;
    const worldH = map.heightInPixels;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // ── Player ──
    this.player = new SunnysidePlayer(this, 160, 180);
    this.physics.add.collider(this.player, collisionLayer);

    // ── Camera follow ──
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);

    // ── NPCs ──
    this.npcs = [
      new NPC(this, 160, 120, 'Welcome to Sunny Side Island! Watch out for the ocean!'),
      new NPC(this, 200, 180, 'The sun always shines here. No monsters, just good vibes!'),
    ];
    for (const npc of this.npcs) {
      this.physics.add.collider(npc, collisionLayer);
    }

    // ── Y-sorting ──
    this.events.on('update', () => {
      this.player.setDepth(this.player.y);
      for (const npc of this.npcs) { npc.setDepth(npc.y); }
    });

    // ── HUD (fixed, depth 9999) ──
    this.hud = this.add.container(0, 0).setScrollFactor(0);
    this.hud.setDepth(9999);

    const backBtn = this.add.text(this.cameras.main.width - 60, 10, '← Menu', {
      fontSize: '12px', color: '#ffffff', backgroundColor: '#000000',
      padding: { x: 6, y: 3 },
    }).setAlpha(0.8).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.scene.stop('IslandScene');
      this.scene.start('MainMenuScene');
    });
    this.hud.add(backBtn);

    this.hud.add(this.add.text(4, this.cameras.main.height - 16, import.meta.env.GAME_VERSION, {
      fontSize: '9px', color: '#888888',
    }));
  }

  update(): void {
    this.player.update();
  }
}