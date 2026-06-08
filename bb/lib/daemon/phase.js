//bb/lib/daemon/phoase.js
export function getCurrentPhase(ns, decision, capabilities) {
    const hacking = ns.getHackingLevel();
    const priority = decision?.spendingPolicy?.priority;
    const mode = decision?.mode;
    const roadmap = decision?.bitNodePlan?.roadmap;

    if (mode === "destroy-node" || priority === "destroy-node") {
        return "destroy-node";
    }

    if (mode === "reset-prep" || priority === "reset-prep") {
        return "reset-prep";
    }

    const isProgression =
        priority === "progression" ||
        priority === "faction" ||
        mode === "progression" ||
        mode === "faction";

    if (roadmap === "singularity" || capabilities?.singularity) {
        if (isProgression) return "Singularity";
        return "Singularity Prep";
    }

    if (hacking < 250) return "Bootstrap";
    if (hacking < 1000) return "Expansion";
    if (hacking < 2500) return "Scaling";

    if (isProgression) return "Faction";

    return "Late Game";
}
