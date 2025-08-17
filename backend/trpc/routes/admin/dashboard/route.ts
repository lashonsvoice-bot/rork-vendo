import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { userRepo } from "../../../../db/user-repo";
import { adminRepo, type AdminAnalytics } from "../../../../db/admin-repo";
import { eventRepo } from "../../../../db/event-repo";
import { subscriptionRepo } from "../../../../db/subscription-repo";
import { randomUUID } from "node:crypto";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new Error("Admin access required");
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Check if user is suspended
export const checkSuspensionProcedure = protectedProcedure.query(async ({ ctx }) => {
  if (!ctx.user) {
    throw new Error("User not authenticated");
  }
  
  const user = await userRepo.findById(ctx.user.id);
  if (!user) {
    throw new Error("User not found");
  }
  
  return {
    suspended: user.suspended || false,
    suspendedAt: user.suspendedAt,
    suspendedReason: user.suspendedReason,
  };
});

// Submit appeal for suspended users
export const submitAppealProcedure = protectedProcedure
  .input(z.object({
    reason: z.string().min(1),
    description: z.string().min(10),
    attachments: z.array(z.string()).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }
    
    const user = await userRepo.findById(ctx.user.id);
    if (!user || !user.suspended) {
      throw new Error("Only suspended users can submit appeals");
    }
    
    const appeal = {
      id: randomUUID(),
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      userName: ctx.user.name,
      userRole: ctx.user.role,
      reason: input.reason,
      description: input.description,
      attachments: input.attachments,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    
    await adminRepo.addAppeal(appeal);
    
    // Log the appeal submission
    await adminRepo.logActivity({
      id: randomUUID(),
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      action: "submit_appeal",
      details: `Submitted appeal: ${input.reason}`,
      timestamp: new Date().toISOString(),
    });
    
    return { success: true, appealId: appeal.id };
  });

export const getAnalyticsProcedure = adminProcedure.query(async () => {
  const users = await userRepo.readAll();
  const events = await eventRepo.readAll();
  const subscriptions = await subscriptionRepo.readAll();
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  // Calculate contractor applications this month
  const contractorApplicationsThisMonth = events.reduce((total: number, event: any) => {
    if (!event.contractorApplications) return total;
    return total + event.contractorApplications.filter((app: any) => {
      const appliedDate = new Date(app.appliedAt);
      return appliedDate >= monthStart;
    }).length;
  }, 0);
  
  // Calculate total revenue from all events (contractor pay + host fees + stipends)
  const totalEventRevenue = events.reduce((total: number, event: any) => {
    if (event.status === 'completed' || event.status === 'active') {
      const contractorPay = (event.contractorPay || 0) * (event.contractorsNeeded || 0);
      const hostFee = event.hostSupervisionFee || 0;
      const foodStipend = (event.foodStipend || 0) * (event.contractorsNeeded || 0);
      const travelStipend = (event.travelStipend || 0) * (event.contractorsNeeded || 0);
      return total + contractorPay + hostFee + foodStipend + travelStipend;
    }
    return total;
  }, 0);
  
  // Calculate monthly revenue from events created this month
  const monthlyEventRevenue = events
    .filter((e: any) => {
      const eventDate = new Date(e.createdAt || e.date);
      return eventDate >= monthStart && (e.status === 'completed' || e.status === 'active');
    })
    .reduce((total: number, event: any) => {
      const contractorPay = (event.contractorPay || 0) * (event.contractorsNeeded || 0);
      const hostFee = event.hostSupervisionFee || 0;
      const foodStipend = (event.foodStipend || 0) * (event.contractorsNeeded || 0);
      const travelStipend = (event.travelStipend || 0) * (event.contractorsNeeded || 0);
      return total + contractorPay + hostFee + foodStipend + travelStipend;
    }, 0);
  
  // Calculate weekly growth metrics
  const thisWeekUsers = users.filter((u: any) => {
    const createdDate = new Date(u.createdAt);
    return createdDate >= weekStart;
  }).length;
  
  const lastWeekUsers = users.filter((u: any) => {
    const createdDate = new Date(u.createdAt);
    return createdDate >= lastWeekStart && createdDate < weekStart;
  }).length;
  
  const thisWeekRevenue = events
    .filter((e: any) => {
      const eventDate = new Date(e.createdAt || e.date);
      return eventDate >= weekStart && (e.status === 'completed' || e.status === 'active');
    })
    .reduce((total: number, event: any) => {
      const contractorPay = (event.contractorPay || 0) * (event.contractorsNeeded || 0);
      const hostFee = event.hostSupervisionFee || 0;
      return total + contractorPay + hostFee;
    }, 0);
  
  const lastWeekRevenue = events
    .filter((e: any) => {
      const eventDate = new Date(e.createdAt || e.date);
      return eventDate >= lastWeekStart && eventDate < weekStart && (e.status === 'completed' || e.status === 'active');
    })
    .reduce((total: number, event: any) => {
      const contractorPay = (event.contractorPay || 0) * (event.contractorsNeeded || 0);
      const hostFee = event.hostSupervisionFee || 0;
      return total + contractorPay + hostFee;
    }, 0);
  
  // Calculate growth percentage
  const userGrowth = lastWeekUsers > 0 ? ((thisWeekUsers - lastWeekUsers) / lastWeekUsers) * 100 : 0;
  const revenueGrowth = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
  const combinedGrowth = (userGrowth + revenueGrowth) / 2;
  
  const analytics: AdminAnalytics = {
    totalUsers: users.length,
    activeUsers: users.filter((u: any) => !u.suspended).length,
    suspendedUsers: users.filter((u: any) => u.suspended).length,
    totalEvents: events.length,
    activeEvents: events.filter((e: any) => e.status === "active").length,
    cancelledEvents: events.filter((e: any) => e.status === "cancelled").length,
    totalRevenue: totalEventRevenue + subscriptions.reduce((sum: number, s: any) => sum + (s.totalPaid || 0), 0),
    monthlyRevenue: monthlyEventRevenue + subscriptions
      .filter((s: any) => s.lastPaymentDate && new Date(s.lastPaymentDate) >= monthStart)
      .reduce((sum: number, s: any) => sum + (s.monthlyAmount || 0), 0),
    contractorApplicationsThisMonth,
    weeklyGrowth: combinedGrowth,
    subscriptions: {
      active: subscriptions.filter((s: any) => s.status === "active").length,
      cancelled: subscriptions.filter((s: any) => s.status === "cancelled").length,
      total: subscriptions.length,
    },
    usersByRole: {
      business_owner: users.filter((u: any) => u.role === "business_owner").length,
      contractor: users.filter((u: any) => u.role === "contractor").length,
      event_host: users.filter((u: any) => u.role === "event_host").length,
    },
    cancellationStats: {
      hostCancellations: events.filter((e: any) => e.status === "cancelled" && (e as any).cancelledBy === "host").length,
      businessCancellations: events.filter((e: any) => e.status === "cancelled" && (e as any).cancelledBy === "business").length,
      contractorNoShows: events.filter((e: any) => (e as any).contractorNoShow).length,
    },
    flaggedUsers: users
      .filter((u: any) => (u as any).flagged)
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        reason: (u as any).flagReason || "Multiple violations",
        count: (u as any).violationCount || 0,
        lastIncident: (u as any).lastViolation || u.createdAt,
      })),
  };
  
  return analytics;
});

