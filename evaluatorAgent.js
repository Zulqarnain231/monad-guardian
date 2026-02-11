const fs = require("fs");
const axios = require("axios");
const { sendDiscordAlert, postToMoltbook } = require("./reporter");

const INSIGHTS_FILE = "insights.json";
let processed = new Set();

function startEvaluatorAgent() {
  console.log("Evaluator Agent started...");

  setInterval(async () => {
    let insights = [];
    try {
      insights = JSON.parse(fs.readFileSync(INSIGHTS_FILE));
    } catch (e) {}

    for (const insight of insights) {
      if (processed.has(insight.timestamp)) continue;
      processed.add(insight.timestamp);

      console.log("Processing insight:", insight);

      const explanation = await getGemmaExplanation(insight);
      const importance = decideImportance(insight);

      if (importance === "high") {
        await sendDiscordAlert(explanation);
        await postToMoltbook(explanation);
        console.log("Alert sent:", explanation);
      } else {
        console.log("Ignored insight:", explanation);
      }
    }
  }, 10000);
}

async function getGemmaExplanation(insight) {
  try {
    const response = await axios.post(
      process.env.GEMINI_API_URL,
      { input: JSON.stringify(insight) },
      { headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}` } }
    );
    return response.data.output || JSON.stringify(insight);
  } catch (e) {
    console.error("Gemma API error:", e.message);
    return JSON.stringify(insight);
  }
}

function decideImportance(insight) {
  if (insight.type === "tx") return "high";
  if (insight.type === "contract") return "high";
  return "low";
}

module.exports = { startEvaluatorAgent };
