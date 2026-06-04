/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  const flags = ns.flags([
    ["tails", false],
  ]);
  if (flags.tails) {
    ns.ui.openTail();
    ns.ui.resizeTail(950, 500);
    ns.ui.moveTail(900, 80);
  }

  const refreshMs = flags.tails ? 5000 : 30000;

  const reset = "\u001b[0m";
  const cyan = "\u001b[36m";
  const green = "\u001b[32m";
  const yellow = "\u001b[33m";
  const white = "\u001b[37m";
  const rowA = "\u001b[48;2;20;20;20m";
  const rowB = "\u001b[48;2;35;35;35m";

  while (true) {
    ns.clearLog();

    const servers = ns.cloud.getServerNames();

    let totalRam = 0;
    let totalUsed = 0;
    let totalIncome = 0;

    ns.print(`${cyan}Purchased Server Monitor${reset}`);
    ns.print(`${cyan}${"=".repeat(90)}${reset}`);
    ns.print(`${yellow}${pad("Server", 20)} ${padLeft("RAM", 12)} ${padLeft("Used", 12)} ${padLeft("Free", 12)} ${padLeft("$/sec", 15)}${reset}`);
    ns.print(`${cyan}${"-".repeat(90)}${reset}`);

    for (let i = 0; i < servers.length; i++) {
      const server = servers[i];
      const bg = i % 2 === 0 ? rowA : rowB;

      const maxRam = ns.getServerMaxRam(server);
      const usedRam = ns.getServerUsedRam(server);
      const freeRam = maxRam - usedRam;
      const income = getServerIncome(ns, server);

      totalRam += maxRam;
      totalUsed += usedRam;
      totalIncome += income;

      ns.print(
        bg +
        white + pad(server, 20) + " " +
        cyan + padLeft(ns.format.ram(maxRam), 12) + " " +
        yellow + padLeft(ns.format.ram(usedRam), 12) + " " +
        white + padLeft(ns.format.ram(freeRam), 12) + " " +
        green + padLeft("$" + ns.format.number(income) + "/s", 15) +
        reset
      );
    }

    ns.print(`${cyan}${"-".repeat(90)}${reset}`);
    ns.print(
      yellow + pad("TOTAL", 20) + " " +
      cyan + padLeft(ns.format.ram(totalRam), 12) + " " +
      yellow + padLeft(ns.format.ram(totalUsed), 12) + " " +
      white + padLeft(ns.format.ram(totalRam - totalUsed), 12) + " " +
      green + padLeft("$" + ns.format.number(totalIncome) + "/s", 15) +
      reset
    );

    await ns.sleep(refreshMs);
  }
}

function getServerIncome(ns, server) {
  let total = 0;

  for (const proc of ns.ps(server)) {
    total += ns.getScriptIncome(proc.filename, server, ...proc.args);
  }

  return total;
}

function pad(value, length) {
  return String(value).padEnd(length, " ");
}

function padLeft(value, length) {
  return String(value).padStart(length, " ");
}