import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import uploadsRoutes from "./routes/uploads";

// Set SendGrid API key from environment or use the provided key
if (!process.env.SENDGRID_API_KEY) {
  process.env.SENDGRID_API_KEY = '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';
  console.log('🔑 Using provided SendGrid API key');
} else {
  console.log('🔑 Using environment SendGrid API key');
}

if (!process.env.SENDGRID_FROM) {
  process.env.SENDGRID_FROM = 'noreply@revovend.com';
  console.log('📧 Using default from email: noreply@revovend.com');
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