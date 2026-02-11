const axios = require("axios");

// Discord webhook
async function sendDiscordAlert(message){
    try{
        await axios.post(process.env.DISCORD_WEBHOOK_URL, { content: message });
    } catch(e){
        console.error("Discord error:", e.message);
    }
}

// Moltbook posting
async function postToMoltbook(message){
    try{
        await axios.post(
            "https://moltbook.com/api/posts",
            { title: "Monad Guardian Alert", body: message },
            { headers: { Authorization: `Bearer ${process.env.MOLTBOOK_AGENT_TOKEN}` } }
        );
    } catch(e){
        console.error("Moltbook error:", e.message);
    }
}

module.exports = { sendDiscordAlert, postToMoltbook };