export const getUsersProcedure = adminProcedure
  .input(z.object({
    page: z.number().default(1),
    limit: z.number().default(50),
    role: z.enum(["business_owner", "contractor", "event_host", "all"]).default("all"),
    status: z.enum(["active", "suspended", "all"]).default("all"),
    search: z.string().optional(),
  }))
  .query(async ({ input }: { input: any }) => {
    const users = await userRepo.readAll();
    
    let filtered = users;
    
    if (input.role !== "all") {
      filtered = filtered.filter((u: any) => u.role === input.role);
    }
    
    if (input.status !== "all") {
      filtered = filtered.filter((u: any) => 
        input.status === "suspended" ? u.suspended : !u.suspended
      );
    }
    
    if (input.search) {
      const search = input.search.toLowerCase();
      filtered = filtered.filter((u: any) => 
        u.name.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    }
    
    const total = filtered.length;
    const offset = (input.page - 1) * input.limit;
    const paginated = filtered.slice(offset, offset + input.limit);
    
    return {
      users: paginated.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        suspended: u.suspended || false,
        suspendedAt: u.suspendedAt,
        suspendedReason: u.suspendedReason,
        lastLoginAt: u.lastLoginAt,
      })),
      total,
      page: input.page,
      totalPages: Math.ceil(total / input.limit),
    };
  });

