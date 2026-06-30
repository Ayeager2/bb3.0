/**
 * Tiny daemon process helpers.
 *
 * Keep this file small so daemon.js does not import unrelated service or share
 * worker lifecycle code into its static RAM footprint.
 */

export function killOtherDaemonInstances(ns) {
    const currentPid = ns.pid;
    const currentScript = ns.getScriptName();

    for (const proc of ns.ps("home")) {
        if (proc.filename !== currentScript) continue;
        if (proc.pid === currentPid) continue;

        ns.kill(proc.pid);
    }
}
