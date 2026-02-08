# Observability Skill

Tools for monitoring OpenClaw health, costs, and logs.

## Tools

### get_cost_report
Get a report of estimated API costs.
- Returns: Text summary of costs.

### get_recent_errors
Get the most recent error logs.
- Parameters:
  - `limit` (number, optional): Number of errors to return. Default 5.
- Returns: List of recent error entries.
