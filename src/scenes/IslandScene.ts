import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { DialogBox } from '../objects/DialogBox';
import { SunnysidePlayer } from '../objects/SunnysidePlayer';

export class IslandScene extends Phaser.Scene {
  private player!: SunnysidePlayer;
  private npcs!: NPC[];
  private dialogBox: DialogBox | null = null;
  private activeNPC: NPC | null = null;
  private interactionKey!: Phaser.Input.Keyboard.Key;
  private isDialogOpen = false;
  private interactionRange = 48;
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

    // ── Interaction ──
    this.interactionKey = this.input.keyboard!.addKey('E');

    // ── HUD (fixed, depth 9999) ──
    this.hud = this.add.container(0, 0).setScrollFactor(0);
    this.hud.setDepth(9999);

    this.hud.add(this.add.text(10, 10, 'E: Interact', {
      fontSize: '10px', color: '#ffffff', backgroundColor: '#000000',
      padding: { x: 4, y: 2 },
    }).setAlpha(0.7));

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

    // Auto-close dialog if player walks away
    if (this.isDialogOpen && this.activeNPC) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.activeNPC.x, this.activeNPC.y
      );
      if (dist > this.interactionRange + 48) {
        this.closeDialog();
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactionKey)) {
      if (this.isDialogOpen && this.dialogBox) {
        this.closeDialog();
      } else {
        for (const npc of this.npcs) {
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y) < this.interactionRange) {
            this.openDialog(npc);
            break;
          }
        }
      }
    }
  }

  private openDialog(npc: NPC): void {
    // Fixed at bottom-center of camera — never floats, never scrolls
    this.dialogBox = new DialogBox(this, npc.dialogText);
    this.dialogBox.setScrollFactor(0);
    this.dialogBox.setDepth(10000);
    this.activeNPC = npc;
    this.isDialogOpen = true;
  }

  private closeDialog(): void {
    this.dialogBox?.destroy();
    this.dialogBox = null;
    this.activeNPC = null;
    this.isDialogOpen = false;
  }
}