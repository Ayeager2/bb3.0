// Generated baseline bootstrap hints. Rebuild late-game with:
// run /tools/build-bootstrap-cheatsheet.js
export const BOOTSTRAP_FORMULA_CHEATSHEET = {
  version: "manual-bootstrap-v1",
  generatedAt: 0,
  levels: [1, 10, 25, 50, 100, 250],
  targets: [
    { name: "n00dles", rank: 100, minHack: 1, growAtMoneyRatio: 0.82, weakenAtSecurityGap: 3, hackAtMoneyRatio: 0.92 },
    { name: "foodnstuff", rank: 90, minHack: 1, growAtMoneyRatio: 0.82, weakenAtSecurityGap: 3, hackAtMoneyRatio: 0.92 },
    { name: "sigma-cosmetics", rank: 80, minHack: 5, growAtMoneyRatio: 0.8, weakenAtSecurityGap: 3, hackAtMoneyRatio: 0.9 },
    { name: "joesguns", rank: 70, minHack: 10, growAtMoneyRatio: 0.78, weakenAtSecurityGap: 3, hackAtMoneyRatio: 0.9 },
    { name: "hong-fang-tea", rank: 60, minHack: 30, growAtMoneyRatio: 0.78, weakenAtSecurityGap: 3, hackAtMoneyRatio: 0.88 },
    { name: "harakiri-sushi", rank: 50, minHack: 40, growAtMoneyRatio: 0.78, weakenAtSecurityGap: 3, hackAtMoneyRatio: 0.88 },
  ],
};

export function getBootstrapCheatTargetNames() {
  return [...BOOTSTRAP_FORMULA_CHEATSHEET.targets]
    .sort((a, b) => Number(b.rank ?? 0) - Number(a.rank ?? 0))
    .map(target => target.name);
}

export function getBootstrapCheatTarget(name) {
  return BOOTSTRAP_FORMULA_CHEATSHEET.targets.find(target => target.name === name) ?? null;
}
