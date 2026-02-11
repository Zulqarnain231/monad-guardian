require("dotenv").config();
const { startMonitorAgent } = require("./monitorAgent");
const { startEvaluatorAgent } = require("./evaluatorAgent");

// Start Monitor Agent
startMonitorAgent();

// Start Evaluator Agent
startEvaluatorAgent();
