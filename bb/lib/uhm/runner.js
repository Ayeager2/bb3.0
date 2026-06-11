// /lib/uhm/runner.js
import { isUsableTarget } from '/lib/uhm/safe.js';

import { getBatchPlan, launchBatchesAggressive } from '/lib/uhm/batch.js';

import { prepTarget, isPrepared } from '/lib/uhm/prep.js';

import {
  hackScript,
  expGrowScript,
  expHackScript,
  expWeakenScript,
  growScript,
  maxWorkerThreadsPerProcess,
  weakenScript,
} from '/lib/uhm/config.js';
import { runExpSprint } from '/lib/uhm/modes/exp-sprint.js';

export function runLane(ns, lane, runtimeStats) {
  if (!isUsableTarget(ns, lane.target)) return null;

  killOversizedUhmWorkers(ns, lane.hosts);

  if (lane.mode === 'exp') {
    const leveling = lane.expPurpose === 'leveling';
    const result = runExpSprint(ns, lane.target, lane.hosts, {
      purpose: lane.expPurpose ?? 'background',
      maxProcesses: leveling ? 100000 : 10000,
      maxThreadsPerProcess: maxWorkerThreadsPerProcess,
      maxProcessesPerHost: leveling ? 5000 : 1000,
    });

    runtimeStats.expOverdrive = {
      active: true,
      engine: result.engine ?? 'hack-sprint',
      target: lane.target,
      purpose: lane.expPurpose ?? 'background',
      launched: result.launched,
      threads: result.threads,
      status: result.status,
      activeProcesses: result.activeProcesses ?? 0,
      maxProcesses: result.maxProcesses ?? 0,
      maxThreadsPerProcess: result.maxThreadsPerProcess ?? 0,
      growRatio: Number.isFinite(result.growRatio) ? result.growRatio : 0,
    };

    return {
      lane: lane.name,
      target: lane.target,
      mode: lane.mode,
      expPurpose: lane.expPurpose ?? 'background',
      targetSource: lane.targetSource ?? 'selected',
      requestedTarget: lane.requestedTarget ?? null,
      status: result.status,
      launched: result.launched,
      threads: result.threads,
      plan: null,
    };
  }

  if (lane.mode === 'money' && shouldUseProtoMoney(ns, lane)) {
    const protoThreads = runProtoMoney(ns, lane.target, lane.hosts);

    runtimeStats.protoMoneyThreads = (runtimeStats.protoMoneyThreads ?? 0) + protoThreads;

    return {
      lane: lane.name,
      target: lane.target,
      mode: lane.mode,
      targetSource: lane.targetSource ?? 'selected',
      requestedTarget: lane.requestedTarget ?? null,
      status: protoThreads > 0 ? 'PROTO-MONEY' : 'NO-RAM',
      launched: protoThreads,
      plan: null,
    };
  }

  const availableRam = getLaneFreeRam(lane.hosts);

  const plan = getBatchPlan(ns, lane.target, lane.mode, {
    availableRam,
    formulasUnlocked: lane.formulasUnlocked === true && !!ns.formulas?.hacking,
  });

  if (!plan) return null;

  if (!isPrepared(ns, lane.target)) {
    runtimeStats.prepRuns++;

    prepTarget(ns, lane.target, lane.hosts);

    return {
      lane: lane.name,
      target: lane.target,
      mode: lane.mode,
      targetSource: lane.targetSource ?? 'selected',
      requestedTarget: lane.requestedTarget ?? null,
      status: 'PREPPING',
      launched: 0,
      plan,
    };
  }

  if (plan.tooLargeForLane) {
    const protoThreads = runProtoMoney(ns, lane.target, lane.hosts);

    runtimeStats.protoMoneyThreads = (runtimeStats.protoMoneyThreads ?? 0) + protoThreads;

    return {
      lane: lane.name,
      target: lane.target,
      mode: lane.mode,
      targetSource: lane.targetSource ?? 'selected',
      requestedTarget: lane.requestedTarget ?? null,
      status: protoThreads > 0 ? 'PROTO-MONEY' : 'PLAN-TOO-LARGE',
      launched: protoThreads,
      plan,
    };
  }

  const launched = launchBatchesAggressive(ns, lane.target, lane.hosts, plan, runtimeStats, {
    maxActiveProcesses: 10000,
  });

  if (launched > 0) {
    runtimeStats.batchesLaunched += launched;
    runtimeStats.hackThreads += plan.hackThreads * launched;
    runtimeStats.growThreads += plan.growThreads * launched;
    runtimeStats.weakenThreads += (plan.weakenHackThreads + plan.weakenGrowThreads) * launched;

    return {
      lane: lane.name,
      target: lane.target,
      mode: lane.mode,
      targetSource: lane.targetSource ?? 'selected',
      requestedTarget: lane.requestedTarget ?? null,
      status: 'RUNNING',
      launched,
      plan,
    };
  }

  const protoThreads = lane.mode === 'money' ? runProtoMoney(ns, lane.target, lane.hosts) : 0;

  runtimeStats.protoMoneyThreads = (runtimeStats.protoMoneyThreads ?? 0) + protoThreads;

  return {
    lane: lane.name,
    target: lane.target,
    mode: lane.mode,
    targetSource: lane.targetSource ?? 'selected',
    requestedTarget: lane.requestedTarget ?? null,
    status: protoThreads > 0 ? 'PROTO-MONEY' : 'NO-RAM',
    launched: protoThreads,
    plan,
  };
}

