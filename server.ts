import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth, type AuthRequest } from "./src/middleware/auth.ts";
import { INVESTMENT_MANDATES } from "./src/trading/tradingPage.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "1mb" }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bitfurytech" });
});

// Public investment mandate definitions (product specifications only, no fake balances)
app.get("/api/trading/plans", (_req, res) => {
  res.json({ mandates: INVESTMENT_MANDATES });
});

// Protected session verification endpoint
app.get("/api/auth/session", requireAuth, (req: AuthRequest, res) => {
  res.json({
    uid: req.user?.uid,
    email: req.user?.email ?? null,
    emailVerified: Boolean(req.user?.email_verified),
    isAdmin:
      Boolean(req.user?.email_verified) &&
      req.user?.email === "bitfurytech21@gmail.com",
  });
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BitfuryTech server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start BitfuryTech server:", err);
  process.exit(1);
});
