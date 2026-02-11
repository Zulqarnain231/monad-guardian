const { ethers } = require("ethers");
const fs = require("fs");
const pLimit = require("p-limit"); // <<< add this

const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL); // HTTP provider
const INSIGHTS_FILE = "insights.json";
const limit = pLimit(5); // max 5 concurrent requests

function saveInsight(insight) {
    let insights = [];
    try { insights = JSON.parse(fs.readFileSync(INSIGHTS_FILE)); } catch(e) {}
    insights.push(insight);
    fs.writeFileSync(INSIGHTS_FILE, JSON.stringify(insights, null, 2));
    console.log("✅ Saved insight:", insight.type, insight.hash || insight.address, insight.reason || "");
}

async function analyzeTx(tx) {
    if (!tx) return null;
    try {
        const receipt = await provider.getTransactionReceipt(tx.hash);
        if (!receipt) return null;

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

        return null;
    } catch(e) {
        console.error("Tx analysis error:", e.message);
        return null;
    }
}

async function startMonitorAgent() {
    console.log("🚀 Monitor Agent running...");

    let lastBlock = await provider.getBlockNumber();

    setInterval(async () => {
        try {
            const currentBlock = await provider.getBlockNumber();
            for (let b = lastBlock + 1; b <= currentBlock; b++) {
                const block = await provider.getBlock(b);

                // <<< throttled transactions loop
                const promises = block.transactions.map(txHash =>
                    limit(async () => {
                        const tx = await provider.getTransaction(txHash);
                        const insight = await analyzeTx(tx);
                        if (insight) saveInsight(insight);
                    })
                );
                await Promise.all(promises); // wait for all txs in the block

                console.log("📦 Processed Block:", b);
            }
            lastBlock = currentBlock;
        } catch(e) {
            console.error("Block fetch error:", e.message);
        }
    }, 5000); // 5 sec poll
}

module.exports = { startMonitorAgent };
