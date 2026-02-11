const { ethers } = require("ethers");
const fs = require("fs");

const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
const INSIGHTS_FILE = "insights.json";

// Save insight to JSON
function saveInsight(insight) {
    let insights = [];
    try { insights = JSON.parse(fs.readFileSync(INSIGHTS_FILE)); } catch(e) {}
    insights.push(insight);
    fs.writeFileSync(INSIGHTS_FILE, JSON.stringify(insights, null, 2));
    console.log("✅ Saved insight:", insight.type, insight.hash || insight.address);
}

// Check if tx is failed / abnormal
async function analyzeTx(tx) {
    if (!tx) return null;
    try {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (!receipt) return null;

        // Example: failed tx
        if (receipt.status === 0) {
            return {
                type: "tx",
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                blockNumber: receipt.blockNumber,
                reason: "Transaction failed",
                timestamp: Date.now()
            };
        }

        // Could add more checks: high gas, revert reason etc.
        return null;
    } catch(e) {
        console.error("Tx analysis error:", e.message);
        return null;
    }
}

// Monitor new blocks
async function startMonitorAgent() {
    console.log("🚀 Monitor Agent running...");
    provider.on("block", async (blockNumber) => {
        console.log("📦 New Block:", blockNumber);

        try {
            const block = await provider.getBlockWithTransactions(blockNumber);
            for (const tx of block.transactions) {
                const insight = await analyzeTx(tx);
                if (insight) saveInsight(insight);
            }
        } catch(e) {
            console.error("Block fetch error:", e.message);
        }
    });
}

module.exports = { startMonitorAgent };
