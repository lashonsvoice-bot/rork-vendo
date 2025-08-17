import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { taxRepo } from "../../../../db/tax-repo";

const paymentSchema = z.object({
  contractorId: z.string(),
  businessOwnerId: z.string(),
  eventId: z.string().optional(),
  amount: z.number().positive(),
  paymentDate: z.string(),
  description: z.string(),
  taxYear: z.number().int().min(2020).max(2030),
  isSubjectToBackupWithholding: z.boolean(),
  backupWithholdingAmount: z.number().optional(),
});

export const recordPaymentProcedure = protectedProcedure
  .input(paymentSchema)
  .mutation(async ({ input }) => {
    console.log("Recording payment:", input.amount, "for contractor:", input.contractorId);
    
    const payment = await taxRepo.recordPayment(input);
    
    console.log("Payment recorded successfully:", payment.id);
    return payment;
  });

export const getContractorPaymentsProcedure = protectedProcedure
  .input(z.object({
    contractorId: z.string(),
    taxYear: z.number().int().optional(),
  }))
  .query(async ({ input }) => {
    console.log("Getting payments for contractor:", input.contractorId, "tax year:", input.taxYear);
    
    const payments = await taxRepo.getPaymentsByContractor(input.contractorId, input.taxYear);
    
    console.log("Found", payments.length, "payments");
    return payments;
  });

export const getBusinessOwnerPaymentsProcedure = protectedProcedure
  .input(z.object({
    businessOwnerId: z.string(),
    taxYear: z.number().int().optional(),
  }))
  .query(async ({ input }) => {
    console.log("Getting payments for business owner:", input.businessOwnerId, "tax year:", input.taxYear);
    
    const payments = await taxRepo.getPaymentsByBusinessOwner(input.businessOwnerId, input.taxYear);
    
    console.log("Found", payments.length, "payments");
    return payments;
  });