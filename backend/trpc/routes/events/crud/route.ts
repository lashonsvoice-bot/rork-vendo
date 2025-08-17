import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../../../create-context";
import { eventRepo } from "../../../../db/event-repo";

const VendorReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string(),
  tip: z.number().min(0),
  reviewDate: z.string(),
  hostResponse: z.string().optional(),
  isRehirable: z.boolean(),
});

const VendorCheckInSchema = z.object({
  id: z.string(),
  vendorName: z.string(),
  contractorId: z.string().optional(),
  arrivalTime: z.string().optional(),
  arrivalConfirmed: z.boolean(),
  idVerified: z.boolean(),
  halfwayCheckIn: z.string().optional(),
  halfwayConfirmed: z.boolean(),
  endCheckIn: z.string().optional(),
  endConfirmed: z.boolean(),
  eventPhotos: z.array(z.string()),
  notes: z.string().optional(),
  fundsReleased: z.boolean(),
  review: VendorReviewSchema.optional(),
  tableLabel: z.string().optional(),
  stipendReleased: z.boolean().optional(),
});

const TableOptionSchema = z.object({
  id: z.string(),
  size: z.string(),
  price: z.number(),
  quantity: z.number(),
  contractorsPerTable: z.number(),
  availableQuantity: z.number(),
});

const ContractorApplicationSchema = z.object({
  id: z.string(),
  contractorId: z.string(),
  contractorName: z.string(),
  appliedAt: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']),
  message: z.string().optional(),
  rating: z.number().optional(),
  experience: z.string().optional(),
});

const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  businessName: z.string().optional(),
  website: z.string().optional(),
  location: z.string(),
  city: z.string(),
  state: z.string(),
  date: z.string(),
  time: z.string(),
  contractorsNeeded: z.number(),
  contractorPay: z.number(),
  hostSupervisionFee: z.number(),
  foodStipend: z.number().nullable().optional(),
  travelStipend: z.number().nullable().optional(),
  flyerUrl: z.string(),
  eventHostId: z.string().optional(),
  eventHostName: z.string().optional(),
  businessOwnerId: z.string().optional(),
  createdBy: z.enum(['business_owner', 'event_host', 'contractor']),
  status: z.enum(['draft', 'active', 'filled', 'completed', 'cancelled', 'awaiting_host', 'host_connected', 'contractors_hired', 'materials_sent', 'ready_for_event']),
  vendors: z.array(VendorCheckInSchema).optional(),
  paymentReceived: z.boolean().optional(),
  paymentReceivedDate: z.string().optional(),
  paymentConfirmationNumber: z.string().optional(),
  materialsReceived: z.boolean().optional(),
  materialsReceivedDate: z.string().optional(),
  materialsDescription: z.string().optional(),
  inventoryChecked: z.boolean().optional(),
  stipendReleaseMethod: z.enum(['notification', 'escrow', 'prepaid_cards']).optional(),
  stipendMode: z.enum(['gift_card', 'in_app', 'external']).optional(),
  escrowEnabled: z.boolean().optional(),
  hostPayoutReleaseMethod: z.enum(['host_releases', 'owner_releases']).optional(),
  businessOwnerSelected: z.boolean().optional(),
  selectedByBusinessId: z.string().optional(),
  tableOptions: z.array(TableOptionSchema).optional(),
  totalVendorSpaces: z.number().optional(),
  hostInterest: z.object({
    hostId: z.string(),
    hostName: z.string(),
    proposedPayout: z.number(),
    date: z.string(),
  }).optional(),
  hasInsurance: z.boolean().nullable().optional(),
  wantsInsuranceContact: z.boolean().optional(),
  expectedAttendees: z.number().optional(),
  marketingMethods: z.array(z.string()).optional(),
  eventFrequency: z.string().optional(),
  hostConnected: z.boolean().optional(),
  hostConnectedAt: z.string().optional(),
  contractorApplications: z.array(ContractorApplicationSchema).optional(),
  selectedContractors: z.array(z.string()).optional(),
  contractorsHiredAt: z.string().optional(),
  materialsSentAt: z.string().optional(),
  trackingNumber: z.string().optional(),
  isPublicListing: z.boolean().optional(),
  originalEventId: z.string().optional(),
  hostEventId: z.string().optional(),
  proposalSent: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const createEventProcedure = protectedProcedure
  .input(EventSchema.omit({ id: true, createdAt: true, updatedAt: true }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events] Creating event:', input.title);
    
    const event = await eventRepo.create({
      ...input,
      businessOwnerId: ctx.user?.role === 'business_owner' ? ctx.user.id : input.businessOwnerId,
      eventHostId: ctx.user?.role === 'event_host' ? ctx.user.id : input.eventHostId,
    });
    
    console.log('[Events] Event created with ID:', event.id);
    return event;
  });

export const getEventsProcedure = protectedProcedure
  .input(z.object({
    status: z.enum(['draft', 'active', 'filled', 'completed', 'cancelled', 'awaiting_host', 'host_connected', 'contractors_hired', 'materials_sent', 'ready_for_event']).optional(),
    userRole: z.enum(['business_owner', 'event_host', 'contractor']).optional(),
  }).optional())
  .query(async ({ input, ctx }) => {
    console.log('[Events] Getting events for user:', ctx.user?.id);
    
    if (input?.status) {
      return await eventRepo.findByStatus(input.status);
    }
    
    const userRole = input?.userRole || ctx.user?.role;
    if (!ctx.user?.id || !userRole) {
      return [];
    }
    return await eventRepo.findByUserId(ctx.user.id, userRole as any);
  });

export const getEventByIdProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    console.log('[Events] Getting event by ID:', input.id);
    return await eventRepo.findById(input.id);
  });

export const updateEventProcedure = protectedProcedure
  .input(z.object({
    id: z.string(),
    updates: EventSchema.partial(),
  }))
  .mutation(async ({ input }) => {
    console.log('[Events] Updating event:', input.id);
    return await eventRepo.update(input.id, input.updates);
  });

export const deleteEventProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input }) => {
    console.log('[Events] Deleting event:', input.id);
    return await eventRepo.delete(input.id);
  });

export const getPublicListingsProcedure = publicProcedure
  .query(async () => {
    console.log('[Events] Getting public listings');
    return await eventRepo.findPublicListings();
  });