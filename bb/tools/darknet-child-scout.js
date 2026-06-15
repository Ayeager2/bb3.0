// /tools/darknet-child-scout.js
const VERSION = 'darknet-child-scout-tiny-v2';

/** @param {NS} ns **/
export async function main(ns) {
  const host = String(ns.getHostname());
  const origin = String(ns.args[0] ?? 'home');
  const enableStasis = ns.args.includes('--stasis');
  const file = `/data/darknet-child-${safe(host)}.txt`;
  const state = {
    diagnosticVersion: VERSION,
    updatedAt: Date.now(),
    updatedAtText: new Date().toLocaleTimeString(),
    host,
    origin,
    status: 'starting',
    neighbors: [],
    stasis: null,
  };

  try {
    state.neighbors = ns.dnet.probe(false) ?? [];
    state.status = 'ready';
  } catch (error) {
    state.status = 'probe-error';
    state.error = String(error);
  }

  if (enableStasis) {
    try {
      state.stasis = compact(await ns.dnet.setStasisLink(true));
    } catch (error) {
      state.stasis = {
        success: false,
        error: String(error),
      };
    }
  }

  ns.write(file, JSON.stringify(state, null, 2), 'w');

  if (host !== 'home') {
    try {
      await ns.scp(file, 'home', host);
    } catch (error) {
      state.copyHomeError = String(error);
      ns.write(file, JSON.stringify(state, null, 2), 'w');
    }
  }
}

function compact(result) {
  if (!result || typeof result !== 'object') return result;
  return {
    success: result.success,
    message: result.message,
    error: result.error,
  };
}

function safe(value) {
  return String(value ?? 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
}
