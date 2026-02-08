import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

async function getSessions(limit) {
  try {
    const { stdout } = await execPromise(`openclaw sessions list --json --limit ${limit}`);
    const parsed = JSON.parse(stdout);
    return parsed.sessions || [];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw new Error(`Failed to fetch sessions: ${error.message}`);
  }
}

export async function get_cost_report() {
  try {
    const sessions = await getSessions(100);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stats = {};

    for (const session of sessions) {
      // Check if updated in last 24h
      const updatedAt = new Date(session.updatedAt);
      if (updatedAt < oneDayAgo) continue;

      const model = session.model || 'unknown';
      if (!stats[model]) {
        stats[model] = { inputTokens: 0, outputTokens: 0, count: 0 };
      }

      stats[model].inputTokens += (session.inputTokens || 0);
      stats[model].outputTokens += (session.outputTokens || 0);
      stats[model].count += 1;
    }

    let report = "## 💰 Estimated Cost Report (Last 24h)\n\n";
    if (Object.keys(stats).length === 0) {
      return report + "No active sessions found in the last 24 hours.";
    }

    report += "| Model | Sessions | Input Tokens | Output Tokens | Est. Cost |\n";
    report += "| :--- | :---: | :---: | :---: | :---: |\n";

    let totalCost = 0;

    for (const [model, data] of Object.entries(stats)) {
      let cost = 0;
      const inM = data.inputTokens / 1_000_000;
      const outM = data.outputTokens / 1_000_000;

      // Pricing logic
      // Hardcode pricing: Gemini Pro ~$3/1M in, $10/1M out; Flash ~$0.1/1M; GPT-5.2 ~$5/15
      const lowerModel = model.toLowerCase();
      
      if (lowerModel.includes('pro')) {
        // Gemini Pro assumption
        cost = (inM * 3.00) + (outM * 10.00);
      } else if (lowerModel.includes('flash')) {
        // Flash assumption (~$0.10 blended or per side? Prompt said ~$0.1/1M. Let's assume symmetric low cost)
        cost = (inM * 0.10) + (outM * 0.10);
      } else if (lowerModel.includes('gpt-5') || lowerModel.includes('gpt-4')) { // GPT-5.2 / GPT-4 placeholder
         // GPT-5.2 ~$5/15 assumption from prompt
        cost = (inM * 5.00) + (outM * 15.00);
      } else {
        // Fallback / Unknown - assume zero or standard low rate? Let's mark as 0/Unknown
        cost = 0;
      }

      totalCost += cost;

      report += `| ${model} | ${data.count} | ${data.inputTokens.toLocaleString()} | ${data.outputTokens.toLocaleString()} | $${cost.toFixed(4)} |\n`;
    }

    report += `\n**Total Estimated Cost:** $${totalCost.toFixed(4)}`;
    return report;

  } catch (error) {
    return `Error generating cost report: ${error.message}`;
  }
}

export async function get_recent_errors() {
  try {
    const sessions = await getSessions(50);
    
    // Filter logic: lastStatus != 'ok' OR abortedLastRun is true
    const failedSessions = sessions.filter(s => {
      const statusNotOk = (s.lastStatus && s.lastStatus !== 'ok');
      const aborted = (s.abortedLastRun === true);
      return statusNotOk || aborted;
    });

    if (failedSessions.length === 0) {
      return "No recent failed sessions found.";
    }

    let output = "## ⚠️ Recent Session Errors\n\n";
    for (const s of failedSessions) {
      output += `- **${s.id}** (${s.title || 'Untitled'}): Status=${s.lastStatus || 'N/A'}, Aborted=${s.abortedLastRun || false}\n`;
    }
    
    return output;

  } catch (error) {
    return `Error checking for errors: ${error.message}`;
  }
}
