//tools/augmentation-status.js
const AUGMENTATION_PLAN_FILE = '/data/augmentation-plan.txt';
const AUGMENTATION_STATE_FILE = '/data/augmentation-state.txt';
const AUGMENTATION_BUYER_STATE_FILE = '/data/augmentation-buyer-state.txt';
const DAEMON_STATE_FILE = '/data/daemon-state.txt';
const TOOL_VERSION = 'augmentation-status-policy-diagnostics-v2';

import { buildAugmentationTiming } from '/lib/daemon/augmentation-timing.js';

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog('ALL');

  const plan = readJson(ns, AUGMENTATION_PLAN_FILE);
  const state = readJson(ns, AUGMENTATION_STATE_FILE);
  const buyerState = readJson(ns, AUGMENTATION_BUYER_STATE_FILE);
  const daemonState = readJson(ns, DAEMON_STATE_FILE);
  const policy = daemonState?.spendingPolicy ?? {};
  const buyerService = getService(daemonState, 'augmentation-buyer');
  const timing =
    daemonState?.augmentationTiming ??
    buildAugmentationTiming(ns, {
      augPlan: plan,
      factionWork: readJson(ns, '/data/faction-work-plan.txt'),
      donationPlan: readJson(ns, '/data/faction-donation-plan.txt'),
    });
  const timingSource = daemonState?.augmentationTiming ? 'daemon-state' : 'live-status';

  if (!plan?.updatedAt) {
    ns.tprint('No augmentation plan found.');
    ns.tprint('Run:');
    ns.tprint('run /tools/augmentation-data-builder.js --force');
    ns.tprint('run /tools/augmentation-buyer-service.js --force-buy false');
    return;
  }

  ns.tprint('Augmentation Status');
  ns.tprint('='.repeat(60));
  ns.tprint(`Diagnostic Version: ${TOOL_VERSION}`);
  ns.tprint(`Updated: ${new Date(plan.updatedAt).toLocaleTimeString()}`);
  ns.tprint(`BitNode: ${plan.bitNode ?? 'unknown'}`);
  ns.tprint(`Money: ${formatMoney(plan.money ?? 0)}`);
  ns.tprint(`Reserve: ${formatMoney(plan.reserveMoney ?? 0)}`);
  ns.tprint(`Spendable: ${formatMoney(plan.spendable ?? 0)}`);
  ns.tprint(`Max Price: ${formatMoney(plan.maxPrice ?? 0)}`);
  ns.tprint(`Cached Factions: ${state?.factionCount ?? 0}`);
  ns.tprint(`Unique Augs: ${state?.uniqueAugmentationCount ?? 0}`);
  if (timing) {
    ns.tprint(`Timing: ${timing.recommendation ?? 'unknown'} (${timingSource})`);
    ns.tprint(`Timing Reason: ${timing.reason ?? 'unknown'}`);
  }
  ns.tprint(`Buyer Allowed: ${policy.allowAugmentPurchases === true ? 'YES' : 'NO'}`);
  ns.tprint(
    `Buyer Service: ${buyerService?.status ?? 'unknown'} ` +
      `${buyerService?.running ? `(pid ${buyerService.pid})` : ''}`,
  );
  ns.tprint('-'.repeat(60));

  if (!plan.nextGoal) {
    ns.tprint(`No next goal: ${plan.blockedReason ?? 'unknown'}`);
    return;
  }

  const g = plan.nextGoal;

  ns.tprint(`Next Goal: ${g.name}`);
  ns.tprint(`Faction: ${g.faction}`);
  ns.tprint(`Theme: ${g.theme}`);
  ns.tprint(`Tags: ${(g.tags ?? []).join(', ')}`);
  if (g.statBreakdown) {
    ns.tprint('Stat Breakdown:');

    for (const [key, value] of Object.entries(g.statBreakdown)) {
      if (Number(value) > 0) {
        ns.tprint(`  ${key}: ${Number(value).toFixed(2)}`);
      }
    }
  }
  ns.tprint(`Score: ${Number(g.score ?? 0).toFixed(2)}`);
  ns.tprint(`Priority Class: ${g.priorityClass ?? 'unknown'}`);
  ns.tprint(`Price: ${formatMoney(g.price)}`);
  ns.tprint(`Rep Required: ${formatNumber(g.rep)}`);
  ns.tprint(`Faction Rep: ${formatNumber(g.factionRep)}`);
  ns.tprint(`Has Rep: ${g.hasRep ? 'YES' : 'NO'}`);
  ns.tprint(`Affordable: ${g.affordable ? 'YES' : 'NO'}`);
  ns.tprint(`Prereqs: ${g.hasPrereqs ? 'OK' : (g.prereqs ?? []).join(', ')}`);
  ns.tprint('-'.repeat(60));
  ns.tprint(`Ready: ${plan.ready ? 'YES' : 'NO'}`);
  ns.tprint(`Status: ${plan.blockedReason ?? 'unknown'}`);

  if (timing) {
    ns.tprint('-'.repeat(60));
    ns.tprint('Augmentation Timing');
    ns.tprint(`Source: ${timingSource}`);
    ns.tprint(`Recommendation: ${timing.recommendation ?? 'unknown'}`);
    ns.tprint(`Full Faction: ${timing.shouldFullFaction ? 'YES' : 'NO'}`);
    ns.tprint(`Background Faction: ${timing.allowBackgroundFaction ? 'YES' : 'NO'}`);
    ns.tprint(
      `Value: ${timing.valueBucket ?? 'unknown'} (${formatNumber(timing.valueScore ?? 0)})`,
    );
    ns.tprint(
      `Rep Gap: ${timing.repBucket ?? 'unknown'} (${formatNumber(timing.missingRep ?? 0)})`,
    );
    ns.tprint(
      `Money Gap: ${timing.moneyBucket ?? 'unknown'} (${formatMoney(timing.missingMoney ?? 0)})`,
    );
    ns.tprint(`Cloud: ${timing.cloudBucket ?? 'unknown'}`);
    if (timing.cloudNextAction?.type && timing.cloudNextAction.type !== 'none') {
      ns.tprint(
        `Cloud Next: ${timing.cloudNextAction.type} ` +
          `${timing.cloudNextAction.server ?? ''} ` +
          `${formatMoney(timing.cloudNextAction.cost ?? 0)}`,
      );
    }
    ns.tprint(`Reason: ${timing.reason ?? 'unknown'}`);
  }

  ns.tprint('-'.repeat(60));
  ns.tprint('Augmentation Buyer Policy');
  ns.tprint(`Policy Priority: ${policy.priority ?? 'unknown'}`);
  ns.tprint(`Allow Purchases: ${policy.allowAugmentPurchases === true ? 'YES' : 'NO'}`);
  ns.tprint(`Reserve: ${formatMoney(policy.reserveMoney ?? 0)}`);
  ns.tprint(`Service Status: ${buyerService?.status ?? 'unknown'}`);
  ns.tprint(`Service Reason: ${buyerService?.reason ?? 'unknown'}`);

  if (buyerState?.updatedAt) {
    ns.tprint('-'.repeat(60));
    ns.tprint('Augmentation Buyer State');
    ns.tprint(`Updated: ${new Date(buyerState.updatedAt).toLocaleTimeString()}`);
    ns.tprint(`Status: ${buyerState.status ?? 'unknown'}`);
    ns.tprint(`Allow Buying: ${buyerState.allowBuying === true ? 'YES' : 'NO'}`);
    ns.tprint(`Plan Ready: ${buyerState.planReady === true ? 'YES' : 'NO'}`);
    ns.tprint(`Reason: ${buyerState.blockedReason || buyerState.planBlockedReason || 'none'}`);
    if (buyerState.nextGoal?.name) {
      ns.tprint(`Buyer Goal: ${buyerState.nextGoal.name}`);
      ns.tprint(`Buyer Faction: ${buyerState.nextGoal.faction}`);
    }
    if (Number.isFinite(Number(buyerState.livePrice))) {
      ns.tprint(`Live Price: ${formatMoney(buyerState.livePrice)}`);
    }
    if (Number.isFinite(Number(buyerState.liveFactionRep))) {
      ns.tprint(`Live Faction Rep: ${formatNumber(buyerState.liveFactionRep)}`);
    }
    if (Number.isFinite(Number(buyerState.liveRepReq))) {
      ns.tprint(`Live Rep Required: ${formatNumber(buyerState.liveRepReq)}`);
    }
    if (Number.isFinite(Number(buyerState.spendable))) {
      ns.tprint(`Buyer Spendable: ${formatMoney(buyerState.spendable)}`);
    }
  }
}

function getService(daemonState, id) {
  const services = Array.isArray(daemonState?.services) ? daemonState.services : [];
  return services.find(service => service.id === id) ?? null;
}

function readJson(ns, file) {
  try {
    if (!ns.fileExists(file, 'home')) return {};
    const raw = ns.read(file);
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function formatMoney(value) {
  return '$' + formatNumber(value);
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '∞';
  if (Math.abs(n) >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + 't';
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'b';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'm';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + 'k';
  return n.toFixed(0);
}
