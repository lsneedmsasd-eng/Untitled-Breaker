const gamestate = (() => {
  const PLAYER_NAME_KEY = "block-breaker-player-name-v1";
  const HIGH_SCORE_KEY = "block-breaker-high-score-v1";
  const LEADERBOARD_KEY = "block-breaker-endless-leaderboard-v1";
  const LEADERBOARD_SIZE = 5;
  let username = "PLAYER";
  let combo = 0;
  let highScore = 0;
  let leaderboard = [];

  try {
    const savedUsername = localStorage.getItem(PLAYER_NAME_KEY);
    if (savedUsername && validateUsername(savedUsername).valid) {
      username = validateUsername(savedUsername).value;
    }
    const savedHighScore = Number(localStorage.getItem(HIGH_SCORE_KEY));
    highScore = Number.isSafeInteger(savedHighScore) && savedHighScore >= 0 ? savedHighScore : 0;
    const savedEntries = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    if (Array.isArray(savedEntries)) {
      leaderboard = savedEntries
        .filter((entry) => Number.isSafeInteger(entry.score) && entry.score >= 0 &&
          Number.isSafeInteger(entry.wave) && entry.wave >= 1)
        .map((entry) => {
          const savedName = validateUsername(entry.username || "PLAYER");
          return { ...entry, username: savedName.valid ? savedName.value : "PLAYER" };
        })
        .sort((a, b) => b.score - a.score || b.wave - a.wave)
        .slice(0, LEADERBOARD_SIZE);
    }
  } catch (error) {
    console.error("Unable to load saved game state.", error);
  }

  function saveLeaderboard() {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (error) {
      console.error("Unable to save the endless leaderboard.", error);
    }
  }

  return Object.freeze({
    get username() {
      return username;
    },
    get combo() {
      return combo;
    },
    get highScore() {
      return highScore;
    },
    get leaderboard() {
      return leaderboard.map((entry) => ({ ...entry }));
    },
    setUsername(value) {
      const result = validateUsername(value);
      if (!result.valid) return result;
      username = result.value;
      try {
        localStorage.setItem(PLAYER_NAME_KEY, username);
      } catch (error) {
        console.error("Unable to save the player name.", error);
        return { valid: false, message: "Could not save this profile on the device." };
      }
      return { valid: true, value: username };
    },
    resetCombo() {
      combo = 0;
    },
    restoreCombo(value) {
      combo = Number.isSafeInteger(value) && value >= 0 ? value : 0;
    },
    recordBlockBreak() {
      combo++;
      return 10 + Math.max(0, combo - 1) * 5;
    },
    updateHighScore(score) {
      if (Number.isSafeInteger(score) && score > highScore) {
        highScore = score;
        try {
          localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
        } catch (error) {
          console.error("Unable to save the personal high score.", error);
        }
      }
    },
    recordEndlessRun(score, wave) {
      this.updateHighScore(score);
      leaderboard.push({ username, score, wave });
      leaderboard.sort((a, b) => b.score - a.score || b.wave - a.wave);
      leaderboard = leaderboard.slice(0, LEADERBOARD_SIZE);
      saveLeaderboard();
    }
  });
})();