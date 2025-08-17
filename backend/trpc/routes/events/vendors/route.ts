import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { eventRepo } from "../../../../db/event-repo";

const VendorCheckInUpdateSchema = z.object({
  vendorName: z.string().optional(),
  contractorId: z.string().optional(),
  arrivalTime: z.string().optional(),
  arrivalConfirmed: z.boolean().optional(),
  idVerified: z.boolean().optional(),
  halfwayCheckIn: z.string().optional(),
  halfwayConfirmed: z.boolean().optional(),
  endCheckIn: z.string().optional(),
  endConfirmed: z.boolean().optional(),
  eventPhotos: z.array(z.string()).optional(),
  notes: z.string().optional(),
  fundsReleased: z.boolean().optional(),
  tableLabel: z.string().optional(),
  stipendReleased: z.boolean().optional(),
});

const VendorReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string(),
  tip: z.number().min(0),
  hostResponse: z.string().optional(),
});

export const addVendorToEventProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    vendorName: z.string(),
    contractorId: z.string().optional(),
    tableLabel: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Adding vendor to event:', input.eventId, input.vendorName);
    
    const vendor = {
      id: Date.now().toString(),
      vendorName: input.vendorName,
      contractorId: input.contractorId,
      arrivalConfirmed: false,
      idVerified: false,
      halfwayConfirmed: false,
      endConfirmed: false,
      eventPhotos: [],
      fundsReleased: false,
      tableLabel: input.tableLabel,
    };
    
    return await eventRepo.addVendorCheckIn(input.eventId, vendor);
  });

export const updateVendorCheckInProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    vendorId: z.string(),
    updates: VendorCheckInUpdateSchema,
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Updating vendor check-in:', input.eventId, input.vendorId);
    return await eventRepo.updateVendorCheckIn(input.eventId, input.vendorId, input.updates);
  });

export const addVendorReviewProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    vendorId: z.string(),
    review: VendorReviewSchema,
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Adding vendor review:', input.eventId, input.vendorId);
    
    const reviewWithDefaults = {
      ...input.review,
      reviewDate: new Date().toISOString(),
      isRehirable: input.review.rating >= 2,
    };
    
    return await eventRepo.updateVendorCheckIn(input.eventId, input.vendorId, {
      review: reviewWithDefaults,
    });
  });

export const releaseVendorFundsProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    vendorId: z.string(),
    amount: z.number().optional(),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Releasing vendor funds:', input.eventId, input.vendorId);
    
    return await eventRepo.updateVendorCheckIn(input.eventId, input.vendorId, {
      fundsReleased: true,
    });
  });

export const releaseVendorStipendProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    vendorId: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Releasing vendor stipend:', input.eventId, input.vendorId);
    
    return await eventRepo.updateVendorCheckIn(input.eventId, input.vendorId, {
      stipendReleased: true,
    });
  });

export const updateTableLabelProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    vendorId: z.string(),
    tableLabel: z.string(),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Updating table label:', input.eventId, input.vendorId, input.tableLabel);
    
    return await eventRepo.updateVendorCheckIn(input.eventId, input.vendorId, {
      tableLabel: input.tableLabel,
    });
  });