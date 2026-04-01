import express from "express";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Automation Endpoints ---

  // Open Application
  app.post("/api/automation/open", (req, res) => {
    const { appName } = req.body;
    let command = "";

    if (appName.toLowerCase() === "notepad") {
      command = "powershell -Command \"Start-Process notepad\"";
    } else if (appName.toLowerCase() === "whatsapp") {
      command = "powershell -Command \"Start-Process 'whatsapp:'\"";
    } else {
      command = `powershell -Command \"Start-Process '${appName}'\"`;
    }

    exec(command, (error) => {
      if (error) {
        return res.status(500).json({ status: "error", message: error.message });
      }
      res.json({ status: "success", message: `${appName} opened.` });
    });
  });

  // Type Text (into active window)
  app.post("/api/automation/type", (req, res) => {
    const { text } = req.body;
    // Use SendKeys via PowerShell
    const command = `powershell -Command \"(New-Object -ComObject WScript.Shell).SendKeys('${text}')\"`;

    exec(command, (error) => {
      if (error) {
        return res.status(500).json({ status: "error", message: error.message });
      }
      res.json({ status: "success", message: "Text typed." });
    });
  });

  // Close Application
  app.post("/api/automation/close", (req, res) => {
    const { appName } = req.body;
    const command = `powershell -Command \"Stop-Process -Name '${appName}' -Force\"`;

    exec(command, (error) => {
      if (error) {
        return res.status(500).json({ status: "error", message: error.message });
      }
      res.json({ status: "success", message: `${appName} closed.` });
    });
  });

  // Get Notifications (Mocking for now, as real notification access requires elevated permissions or specific APIs)
  // In a real Windows environment, we'd use a more complex PowerShell script or a native addon.
  app.get("/api/automation/notifications", (req, res) => {
    // This is a placeholder for actual notification polling logic
    // Real implementation would involve:
    // powershell -Command "[Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType=WindowsRuntime]::Current.GetNotificationsAsync(1).GetResults()"
    res.json({ 
      status: "success", 
      notifications: [] 
    });
  });

  // Send WhatsApp Message (via URI scheme)
  app.post("/api/automation/whatsapp/send", (req, res) => {
    const { number, message } = req.body;
    // whatsapp://send?phone=NUMBER&text=MESSAGE
    const command = `powershell -Command \"Start-Process 'whatsapp://send?phone=${number}&text=${encodeURIComponent(message)}'\"`;

    exec(command, (error) => {
      if (error) {
        return res.status(500).json({ status: "error", message: error.message });
      }
      res.json({ status: "success", message: "WhatsApp message prepared." });
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
