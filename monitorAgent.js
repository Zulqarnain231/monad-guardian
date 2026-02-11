const { ethers } = require("ethers");
const fs = require("fs");

const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
const WS_PROVIDER = process.env.MONAD_WS_URL
  ? new ethers.WebSocketProvider(process.env.MONAD_WS_URL)
  : null;

const INSIGHTS_FILE = "insights.json";

function saveInsight(insight) {
  let insights = [];
  try {
    insights = JSON.parse(fs.readFileSync(INSIGHTS_FILE));
  } catch (e) {}
  insights.push(insight);
  fs.writeFileSync(INSIGHTS_FILE, JSON.stringify(insights, null, 2));
  console.log("Saved insight:", insight);
}

async function watchTransaction(txHash) {
  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) return;
    const insight = {
      type: "tx",
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value?.toString(),
      timestamp: Date.now(),
    };
    saveInsight(insight);
  } catch (e) {
    console.error("Error fetching tx:", e.message);
  }
}

async function watchContract(tx) {
  if (!tx) return;
  if (tx.to === null || tx.creates) {
    const insight = {
      type: "contract",
      address: tx.creates || tx.contractAddress,
      deployTx: tx.hash,
      timestamp: Date.now(),
    };
    saveInsight(insight);
  }
}

function startMonitorAgent() {
  console.log("Monitor Agent started...");

  if (WS_PROVIDER) {
    WS_PROVIDER.on("pending", (txHash) => watchTransaction(txHash));

    WS_PROVIDER.on("block", async (blockNumber) => {
      try {
        const block = await provider.getBlock(Number(blockNumber), { includeTransactions: true });
        if (!block || !block.transactions) return;
        for (const tx of block.transactions) {
          watchContract(tx);
        }
      } catch (e) {
        console.error("Error fetching block:", e.message);
      }
    });
  } else {
    provider.on("pending", (txHash) => watchTransaction(txHash));
  }
}

module.exports = { startMonitorAgent };
