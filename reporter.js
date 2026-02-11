const axios = require("axios");

let lastSent = 0;

async function sendAlert(insight) {
    const now = Date.now();
    if (now - lastSent < 20000) return; // 20 sec cooldown

    const message = {
        content: `🚨 Monad Guardian Alert\n\n${JSON.stringify(insight, null, 2)}`
    };

    try {
        await axios.post(process.env.DISCORD_WEBHOOK_URL, message);
        lastSent = now;
        console.log("Alert sent:", insight.type);
    } catch (err) {
        console.error("Discord error:", err.message);
    }
}

module.exports = { sendAlert };
