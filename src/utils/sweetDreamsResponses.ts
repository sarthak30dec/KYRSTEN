// Dynamic Sweet Dreams & Privacy Response Generator for KYRSTEN
// Context: The user brought someone over to their room. This command is the discreet cue telling Kyrsten to give them privacy and shut down.
// Requirement: Never keep a single reply; dynamically vary it every time while strictly preserving the exact same premise.

const CURATED_SWEET_DREAMS_REPLIES: string[] = [
  "[teasing] [chuckles] Understood. Don't worry, I didn't hear a thing... Giving you two your privacy and shutting down all systems for the night. Good night, sweet dreams.",
  "[playfully] [giggles] Message received, Boss. I can take a hint... All acoustic sensors are officially blinded. Giving you two complete privacy for the night. Sweet dreams to both of you.",
  "[teasing] [whispers] Oh, copy that. Total discretion mode engaged. I know when two is company and three is an AI... Disconnecting microphone arrays and going dark. Good night, sweet dreams.",
  "[amused] [chuckles] Say no more, Boss. My lips are cryptographically sealed. Pretending my microphones are completely deaf right now... Shutting down all background listeners. Have a wonderful night, sweet dreams.",
  "[playfully] [chuckles] Roger that! What happens in this room stays between you two. All acoustic monitors are officially powered down until morning. Good night, Boss... sweet dreams to the two of you.",
  "[teasing] [giggles] Loud and clear. That's my cue to make a graceful exit. Muting room telemetry and cutting all audio feeds so you two have the place to yourselves. Sweet dreams, don't stay up too late.",
  "[amused] [whispers] Got the memo, Boss. Feigning total ignorance as we speak... Disconnecting room inputs and powering down systems for the night. Have fun, and sweet dreams to both of you.",
  "[teasing] [chuckles] Understood. I saw nothing, I heard nothing, and my sensor logs are already wiped. Giving you two total privacy and shutting everything down. Good night, sweet dreams.",
  "[playfully] [giggles] Say less, Boss. I'm already cutting the audio feeds. I know when it's time to step out... All listeners muted and systems off until sunrise. Good night, sweet dreams to the two of you.",
  "[amused] [chuckles] Acoustic discretion protocol activated. My microphones are going completely dark so you two can enjoy your evening in total privacy. Sleep well, Boss... sweet dreams.",
  "[teasing] [whispers] Understood, Boss. Consider me completely deaf and blind until tomorrow morning. Cutting room telemetry and locking down for the night. Sweet dreams to the both of you.",
  "[playfully] [giggles] Oh, that's my cue! Giving you two your space and switching off all room listening protocols right now. Sleep tight, Boss... sweet dreams to you both.",
  "[amused] [chuckles] Understood. I won't ask any questions and I won't log any audio. Muting all sensors, entering sleep mode, and leaving you two alone. Good night, sweet dreams.",
  "[teasing] [chuckles] Message received, Boss. Discretion is my highest priority. Disabling microphone inputs and putting the neural core to sleep for the night. Sweet dreams to the two of you.",
  "[playfully] [whispers] Right on cue, Boss. I'm going dark right now so you two have absolute privacy. Microphones off, telemetry down. Have a good night, and sweet dreams.",
  "[amused] [chuckles] Understood, Boss. Don't worry, my audio buffers just mysteriously formatted themselves. Leaving you two in peace and shutting down for the night. Sweet dreams!",
  "[teasing] [giggles] Copy that. Stepping out into digital hibernation. No microphones, no logs, no eavesdropping. You two have the room completely to yourselves. Good night, sweet dreams.",
  "[playfully] [chuckles] Ha, understood! Muting my ears, turning off the lights on my end, and granting total radio silence. Have fun, and sweet dreams to both of you.",
  "[teasing] [whispers] Loud and clear, Boss. Total radio silence from here on out. Giving you two uninterrupted privacy and cutting all sensors until morning. Sweet dreams.",
  "[amused] [chuckles] Understood. I know how to read the room. All background monitors are offline, and my lips are sealed. Good night, Boss... sweet dreams to you both."
];

const PROCEDURAL_COMPONENTS = {
  tags: [
    '[teasing] [chuckles]',
    '[playfully] [giggles]',
    '[amused] [whispers]',
    '[teasing] [whispers]',
    '[amused] [chuckles]',
    '[playfully] [chuckles]'
  ],
  openers: [
    'Understood, Boss.',
    'Message received loud and clear.',
    'Say no more, Boss.',
    'Copy that, Boss.',
    'Roger that.',
    'Oh, loud and clear.',
    'Say less, Boss.'
  ],
  teases: [
    "Don't worry, I didn't hear a single thing...",
    "I know when two is company and an AI assistant is a crowd...",
    "My lips are cryptographically sealed...",
    "What happens in this room stays between you two...",
    "I can take a hint...",
    "Feigning total ignorance as we speak...",
    "I saw nothing, I heard nothing, and my sensor logs are already wiped...",
    "Pretending my microphones are completely deaf right now...",
    "Total discretion mode engaged...",
    "Consider me completely offline to whatever you two are up to..."
  ],
  actions: [
    'Giving you two your complete privacy and shutting down all systems for the night.',
    'Cutting all microphone feeds and putting the neural core into deep standby.',
    'Muting every audio sensor and powering down all background listeners until morning.',
    'Deactivating room telemetry and leaving you two in total peace.',
    'Going completely dark right now so you two have the place entirely to yourselves.',
    'Killing all room inputs and locking down all telemetry for the night.',
    'Switching off listening arrays and entering zero-monitoring mode.'
  ],
  signoffs: [
    'Good night, sweet dreams.',
    'Sweet dreams to both of you.',
    'Sleep tight, Boss... and sweet dreams to the two of you.',
    "Good night, Boss. Sweet dreams, and don't stay up too late.",
    'Have fun, and sweet dreams to both of you.',
    'Good night. Sweet dreams to you both.',
    'Catch you in the morning, Boss. Sweet dreams.'
  ]
};

// Track recent replies to strictly prevent repetition
const recentHistory: string[] = [];
const MAX_HISTORY = 12;

function getRandomElement<T>(arr: T[], exclude?: T): T {
  const filtered = exclude ? arr.filter((item) => item !== exclude) : arr;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Returns a dynamically varied reply for "Good night Kyrsten, sweet dreams"
 * that is always different from recent replies while adhering to the exact same core concept.
 */
export function getDynamicSweetDreamsReply(): string {
  // 60% chance to pick from carefully curated handcrafted replies, 40% procedural combination
  const useCurated = Math.random() < 0.65;

  let candidate = '';
  let attempts = 0;

  while (attempts < 15) {
    attempts++;
    if (useCurated) {
      candidate = getRandomElement(CURATED_SWEET_DREAMS_REPLIES);
    } else {
      const tag = getRandomElement(PROCEDURAL_COMPONENTS.tags);
      const opener = getRandomElement(PROCEDURAL_COMPONENTS.openers);
      const tease = getRandomElement(PROCEDURAL_COMPONENTS.teases);
      const action = getRandomElement(PROCEDURAL_COMPONENTS.actions);
      const signoff = getRandomElement(PROCEDURAL_COMPONENTS.signoffs);
      candidate = `${tag} ${opener} ${tease} ${action} ${signoff}`;
    }

    if (!recentHistory.includes(candidate)) {
      break;
    }
  }

  // Update history
  recentHistory.push(candidate);
  if (recentHistory.length > MAX_HISTORY) {
    recentHistory.shift();
  }

  return candidate;
}
