import { logPurchase } from "/lib/daemon/purchase-log.js";
const STATE_FILE = "/data/daemon-state.txt";

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");
  const flags = ns.flags([
    ["tails", false],
  ]);
  if (flags.tails) {
    ns.ui.openTail();
    ns.ui.resizeTail(900, 700);
  }

  const CONFIG = {
    tradeBudgetPercent: 0.40,
    refreshMs: 6000,
    accessCheckMs: 10 * 60 * 1000,
    stateRefreshMs: 2000,

    fallbackReserveMoney: 1_000_000_000,
    maxSpendPercent: 0.25,
    commission: 100_000,

    buyForecast: 0.60,
    sellForecast: 0.52,

    historyLimit: 20,
    buyTrendPercent: 0.01,
    sellTrendPercent: -0.005,

    maxRows: 16,
    maxRecentActions: 8,
    wsePurchaseMoney: 200_000_000,
    tixPurchaseMoney: 5_000_000_000,
    fourSPurchaseMoneyAfterTix: 5_000_000_000,
    fourSTixPurchaseMoney: 25_000_000_000,
  };

  const priceHistory = new Map();

  const state = {
    started: Date.now(),
    cycles: 0,
    mode: "",
    daemonPriority: "unknown",
    daemonAllowed: true,
    daemonReserve: CONFIG.fallbackReserveMoney,
    resetPrep: false,

    money: 0,
    portfolioValue: 0,
    totalWealth: 0,
    maxStockInvestment: 0,
    remainingStockBudget: 0,
    buyBudget: 0,
    totalProfit: 0,
    holdings: 0,
    winners: 0,
    losers: 0,
    rows: [],
    recentActions: [],
    marketAccess: {},
    lastAction: "Starting daemon-controlled stock trader...",
  };

  let lastAccessCheck = 0;
  let lastStateRefresh = 0;
  let access = getAccess(ns);
  let daemonState = {};

  while (true) {
    const now = Date.now();

    if (now - lastAccessCheck > CONFIG.accessCheckMs) {
      access = getAccess(ns);
      lastAccessCheck = now;
    }

    if (now - lastStateRefresh > CONFIG.stateRefreshMs) {
      daemonState = readDaemonState(ns);
      lastStateRefresh = now;
    }

    const spendingPolicy = daemonState?.spendingPolicy ?? {};
    const daemonPriority = spendingPolicy.priority ?? "unknown";
    const daemonAllowed = spendingPolicy.allowStockTrading !== false;
    const resetPrep = daemonPriority === "reset-prep";

    const reserveMoney = Number.isFinite(spendingPolicy.reserveMoney)
      ? spendingPolicy.reserveMoney
      : CONFIG.fallbackReserveMoney;

    const money = ns.getPlayer().money;
    const marketAccess = buyMarketAccess(ns, CONFIG, state, {
      daemonAllowed,
      resetPrep,
      reserveMoney,
    });
    access = marketAccess.access;

    if (!access.hasTix) {
      state.cycles++;
      state.mode = getModeName(access);
      state.daemonPriority = daemonPriority;
      state.daemonAllowed = daemonAllowed;
      state.daemonReserve = reserveMoney;
      state.resetPrep = resetPrep;
      state.money = ns.getPlayer().money;
      state.portfolioValue = 0;
      state.totalWealth = state.money;
      state.maxStockInvestment = 0;
      state.remainingStockBudget = 0;
      state.buyBudget = 0;
      state.totalProfit = 0;
      state.holdings = 0;
      state.winners = 0;
      state.losers = 0;
      state.rows = [];
      state.marketAccess = marketAccess;

      drawDashboard(ns, CONFIG, state);

      await ns.sleep(CONFIG.refreshMs);
      continue;
    }

    const symbols = ns.stock.getSymbols();

    let portfolioValue = 0;
    let totalProfit = 0;
    let holdings = 0;
    let winners = 0;
    let losers = 0;
    const rows = [];

    for (const sym of symbols) {
      const bid = ns.stock.getBidPrice(sym);
      const [shares] = ns.stock.getPosition(sym);

      if (shares > 0) {
        portfolioValue += shares * bid;
      }
    }

    const totalWealth = money + portfolioValue;
    const maxStockInvestment = totalWealth * CONFIG.tradeBudgetPercent;
    const remainingStockBudget = Math.max(0, maxStockInvestment - portfolioValue);
    const availableCash = Math.max(0, money - reserveMoney);
    const buyBudget = daemonAllowed && !resetPrep
      ? Math.min(remainingStockBudget, availableCash)
      : 0;

    for (const sym of symbols) {
      const price = ns.stock.getPrice(sym);
      const ask = ns.stock.getAskPrice(sym);
      const bid = ns.stock.getBidPrice(sym);
      const maxShares = ns.stock.getMaxShares(sym);
      const [shares, avgPrice] = ns.stock.getPosition(sym);

      updateHistory(priceHistory, sym, price, CONFIG.historyLimit);

      const trend = getTrend(priceHistory.get(sym));
      const hasPosition = shares > 0;

      let forecast = null;
      let action = "";
      let value = 0;
      let profit = 0;

      if (access.has4S) {
        forecast = ns.stock.getForecast(sym);
      }

      if (hasPosition) {
        holdings++;
        value = shares * bid;
        profit = value - shares * avgPrice - CONFIG.commission * 2;
        totalProfit += profit;

        if (profit >= 0) winners++;
        else losers++;
      }

      if (access.hasTix) {
        if (resetPrep && hasPosition) {
          const moneyBefore = ns.getPlayer().money;

          const salePrice =
            ns.stock.sellStock(sym, shares);

          const moneyAfter = ns.getPlayer().money;

          action = "SOLD RESET";

          if (salePrice > 0) {
            logPurchase(ns, {
              source: "stock-trader",
              type: "stock-sell",
              item: `${sym} x${shares}`,
              cost: -(moneyAfter - moneyBefore),
              moneyBefore,
              moneyAfter,
              message:
                `[STOCK] Sold ${shares} ${sym} during reset-prep.`,
            });
          }
        } else if (!daemonAllowed) {
          if (hasPosition && shouldSellWhilePaused(access, forecast, trend, CONFIG)) {
            const moneyBefore = ns.getPlayer().money;

            const salePrice =
              ns.stock.sellStock(sym, shares);

            const moneyAfter = ns.getPlayer().money;

            action = "SOLD PAUSED";

            if (salePrice > 0) {
              logPurchase(ns, {
                source: "stock-trader",
                type: "stock-sell",
                item: `${sym} x${shares}`,
                cost: -(moneyAfter - moneyBefore),
                moneyBefore,
                moneyAfter,
                message:
                  `[STOCK] Sold ${shares} ${sym} while trading paused.`,
              });
            }
          }
        } else if (access.has4S) {
          if (hasPosition && forecast < CONFIG.sellForecast) {
            const moneyBefore = ns.getPlayer().money;

            const salePrice =
              ns.stock.sellStock(sym, shares);

            const moneyAfter = ns.getPlayer().money;

            action = "SOLD PAUSED";

            if (salePrice > 0) {
              logPurchase(ns, {
                source: "stock-trader",
                type: "stock-sell",
                item: `${sym} x${shares}`,
                cost: -(moneyAfter - moneyBefore),
                moneyBefore,
                moneyAfter,
                message:
                  `[STOCK] Sold ${shares} ${sym} while trading paused.`,
              });
            }
          } else if (!hasPosition && forecast >= CONFIG.buyForecast && buyBudget > CONFIG.commission) {
            const buyResult = buyStock(
              ns,
              sym,
              ask,
              maxShares,
              buyBudget,
              CONFIG.maxSpendPercent,
              CONFIG.commission
            );

            if (buyResult.shares > 0) {
              action = "BOUGHT 4S";

              logPurchase(ns, {
                source: "stock-trader",
                type: "stock-buy",
                item: `${sym} x${buyResult.shares}`,
                cost: buyResult.cost,
                moneyBefore: buyResult.moneyBefore,
                moneyAfter: buyResult.moneyAfter,
                message:
                  `[STOCK] Bought ${buyResult.shares} ${sym}.`,
              });
            }
          }
        } else {
          if (hasPosition && trend <= CONFIG.sellTrendPercent) {
            const moneyBefore = ns.getPlayer().money;

            const salePrice =
              ns.stock.sellStock(sym, shares);

            const moneyAfter = ns.getPlayer().money;

            action = "SOLD PAUSED";

            if (salePrice > 0) {
              logPurchase(ns, {
                source: "stock-trader",
                type: "stock-sell",
                item: `${sym} x${shares}`,
                cost: -(moneyAfter - moneyBefore),
                moneyBefore,
                moneyAfter,
                message:
                  `[STOCK] Sold ${shares} ${sym} while trading paused.`,
              });
            }
          } else if (!hasPosition && trend >= CONFIG.buyTrendPercent && buyBudget > CONFIG.commission) {
            const buyResult = buyStock(
              ns,
              sym,
              ask,
              maxShares,
              buyBudget,
              CONFIG.maxSpendPercent,
              CONFIG.commission
            );

            if (buyResult.shares > 0) {
              action = "BOUGHT TREND";

              logPurchase(ns, {
                source: "stock-trader",
                type: "stock-buy",
                item: `${sym} x${buyResult.shares}`,
                cost: buyResult.cost,
                moneyBefore: buyResult.moneyBefore,
                moneyAfter: buyResult.moneyAfter,
                message: `[STOCK] Bought ${buyResult.shares} ${sym} using trend mode.`,
              });
            }
          }
        }
      }

      if (action) {
        logTrade(state, `${action} ${sym}`);
      }

      rows.push({
        sym,
        shares,
        price,
        trend,
        forecast,
        value,
        profit,
        action,
        hasPosition,
      });
    }

    rows.sort((a, b) => {
      if (b.hasPosition !== a.hasPosition) return Number(b.hasPosition) - Number(a.hasPosition);
      return Math.abs(b.profit) - Math.abs(a.profit);
    });

    state.cycles++;
    state.mode = getModeName(access);
    state.daemonPriority = daemonPriority;
    state.daemonAllowed = daemonAllowed;
    state.daemonReserve = reserveMoney;
    state.resetPrep = resetPrep;
    state.money = money;
    state.portfolioValue = portfolioValue;
    state.totalWealth = totalWealth;
    state.maxStockInvestment = maxStockInvestment;
    state.remainingStockBudget = remainingStockBudget;
    state.buyBudget = buyBudget;
    state.totalProfit = totalProfit;
    state.holdings = holdings;
    state.winners = winners;
    state.losers = losers;
    state.rows = rows;
    state.marketAccess = marketAccess;

    drawDashboard(ns, CONFIG, state);

    await ns.sleep(CONFIG.refreshMs);
  }
}

