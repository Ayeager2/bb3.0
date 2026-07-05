const STATE_FILE = "/data/gang-ascend-state.txt";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const flags = ns.flags([
    ["member", ""],
  ]);
  const requested =
    String(flags.member || ns.args[0] || "").trim();

  if (!requested) {
    writeState(ns, "error", "No gang member was provided.", { requested });
    return;
  }

  if (!ns.gang?.inGang?.()) {
    writeState(ns, "error", "Cannot ascend: not currently in a gang.", { requested });
    return;
  }

  const member =
    findMember(ns, requested);

  if (!member) {
    writeState(ns, "error", `Cannot ascend: ${requested} was not found.`, {
      requested,
      members: safeMemberNames(ns),
    });
    return;
  }

  const before =
    safeMemberInfo(ns, member);
  const projected =
    safeAscensionResult(ns, member);
  const result =
    ns.gang.ascendMember(member);

  if (!result) {
    writeState(ns, "error", `Ascend failed for ${member}.`, {
      requested,
      member,
      before,
      projected,
    });
    return;
  }

  writeState(ns, "success", `Ascended ${member}.`, {
    requested,
    member,
    before,
    projected,
    result,
  });
}

function findMember(ns, requested) {
  const names =
    safeMemberNames(ns);
  const exact =
    names.find(name => name === requested);
  if (exact) return exact;

  const wanted =
    requested.toLowerCase();
  return names.find(name => String(name).toLowerCase() === wanted) ?? null;
}

function safeMemberNames(ns) {
  try {
    return ns.gang.getMemberNames();
  } catch {
    return [];
  }
}

function safeMemberInfo(ns, member) {
  try {
    return ns.gang.getMemberInformation(member);
  } catch {
    return null;
  }
}

function safeAscensionResult(ns, member) {
  try {
    return ns.gang.getAscensionResult(member);
  } catch {
    return null;
  }
}

function writeState(ns, status, message, extra = {}) {
  ns.write(STATE_FILE, JSON.stringify({
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    source: "gang-ascend-member",
    status,
    message,
    ...extra,
  }, null, 2), "w");
}