function shouldUseProtoMoney(ns, lane) {
  const homeRam = ns.getServerMaxRam('home');
  const formulasUnlocked = lane.formulasUnlocked === true && !!ns.formulas?.hacking;

  if (!formulasUnlocked) return true;
  if (homeRam < 256) return true;

  return false;
}

function getLaneFreeRam(hosts = []) {
  return hosts.reduce((sum, host) => sum + Math.max(0, host.freeRam ?? 0), 0);
}

function runProtoMoney(ns, target, hosts = []) {
  const money = ns.getServerMoneyAvailable(target);
  const maxMoney = ns.getServerMaxMoney(target);
  const sec = ns.getServerSecurityLevel(target);
  const minSec = ns.getServerMinSecurityLevel(target);

  if (sec > minSec + 2) {
    return runTinyDistributed(
      ns,
      weakenScript,
      target,
      hosts,
      getNeededWeakenThreads(ns, target, sec - minSec),
    );
  }

  if (money < maxMoney * 0.75) {
    const growThreads = getNeededGrowThreads(ns, target, money, maxMoney);
    const growSecurity = ns.growthAnalyzeSecurity(growThreads, target);
    const weakenThreads = getNeededWeakenThreads(ns, target, growSecurity);

    return (
      runTinyDistributed(ns, growScript, target, hosts, growThreads) +
      runTinyDistributed(ns, weakenScript, target, hosts, weakenThreads)
    );
  }

  const hackThreads = getProtoHackThreads(ns, target, maxMoney);
  const hackSecurity = ns.hackAnalyzeSecurity(hackThreads, target);
  const weakenThreads = getNeededWeakenThreads(ns, target, hackSecurity);

  return (
    runTinyDistributed(ns, hackScript, target, hosts, hackThreads) +
    runTinyDistributed(ns, weakenScript, target, hosts, weakenThreads)
  );
}

function runTinyDistributed(ns, script, target, hosts = [], maxThreads = Infinity) {
  const scriptRam = ns.getScriptRam(script);
  let launched = 0;
  let remaining = Math.max(0, Math.floor(maxThreads));

  if (remaining <= 0) return 0;

  for (const host of hosts) {
    if (remaining <= 0) break;

    while (true) {
      if (remaining <= 0) break;

      const freeRam = Math.max(0, host.freeRam ?? 0);
      const threads = Math.min(
        remaining,
        maxWorkerThreadsPerProcess,
        Math.floor(freeRam / scriptRam),
      );

      if (threads <= 0) break;

      const pid = ns.exec(script, host.host, threads, target, launched);

      if (pid === 0) break;

      host.freeRam -= threads * scriptRam;
      launched += threads;
      remaining -= threads;
    }
  }

  return launched;
}

function getNeededWeakenThreads(ns, target, securityGap) {
  const weakenPerThread = Math.max(0.000001, ns.weakenAnalyze(1));

  return Math.max(1, Math.ceil(Math.max(0, securityGap) / weakenPerThread));
}

function getNeededGrowThreads(ns, target, money, maxMoney) {
  if (maxMoney <= 0) return 0;

  const currentMoney = Math.max(1, money);
  const targetMoney = Math.max(currentMoney, maxMoney * 0.95);
  const growthMultiplier = Math.max(1.001, targetMoney / currentMoney);

  try {
    const raw = ns.growthAnalyze(target, growthMultiplier);

    return Math.max(1, Math.ceil(Number.isFinite(raw) ? raw : 1));
  } catch {
    return 1;
  }
}

function getProtoHackThreads(ns, target, maxMoney) {
  if (maxMoney <= 0) return 0;

  const hackMoney = maxMoney * getProtoHackPercent(ns, target);
  const raw = ns.hackAnalyzeThreads(target, hackMoney);

  return Math.max(1, Math.floor(Number.isFinite(raw) ? raw : 1));
}

function getProtoHackPercent(ns, target) {
  const maxMoney = ns.getServerMaxMoney(target);

  if (maxMoney < 1_000_000) return 0.01;
  if (maxMoney < 50_000_000) return 0.025;

  return 0.05;
}

function killOversizedUhmWorkers(ns, hosts = []) {
  const workerScripts = new Set([
    normalizeScript(hackScript),
    normalizeScript(growScript),
    normalizeScript(weakenScript),
    normalizeScript(expHackScript),
    normalizeScript(expGrowScript),
    normalizeScript(expWeakenScript),
  ]);

  for (const host of hosts) {
    try {
      for (const proc of ns.ps(host.host)) {
        const script = normalizeScript(proc.filename);
        if (!workerScripts.has(script)) continue;
        if ((proc.threads ?? 0) <= maxWorkerThreadsPerProcess) continue;

        ns.kill(proc.pid);
      }
    } catch {
      // Ignore hosts that disappeared between scans.
    }
  }
}

function normalizeScript(path) {
  return String(path ?? '').replace(/^\/+/, '');
}
