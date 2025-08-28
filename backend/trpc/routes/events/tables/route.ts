import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { eventRepo } from "../../../../db/event-repo";
import { walletRepo } from "../../../../db/wallet-repo";
import { messageRepo } from "../../../../db/message-repo";

const PLATFORM_USER_ID = "platform_fees";

export const purchaseTableProcedure = protectedProcedure
  .input(z.object({
    eventId: z.string(),
    tableId: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Events][Tables] purchaseTable called', input);

    if (!ctx.user?.id) {
      throw new Error('User not authenticated');
    }

    const event = await eventRepo.findById(input.eventId);
    if (!event) throw new Error('Event not found');

    if (!event.tableOptions || event.tableOptions.length === 0) {
      throw new Error('This event has no table options');
    }

    const table = event.tableOptions.find(t => t.id === input.tableId);
    if (!table) throw new Error('Table option not found');

    if (table.availableQuantity <= 0) {
      throw new Error('No tables available for this option');
    }

    const hostId = event.eventHostId;
    if (!hostId) throw new Error('Host is not connected to this event yet');

    const price = table.price;
    const hostFee = Math.round(price * 0.05 * 100) / 100; // 5% fee
    const hostNet = Math.round((price - hostFee) * 100) / 100;

    // Charge buyer (local vendor)
    await walletRepo.withdraw(ctx.user.id, price, `Purchase table ${table.size} for event ${event.title}`);
    // Credit host minus fee
    await walletRepo.deposit(hostId, hostNet, `Table sale for ${event.title} (${table.size})`);
    // Credit platform fee
    await walletRepo.deposit(PLATFORM_USER_ID, hostFee, `5% platform fee for table sale ${event.title}`);

    // Update event: decrement availableQuantity and append vendor record
    const updatedTableOptions = event.tableOptions.map(t =>
      t.id === table.id ? { ...t, availableQuantity: Math.max(0, t.availableQuantity - 1) } : t
    );

    const vendorEntry: import('../../../../db/event-repo').VendorCheckIn = {
      id: `vendor-${ctx.user.id}-${Date.now()}`,
      vendorName: ctx.user.name ?? ctx.user.email ?? 'Local Vendor',
      contractorId: ctx.user.id,
      arrivalConfirmed: false,
      idVerified: false,
      halfwayConfirmed: false,
      endConfirmed: false,
      eventPhotos: [],
      fundsReleased: false,
      tableLabel: table.size,
      stipendReleased: false,
    };

    const updatedVendors = [...(event.vendors ?? []), vendorEntry];

    const updated = await eventRepo.update(input.eventId, {
      tableOptions: updatedTableOptions,
      vendors: updatedVendors,
      totalVendorSpaces: (event.totalVendorSpaces ?? 0),
    });

    // Ensure messaging connection between buyer and host
    try {
      messageRepo.addConnection({
        id: Date.now().toString(),
        userId1: ctx.user.id,
        userId2: hostId,
        eventId: input.eventId,
        connectionType: 'hired',
        connectedAt: new Date().toISOString(),
        isActive: true,
      });
    } catch (e) {
      console.warn('[Events][Tables] Failed to create messaging connection', e);
    }

    return {
      success: true,
      event: updated,
      purchase: {
        tableId: table.id,
        price,
        hostNet,
        hostFee,
      },
    };
  });

export default purchaseTableProcedure;
