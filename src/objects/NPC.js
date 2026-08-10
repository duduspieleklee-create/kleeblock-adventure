import Phaser from 'phaser';
export class NPC extends Phaser.Physics.Arcade.Sprite {
    get dialogText() {
        return this._dialogText;
    }
    constructor(scene, x, y, dialogText) {
        super(scene, x, y, 'npc_idle');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);
        this.setFrame(0);
        this._dialogText = dialogText;
        // Create NPC animations
        scene.anims.create({
            key: 'npc_idle',
            frames: scene.anims.generateFrameNumbers('npc_idle', { start: 0, end: 15 }),
            frameRate: 8,
            repeat: -1,
        });
        scene.anims.create({
            key: 'npc_walk',
            frames: scene.anims.generateFrameNumbers('npc_walk', { start: 0, end: 23 }),
            frameRate: 10,
            repeat: -1,
        });
        // Default to idle animation
        this.anims.play('npc_idle');
    }
}
