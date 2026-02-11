const { ethers } = require("ethers");
const fs = require("fs");

const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
const WS_PROVIDER = process.env.MONAD_WS_URL ? new ethers.WebSocketProvider(process.env.MONAD_WS_URL) : null;

// File to store raw insights
const INSIGHTS_FILE = "insights.json";

// Utility to save insight
function saveInsight(insight) {
    let insights = [];
    try {
        insights = JSON.parse(fs.readFileSync(INSIGHTS_FILE));
    } catch (e) {}
    insights.push(insight);
    fs.writeFileSync(INSIGHTS_FILE, JSON.stringify(insights, null, 2));
}

// Monitor pending & failed transactions
async function watchTransactions(tx) {
    const insight = {
        type: "tx",
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value?.toString(),
        timestamp: Date.now()
    };
    saveInsight(insight);
}

// Monitor new contracts
async function watchContracts(tx) {
    if(tx.to === null) { // Contract deployment
        const contractInsight = {
            type: "contract",
            address: tx.creates || tx.contractAddress,
            deployTx: tx.hash,
            timestamp: Date.now()
        };
        saveInsight(contractInsight);
    }
}

// Start the Monitor Agent
function startMonitorAgent() {
    console.log("Monitor Agent started...");

    // Pending txs via WebSocket if available
    if(WS_PROVIDER) {
        WS_PROVIDER.on("pending", async (txHash) => {
            const tx = await provider.getTransaction(txHash);
            if(tx) watchTransactions(tx);
        });

        WS_PROVIDER.on("block", async (blockNumber) => {
            const block = await provider.getBlockWithTransactions(blockNumber);
            for(const tx of block.transactions){
                watchContracts(tx);
            }
        });
    } else { // fallback HTTP polling
        provider.on("pending", async (txHash) => {
            const tx = await provider.getTransaction(txHash);
            if(tx) watchTransactions(tx);
        });
    }
}

module.exports = { startMonitorAgent };
