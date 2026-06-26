// /tools/start-bn2.js

const TARGET_BITNODE = 2;
const DEFAULT_CALLBACK = "startup.js";

/** @param {NS} ns **/
export async function main(ns) {
    const flags = ns.flags([
        ["confirm", false],
        ["method", "flume"],
        ["callback", DEFAULT_CALLBACK],
    ]);

    const method = String(flags.method ?? "flume").toLowerCase();
    const callbackScript = String(flags.callback ?? DEFAULT_CALLBACK);

    ns.tprint("BN2 Launch Helper");
    ns.tprint("============================================================");
    ns.tprint(`Target: BN${TARGET_BITNODE} / Rise of the Underworld`);
    ns.tprint(`Method: ${method}`);
    ns.tprint(`Callback: ${callbackScript}`);

    if (!hasSingularity(ns)) {
        ns.tprint("ERROR: Singularity API is not available.");
        return;
    }

    if (!ns.fileExists(callbackScript, "home")) {
        ns.tprint(`ERROR: Callback script ${callbackScript} is not on home.`);
        return;
    }

    if (flags.confirm !== true) {
        ns.tprint("");
        ns.tprint("Dry run only. Re-run with --confirm true when ready.");
        ns.tprint("");
        ns.tprint("Switch to BN2 now:");
        ns.tprint(`run /tools/start-bn2.js --confirm true`);
        ns.tprint("");
        ns.tprint("If you are at the final world-daemon kill and want to complete this BN first:");
        ns.tprint(`run /tools/start-bn2.js --method destroy --confirm true`);
        return;
    }

    if (method === "destroy") {
        ns.tprint("Destroying current BitNode and starting BN2...");
        ns.singularity.destroyW0r1dD43m0n(TARGET_BITNODE, callbackScript);
        return;
    }

    if (method === "flume" || method === "b1tflum3") {
        ns.tprint("Using b1t_flum3 to switch to BN2...");
        ns.singularity.b1tflum3(TARGET_BITNODE, callbackScript);
        return;
    }

    ns.tprint(`ERROR: Unknown method ${method}. Use flume or destroy.`);
}

function hasSingularity(ns) {
    return Boolean(
        ns.singularity?.b1tflum3 &&
        ns.singularity?.destroyW0r1dD43m0n
    );
}
