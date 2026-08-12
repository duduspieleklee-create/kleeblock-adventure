import Phaser from 'phaser';
import { NPC } from '../objects/NPC';
import { DialogBox } from '../ui/DialogBox';
import { InputEvents } from '../input/InputEvents';

export class InteractionManager {
  private scene: Phaser.Scene;
  private interactionRadius = 80;
  private currentNearbyNPC?: NPC;
  private currentDialog?: DialogBox;
  private currentDialogSequence: string[] = [];
  private currentDialogIndex = 0;
  private dialogueData: Record<string, { sequence: string[] }>;
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
    this.scene.events.on(InputEvents.INTERACT, this.handleInteractionKey, this);

    const keyboard = this.scene.input.keyboard;
    if (keyboard) {
      this.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.spaceKey.on(Phaser.Input.Keyboard.Events.DOWN, this.handleContinueKey, this);
    }
  }

  private createInteractionHint(): void {
    this.interactionHint = this.scene.add
      .text(0, 0, 'Press E to talk', {
        fontSize: '12px',
        color: '#ffff88',
        backgroundColor: '#000000',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setScrollFactor(0)
      .setDepth(9998);
  }

  private handleInteractionKey(): void {
    if (this.currentDialog) {
      if (!this.currentDialog.isTypewriterComplete()) {
        this.currentDialog.skipTypewriter();
      } else {
        this.showNextDialog();
      }
    } else if (this.currentNearbyNPC) {
      this.startDialogWithNPC(this.currentNearbyNPC);
    }
  }

  private handleContinueKey(): void {
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
      if (this.currentNearbyNPC) {
        this.scene.events.emit('dialogueSequenceCompleted', {
          dialogueId: this.currentNearbyNPC.dialogueId,
        });
      }
      this.dismissDialog();
      return;
    }

    const text = this.currentDialogSequence[this.currentDialogIndex];

    if (this.currentDialog) {
      this.currentDialog.setText(text);
      this.currentDialog.show();
    } else {
      this.currentDialog = new DialogBox(this.scene, text, 40);
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

    if (this.interactionHint) {
      if (nearbyNPC && !this.currentDialog) {
        const { width, height } = this.scene.scale.gameSize;
        this.interactionHint.setPosition(Math.round(width / 2), Math.round(height - 56));
        this.interactionHint.setAlpha(1);
      } else {
        this.interactionHint.setAlpha(0);
      }
    }
  }

  isDialogOpen(): boolean {
    return !!this.currentDialog;
  }

  /** Trigger interact from mobile UI button. */
  requestInteract(): void {
    this.handleInteractionKey();
  }

  shutdown(): void {
    this.dismissDialog();
    this.scene.events.off(InputEvents.INTERACT, this.handleInteractionKey, this);
    if (this.spaceKey) {
      this.spaceKey.off(Phaser.Input.Keyboard.Events.DOWN, this.handleContinueKey, this);
    }
    if (this.interactionHint) {
      this.interactionHint.destroy();
    }
  }
}
