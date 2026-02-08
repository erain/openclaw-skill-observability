import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function get_cost_report() {
  // MVP Placeholder
  // In the future, this could parse billing-import-state.json or similar
  return "Cost reporting is not yet fully implemented. \nEstimated current session cost: $0.00 (Placeholder)";
}

export async function get_recent_errors({ limit = 5 } = {}) {
  const logDir = path.join(os.homedir(), '.openclaw', 'logs');
  
  try {
    const files = await fs.readdir(logDir);
    // Filter for likely log files if necessary, or just take all
    // Sort by modification time, newest first
    const sortedFiles = await Promise.all(files.map(async f => {
      const stats = await fs.stat(path.join(logDir, f));
      return { name: f, time: stats.mtimeMs };
    }));
    sortedFiles.sort((a, b) => b.time - a.time);
    
    // Look through recent files for "error" string (case insensitive)
    const errors = [];
    
    for (const file of sortedFiles) {
        if (errors.length >= limit) break;
        
        try {
            const content = await fs.readFile(path.join(logDir, file.name), 'utf8');
            const lines = content.split('\n').reverse(); // Read backwards for recent
            
            for (const line of lines) {
                if (errors.length >= limit) break;
                if (!line.trim()) continue;
                
                if (line.toLowerCase().includes('error') || line.toLowerCase().includes('exception')) {
                    errors.push(`[${file.name}] ${line.trim()}`);
                }
            }
        } catch (readErr) {
            // Ignore unreadable files (dirs, etc)
        }
    }
    
    if (errors.length === 0) {
        return `No errors found in recent logs (checked ${sortedFiles.length} files in ${logDir}).`;
    }
    
    return errors.join('\n');

  } catch (err) {
    if (err.code === 'ENOENT') {
      return `Log directory not found at ${logDir}.`;
    }
    return `Error reading logs: ${err.message}`;
  }
}
