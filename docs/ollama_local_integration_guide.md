# 🦙 PPS Local Ollama Integration Guide

This guide walks you through connecting your local **Ollama** installation to the **Personal Performance System (PPS)** for free, 100% private, offline AI Coaching during local development.

---

## 🛠️ Step 1: Verify Ollama is Running Locally

1. Open **Command Prompt** or **PowerShell** on your machine.
2. Check if Ollama is running and see your downloaded models:
   ```bash
   ollama list
   ```
   *Example output:*
   ```
   NAME               ID           SIZE      MODIFIED
   llama3.2:latest    a80c4f172d5e 2.0 GB    2 days ago
   deepseek-r1:latest 0aee6da141cb 4.7 GB    1 week ago
   mistral:latest     61e88e8876e4 4.1 GB    3 weeks ago
   ```

3. Ensure the Ollama server is running (default port is `http://localhost:11434`):
   ```bash
   curl http://localhost:11434/api/tags
   ```

---

## 🌐 Step 2: Enable CORS for Localhost (Important!)

Browsers running `http://localhost:8080` or `http://localhost:5173` require Ollama to allow incoming requests.

### On Windows:
1. Close Ollama from the system tray (taskbar bottom-right).
2. Set the environment variable:
   - In PowerShell:
     ```powershell
     $env:OLLAMA_ORIGINS="*"
     ollama serve
     ```
   - Or permanently in Windows **Environment Variables**:
     - Variable name: `OLLAMA_ORIGINS`
     - Variable value: `*`
3. Restart Ollama.

---

## 🔌 Step 3: Test Direct Generation via PowerShell

Run this quick test to verify your local model responds:

```powershell
Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method Post -Body (ConvertTo-Json @{
    model = "llama3.2"
    prompt = "Give me 3 concise tips to maintain a 30-day study habit streak."
    stream = $false
}) -ContentType "application/json" | Select-Object -ExpandProperty response
```

---

## 🎯 Step 4: Connecting Ollama into PPS Codebase

In `src/lib/ai/aiChatService.ts`, you can configure the local fallback to send requests directly to Ollama at `http://localhost:11434/api/generate`:

```typescript
async function queryLocalOllama(prompt: string, modelName: string = "llama3.2") {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: false,
      }),
    });
    const data = await res.json();
    return data.response;
  } catch (err) {
    console.warn("Local Ollama not reachable, using built-in intent engine", err);
    return null;
  }
}
```

Now you have full local AI capabilities running on your personal machine with 0 API costs!
