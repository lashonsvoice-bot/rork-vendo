import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import uploadsRoutes from "./routes/uploads";
import webhooksRoutes from "./routes/webhooks";
import { validateConfig, logConfigStatus, logSecurityRecommendations } from "./config/env";
import { initializeDatabase } from "./db/user-repo";

// Initialize and validate configuration
try {
  validateConfig();
  logConfigStatus();
  logSecurityRecommendations();
} catch (error) {
  console.error('❌ Failed to initialize configuration:', error);
  process.exit(1);
}

// Initialize database
initializeDatabase().catch(error => {
  console.error('❌ Failed to initialize database:', error);
});

const app = new Hono();

app.use("*", cors({ origin: (origin) => origin ?? "*", credentials: true }));

app.route("/auth", authRoutes);
app.route("/profile", profileRoutes);
app.route("/uploads", uploadsRoutes);
app.route("/webhooks", webhooksRoutes);

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;