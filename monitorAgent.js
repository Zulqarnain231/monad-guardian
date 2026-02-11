const { ethers } = require("ethers");
const fs = require("fs");

// HTTP provider (mandatory)
const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);

// Optional WebSocket provider for real-time subscriptions
const WS_PROVIDER = process.env.MONAD_WS_URL
    ? new ethers.WebSocketProvider(process.env.MONAD_WS_URL)
    : null;

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
    if (!tx) return;
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
    if (!tx) return;
    if (tx.to === null) { // Contract deployment
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

    if (WS_PROVIDER) {
        // Listen to pending transactions
        WS_PROVIDER.on("pending", async (txHash) => {
            try {
                const tx = await provider.getTransaction(txHash); // fetch tx via HTTP provider
                if(tx) watchTransactions(tx);
            } catch(e) {
                console.error("Error fetching pending tx:", e.message);
            }
        });

        // Listen to new blocks
        WS_PROVIDER.on("block", async (blockNumber) => {
            try {
                // ethers v6 fix: getBlock with transactions
                const block = await provider.getBlock(Number(blockNumber), { includeTransactions: true });
                for(const tx of block.transactions){
                    watchContracts(tx);
                }
            } catch(e){
                console.error("Error fetching block:", e.message);
            }
        });

    } else { // fallback: only pending txs via HTTP polling
        provider.on("pending", async (txHash) => {
            try {
                const tx = await provider.getTransaction(txHash);
                if(tx) watchTransactions(tx);
            } catch(e){
                console.error("Error fetching pending tx:", e.message);
            }
        });
    }
}

module.exports = { startMonitorAgent };
