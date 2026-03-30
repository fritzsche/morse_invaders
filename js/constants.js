// Morse code dictionary (International Morse Code)
export const MORSE_CODE = {
  'A': '.-',
  'B': '-...',
  'C': '-.-.',
  'D': '-..',
  'E': '.',
  'F': '..-.',
  'G': '--.',
  'H': '....',
  'I': '..',
  'J': '.---',
  'K': '-.-',
  'L': '.-..',
  'M': '--',
  'N': '-.',
  'O': '---',
  'P': '.--.',
  'Q': '--.-',
  'R': '.-.',
  'S': '...',
  'T': '-',
  'U': '..-',
  'V': '...-',
  'W': '.--',
  'X': '-..-',
  'Y': '-.--',
  'Z': '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  '=': '-...-'
};

// Game configuration
export const GameConfig = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  INVADER_ROWS: 2,
  INVADER_COLS: 4,
  INVADER_SPACING_X: 70,
  INVADER_SPACING_Y: 50,
  INVADER_START_Y: 80,
  INVADER_HORIZONTAL_SPEED: 1.0, // pixels per frame at 60fps (normalized via deltaTime)
  INVADER_DROP_AMOUNT: 25, // pixels to drop when hitting edge
  INVADER_MARGIN: 40, // margin from screen edges
  SPEED_INCREASE_PER_LEVEL: 0.22, // speed multiplier increase per level
  POINTS_PER_INVADER: 100,
  WAVE_CLEAR_BONUS: 500,
  INITIAL_LIVES: 3,
  LASER_SPEED: 10,
  MORSE_TONE_FREQUENCY: 700,
  ENVELOPE_TIME_MS: 5
};

// Game states
export const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  GAME_OVER: 'gameover'
};

// Space invader pixel art sprites (1 = filled pixel)
// Type 1 - Classic squid-like invader
export const INVADER_SPRITES = {
  type1: [
    [0,0,0,0,1,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,0,0],
    [0,1,1,0,1,1,1,0,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,0,1,1,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,1],
    [0,0,0,1,1,0,1,1,0,0,0]
  ],
  // Type 2 - Crab-like invader
  type2: [
    [0,1,0,0,0,0,0,0,0,1,0],
    [0,0,1,0,0,0,0,0,1,0,0],
    [0,1,1,1,1,1,1,1,1,1,0],
    [1,1,0,1,1,1,1,1,0,1,1],
    [1,1,1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,1,0],
    [1,0,1,0,0,0,0,0,1,0,1],
    [0,0,1,0,0,0,0,0,1,0,0]
  ],
  // Type 3 - Octopus-like invader
  type3: [
    [0,0,1,0,0,0,0,0,1,0,0],
    [0,0,0,1,0,0,0,1,0,0,0],
    [0,1,1,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,0,0,1,0,0,1,1,1],
    [1,1,0,1,1,1,1,1,0,1,1],
    [1,0,0,0,1,0,1,0,0,0,1],
    [0,0,0,1,0,0,0,1,0,0,0]
  ]
};

// Player cannon sprite
export const PLAYER_SPRITE = [
  [0,0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,1,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,1,0,0,1,1,1,0,0,1,1],
  [1,0,0,0,0,1,0,0,0,0,1]
];

// Default learned characters
export const DEFAULT_LEARNED_CHARS = ['A', 'E', 'T', 'M', 'O', 'N', 'I', 'S', 'H', 'R'];
