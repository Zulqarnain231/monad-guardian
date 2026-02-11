require("dotenv").config();
const { startMonitorAgent } = require("./monitorAgent.js");
const { startEvaluatorAgent } = require("./evaluatorAgent.js");

// Start agents
startMonitorAgent();
startEvaluatorAgent();