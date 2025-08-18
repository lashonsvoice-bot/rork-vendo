import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import authRoutes from "./routes/auth";
import profileRoutes from "./routes/profile";
import uploadsRoutes from "./routes/uploads";
import webhooksRoutes from "./routes/webhooks";
import stripeWebhooksRoutes from "./routes/stripe-webhooks";
import { validateConfig, logConfigStatus, logSecurityRecommendations } from "./config/env";
import { initializeDatabase, userRepo } from "./db/user-repo";
import { eventRepo } from "./db/event-repo";
import { walletRepo } from "./db/wallet-repo";

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

// Seed a sample host-connected event with table options for local vendor testing
(async () => {
  try {
    console.log('🌱 Seeding sample event for local vendor table purchase flow...');

    const all = await eventRepo.findAll();
    const existing = all.find(e => e.title === 'Downtown Night Market');
    if (existing) {
      console.log('ℹ️ Sample event already exists with id:', existing.id);
    } else {
      const users = await userRepo.readAll();
      const host = users.find(u => u.role === 'event_host');
      const contractor = users.find(u => u.role === 'contractor');

      if (!host) {
        console.warn('⚠️ No test host found, skipping sample event seed');
        return;
      }

      if (contractor) {
        try {
          await walletRepo.deposit(contractor.id, 500, 'Seed funds for table purchases');
          console.log('💰 Seeded $500 to contractor wallet');
        } catch (e) {
          console.warn('⚠️ Failed to seed contractor wallet:', e);
        }
      }

      try {
        await walletRepo.deposit('platform_fees', 0, 'Initialize platform wallet');
      } catch {}

      const event = await eventRepo.create({
        title: 'Downtown Night Market',
        description: 'Vibrant evening market with food trucks, makers, and live music. High foot traffic and curated vendor mix.',
        businessName: 'City Events Co.',
        website: 'https://example.com/night-market',
        location: 'Riverfront Park',
        city: 'Austin',
        state: 'TX',
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
        time: '18:00',
        contractorsNeeded: 0,
        contractorPay: 0,
        hostSupervisionFee: 0,
        foodStipend: null,
        travelStipend: null,
        flyerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop',
        eventHostId: host.id,
        eventHostName: host.name,
        businessOwnerId: undefined,
        createdBy: 'event_host',
        status: 'host_connected',
        vendors: [],
        paymentReceived: undefined,
        materialsReceived: undefined,
        inventoryChecked: undefined,
        stipendReleaseMethod: undefined,
        stipendMode: undefined,
        escrowEnabled: undefined,
        hostPayoutReleaseMethod: undefined,
        businessOwnerSelected: undefined,
        selectedByBusinessId: undefined,
        tableOptions: [
          { id: 't-6ft', size: '6ft Table', price: 75, quantity: 20, contractorsPerTable: 1, availableQuantity: 20 },
          { id: 't-10x10', size: '10x10 Booth', price: 150, quantity: 12, contractorsPerTable: 2, availableQuantity: 12 },
          { id: 't-10x20', size: '10x20 Booth', price: 250, quantity: 6, contractorsPerTable: 3, availableQuantity: 6 },
        ],
        totalVendorSpaces: 20 + 12 + 6,
        hostInterest: undefined,
        hasInsurance: null,
        wantsInsuranceContact: false,
        expectedAttendees: 1200,
        marketingMethods: ['Instagram', 'Flyers', 'Local Radio'],
        eventFrequency: 'monthly',
        hostConnected: true,
        hostConnectedAt: new Date().toISOString(),
        contractorApplications: [],
        selectedContractors: [],
        contractorsHiredAt: undefined,
        contractorsNeedingW9: undefined,
        materialsSentAt: undefined,
        trackingNumber: undefined,
        isPublicListing: true,
        originalEventId: undefined,
        hostEventId: undefined,
        proposalSent: undefined,
        paymentReceivedDate: undefined,
        paymentConfirmationNumber: undefined,
        materialsDescription: undefined,
        inventoryItems: undefined,
        inventoryDiscrepancies: undefined,
      });

      console.log('✅ Sample event created with id:', event.id);
    }
  } catch (err) {
    console.error('❌ Failed to seed sample event:', err);
  }
})();

const app = new Hono();

app.use("*", cors({ origin: (origin) => origin ?? "*", credentials: true }));

app.route("/auth", authRoutes);
app.route("/profile", profileRoutes);
app.route("/uploads", uploadsRoutes);
app.route("/webhooks", webhooksRoutes);
app.route("/stripe-webhooks", stripeWebhooksRoutes);

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