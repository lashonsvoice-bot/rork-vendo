import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import uploadsRoutes from "./routes/uploads";
import { validateConfig, logConfigStatus } from "./config/env";

// Initialize and validate configuration
try {
  validateConfig();
  logConfigStatus();
} catch (error) {
  console.error('❌ Failed to initialize configuration:', error);
  process.exit(1);
}

const app = new Hono();

app.use("*", cors({ origin: (origin) => origin ?? "*", credentials: true }));

app.route("/auth", authRoutes);
app.route("/profile", profileRoutes);
app.route("/uploads", uploadsRoutes);

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