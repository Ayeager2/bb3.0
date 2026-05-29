const getPortsNum = ns => {
  const portBusters = [
    'BruteSSH.exe',
    'FTPCrack.exe',
    'relaySMTP.exe',
    'HTTPWorm.exe',
    'SQLInject.exe',
  ];
  let ports = 0;
  for (const buster of portBusters) {
    if (ns.fileExists(buster)) {
      ports++;
    }
  }
  return ports;
};

const getMoney = ns => {
  return ns.getServerMoneyAvailable('home');
};

function buyPrograms(ns) {
  const portBusters = [
    {
      name: 'BruteSSH.exe',
      cost: 500000,
    },
    {
      name: 'FTPCrack.exe',
      cost: 1500000,
    },
    {
      name: 'relaySMTP.exe',
      cost: 5000000,
    },
    {
      name: 'HTTPWorm.exe',
      cost: 30000000,
    },
    {
      name: 'SQLInject.exe',
      cost: 250000000,
    },
  ];
  for (const buster of portBusters) {
    const money = getMoney(ns);
    if (!ns.fileExists(buster.name) && money > buster.cost) {
      ns.purchaseProgram(buster.name);
    }
  }
}

export async function main(ns) {
  while (getMoney(ns) < 200000) {
    // Waiting for money
    await ns.sleep(100);
  }
  ns.purchaseTor();

  while (getPortsNum(ns) !== 5) {
    buyPrograms(ns);
    await ns.sleep(500);
  }
}