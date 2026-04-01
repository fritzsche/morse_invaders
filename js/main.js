import { Game } from './game.js';
import { Renderer } from './renderer.js';
import { MorseAudioEngine } from './morse-audio.js';
import { GameLoop } from './game-loop.js';
import { InputHandler } from './input-handler.js';

// Main entry point - wires everything together
async function init() {
  // Get canvas
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }

  // Create game components
  const game = new Game();
  const renderer = new Renderer(canvas);
  const audioEngine = new MorseAudioEngine();

  // Start game loop immediately so the menu renders while the worklet module loads
  const gameLoop = new GameLoop(game, renderer, audioEngine);
  gameLoop.start();

  // Initialize audio — async because AudioWorklet.addModule() returns a Promise
  await audioEngine.init(game.wpm);
  audioEngine.setEnabled(game.audioEnabled);

  // Create input handler after audio is ready
  const inputHandler = new InputHandler(game, audioEngine, gameLoop, renderer);

  // Handle first user interaction to enable audio context (browser autoplay policy)
  const enableAudio = () => {
    if (audioEngine.audioContext.state === 'suspended') {
      audioEngine.audioContext.resume();
    }
    document.removeEventListener('click', enableAudio);
    document.removeEventListener('keydown', enableAudio);
  };
  document.addEventListener('click', enableAudio);
  document.addEventListener('keydown', enableAudio);

  console.log('Morse Code Space Invaders initialized!');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
