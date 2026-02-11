cat <<'EOF' > monitorAgent.js
const { ethers } = require("ethers");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL || "https://rpc-devnet.monad.xyz/");
const INSIGHTS_FILE = "insights.json";
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

const getNYTime = () => {
    return new Date().toLocaleString("en-US", {
        timeZone: "America/New_York",
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
};

async function sendDiscordAlert(msg) {
    if (DISCORD_WEBHOOK && DISCORD_WEBHOOK.startsWith('http')) {
        try { await axios.post(DISCORD_WEBHOOK, { content: msg }); } catch (e) {}
    }
}

function saveInsight(insight) {
    let insights = [];
    try { insights = JSON.parse(fs.readFileSync(INSIGHTS_FILE)); } catch (e) { insights = []; }
    insights.push(insight);
    fs.writeFileSync(INSIGHTS_FILE, JSON.stringify(insights, null, 2));
    console.log(`✅ [Insight Saved]: ${insight.reason} | Hash: ${insight.hash.slice(0,10)}...`);
}

async function startMonitorAgent() {
    console.log("------------------------------------------");
    console.log(`🚀 ScoutNet: Failed Transaction Monitor Active!`);
    console.log("------------------------------------------");

    provider.on("block", async (blockNumber) => {
        const time = getNYTime();
        try {
            const block = await provider.getBlock(blockNumber, true);
            if (!block || !block.transactions) return;

            console.log(`[${time} EST] 📦 Block ${blockNumber}: Scanning ${block.transactions.length} txs...`);

            for (const tx of block.transactions) {
                const txHash = typeof tx === 'string' ? tx : tx.hash;
                const receipt = await provider.getTransactionReceipt(txHash);
                
                if (receipt && receipt.status === 0) {
                    const insight = {
                        type: "tx_fail",
                        hash: receipt.hash,
                        blockNumber: blockNumber,
                        reason: "Critical: Transaction Failed on Monad",
                        timestamp: time
                    };
                    
                    saveInsight(insight);
                    await sendDiscordAlert(`🚨 **Failed Transaction Alert**\n**Block:** ${blockNumber}\n**Hash:** ${receipt.hash}\n**Time:** ${time} EST`);
                }
            }
        } catch (e) {
            console.error("Error scanning block:", e.message);
        }
    });
}

module.exports = { startMonitorAgent };
EOF