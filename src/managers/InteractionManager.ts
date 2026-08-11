import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { DialogBox } from '../objects/DialogBox';

export class InteractionManager {
  private scene: Phaser.Scene;
  private interactionRadius: number = 80;
  private currentNearbyNPC?: NPC;
  private currentDialog?: DialogBox;
  private currentDialogSequence: string[] = [];
  private currentDialogIndex: number = 0;
  private dialogueData: Record<string, { sequence: string[] }>;
  private eKey?: Phaser.Input.Keyboard.Key;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private interactionHint?: Phaser.GameObjects.Text;
  private npcs: NPC[];

  constructor(
    scene: Phaser.Scene,
    _player: Phaser.Physics.Arcade.Sprite,
    npcs: NPC[],
    dialogueData: Record<string, { sequence: string[] }>,
  ) {
    this.scene = scene;
    this.npcs = npcs;
    this.dialogueData = dialogueData;

    this.setupInput();
    this.createInteractionHint();
  }

  private setupInput(): void {
    const keyboard = this.scene.input.keyboard;
    if (keyboard) {
      this.eKey = keyboard.addKey('E');
      this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

      this.eKey.on(Phaser.Input.Keyboard.Events.DOWN, this.handleInteractionKey, this);
      this.spaceKey.on(Phaser.Input.Keyboard.Events.DOWN, this.handleContinueKey, this);
    }
  }

  private createInteractionHint(): void {
    this.interactionHint = this.scene.add
      .text(0, 0, 'Press E to talk', {
        fontSize: '10px',
        color: '#ffff88',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0)
      .setDepth(9998);
  }

  private handleInteractionKey(): void {
    if (this.currentDialog) {
      // If dialog is open, skip typewriter
      if (!this.currentDialog.isTypewriterComplete()) {
        this.currentDialog.skipTypewriter();
      } else {
        // Move to next dialog in sequence
        this.showNextDialog();
      }
    } else if (this.currentNearbyNPC) {
      // Start dialog with nearby NPC
      this.startDialogWithNPC(this.currentNearbyNPC);
    }
  }

  private handleContinueKey(): void {
    // Same as E key for convenience
    this.handleInteractionKey();
  }

  private startDialogWithNPC(npc: NPC): void {
    const dialogueId = npc.dialogueId;
    const dialogue = this.dialogueData[dialogueId];

    if (!dialogue) {
      console.warn(`[InteractionManager] No dialogue found for ID: ${dialogueId}`);
      return;
    }

    this.currentDialogSequence = dialogue.sequence;
    this.currentDialogIndex = 0;
    this.showNextDialog();
  }

  private showNextDialog(): void {
    if (this.currentDialogIndex >= this.currentDialogSequence.length) {
      // Emit event when all dialogues are complete
      if (this.currentNearbyNPC) {
        this.scene.events.emit('dialogueSequenceCompleted', {
          dialogueId: this.currentNearbyNPC.dialogueId,
        });
      }
      this.dismissDialog();
      return;
    }

    const text = this.currentDialogSequence[this.currentDialogIndex];
    this.currentDialog = new DialogBox(this.scene, text, 40);

    if (this.currentNearbyNPC) {
      this.currentDialog.positionAtNPC(this.currentNearbyNPC, this.scene.cameras.main);
    }

    this.currentDialogIndex++;
  }

  private dismissDialog(): void {
    if (this.currentDialog) {
      this.currentDialog.destroy();
      this.currentDialog = undefined;
    }
    this.currentDialogSequence = [];
    this.currentDialogIndex = 0;
  }

  update(playerPos: { x: number; y: number }): void {
    // Check proximity to NPCs
    let nearbyNPC: NPC | undefined;
    let closestDistance = Infinity;

    for (const npc of this.npcs) {
      const distance = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, npc.x, npc.y);
      if (distance < this.interactionRadius && distance < closestDistance) {
        closestDistance = distance;
        nearbyNPC = npc;
      }
    }

    this.currentNearbyNPC = nearbyNPC;

    // Update interaction hint
    if (this.interactionHint) {
      if (nearbyNPC && !this.currentDialog) {
        this.interactionHint.setPosition(
          this.scene.cameras.main.width / 2,
          this.scene.cameras.main.height - 50,
        );
        this.interactionHint.setAlpha(1);
      } else {
        this.interactionHint.setAlpha(0);
      }
    }

    // Update dialog position if visible
    if (this.currentDialog && this.currentNearbyNPC) {
      this.currentDialog.positionAtNPC(this.currentNearbyNPC, this.scene.cameras.main);
    }
  }

  shutdown(): void {
    this.dismissDialog();
    if (this.eKey) {
      this.eKey.off(Phaser.Input.Keyboard.Events.DOWN, this.handleInteractionKey, this);
    }
    if (this.spaceKey) {
      this.spaceKey.off(Phaser.Input.Keyboard.Events.DOWN, this.handleContinueKey, this);
    }
    if (this.interactionHint) {
      this.interactionHint.destroy();
    }
  }
}