function shouldSellWhilePaused(access, forecast, trend, CONFIG) {
  if (access.has4S && forecast !== null) {
    return forecast < CONFIG.sellForecast;
  }

  return trend <= CONFIG.sellTrendPercent;
}

function buyMarketAccess(ns, CONFIG, state, { daemonAllowed, resetPrep, reserveMoney }) {
  const accessBefore = getAccess(ns);
  const costs = getMarketAccessCosts(ns, CONFIG);
  const money = ns.getPlayer().money;
  const spendable = Math.max(0, money - reserveMoney);
  const result = {
    access: accessBefore,
    money,
    spendable,
    next: null,
    lastPurchase: null,
    blockedReason: null,
  };

  if (!daemonAllowed) {
    result.blockedReason = "daemon policy has stock trading disabled";
    return result;
  }

  if (resetPrep) {
    result.blockedReason = "reset-prep blocks new market access purchases";
    return result;
  }

  const ladder = [
    {
      key: "wse",
      label: "WSE account",
      owned: accessBefore.hasWse,
      threshold: costs.wse,
      buy: () => safePurchase(ns, "purchaseWseAccount"),
    },
    {
      key: "tix",
      label: "TIX API",
      owned: accessBefore.hasTix,
      threshold: costs.tix,
      buy: () => safePurchase(ns, "purchaseTixApi"),
    },
    {
      key: "fourS",
      label: "4S Market Data",
      owned: accessBefore.has4SData,
      threshold: costs.fourS,
      requires: () => getAccess(ns).hasTix,
      buy: () => safePurchase(ns, "purchase4SMarketData"),
    },
    {
      key: "fourSTix",
      label: "4S Market Data TIX API",
      owned: accessBefore.has4S,
      threshold: costs.fourSTix,
      requires: () => getAccess(ns).hasTix,
      buy: () => safePurchase(ns, "purchase4SMarketDataTixApi"),
    },
  ];

  for (const step of ladder) {
    if (step.owned) continue;

    result.next = {
      key: step.key,
      label: step.label,
      threshold: step.threshold,
      money,
      spendable,
      ready: money >= step.threshold,
    };

    if (step.requires && step.requires() !== true) {
      result.blockedReason = `${step.label} requires an earlier market unlock.`;
      return result;
    }

    if (money < step.threshold) {
      result.blockedReason = `Need ${formatMoney(step.threshold)} cash for ${step.label}.`;
      return result;
    }

    const moneyBefore = ns.getPlayer().money;
    const purchased = step.buy();
    const moneyAfter = ns.getPlayer().money;
    const accessAfter = getAccess(ns);
    const ownedAfter = ownsMarketAccess(accessAfter, step.key);

    if (purchased && ownedAfter) {
      result.lastPurchase = {
        key: step.key,
        label: step.label,
        moneyBefore,
        moneyAfter,
      };
      result.blockedReason = null;

      logTrade(state, `BOUGHT ${step.label}`);
      logPurchase(ns, {
        source: "stock-trader",
        type: "stock-access",
        item: step.label,
        cost: moneyBefore - moneyAfter,
        moneyBefore,
        moneyAfter,
        message: `[STOCK] Purchased ${step.label}.`,
      });

      result.access = accessAfter;
      return result;
    }

    result.blockedReason =
      purchased
        ? `${step.label} purchase returned success, but access is still not detected.`
        : `${step.label} purchase failed.`;
    result.access = accessAfter;
    return result;
  }

  result.access = getAccess(ns);
  result.blockedReason = "All configured market access purchases are complete.";
  return result;
}

