const DAEMON_STATE_FILE = "/data/daemon-state.txt";

const SYMBOLS = ["", "k", "m", "b", "t", "q", "Q", "s", "S", "o", "n", "e33", "e36", "e39"];

const ARGS_SCHEMA = [
  ["trips-per-cycle", 100000],
  ["money-threshold", 1000000000000],
];

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const options = ns.flags(ARGS_SCHEMA);
  const tripsPerCycle = Number(options["trips-per-cycle"]);
  const moneyThreshold = Number(options["money-threshold"]);

  ns.tprint(`trips-per-cycle: ${tripsPerCycle}`);
  ns.tprint(`money-threshold: ${formatMoney(moneyThreshold)}`);
  ns.tprint("Int travel is daemon-controlled. Waiting for allowIntTravel + Singularity.");

  let justStarted = true;
  let previousInt = ns.getPlayer().intelligence ?? 0;
  let currentInt = previousInt;
  let previousLevelTime = Date.now();
  let cycles = 0;

  ns.tprint(`Starting Script at Int ${currentInt}`);

  while (true) {
    while (shouldTravel(ns, moneyThreshold)) {
      for (let i = 0; i < tripsPerCycle; i++) {
        ns.singularity.travelToCity("Aevum");
        ns.singularity.travelToCity("Sector-12");
      }

      await ns.sleep(1);
      cycles++;

      currentInt = ns.getPlayer().intelligence ?? 0;

      if (previousInt !== currentInt) {
        const levelupTime = Date.now();
        const duration = levelupTime - previousLevelTime;
        const tripsPerLevel = cycles * tripsPerCycle * 2;
        const tripsPerMs = Math.floor(tripsPerLevel / Math.max(1, duration));

        ns.tprint(
          `Level Up: Int ${currentInt}${justStarted ? " Partial" : " Full"} Level in ` +
          `${formatDuration(duration)} & ${formatNumberShort(tripsPerLevel)} Travels`
        );

        ns.tprint(`Approximately ${tripsPerMs} Trips/Millisecond`);

        previousLevelTime = levelupTime;
        previousInt = currentInt;
        justStarted = false;
        cycles = 0;
      }
    }

    const daemon = readJson(ns, DAEMON_STATE_FILE);
    ns.print(
      `Waiting | singularity=${yesNo(daemon?.capabilities?.singularity)} | ` +
      `allowIntTravel=${yesNo(daemon?.spendingPolicy?.allowIntTravel)} | ` +
      `money=${formatMoney(ns.getPlayer().money)} / ${formatMoney(moneyThreshold)}`
    );

    await ns.sleep(10000);
  }
}

export function autocomplete(data) {
  data.flags(ARGS_SCHEMA);
  return [];
}

function shouldTravel(ns, moneyThreshold) {
  const daemon = readJson(ns, DAEMON_STATE_FILE);

  return (
    daemon?.capabilities?.singularity === true &&
    daemon?.spendingPolicy?.allowIntTravel === true &&
    hasSingularityAccess(ns) &&
    ns.getPlayer().money > moneyThreshold
  );
}

function hasSingularityAccess(ns) {
  try {
    ns.singularity.checkFactionInvitations();
    return true;
  } catch {
    return false;
  }
}

function readJson(ns, file) {
  try {
    if (!ns.fileExists(file, "home")) return {};
    const raw = ns.read(file);
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function yesNo(value) {
  return value === true ? "YES" : "NO";
}

function formatMoney(num, maxSignificantFigures = 6, maxDecimalPlaces = 3) {
  const numberShort = formatNumberShort(num, maxSignificantFigures, maxDecimalPlaces);
  return num >= 0 ? "$" + numberShort : numberShort.replace("-", "-$");
}

function formatDuration(duration) {
  if (duration < 1000) return `${duration.toFixed(0)}ms`;

  const portions = [];
  const msInHour = 1000 * 60 * 60;
  const hours = Math.trunc(duration / msInHour);

  if (hours > 0) {
    portions.push(hours + "h");
    duration -= hours * msInHour;
  }

  const msInMinute = 1000 * 60;
  const minutes = Math.trunc(duration / msInMinute);

  if (minutes > 0) {
    portions.push(minutes + "m");
    duration -= minutes * msInMinute;
  }

  let seconds = duration / 1000;
  seconds = hours === 0 && minutes === 0 ? seconds.toPrecision(3) : seconds.toFixed(0);

  if (Number(seconds) > 0) {
    portions.push(seconds + "s");
  }

  return portions.join(" ");
}

function formatNumberShort(num, maxSignificantFigures = 6, maxDecimalPlaces = 3) {
  const sign = Math.sign(num);
  let value = Math.abs(num);
  let i = 0;

  while (value >= 1000 && i < SYMBOLS.length - 1) {
    value /= 1000;
    i++;
  }

  const digits = value > 0
    ? Math.max(0, Math.min(maxDecimalPlaces, maxSignificantFigures - Math.floor(1 + Math.log10(value))))
    : 0;

  return `${sign < 0 ? "-" : ""}${value.toFixed(digits)}${SYMBOLS[i]}`;
}