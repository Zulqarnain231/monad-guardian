const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(process.env.MONAD_RPC_URL);

async function simulateHoneypot(contractAddress) {
    try {
        const code = await provider.getCode(contractAddress);
        if (!code || code === "0x") return null;

        // Simple bytecode heuristics
        const suspiciousPatterns = [
            "5c11d795", // blacklist-like
            "715018a6", // setTax-like
            "a9059cbb"  // transfer
        ];

        let score = 0;

        for (const pattern of suspiciousPatterns) {
            if (code.includes(pattern)) score += 20;
        }

        // Basic call simulation (dummy transfer call)
        try {
            await provider.call({
                to: contractAddress,
                data: "0x095ea7b3" // approve function selector
            });
        } catch (err) {
            score += 30;
        }

        return {
            contract: contractAddress,
            honeypotScore: score
        };

    } catch (err) {
        return null;
    }
}

module.exports = { simulateHoneypot };