function getMarketAccessCosts(ns, CONFIG) {
  try {
    const constants = ns.stock.getConstants();

    return {
      wse: constants.WseAccountCost ?? CONFIG.wsePurchaseMoney,
      tix: constants.TixApiCost ?? CONFIG.tixPurchaseMoney,
      fourS: constants.MarketData4SCost ?? CONFIG.fourSPurchaseMoneyAfterTix,
      fourSTix: constants.MarketDataTixApi4SCost ?? CONFIG.fourSTixPurchaseMoney,
    };
  } catch {
    return {
      wse: CONFIG.wsePurchaseMoney,
      tix: CONFIG.tixPurchaseMoney,
      fourS: CONFIG.fourSPurchaseMoneyAfterTix,
      fourSTix: CONFIG.fourSTixPurchaseMoney,
    };
  }
}

function safePurchase(ns, method) {
  try {
    return ns.stock?.[method]?.() === true;
  } catch {
    return false;
  }
}

function ownsMarketAccess(access, key) {
  if (key === "wse") return access.hasWse === true;
  if (key === "tix") return access.hasTix === true;
  if (key === "fourS") return access.has4SData === true;
  if (key === "fourSTix") return access.has4S === true;
  return false;
}

function readDaemonState(ns) {
  try {
    if (!ns.fileExists(STATE_FILE, "home")) return {};
    const raw = ns.read(STATE_FILE);
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function logTrade(state, message) {
  state.lastAction = message;
  state.recentActions.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
  state.recentActions = state.recentActions.slice(0, 20);
}

function drawDashboard(ns, CONFIG, state) {
  const c = colors();

  const uptime = formatDuration(Date.now() - state.started);
  const profitColor = state.totalProfit >= 0 ? c.green : c.red;
  const daemonColor = state.daemonAllowed ? c.green : c.red;
  const priorityColor =
    state.daemonPriority === "income" ? c.green :
      state.daemonPriority === "upgrades" ? c.yellow :
        state.daemonPriority === "faction" ? c.magenta :
          state.daemonPriority === "reset-prep" ? c.red :
            c.gray;

  ns.clearLog();

  printTitleBox(ns, "Daemon-Controlled Stock Trader", [
    `Mode       : ${state.mode}`,
    `Daemon     : ${state.daemonAllowed ? "ALLOWED" : "PAUSED"} | Priority: ${state.daemonPriority}`,
    `Uptime     : ${uptime}`,
    `Cycle      : ${state.cycles}`,
    `Last Action: ${state.lastAction}`,
  ], c);

  printAccordionSection(ns, "Daemon Policy", true, [
    `${badge(c, "TRADING", state.daemonAllowed ? "YES" : "NO", daemonColor)} ${badge(c, "PRIORITY", state.daemonPriority, priorityColor)}`,
    `${badge(c, "RESET PREP", state.resetPrep ? "YES" : "NO", state.resetPrep ? c.red : c.green)} ${badge(c, "RESERVE", "$" + formatNum(state.daemonReserve), c.yellow)}`,
    state.resetPrep
      ? `${c.red}Reset-prep active: selling all positions and blocking new buys.${c.reset}`
      : state.daemonAllowed
        ? `${c.green}Trading allowed by daemon spending policy.${c.reset}`
        : `${c.yellow}Trading paused: no new buys; weak positions may be sold.${c.reset}`,
  ], c.cyan);

  printAccordionSection(ns, "Market Access", true, getMarketAccessLines(state, c), c.cyan);

  printAccordionSection(ns, "Account", true, [
    `${badge(c, "CASH", "$" + formatNum(state.money), c.green)} ${badge(c, "PORT", "$" + formatNum(state.portfolioValue), c.cyan)}`,
    `${badge(c, "BUDGET", "$" + formatNum(state.buyBudget), c.yellow)} ${badge(c, "PROFIT", "$" + formatNum(state.totalProfit), profitColor)}`,
    `${badge(c, "HELD", state.holdings, c.white)} ${badge(c, "WIN", state.winners, c.green)} ${badge(c, "LOSS", state.losers, c.red)}`,
  ], c.cyan);

  printAccordionSection(ns, "Budget", true, [
    `Max Stock Investment   : ${c.white}$${formatNum(state.maxStockInvestment)}${c.reset}`,
    `Remaining Stock Budget : ${c.white}$${formatNum(state.remainingStockBudget)}${c.reset}`,
    `Daemon Reserve Cash    : ${c.white}$${formatNum(state.daemonReserve)}${c.reset}`,
    `Trade Budget Percent   : ${c.white}${(CONFIG.tradeBudgetPercent * 100).toFixed(0)}%${c.reset}`,
  ], c.cyan);

  const stockLines = [];

  stockLines.push(
    `${c.gray}${pad("SYM", 6)} ${padLeft("SHARES", 10)} ${padLeft("PRICE", 10)} ${padLeft("TRND", 8)} ${padLeft("FCST", 8)} ${padLeft("P/L", 12)} ${pad("ACTION", 12)}${c.reset}`
  );

  const visibleRows = state.rows.slice(0, CONFIG.maxRows);

  for (const row of visibleRows) {
    const trendColor = row.trend > 0 ? c.green : row.trend < 0 ? c.red : c.yellow;

    const forecastColor =
      row.forecast === null
        ? c.gray
        : row.forecast >= CONFIG.buyForecast
          ? c.green
          : row.forecast < CONFIG.sellForecast
            ? c.red
            : c.yellow;

    const rowProfitColor = row.profit >= 0 ? c.green : c.red;
    const actionColor =
      row.action.includes("SOLD") ? c.red :
        row.action.includes("BOUGHT") ? c.green :
          c.gray;

    stockLines.push(
      `${c.white}${pad(row.sym, 6)}${c.reset} ` +
      `${c.cyan}${padLeft(formatNum(row.shares), 10)}${c.reset} ` +
      `${c.white}${padLeft("$" + formatNum(row.price), 10)}${c.reset} ` +
      `${trendColor}${padLeft((row.trend * 100).toFixed(2) + "%", 8)}${c.reset} ` +
      `${forecastColor}${padLeft(row.forecast === null ? "LOCK" : (row.forecast * 100).toFixed(1) + "%", 8)}${c.reset} ` +
      `${rowProfitColor}${padLeft("$" + formatNum(row.profit), 12)}${c.reset} ` +
      `${actionColor}${pad(shorten(row.action || "-", 12), 12)}${c.reset}`
    );
  }

  if (state.rows.length > CONFIG.maxRows) {
    stockLines.push(`${c.gray}+${state.rows.length - CONFIG.maxRows} more stocks hidden${c.reset}`);
  }

  printAccordionSection(ns, "Stocks", true, stockLines, c.cyan);

  const recentLines =
    state.recentActions.length === 0
      ? [`${c.gray}No trades yet.${c.reset}`]
      : state.recentActions.slice(0, CONFIG.maxRecentActions).map(x => `${c.gray}${shorten(x, 85)}${c.reset}`);

  printAccordionSection(ns, "Recent Trades", true, recentLines, c.cyan);
}

function getMarketAccessLines(state, c) {
  const access = state.marketAccess?.access ?? {};
  const next = state.marketAccess?.next ?? null;
  const blocked = state.marketAccess?.blockedReason ?? null;

  const lines = [
    `${badge(c, "WSE", access.hasWse ? "YES" : "NO", access.hasWse ? c.green : c.yellow)} ` +
    `${badge(c, "TIX", access.hasTix ? "YES" : "NO", access.hasTix ? c.green : c.yellow)} ` +
    `${badge(c, "4S UI", access.has4SData ? "YES" : "NO", access.has4SData ? c.green : c.yellow)} ` +
    `${badge(c, "4S API", access.has4S ? "YES" : "NO", access.has4S ? c.green : c.yellow)}`,
  ];

  if (next) {
    lines.push(
      `${c.white}Next unlock:${c.reset} ${next.label} | ` +
      `${c.white}Need:${c.reset} $${formatNum(next.threshold)} | ` +
      `${c.white}Cash:${c.reset} $${formatNum(next.money)}`
    );
  }

  if (blocked) {
    lines.push(`${c.gray}${blocked}${c.reset}`);
  }

  return lines;
}

function printTitleBox(ns, title, lines, c) {
  const width = 86;
  const innerWidth = width - 4;

  ns.print(`${c.cyan}╔${"═".repeat(width - 2)}╗${c.reset}`);
  ns.print(`${c.cyan}║${c.reset} ${c.white}${padRight(title, innerWidth)}${c.reset} ${c.cyan}║${c.reset}`);
  ns.print(`${c.cyan}╠${"═".repeat(width - 2)}╣${c.reset}`);

  for (const line of lines) {
    ns.print(`${c.cyan}║${c.reset} ${padRight(stripAnsi(line), innerWidth)} ${c.cyan}║${c.reset}`);
  }

  ns.print(`${c.cyan}╚${"═".repeat(width - 2)}╝${c.reset}`);
}

function printAccordionSection(ns, title, isOpen, lines, color = "\u001b[36m") {
  const reset = "\u001b[0m";
  const icon = isOpen ? "[-]" : "[+]";

  ns.print("");
  ns.print(`${color}${icon} ${title}${reset}`);

  if (!isOpen) return;

  for (const line of lines) {
    ns.print(`    ${line}`);
  }
}

function badge(c, label, value, color) {
  return (
    `${c.gray}[${c.reset}` +
    `${color}${label}:${value}${c.reset}` +
    `${c.gray}]${c.reset}`
  );
}

function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatNum(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + "t";
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "b";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "m";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + "k";

  return n.toFixed(0);
}

function formatMoney(value) {
  return "$" + formatNum(value);
}

function shorten(value, maxLength) {
  const text = String(value ?? "");

  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);

  return text.slice(0, maxLength - 3) + "...";
}

function stripAnsi(value) {
  return String(value ?? "").replace(/\u001b\[[0-9;]*m/g, "");
}

function getAccess(ns) {
  let hasWse = false;
  let hasTix = false;
  let has4SData = false;
  let has4S = false;

  try {
    hasWse = ns.stock.hasWseAccount();
  } catch {
    hasWse = false;
  }

  try {
    hasTix = ns.stock.hasTixApiAccess();
  } catch {
    try {
      ns.stock.getPosition("ECP");
      hasTix = true;
    } catch {
      hasTix = false;
    }
  }

  try {
    has4SData = ns.stock.has4SData();
  } catch {
    has4SData = false;
  }

  try {
    has4S = ns.stock.has4SDataTixApi();
  } catch {
    try {
      ns.stock.getForecast("ECP");
      has4S = true;
    } catch {
      has4S = false;
    }
  }

  return { hasWse, hasTix, has4SData, has4S };
}

function getModeName(access) {
  if (access.has4S) return "4S FORECAST AUTO-TRADER";
  if (access.hasTix) return "TIX TREND AUTO-TRADER";
  return "TICKER ONLY";
}

function updateHistory(priceHistory, sym, price, limit) {
  if (!priceHistory.has(sym)) {
    priceHistory.set(sym, []);
  }

  const history = priceHistory.get(sym);
  history.push(price);

  while (history.length > limit) {
    history.shift();
  }
}

function getTrend(history) {
  if (!history || history.length < 2) return 0;

  const first = history[0];
  const last = history[history.length - 1];

  return (last - first) / first;
}

function buyStock(ns, sym, ask, maxShares, buyBudget, maxSpendPercent, commission) {
  const budget = buyBudget * maxSpendPercent;
  const sharesToBuy = Math.min(maxShares, Math.floor((budget - commission) / ask));

  if (sharesToBuy <= 0) {
    return {
      shares: 0,
      cost: 0,
      moneyBefore: ns.getPlayer().money,
      moneyAfter: ns.getPlayer().money,
    };
  }

  const [sharesBefore] = ns.stock.getPosition(sym);
  const moneyBefore = ns.getPlayer().money;
  ns.stock.buyStock(sym, sharesToBuy);
  const moneyAfter = ns.getPlayer().money;
  const [sharesAfter] = ns.stock.getPosition(sym);
  const sharesBought = Math.max(0, sharesAfter - sharesBefore);

  return {
    shares: sharesBought,
    cost: sharesBought > 0
      ? sharesBought * ask + commission
      : 0,
    moneyBefore,
    moneyAfter,
  };
}

function colors() {
  return {
    reset: "\u001b[0m",
    cyan: "\u001b[36m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    red: "\u001b[31m",
    white: "\u001b[37m",
    gray: "\u001b[90m",
    magenta: "\u001b[35m",
  };
}

function pad(value, length) {
  return String(value).padEnd(length, " ");
}

function padLeft(value, length) {
  return String(value).padStart(length, " ");
}

function padRight(value, length) {
  return String(value).padEnd(length, " ");
}
