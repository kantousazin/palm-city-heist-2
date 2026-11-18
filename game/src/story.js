// Original story for PALM CITY HEIST: Ren Solano, an ex-courier driver in Palmera City.

export const HERO_NAME = 'Ren Solano';

export const INTRO_DIALOG = [
  { speaker: 'Ren', text: 'One last delivery job in Palmera City. What could go wrong?' },
  { speaker: 'Mara (phone)', text: 'Ren! Cafe Sol, downtown. Come meet me — I have work that pays real money.' },
  { speaker: 'Ren', text: 'On my way. WASD to walk, E to get in a car, mouse to aim, click to shoot.' },
];

export const MISSION_DIALOGS = [
  [{ speaker: 'Mara', text: 'You made it. A client needs a fast driver tonight. Prove you can cross town.' }],
  [{ speaker: 'Mara', text: 'Pick up the singer at the Neon Arcade. Do not scratch the paint. Much.' }],
  [{ speaker: 'Dockmaster Ivo', text: 'That crate at the Marina Docks? It fell off a boat. Take it to the Safehouse.' }],
  [{ speaker: 'Ren', text: 'The police are onto the crate run. Lose them, then reach the Safehouse.' }],
  [{ speaker: 'Mara', text: 'The warehouse crew stole our payout. Go to the Old Warehouse and take it back.' }],
  [{ speaker: 'Mara', text: 'Final job: the Palmera Bank courier van leaves at dawn. Reach the bank and finish the heist!' }],
];

export const ENDING_DIALOG = [
  { speaker: 'Mara', text: 'You did it, Ren. Palmera City is yours tonight.' },
  { speaker: 'Ren', text: 'Free roam now — steal cars, dodge the law, chase the sunset.' },
];

export const BUSTED_TEXT = 'BUSTED — The police impound fee cleaned you out a little.';
export const WASTED_TEXT = 'WASTED — The hospital patched Ren up and billed the insurance.';
