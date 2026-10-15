const BLOCKED_USERNAME_WORDS = new Set([
  "asshole", "bastard", "bitch", "bullshit", "cock", "cocksucker", "coon",
  "cunt", "dick", "dyke", "fag", "faggot", "fuck", "fucker", "motherfucker",
  "nazi", "nigger", "nigga", "paki", "retard", "shit", "slut", "spic",
  "tranny", "twat", "whore", "wetback", "chink", "kike"
]);

function normalizeUsernameWord(word) {
  return word
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t");
}

function validateUsername(value) {
  const username = String(value ?? "").trim().replace(/\s+/g, " ");
  if (username.length < 3 || username.length > 16) {
    return { valid: false, message: "Use 3 to 16 characters." };
  }
  if (!/^[a-zA-Z0-9 _-]+$/.test(username)) {
    return { valid: false, message: "Use letters, numbers, spaces, _ or -." };
  }

  const normalizedUsername = normalizeUsernameWord(username);
  const containsBlockedWord = [...BLOCKED_USERNAME_WORDS].some((word) => {
    const spacedWord = [...word].join("[ _-]*");
    return new RegExp(`(^|[ _-])${spacedWord}($|[ _-])`).test(normalizedUsername);
  });
  if (containsBlockedWord) {
    return { valid: false, message: "That username is not allowed." };
  }
  return { valid: true, value: username };
}