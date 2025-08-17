import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../create-context";
import { walletRepo } from "../../../db/wallet-repo";

const money = z.number().positive();

const depositInput = z.object({ amount: money, note: z.string().optional() });
const withdrawInput = z.object({ amount: money, note: z.string().optional() });
const holdInput = z.object({ amount: money, relatedId: z.string().optional(), note: z.string().optional() });
const releaseInput = z.object({ amount: money, relatedId: z.string().optional(), note: z.string().optional() });
const captureInput = z.object({ amount: money, relatedId: z.string().optional(), note: z.string().optional() });
const payoutInput = z.object({ amount: money, relatedId: z.string().optional(), note: z.string().optional() });

const getBalanceProcedure = protectedProcedure.query(async ({ ctx }) => {
  console.log("[wallet] getBalance for", ctx.user?.id);
  const balance = await walletRepo.getBalance(ctx.user!.id);
  return balance;
});

const listTransactionsProcedure = protectedProcedure
  .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
  .query(async ({ ctx, input }) => {
    const limit = input?.limit ?? 50;
    console.log("[wallet] listTransactions for", ctx.user?.id, "limit", limit);
    const tx = await walletRepo.listTransactions(ctx.user!.id, limit);
    return tx;
  });

const depositProcedure = protectedProcedure
  .input(depositInput)
  .mutation(async ({ ctx, input }) => {
    console.log("[wallet] deposit", input.amount, "for", ctx.user?.id);
    const result = await walletRepo.deposit(ctx.user!.id, input.amount, input.note);
    return result;
  });

const withdrawProcedure = protectedProcedure
  .input(withdrawInput)
  .mutation(async ({ ctx, input }) => {
    console.log("[wallet] withdraw", input.amount, "for", ctx.user?.id);
    const result = await walletRepo.withdraw(ctx.user!.id, input.amount, input.note);
    return result;
  });

const holdProcedure = protectedProcedure
  .input(holdInput)
  .mutation(async ({ ctx, input }) => {
    console.log("[wallet] hold", input.amount, "for", ctx.user?.id, input.relatedId);
    const result = await walletRepo.createHold(ctx.user!.id, input.amount, input.relatedId, input.note);
    return result;
  });

const releaseProcedure = protectedProcedure
  .input(releaseInput)
  .mutation(async ({ ctx, input }) => {
    console.log("[wallet] release", input.amount, "for", ctx.user?.id, input.relatedId);
    const result = await walletRepo.releaseHold(ctx.user!.id, input.amount, input.relatedId, input.note);
    return result;
  });

const captureProcedure = protectedProcedure
  .input(captureInput)
  .mutation(async ({ ctx, input }) => {
    console.log("[wallet] capture", input.amount, "for", ctx.user?.id, input.relatedId);
    const result = await walletRepo.captureHold(ctx.user!.id, input.amount, input.relatedId, input.note);
    return result;
  });

const payoutProcedure = protectedProcedure
  .input(payoutInput)
  .mutation(async ({ ctx, input }) => {
    console.log("[wallet] payout", input.amount, "for", ctx.user?.id, input.relatedId);
    const result = await walletRepo.payout(ctx.user!.id, input.amount, input.relatedId, input.note);
    return result;
  });

const walletRoutes = createTRPCRouter({
  getBalance: getBalanceProcedure,
  listTransactions: listTransactionsProcedure,
  deposit: depositProcedure,
  withdraw: withdrawProcedure,
  hold: holdProcedure,
  release: releaseProcedure,
  capture: captureProcedure,
  payout: payoutProcedure,
});

export default walletRoutes;