export const suspendUserProcedure = adminProcedure
  .input(z.object({
    userId: z.string(),
    reason: z.string(),
  }))
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    const user = await userRepo.findById(input.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updated = {
      ...user,
      suspended: true,
      suspendedAt: new Date().toISOString(),
      suspendedReason: input.reason,
    };
    
    await userRepo.update(updated);
    
    // Log the action
    await adminRepo.logActivity({
      id: randomUUID(),
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      action: "suspend_user",
      details: `Suspended user ${user.email} - Reason: ${input.reason}`,
      timestamp: new Date().toISOString(),
    });
    
    return { success: true };
  });

export const unsuspendUserProcedure = adminProcedure
  .input(z.object({
    userId: z.string(),
  }))
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    const user = await userRepo.findById(input.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updated = {
      ...user,
      suspended: false,
      suspendedAt: undefined,
      suspendedReason: undefined,
    };
    
    await userRepo.update(updated);
    
    // Log the action
    await adminRepo.logActivity({
      id: randomUUID(),
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      action: "unsuspend_user",
      details: `Unsuspended user ${user.email}`,
      timestamp: new Date().toISOString(),
    });
    
    return { success: true };
  });

export const getAppealsProcedure = adminProcedure
  .input(z.object({
    status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
  }))
  .query(async ({ input }: { input: any }) => {
    const appeals = await adminRepo.readAppeals();
    
    if (input.status === "all") {
      return appeals;
    }
    
    return appeals.filter((a: any) => a.status === input.status);
  });

export const reviewAppealProcedure = adminProcedure
  .input(z.object({
    appealId: z.string(),
    status: z.enum(["approved", "rejected"]),
    adminNotes: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
    const appeals = await adminRepo.readAppeals();
    const appeal = appeals.find((a: any) => a.id === input.appealId);
    
    if (!appeal) {
      throw new Error("Appeal not found");
    }
    
    const updated = {
      ...appeal,
      status: input.status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: ctx.user.email,
      adminNotes: input.adminNotes,
    };
    
    await adminRepo.updateAppeal(updated);
    
    // If approved, unsuspend the user
    if (input.status === "approved") {
      const user = await userRepo.findById(appeal.userId);
      if (user && user.suspended) {
        await userRepo.update({
          ...user,
          suspended: false,
          suspendedAt: undefined,
          suspendedReason: undefined,
        });
      }
    }
    
    // Log the action
    await adminRepo.logActivity({
      id: randomUUID(),
      userId: ctx.user.id,
      userEmail: ctx.user.email,
      action: "review_appeal",
      details: `${input.status} appeal from ${appeal.userEmail} - Notes: ${input.adminNotes || "None"}`,
      timestamp: new Date().toISOString(),
    });
    
    return { success: true };
  });

export const getActivityLogsProcedure = adminProcedure
  .input(z.object({
    limit: z.number().default(100),
  }))
  .query(async ({ input }: { input: any }) => {
    const logs = await adminRepo.readActivity();
    return logs
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, input.limit);
  });