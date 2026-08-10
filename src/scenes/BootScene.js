import Phaser from 'phaser';
export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }
    preload() {
        // Load only assets needed for the loading screen
        // (tiny images like a logo or loading bar graphic)
    }
    create() {
        this.scene.start('PreloaderScene');
    }
}
