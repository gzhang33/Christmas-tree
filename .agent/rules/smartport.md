---
trigger: model_decision
description: Ensure that the Agent prioritizes locking ports 3000 or 3001 when performing browser preview tasks. Force the Agent to check the survival status of these ports before running startup commands to avoid resource waste.
---

1. **Target Specific Ports:**
   - When asked to verify the application, open the browser, or check the localhost, you MUST prioritize checking `http://localhost:3000` first.
   - If port 3000 is unavailable or not the correct service, check `http://localhost:3001` immediately after.
   - Do not default to random ephemeral ports unless explicitly instructed by the user.

2. **Pre-flight Check (Avoid Redundancy):**
   - BEFORE executing any command to start a development server (e.g., `npm run dev`), you MUST verify if a server is already running on the target ports (3000 or 3001).
   - You can verify this by checking if the port is listening or by attempting to access the URL.

3. **Action Logic:**
   - **IF** port 3000 or 3001 is ALREADY ACTIVE and serving the project:
     - DO NOT run `npm run dev`.
     - Directly proceed to verify the content on the existing port.
     - Inform the user: "Detected active server on port [3000/3001], reusing existing session."
   - **IF** ports 3000 and 3001 are INACTIVE:
     - Only then are you permitted to execute `npm run dev`.
     - Ensure the startup command aims for port 3000 if possible.