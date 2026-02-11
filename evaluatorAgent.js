const fs = require("fs");
const axios = require("axios");
const { sendDiscordAlert, postToMoltbook } = require("./reporter");

const INSIGHTS_FILE = "insights.json";
let processed = new Set();

// Evaluate insights every 10 seconds
function startEvaluatorAgent() {
    console.log("Evaluator Agent started...");
    setInterval(async () => {
        let insights = [];
        try {
            insights = JSON.parse(fs.readFileSync(INSIGHTS_FILE));
        } catch (e) { return; }

        for(const insight of insights){
            if(processed.has(insight.timestamp)) continue; // Skip already processed
            processed.add(insight.timestamp);

            // Use Gemini Gemma 12B for explanation
            const explanation = await getGemmaExplanation(insight);

            // Decide importance (simple heuristic)
            const importance = decideImportance(insight, explanation);

            if(importance === "high"){
                await sendDiscordAlert(explanation);
                await postToMoltbook(explanation);
            } else {
                console.log("Ignored low importance insight:", explanation);
            }
        }
    }, 10000);
}

// Call Gemma 12B REST API
async function getGemmaExplanation(insight){
    try{
        const response = await axios.post(
            process.env.GEMINI_API_URL,
            { input: JSON.stringify(insight) },
            { headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}` } }
        );
        return response.data.output || JSON.stringify(insight);
    } catch(e){
        console.error("Gemma API error:", e.message);
        return JSON.stringify(insight);
    }
}

// Simple importance heuristic
function decideImportance(insight, explanation){
    if(insight.type === "tx") return "high";       // all tx events high for demo
    if(insight.type === "contract") return "high"; // all contracts high for demo
    return "low";
}

module.exports = { startEvaluatorAgent };
