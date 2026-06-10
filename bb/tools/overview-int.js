// /tools/overview-int.js

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("ALL");

const flags = ns.flags([
    ["refresh", 500],
    ["label", "Int"],
    ["debug", false],
]);

    const doc = eval("document");
    const hook0 = doc.getElementById("overview-extra-hook-0");
    const hook1 = doc.getElementById("overview-extra-hook-1");

    if (!hook0 || !hook1) {
        ns.tprint("[OVERVIEW INT] Open Overview, then rerun.");
        return;
    }

    const bar = ensureIntProgressBar(doc, hook0);

    ns.atExit(() => {
        hook0.innerText = "";
        hook1.innerText = "";
        bar?.row?.remove();
    });

    while (true) {
        const player = ns.getPlayer();

        const level = getNumber(
            player?.skills?.intelligence,
            player?.intelligence,
        );

        const exp = getNumber(
            player?.exp?.intelligence,
            player?.intelligence_exp,
        );

        const progress = getLevelProgress(exp);

        hook0.innerText = String(flags.label);
        hook1.innerText = `${formatNumber(level)} (${progress.toFixed(1)}%)`;

        bar.outer.setAttribute("aria-valuenow", String(progress));
        bar.inner.style.transform = `translateX(-${100 - progress}%)`;

        await ns.sleep(Number(flags.refresh) || 500);
    }
}

function ensureIntProgressBar(doc, hook0) {
    const existing = doc.getElementById("bb-int-progress-row");
    if (existing) {
        return {
            row: existing,
            outer: existing.querySelector(".bb-int-progress"),
            inner: existing.querySelector(".bb-int-progress-bar"),
        };
    }

    const hookRow = hook0.closest("tr");
    const row = doc.createElement("tr");
    row.id = "bb-int-progress-row";
    row.className = hookRow?.className ?? "";

    const cell = doc.createElement("th");
    cell.scope = "row";
    cell.colSpan = 2;
    cell.style.paddingBottom = "2px";
    cell.style.position = "relative";
    cell.style.top = "-3px";

    const outer = doc.createElement("span");
    outer.className = "bb-int-progress";
    outer.setAttribute("role", "progressbar");
    outer.setAttribute("aria-valuemin", "0");
    outer.setAttribute("aria-valuemax", "100");

    outer.style.display = "block";
    outer.style.height = "4px";
    outer.style.width = "100%";
    outer.style.overflow = "hidden";
    outer.style.borderRadius = "999px";
    outer.style.background = "rgba(255, 255, 255, 0.18)";

    const inner = doc.createElement("span");
    inner.className = "bb-int-progress-bar";
    inner.style.display = "block";
    inner.style.height = "100%";
    inner.style.width = "100%";
    inner.style.transform = "translateX(-100%)";
    inner.style.transition = "transform 120ms linear";
    inner.style.background = "currentColor";

    outer.appendChild(inner);
    cell.appendChild(outer);
    row.appendChild(cell);

    hookRow.after(row);

    return { row, outer, inner };
}

function getLevelProgress(exp) {
    if (!Number.isFinite(exp) || exp <= 0) return 0;

    let level = 1;

    while (true) {
        const current = expForLevel(level);
        const next = expForLevel(level + 1);

        if (exp >= current && exp < next) {
            return ((exp - current) / Math.max(1, next - current)) * 100;
        }

        level++;

        if (level > 10000) return 100;
    }
}

function expForLevel(level) {
    return Math.exp((level - 1) / 32) * 975 - 975;
}

function getNumber(...values) {
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) return value;
    }

    return 0;
}

function formatNumber(value) {
    if (!Number.isFinite(value)) return "0";
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}k`;
    return value.toFixed(value < 100 ? 2 : 0);
}