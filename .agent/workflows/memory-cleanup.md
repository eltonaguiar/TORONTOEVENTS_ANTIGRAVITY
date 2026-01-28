# Memory cleanup – terminals and Node

**Do occasionally to save memory:**

1. **Close stale terminals in Cursor**
   - Close any terminal tabs you’re not using (right‑click tab → Close or click X).
   - One active terminal is enough for most work.

2. **Kill orphaned Node processes (optional)**
   - Run only when you’re **not** running a dev server you need (e.g. `next dev`, `npm run dev`).
   - In PowerShell:
     ```powershell
     taskkill /F /IM node.exe 2>$null; Write-Host "Node processes stopped (if any)."
     ```
   - Or use the project script:
     ```bash
     npm run kill-stale-node
     ```
   - This stops all Node processes, so Cursor/Electron may be affected; run when you’re done with local servers.
