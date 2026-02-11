const { ethers } = require("ethers");
const fs = require("fs");

const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);
const INSIGHTS_FILE = "insights.json";

// Save only suspicious insights
function saveInsight(insight) {
    let insights = [];
    try {
        insights = JSON.parse(fs.readFileSync(INSIGHTS_FILE));
    } catch (e) {}

    insights.push(insight);
    fs.writeFileSync(INSIGHTS_FILE, JSON.stringify(insights, null, 2));

    console.log("🚨 Saved Suspicious TX:", insight.issue, insight.hash);
}

async function startMonitorAgent() {
    console.log("🚀 Monitor Agent Active & Filtering Suspicious Activity...");

    provider.on("block", async (blockNumber) => {
        try {
            console.log("📦 Block:", blockNumber);

            const block = await provider.getBlock(blockNumber);
            if (!block || !block.transactions) return;

            for (const txHash of block.transactions) {

                const tx = await provider.getTransaction(txHash);
                if (!tx) continue;

                const receipt = await provider.getTransactionReceipt(txHash);
                if (!receipt) continue;

                const valueInEth = Number(ethers.formatEther(tx.value));
                let issue = null;

                // 🚨 Rule 1: Failed transaction
                if (receipt.status === 0) {
                    issue = "Failed Transaction";
                }

                // 🚨 Rule 2: Contract deployment
                if (!tx.to) {
                    issue = "Contract Deployment";
                }

                // 🚨 Rule 3: Large transfer
                if (valueInEth > 10) {
                    issue = "Large Transfer";
                }

                if (issue) {
                    saveInsight({
                        type: "suspicious_tx",
                        hash: tx.hash,
                        from: tx.from,
                        to: tx.to,
                        value: valueInEth,
                        issue,
                        timestamp: Date.now()
                    });
                }
            }

        } catch (err) {
            console.error("Block error:", err.message);
        }
    });
}

module.exports = { startMonitorAgent };
