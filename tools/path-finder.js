/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  const target = String(ns.args[0] ?? "run4theh111z");

  const path = findPath(ns, "home", target);

  if (!path) {
    ns.tprint(`Could not find server: ${target}`);
    return;
  }

  const connectCommand = path.map(server => `connect ${server}`).join("; ");

  ns.tprint(`Found ${target}:`);
  ns.tprint(path.join(" -> "));
  ns.tprint("");
  ns.tprint("Terminal command:");
  ns.tprint(connectCommand);

  ns.clearLog();
  ns.print(`Target: ${target}`);
  ns.print(path.join(" -> "));
  ns.print("");
  ns.print(connectCommand);
}

function findPath(ns, start, target) {
  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current === target) return path;

    for (const next of ns.scan(current)) {
      if (visited.has(next)) continue;
      if (next.startsWith("box-")) continue;

      visited.add(next);
      queue.push([...path, next]);
    }
  }

  return null;
}