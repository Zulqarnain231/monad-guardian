const { ethers } = require("ethers");
require("dotenv").config();
const axios = require("axios");

const rpcUrls = [
    process.env.MONAD_RPC_URL,
    "https://monad-mainnet.public.blastapi.io",
    "https://monad.drpc.org",
    "https://rpc.ankr.com/monad"
].filter(url => url);

let currentRpcIndex = 0;
const processedBlocks = new Set();
// 🛡️ Security Tracker: Contract address aur unki failure count store karne ke liye
const riskTracker = new Map(); 

function getProvider() {
    const url = rpcUrls[currentRpcIndex];
    currentRpcIndex = (currentRpcIndex + 1) % rpcUrls.length;
    return new ethers.JsonRpcProvider(url, { name: "monad", chainId: 10143 }, { staticNetwork: true });
}

async function sendDiscordAlert(msg, level = "INFO") {
    const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;
    if (!DISCORD_WEBHOOK) return;
    
    // Level ke hisaab se emojis
    const emoji = level === "HIGH RISK" ? "🚨🚨🚨" : level === "WARNING" ? "⚠️" : "ℹ️";
    const content = `${emoji} **${level} ALERT** ${emoji}\n${msg}`;
    
    try { await axios.post(DISCORD_WEBHOOK, { content }); } catch (e) {}
}

async function analyzeSecurity(contractAddress, provider) {
    try {
        const code = await provider.getCode(contractAddress);
        if (code === "0x") return "Externally Owned Account (EOA)";

        // Honeypot Logic: Agar ek hi contract par 3 se zyada fail Txs hon
        let failCount = (riskTracker.get(contractAddress) || 0) + 1;
        riskTracker.set(contractAddress, failCount);

        if (failCount >= 3) {
            return `🚨 HONEYPOT SUSPECT: ${failCount} consecutive failures detected!`;
        }

        // Basic Code Check
        if (code.includes("ef6363") || code.length < 200) {
            return "⚠️ Suspiciously small or obfuscated contract code.";
        }

        return "Analyzing Patterns...";
    } catch (e) { return "Security Scan Pending"; }
}

async function startMonitorAgent() {
    console.log("------------------------------------------");
    console.log(`🛡️  ScoutNet Sentinel: SECURITY MODE ACTIVE`);
    console.log(`🔍 Monitoring Mainnet for Honeypots & Risks`);
    console.log("------------------------------------------");

    let lastBlock = 0;

    setInterval(async () => {
        try {
            const provider = getProvider();
            const currentBlock = await provider.getBlockNumber();
            
            if (currentBlock > lastBlock) {
                if (lastBlock === 0) lastBlock = currentBlock - 1;

                for (let b = lastBlock + 1; b <= currentBlock; b++) {
                    if (processedBlocks.has(b)) continue;
                    
                    const block = await provider.getBlock(b, true);
                    if (!block) continue;
                    processedBlocks.add(b);

                    console.log(`[Block ${b}] Scanning ${block.transactions.length} Txs...`);

                    for (const txHash of block.transactions) {
                        await new Promise(r => setTimeout(r, 10));
                        const receipt = await provider.getTransactionReceipt(txHash);

                        if (receipt && receipt.status === 0) {
                            const contractAddress = receipt.to;
                            if (!contractAddress) continue;

                            const securityReport = await analyzeSecurity(contractAddress, provider);
                            const explorerLink = `https://monadscan.com/tx/${receipt.hash}`;

                            if (securityReport.includes("HONEYPOT")) {
                                await sendDiscordAlert(`**Potential Honeypot Detected!**\n**Contract:** ${contractAddress}\n**Evidence:** Multiple reverted 'Sell' attempts.\n**View:** ${explorerLink}`, "HIGH RISK");
                                console.log(`🚨 ALERT: Honeypot Suspect ${contractAddress}`);
                            } else {
                                console.log(`⚠️ Failed Tx: ${receipt.hash}`);
                            }
                        }
                    }
                    
                    // Cleanup memory
                    if (processedBlocks.size > 50) processedBlocks.delete(processedBlocks.values().next().value);
                    if (riskTracker.size > 100) riskTracker.clear(); 
                }
                lastBlock = currentBlock;
            }
        } catch (e) {}
    }, 2000);
}

module.exports = { startMonitorAgent };