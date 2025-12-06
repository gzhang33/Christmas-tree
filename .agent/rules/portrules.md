---
trigger: always_on
---

Before executing npm run dev, always check if port 5173 is already active for the current project. If the server is already running, do not start a new instance or spawn a new port; instead, utilize the existing session.