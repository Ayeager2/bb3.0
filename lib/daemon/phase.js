export function getCurrentPhase(ns, decision, capabilities) {
    const hacking = ns.getHackingLevel();
    const money = ns.getPlayer().money;
    const priority = decision?.spendingPolicy?.priority;
    const mode = decision?.mode;
    const roadmap = decision?.bitNodePlan?.roadmap;

    if (roadmap === "singularity" || capabilities?.singularity) {
        if (priority === "reset-prep") return "Reset Prep";
        if (mode === "faction") return "Singularity";
        return "Singularity Prep";
    }

    if (hacking < 250) return "Bootstrap";
    if (hacking < 1000) return "Expansion";
    if (hacking < 2500) return "Scaling";
    if (priority === "faction") return "Faction";
    if (priority === "reset-prep") return "Reset Prep";

    return "Late Game";
}