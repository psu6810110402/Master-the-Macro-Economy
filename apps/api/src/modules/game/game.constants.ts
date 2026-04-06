/**
 * Global Constants for Master the Macro Economy Simulation
 */

export const GAME_CONFIG = {
  DEFAULT_SESSION_DURATION: 180, // 180 seconds (3 minutes) per round
  NEWS_BREAK_DURATION: 0,        // Pause until players ack news
  INITIAL_CASH_BALANCE: 100000,   // Starting capital $100,000
  MAX_PLAYERS_PER_SESSION: 50,
  
  FORMATS: {
    SHORT: { rounds: 3 },
    STANDARD: { rounds: 5 },
    FULL: { rounds: 7 },
  },

  INACTIVITY_THRESHOLD_MS: 5 * 60 * 1000, // 5 minutes
  INACTIVITY_CHECK_INTERVAL_MS: 60 * 1000, // 1 minute
  
  BLACK_SWAN_CHANCE: 0.15, // 15% chance per session start
};

export const DEFAULT_ALLOCATION = { 'CASH': 100 };
