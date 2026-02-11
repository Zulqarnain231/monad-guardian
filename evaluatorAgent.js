const fs = require("fs");
const { simulateHoneypot } = require("./honeypotEngine");
const { sendAlert } = require("./reporter");

const INSIGHTS_FILE = "insights.json";

function scoreInsight(insight) {
    let score = 0;

    if (insight.type === "failed_tx") score += 70;
    if (insight.type === "high_gas_risk") score += 50;

    return score;
}

async function processInsight(insight) {
    let score = scoreInsight(insight);

    if (insight.type === "new_contract") {
        const result = await simulateHoneypot(insight.contract);
        if (result && result.honeypotScore > 40) {
            score += result.honeypotScore;
            insight.honeypotScore = result.honeypotScore;
        }
    }

    if (score >= 80) {
        await sendAlert(insight);
    }
}

function startEvaluatorAgent() {
    console.log("Evaluator Agent running...");

    setInterval(async () => {
        if (!fs.existsSync(INSIGHTS_FILE)) return;

        const insights = JSON.parse(fs.readFileSync(INSIGHTS_FILE));

        while (insights.length > 0) {
            const insight = insights.shift();
            await processInsight(insight);
        }

        fs.writeFileSync(INSIGHTS_FILE, JSON.stringify([], null, 2));
    }, 5000);
}

module.exports = { startEvaluatorAgent };
