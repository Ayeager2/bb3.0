const DAEMON_STATE_FILE = "/data/daemon-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["watch", false],
    ["interval", 10000],
    ["tails", false],
  ]);

  if (flags.tails) {
    ns.ui.openTail();
    ns.ui.resizeTail(900, 500);
  }

  do {
    ns.clearLog();

    const state = readDaemonState(ns);
    const player = ns.getPlayer();

    const hacking = ns.getHackingLevel();
    const money = player.money;
    const homeRam = ns.getServerMaxRam("home");
    const sharePower = ns.getSharePower();

    const ownedAugs = safe(() => ns.singularity.getOwnedAugmentations(true), []);
    const installedAugs = safe(() => ns.singularity.getOwnedAugmentations(false), []);
    const queuedAugs = Math.max(0, ownedAugs.length - installedAugs.length);

    const factions = safe(() => player.factions, []);
    const joinedDaedalus = factions.includes("Daedalus");
    const daedalusRep = joinedDaedalus
      ? safe(() => ns.singularity.getFactionRep("Daedalus"), 0)
      : 0;

    ns.print("╔═ FLIGHT SNAPSHOT ═════════════════════════════");
    ns.print(`║ Mode    : ${state?.mode ?? "unknown"}`);
    ns.print(`║ Priority: ${state?.spendingPolicy?.priority ?? "unknown"}`);
    ns.print(`║ Phase   : ${state?.phase?.name ?? state?.controller?.phase ?? "unknown"}`);
    ns.print("╠═══════════════════════════════════════════════");
    ns.print(`║ Hack    : ${hacking}`);
    ns.print(`║ Money   : ${formatNum(money)}`);
    ns.print(`║ Home RAM: ${formatRam(homeRam)}`);
    ns.print(`║ Share   : ${sharePower.toFixed(4)}x`);
    ns.print("╠═══════════════════════════════════════════════");
    ns.print(`║ Augs    : ${ownedAugs.length} owned | ${installedAugs.length} installed | ${queuedAugs} queued`);
    ns.print(`║ Factions: ${factions.length}`);
    ns.print(`║ Daedalus: ${joinedDaedalus ? "JOINED" : "NOT JOINED"} | Rep ${formatNum(daedalusRep)}`);
    ns.print("╚═══════════════════════════════════════════════");

    if (!flags.watch) break;

    await ns.sleep(Number(flags.interval));
  } while (true);
}

function readDaemonState(ns) {
  try {
    if (!ns.fileExists(DAEMON_STATE_FILE, "home")) return {};
    const raw = ns.read(DAEMON_STATE_FILE);
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function safe(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function formatNum(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + "t";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "b";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "m";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + "k";
  return n.toFixed(0);
}

function formatRam(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0GB";
  if (n >= 1024) return (n / 1024).toFixed(1) + "TB";
  return n.toFixed(0) + "GB";
}