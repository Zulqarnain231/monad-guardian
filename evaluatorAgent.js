if (insight.type === "suspicious_tx") {
    console.log("🚨 Suspicious TX Detected:", insight.issue);

    if (shouldSendAlert()) {
        sendDiscordAlert(`
🚨 ALERT
Issue: ${insight.issue}
Hash: ${insight.hash}
Value: ${insight.value}
From: ${insight.from}
To: ${insight.to}
        `);
    }
}
