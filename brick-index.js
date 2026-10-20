const brickIconStyles = {
  normal: { color: "#ff765e" },
  armored: { color: "#ff765e", armor: true },
  giant: { color: "#f29b55", symbol: "4" },
  heart: { color: "#f05b78", symbol: "♥" },
  grow: { color: "#55cbb2", symbol: "↔" },
  poison: { color: "#b6f45b", symbol: "✦" },
  slow: { color: "#789be8", symbol: "SLOW" },
  jackpot: { color: "#f3d45b", symbol: "+100" },
  bomb: { color: "#fa6658", symbol: "✹" },
  projectile: { color: "#65d5e8", projectile: true },
  shooter: { color: "#f05b70", shooter: true }
};

function makeBrickIcon({ color, symbol, armor, projectile, shooter }) {
  const x = symbol === "4" ? 2 : 8;
  const y = symbol === "4" ? 3 : 7;
  const width = 96 - x * 2;
  const height = symbol === "4" ? 34 : 26;
  const feature = armor
    ? '<rect x="28" y="20" width="8" height="5" rx="1" fill="#eff4f3"/><rect x="60" y="20" width="8" height="5" rx="1" fill="#eff4f3"/>'
    : projectile
      ? '<circle cx="48" cy="21" r="4" fill="#e4fbff"/>'
      : shooter
        ? '<rect x="40" y="19" width="16" height="4" rx="1" fill="#fff0d1"/>'
        : symbol
          ? `<text x="48" y="22" fill="#ffffff" font-family="sans-serif" font-size="${symbol === "SLOW" ? 9 : 15}" text-anchor="middle" dominant-baseline="middle">${symbol}</text>`
          : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="40" viewBox="0 0 96 40"><defs><linearGradient id="brick" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#263b4a"/></linearGradient></defs><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" fill="url(#brick)"/><rect x="${x + 4}" y="${y + 3}" width="${width - 8}" height="3" rx="1" fill="#ffffff" fill-opacity=".28"/>${feature}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

document.querySelectorAll("[data-brick-icon]").forEach((image) => {
  const style = brickIconStyles[image.dataset.brickIcon];
  if (!style) {
    throw new Error(`Unknown brick icon: ${image.dataset.brickIcon}`);
  }
  image.src = makeBrickIcon(style);
});
