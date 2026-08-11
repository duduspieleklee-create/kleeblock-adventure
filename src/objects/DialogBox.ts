import Phaser from 'phaser';

export class DialogBox extends Phaser.GameObjects.Container {
  private textBox!: Phaser.GameObjects.Text;
  private fullText: string = '';
  private displayedText: string = '';
  private typewriterTimer?: Phaser.Time.TimerEvent;
  private charIndex: number = 0;
  private typewriterSpeed: number = 50; // milliseconds per character
  private isComplete: boolean = false;
  private continueIndicator?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, text: string, speed: number = 50) {
    super(scene);

    this.fullText = text;
    this.typewriterSpeed = speed;

    const fontSize = '10px';
    const padding = 6;
    const maxWidth = 160;

    // Measure text for box sizing
    const tempText = scene.add
      .text(0, 0, text, {
        fontSize: fontSize,
        color: '#e0e0e0',
        wordWrap: { width: maxWidth },
      })
      .setOrigin(0);

    const bounds = tempText.getBounds();
    const boxW = Math.round(bounds.width + padding * 2);
    const boxH = Math.round(bounds.height + padding * 2);
    tempText.destroy();

    // Background
    const bg = scene.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 3);
    bg.lineStyle(1, 0x5a5a7a, 0.9);
    bg.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 3);
    this.add(bg);

    // Text - will be filled by typewriter effect
    this.textBox = scene.add
      .text(0, 0, '', {
        fontSize: fontSize,
        color: '#e0e0e0',
        wordWrap: { width: boxW - padding * 2 },
      })
      .setOrigin(0.5);
    this.add(this.textBox);

    // Continue indicator (blinking arrow)
    this.continueIndicator = scene.add
      .text(0, boxH / 2 - 10, '▼', {
        fontSize: '8px',
        color: '#ffff88',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.add(this.continueIndicator);

    scene.add.existing(this);
    this.setScrollFactor(0);
    this.setDepth(10000);

    // Start typewriter effect
    this.startTypewriter();
  }

  private startTypewriter(): void {
    this.charIndex = 0;
    this.displayedText = '';
    this.isComplete = false;

    this.typewriterTimer = this.scene.time.addEvent({
      delay: this.typewriterSpeed,
      callback: this.typewriterTick,
      callbackScope: this,
      repeat: this.fullText.length - 1,
    });
  }

  private typewriterTick(): void {
    if (this.charIndex < this.fullText.length) {
      this.displayedText += this.fullText[this.charIndex];
      this.textBox.setText(this.displayedText);
      this.charIndex++;

      if (this.charIndex === this.fullText.length) {
        this.isComplete = true;
        this.showContinueIndicator();
      }
    }
  }

  private showContinueIndicator(): void {
    if (this.continueIndicator) {
      // Blinking animation
      this.scene.tweens.add({
        targets: this.continueIndicator,
        alpha: { from: 0, to: 1 },
        duration: 500,
        repeat: -1,
        yoyo: true,
      });
    }
  }

  /** Skip typewriter and show full text immediately */
  skipTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
    }
    this.displayedText = this.fullText;
    this.textBox.setText(this.displayedText);
    this.charIndex = this.fullText.length;
    this.isComplete = true;
    this.showContinueIndicator();
  }

  /** Position above NPC head, clamped to camera bounds */
  positionAtNPC(npc: { x: number; y: number }, cam: Phaser.Cameras.Scene2D.Camera): void {
    const offset = 40;

    // Convert world position to screen space (ignoring zoom)
    let x = (npc.x - cam.scrollX) * cam.zoom;
    let y = (npc.y - offset - cam.scrollY) * cam.zoom;

    const minX = 60;
    const maxX = cam.width - 60;
    const minY = 10;
    const maxY = cam.height - 10;

    x = Phaser.Math.Clamp(x, minX, maxX);
    y = Phaser.Math.Clamp(y, minY, maxY);

    this.setPosition(x, y);
  }

  isTypewriterComplete(): boolean {
    return this.isComplete;
  }

  destroy(fromScene?: boolean): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
    }
    this.removeAll(true);
    super.destroy(fromScene);
  }
}
