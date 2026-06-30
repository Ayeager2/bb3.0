// /lib/corp/safe.js

export function corpApi(ns) {
    return ns.corporation;
}

export function safeCall(fn, fallback = null) {
    try {
        const value = fn();
        return value === undefined ? fallback : value;
    } catch {
        return fallback;
    }
}

export function hasCorporation(ns) {
    return safeCall(() => corpApi(ns).hasCorporation(), false) === true;
}

export function canCreateCorporation(ns, seedMoney) {
    return safeCall(() => corpApi(ns).canCreateCorporation(seedMoney), false) === true;
}

export function getCorporation(ns) {
    return safeCall(() => corpApi(ns).getCorporation(), null);
}

export function getDivision(ns, division) {
    return safeCall(() => corpApi(ns).getDivision(division), null);
}

export function hasDivision(ns, division) {
    return !!getDivision(ns, division);
}

export function hasCity(ns, division, city) {
    const div = getDivision(ns, division);
    return Array.isArray(div?.cities) && div.cities.includes(city);
}

export function getInvestmentOffer(ns) {
    return safeCall(() => corpApi(ns).getInvestmentOffer(), null);
}

export function getOffice(ns, division, city) {
    return safeCall(() => corpApi(ns).getOffice(division, city), null);
}

export function getWarehouse(ns, division, city) {
    return safeCall(() => corpApi(ns).getWarehouse(division, city), null);
}

export function hasWarehouse(ns, division, city) {
    return !!getWarehouse(ns, division, city);
}

export function getMaterial(ns, division, city, material) {
    return safeCall(() => corpApi(ns).getMaterial(division, city, material), null);
}

export function getProduct(ns, division, city, product) {
    return safeCall(() => corpApi(ns).getProduct(division, city, product), null);
}

export function getUpgradeLevel(ns, upgrade) {
    return Number(safeCall(() => corpApi(ns).getUpgradeLevel(upgrade), 0)) || 0;
}

export function writeJson(ns, file, data) {
    ns.write(file, JSON.stringify(data, null, 2), "w");
}

export function readJson(ns, file, fallback = {}) {
    try {
        if (!ns.fileExists(file, "home")) return fallback;
        const raw = ns.read(file);
        if (!raw.trim()) return fallback;
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function formatMoney(ns, value) {
    try {
        return `$${ns.format.number(Number(value) || 0)}`;
    } catch {
        return `$${Math.round(Number(value) || 0).toLocaleString()}`;
    }
}
