import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@/hooks/user-store";
import { useCommunication } from "@/hooks/communication-store";

export interface VendorReview {
  rating: number;
  comment: string;
  tip: number;
  reviewDate: string;
  hostResponse?: string;
  isRehirable: boolean;
}

export interface VendorCheckIn {
  id: string;
  vendorName: string;
  contractorId?: string;
  arrivalTime?: string;
  arrivalConfirmed: boolean;
  idVerified: boolean;
  halfwayCheckIn?: string;
  halfwayConfirmed: boolean;
  endCheckIn?: string;
  endConfirmed: boolean;
  eventPhotos: string[];
  notes?: string;
  fundsReleased: boolean;
  review?: VendorReview;
  tableLabel?: string;
  stipendReleased?: boolean;
  checkedInBy?: 'host' | 'contractor';
}

export interface TableOption {
  id: string;
  size: string;
  price: number;
  quantity: number;
  contractorsPerTable: number;
  availableQuantity: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  expectedQuantity: number;
  receivedQuantity: number;
  discrepancyType?: 'damaged' | 'missing' | 'lost_package' | 'extra';
  discrepancyExplanation?: string;
  checkedAt?: string;
}

export interface InventoryDiscrepancy {
  id: string;
  eventId: string;
  items: InventoryItem[];
  totalDiscrepancies: number;
  reportedAt: string;
  reportedBy: string;
  businessOwnerNotified: boolean;
  resolved: boolean;
  resolvedAt?: string;
  notes?: string;
}

export interface EventRequirements {
  dressCodeEnabled: boolean;
  dressCode?: string;
  parkingInfoEnabled: boolean;
  parkingInfo?: string;
  miscInfoEnabled: boolean;
  miscInfo?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  businessName?: string;
  website?: string;
  location: string;
  city: string;
  state: string;
  date: string;
  time: string;
  contractorsNeeded: number;
  contractorPay: number;
  hostSupervisionFee: number;
  foodStipend?: number | null;
  travelStipend?: number | null;
  flyerUrl: string;
  eventHostId?: string;
  eventHostName?: string;
  businessOwnerId?: string;
  createdBy: 'business_owner' | 'event_host' | 'contractor';
  status: 'draft' | 'active' | 'filled' | 'completed' | 'cancelled' | 'awaiting_host' | 'host_connected' | 'contractors_hired' | 'materials_sent' | 'ready_for_event';
  vendors?: VendorCheckIn[];
  paymentReceived?: boolean;
  paymentReceivedDate?: string;
  paymentConfirmationNumber?: string;
  materialsReceived?: boolean;
  materialsReceivedDate?: string;
  materialsDescription?: string;
  inventoryChecked?: boolean;
  inventoryItems?: InventoryItem[];
  inventoryDiscrepancies?: InventoryDiscrepancy[];
  stipendReleaseMethod?: 'notification' | 'escrow' | 'prepaid_cards';
  stipendMode?: 'gift_card' | 'in_app' | 'external';
  escrowEnabled?: boolean;
  hostPayoutReleaseMethod?: 'host_releases' | 'owner_releases';
  businessOwnerSelected?: boolean;
  selectedByBusinessId?: string;
  tableOptions?: TableOption[];
  totalVendorSpaces?: number;
  hostInterest?: { hostId: string; hostName: string; proposedPayout: number; date: string };
  hasInsurance?: boolean | null;
  wantsInsuranceContact?: boolean;
  expectedAttendees?: number;
  marketingMethods?: string[];
  eventFrequency?: string;
  hostConnected?: boolean;
  hostConnectedAt?: string;
  contractorApplications?: ContractorApplication[];
  selectedContractors?: string[];
  contractorsHiredAt?: string;
  materialsSentAt?: string;
  trackingNumber?: string;
  isPublicListing?: boolean;
  originalEventId?: string;
  hostEventId?: string;
  proposalSent?: boolean;
  // New fields for visibility and requirements
  optInListings?: boolean;
  isPrivateEvent?: boolean;
  privateNotes?: string;
  privatePremium?: boolean;
  requirements?: EventRequirements;
  listVenueInDirectory?: boolean;
}

const STORAGE_KEY = "vendor_events";

export interface ContractorApplication {
  id: string;
  contractorId: string;
  contractorName: string;
  appliedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  rating?: number;
  experience?: string;
}

const mockEvents: Event[] = [
  {
    id: "1",
    title: "Tech Expo 2024",
    description: "Annual technology exhibition showcasing the latest innovations in AI, robotics, and software development. We need contractors to manage vendor booths and assist with product demonstrations.",
    businessName: "TechVentures Inc.",
    website: "https://techventures.com",
    location: "San Francisco Convention Center",
    city: "San Francisco",
    state: "CA",
    date: "2024-03-15",
    time: "9:00 AM - 6:00 PM",
    contractorsNeeded: 5,
    contractorPay: 250,
    hostSupervisionFee: 75,
    foodStipend: 30,
    travelStipend: 50,
    flyerUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    createdBy: 'business_owner',
    status: 'completed',
    vendors: [
      {
        id: "v1",
        vendorName: "Acme Robotics",
        contractorId: "c1",
        arrivalConfirmed: true,
        idVerified: true,
        halfwayConfirmed: true,
        endConfirmed: true,
        eventPhotos: [],
        fundsReleased: true,
        notes: "Completed successfully"
      }
    ],
  },
  {
    id: "2",
    title: "Farmers Market Weekend",
    description: "Local farmers market featuring organic produce, artisanal goods, and live music. Looking for contractors to help vendors with setup, sales, and customer engagement.",
    eventHostId: "eh1",
    eventHostName: "Downtown Events Co.",
    location: "Downtown Plaza",
    city: "Oakland",
    state: "CA",
    date: "2024-03-22",
    time: "7:00 AM - 2:00 PM",
    contractorsNeeded: 0,
    contractorPay: 150,
    hostSupervisionFee: 50,
    foodStipend: 20,
    flyerUrl: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
    createdBy: 'event_host',
    status: 'active',
    businessOwnerSelected: false,
    tableOptions: [
      {
        id: "t1",
        size: "Small (6ft)",
        price: 75,
        quantity: 8,
        contractorsPerTable: 1,
        availableQuantity: 8,
      },
      {
        id: "t2",
        size: "Medium (8ft)",
        price: 100,
        quantity: 6,
        contractorsPerTable: 2,
        availableQuantity: 6,
      },
      {
        id: "t3",
        size: "Large (10ft)",
        price: 150,
        quantity: 4,
        contractorsPerTable: 3,
        availableQuantity: 4,
      },
    ],
    totalVendorSpaces: 32,
  },
  {
    id: "3",
    title: "Health & Wellness Fair",
    description: "Community health fair with free screenings, wellness workshops, and vendor booths. Need contractors to assist healthcare providers and manage information tables.",
    eventHostId: "eh2",
    eventHostName: "City Community Events",
    location: "City Community Center",
    city: "Austin",
    state: "TX",
    date: "2024-04-05",
    time: "10:00 AM - 4:00 PM",
    contractorsNeeded: 0,
    contractorPay: 200,
    hostSupervisionFee: 60,
    foodStipend: 25,
    travelStipend: 30,
    flyerUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
    createdBy: 'event_host',
    status: 'active',
    businessOwnerSelected: false,
    tableOptions: [
      {
        id: "t4",
        size: "Standard (8ft)",
        price: 120,
        quantity: 10,
        contractorsPerTable: 2,
        availableQuantity: 10,
      },
      {
        id: "t5",
        size: "Premium (10ft)",
        price: 180,
        quantity: 5,
        contractorsPerTable: 3,
        availableQuantity: 5,
      },
    ],
    totalVendorSpaces: 35,
  },
  {
    id: "4",
    title: "Art & Craft Festival",
    description: "Annual arts and crafts festival featuring local artists, handmade goods, and interactive workshops. Contractors needed for vendor assistance and crowd management.",
    businessName: "Creative Arts Alliance",
    location: "Riverside Park",
    city: "Miami",
    state: "FL",
    date: "2024-04-12",
    time: "11:00 AM - 7:00 PM",
    contractorsNeeded: 6,
    contractorPay: 180,
    hostSupervisionFee: 70,
    travelStipend: 40,
    flyerUrl: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800",
    createdBy: 'business_owner',
    status: 'active',
    proposalSent: true,
  },
  {
    id: "5",
    title: "Food Truck Festival",
    description: "Weekend food truck festival with live music and family activities. Need contractors to help with vendor coordination and customer service.",
    eventHostId: "eh3",
    eventHostName: "Seattle Events Group",
    location: "Pike Place Market",
    city: "Seattle",
    state: "WA",
    date: "2024-03-30",
    time: "12:00 PM - 8:00 PM",
    contractorsNeeded: 0,
    contractorPay: 175,
    hostSupervisionFee: 55,
    foodStipend: 35,
    flyerUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
    createdBy: 'event_host',
    status: 'active',
    businessOwnerSelected: false,
    tableOptions: [
      {
        id: "t6",
        size: "Food Vendor (12ft)",
        price: 200,
        quantity: 12,
        contractorsPerTable: 2,
        availableQuantity: 12,
      },
      {
        id: "t7",
        size: "Merchandise (6ft)",
        price: 80,
        quantity: 15,
        contractorsPerTable: 1,
        availableQuantity: 15,
      },
      {
        id: "t8",
        size: "Premium Corner (10ft)",
        price: 250,
        quantity: 4,
        contractorsPerTable: 3,
        availableQuantity: 4,
      },
    ],
    totalVendorSpaces: 51,
  },
  {
    id: "6",
    title: "Business Networking Expo",
    description: "Professional networking event with business showcases and seminars. Looking for contractors to assist with registration and booth management.",
    businessName: "Business Connect NY",
    location: "Jacob Javits Center",
    city: "New York",
    state: "NY",
    date: "2024-04-20",
    time: "8:00 AM - 5:00 PM",
    contractorsNeeded: 8,
    contractorPay: 220,
    hostSupervisionFee: 80,
    foodStipend: 40,
    travelStipend: 60,
    flyerUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800",
    createdBy: 'business_owner',
    status: 'active',
  },
];

export const [EventsProvider, useEvents] = createContextHook(() => {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  type PendingAction = { id: string; type: 'updateVendor'; payload: { eventId: string; vendorId: string; updates: Partial<VendorCheckIn> } };
  const QUEUE_KEY = 'events_action_queue';
  const [queue, setQueue] = useState<PendingAction[]>([]);

  const { updateContractor: updateContractorUser, contractors, currentUser, userRole, businessOwners } = useUser();
  const { sendMessage } = useCommunication();

  const loadEvents = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedEvents: Event[] = JSON.parse(stored);
        setEvents([...mockEvents, ...parsedEvents]);
      }
      const q = await AsyncStorage.getItem(QUEUE_KEY);
      if (q) {
        const parsedQ: PendingAction[] = JSON.parse(q);
        setQueue(parsedQ);
        console.log('[Events] Loaded queued actions', parsedQ.length);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const saveEvents = useCallback(async (eventsToSave: Event[]) => {
    try {
      const customEvents = eventsToSave.filter(
        (e) => !mockEvents.find((m) => m.id === e.id)
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customEvents));
    } catch (error) {
      console.error("Error saving events:", error);
    }
  }, []);

  const saveQueue = useCallback(async (q: PendingAction[]) => {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch (e) {
      console.log('[Events] Failed saving queue', e);
    }
  }, []);

  const addEvent = useCallback((event: Omit<Event, 'id' | 'status' | 'city' | 'state'>) => {
    const locationParts = event.location.split(',');
    const city = locationParts[locationParts.length - 2]?.trim() || 'Unknown';
    const state = locationParts[locationParts.length - 1]?.trim() || 'Unknown';
    const newEvent: Event = {
      ...event,
      id: Date.now().toString(),
      status: 'active',
      city,
      state,
      proposalSent: event.proposalSent ?? false,
      stipendMode: event.stipendMode ?? 'in_app',
    };
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    return newEvent;
  }, [events, saveEvents]);

  const updateEvent = useCallback((id: string, updates: Partial<Event>) => {
    const prev = events.find((e) => e.id === id);
    const updatedEvents = events.map((event) =>
      event.id === id ? { ...event, ...updates } : event
    );

    const updated = updatedEvents.find((e) => e.id === id);

    try {
      if (prev && updated) {
        const flippedMaterialsToReceived = updates.materialsReceived === true && (prev.materialsReceived ?? false) === false;
        const flippedPaymentToReceived = updates.paymentReceived === true && (prev.paymentReceived ?? false) === false;

        const toUserId = updated.selectedByBusinessId;
        if ((flippedMaterialsToReceived || flippedPaymentToReceived) && toUserId) {
          const toUser = businessOwners.find((bo) => bo.id === toUserId);
          const toUserName = toUser?.name ?? "Business Owner";
          const fromUserId = currentUser?.id ?? "system";
          const fromUserName = currentUser?.name ?? "System";
          const fromUserRole: 'business_owner' | 'contractor' | 'event_host' = (userRole ?? 'event_host') as 'business_owner' | 'contractor' | 'event_host';

          if (flippedMaterialsToReceived) {
            console.log('[Events] Materials received flipped to true for event', id);
            sendMessage({
              fromUserId,
              fromUserName,
              fromUserRole,
              toUserId,
              toUserName,
              toUserRole: 'business_owner',
              eventId: id,
              eventTitle: updated.title,
              type: 'material_confirmation',
              subject: `Packages received for ${updated.title}`,
              content: `Host has marked packages as received for \"${updated.title}\". This confirmation is informational and highlights the receipt.`,
              metadata: { materialsReceived: true, materialsDescription: updated.materialsDescription },
            });
          }

          if (flippedPaymentToReceived) {
            console.log('[Events] Payment received flipped to true for event', id);
            sendMessage({
              fromUserId,
              fromUserName,
              fromUserRole,
              toUserId,
              toUserName,
              toUserRole: 'business_owner',
              eventId: id,
              eventTitle: updated.title,
              type: 'payment_confirmation',
              subject: `Payment received for ${updated.title}`,
              content: `Host has marked payment as received for \"${updated.title}\". This confirmation is informational and highlights the receipt.`,
              metadata: { paymentReceived: true },
            });
          }
        }
      }
    } catch (e) {
      console.log('[Events] Failed to send received notifications', e);
    }

    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, [events, currentUser, userRole, sendMessage, businessOwners, saveEvents]);

  const applyVendorUpdateLocal = useCallback((eventId: string, vendorId: string, updates: Partial<VendorCheckIn>) => {
    const updatedEvents = events.map((event) => {
      if (event.id === eventId) {
        const vendors = event.vendors || [];
        const updatedVendors = vendors.map((vendor) =>
          vendor.id === vendorId ? { ...vendor, ...updates } : vendor
        );
        return { ...event, vendors: updatedVendors };
      }
      return event;
    });
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, [events, saveEvents]);

  const isOnline = typeof navigator !== 'undefined' && (navigator as unknown as { onLine?: boolean }).onLine !== undefined ? ((navigator as unknown as { onLine?: boolean }).onLine ?? true) : true;

  const processQueue = useCallback(async () => {
    if (!queue.length) return;
    console.log('[Events] Processing queue', queue.length);
    setQueue([]);
    await saveQueue([]);
  }, [queue, saveQueue]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const onOnline = () => {
        console.log('[Events] Online detected, processing queue');
        processQueue();
      };
      window.addEventListener('online', onOnline);
      return () => window.removeEventListener('online', onOnline);
    }
    return undefined;
  }, [processQueue]);

  const updateVendorCheckIn = useCallback((eventId: string, vendorId: string, updates: Partial<VendorCheckIn>) => {
    applyVendorUpdateLocal(eventId, vendorId, updates);
    if (!isOnline) {
      const action: PendingAction = { id: Date.now().toString(), type: 'updateVendor', payload: { eventId, vendorId, updates } };
      const next = [...queue, action];
      setQueue(next);
      saveQueue(next);
      console.log('[Events] Queued action (offline)', action);
    }
  }, [applyVendorUpdateLocal, isOnline, queue, saveQueue]);

  const addVendorReview = useCallback((eventId: string, vendorId: string, review: Omit<VendorReview, 'reviewDate' | 'isRehirable'>) => {
    const reviewWithDefaults: VendorReview = {
      ...review,
      reviewDate: new Date().toISOString(),
      isRehirable: review.rating >= 2,
    };

    let contractorId: string | undefined;
    const targetEvent = events.find(e => e.id === eventId);
    if (targetEvent && targetEvent.vendors) {
      const v = targetEvent.vendors.find(vn => vn.id === vendorId);
      contractorId = v?.contractorId;
    }

    updateVendorCheckIn(eventId, vendorId, { review: reviewWithDefaults });

    if (review.rating === 1 && contractorId) {
      const contractor = contractors.find(c => c.id === contractorId);
      const currentCount = contractor?.oneStarCount ?? 0;
      const newCount = currentCount + 1;
      const shouldSuspend = newCount > 3;

      const updates: Partial<import("@/hooks/user-store").Contractor> = {
        oneStarCount: newCount,
        suspended: shouldSuspend ? true : contractor?.suspended ?? false,
        suspendedAt: shouldSuspend ? new Date().toISOString() : contractor?.suspendedAt,
        suspensionReason: shouldSuspend ? 'Received more than 3 one-star ratings from hosts' : contractor?.suspensionReason,
      };

      updateContractorUser(contractorId, updates);

      if (shouldSuspend && currentUser && userRole === 'event_host') {
        const toUserName = contractor?.name ?? 'Contractor';
        try {
          sendMessage({
            fromUserId: currentUser.id,
            fromUserName: currentUser.name,
            fromUserRole: 'event_host',
            toUserId: contractorId,
            toUserName,
            toUserRole: 'contractor',
            eventId,
            eventTitle: targetEvent?.title,
            type: 'coordination',
            subject: 'Account Suspension Notice',
            content: 'Your account has been suspended due to multiple one-star ratings from hosts. You will receive an email with more details regarding the issue that occurred.',
            metadata: undefined,
          });
        } catch (e) {
          console.log('Failed to send suspension message', e);
        }
        console.log('Email notification queued: Account suspension due to >3 one-star ratings for contractor', contractorId);
      }
    }
  }, [events, updateVendorCheckIn, contractors, updateContractorUser, currentUser, userRole, sendMessage]);

  const addVendorToEvent = useCallback((eventId: string, vendorName: string, contractorId?: string) => {
    const newVendor: VendorCheckIn = {
      id: Date.now().toString(),
      vendorName,
      contractorId,
      arrivalConfirmed: false,
      idVerified: false,
      halfwayConfirmed: false,
      endConfirmed: false,
      eventPhotos: [],
      fundsReleased: false,
    };

    const updatedEvents = events.map((event) => {
      if (event.id === eventId) {
        const vendors = event.vendors || [];
        return { ...event, vendors: [...vendors, newVendor] };
      }
      return event;
    });
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    return newVendor;
  }, [events, saveEvents]);

  const deleteEvent = useCallback((id: string) => {
    const updatedEvents = events.filter((event) => event.id !== id);
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, [events, saveEvents]);

  const getEventsByState = useCallback((state?: string) => {
    if (!state) return events;
    return events.filter(event => event.state === state);
  }, [events]);

  const getAvailableStates = useCallback(() => {
    const states = [...new Set(events.map(event => event.state))];
    return states.sort();
  }, [events]);

  const getSortedEvents = useCallback((eventList: Event[] = events) => {
    return [...eventList].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return a.title.localeCompare(b.title);
    });
  }, [events]);

  const connectHostToEvent = useCallback((eventId: string, hostId: string) => {
    const updatedEvents = events.map((event) => {
      if (event.id === eventId && event.createdBy === 'business_owner') {
        return {
          ...event,
          eventHostId: hostId,
          hostConnected: true,
          hostConnectedAt: new Date().toISOString(),
          status: 'host_connected' as const,
          isPublicListing: true,
        };
      }
      return event;
    });
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, [events, saveEvents]);

  const submitContractorApplication = useCallback((eventId: string, contractorId: string, contractorName: string, message?: string) => {
    const application: ContractorApplication = {
      id: Date.now().toString(),
      contractorId,
      contractorName,
      appliedAt: new Date().toISOString(),
      status: 'pending',
      message,
    };

    const updatedEvents = events.map((event) => {
      if (event.id === eventId) {
        const applications = event.contractorApplications || [];
        return {
          ...event,
          contractorApplications: [...applications, application],
        };
      }
      return event;
    });
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    return application;
  }, [events, saveEvents]);

  const selectContractors = useCallback((eventId: string, selectedContractorIds: string[]) => {
    const updatedEvents = events.map((event) => {
      if (event.id === eventId) {
        const updatedApplications = (event.contractorApplications || []).map((app) => ({
          ...app,
          status: selectedContractorIds.includes(app.contractorId) ? 'accepted' as const : 'rejected' as const,
        }));

        // Auto-create vendor entries for selected contractors
        const selectedApplications = updatedApplications.filter(app => app.status === 'accepted');
        const autoVendors: VendorCheckIn[] = selectedApplications.map(app => ({
          id: `vendor-${app.contractorId}-${Date.now()}`,
          vendorName: app.contractorName,
          contractorId: app.contractorId,
          arrivalConfirmed: false,
          idVerified: false,
          halfwayConfirmed: false,
          endConfirmed: false,
          eventPhotos: [],
          fundsReleased: false,
        }));

        return {
          ...event,
          contractorApplications: updatedApplications,
          selectedContractors: selectedContractorIds,
          contractorsHiredAt: new Date().toISOString(),
          status: 'contractors_hired' as const,
          vendors: autoVendors, // Auto-populate vendors from selected contractors
        };
      }
      return event;
    });
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    const event = updatedEvents.find(e => e.id === eventId);
    if (event && currentUser && userRole === 'business_owner') {
      selectedContractorIds.forEach((contractorId) => {
        const contractor = contractors.find(c => c.id === contractorId);
        if (contractor) {
          try {
            sendMessage({
              fromUserId: currentUser.id,
              fromUserName: currentUser.name,
              fromUserRole: 'business_owner',
              toUserId: contractorId,
              toUserName: contractor.name,
              toUserRole: 'contractor',
              eventId,
              eventTitle: event.title,
              type: 'acceptance',
              subject: `You've been selected for ${event.title}`,
              content: `Congratulations! You have been selected to work at \"${event.title}\". The host will be notified and you'll receive further coordination details soon.`,
            });
          } catch (e) {
            console.log('Failed to send contractor selection message', e);
          }
        }
      });

      if (event.eventHostId) {
        try {
          sendMessage({
            fromUserId: currentUser.id,
            fromUserName: currentUser.name,
            fromUserRole: 'business_owner',
            toUserId: event.eventHostId,
            toUserName: event.eventHostName || 'Event Host',
            toUserRole: 'event_host',
            eventId,
            eventTitle: event.title,
            type: 'coordination',
            subject: `Contractors selected for ${event.title}`,
            content: `The contractors have been selected for \"${event.title}\". You can now coordinate with them and prepare for the event. Contractors have been automatically added to your vendor management system.`,
            metadata: { contractorCount: selectedContractorIds.length },
          });
        } catch (e) {
          console.log('Failed to send host notification message', e);
        }
      }
    }
  }, [events, currentUser, userRole, contractors, sendMessage, saveEvents]);

  const sendMaterials = useCallback((eventId: string, trackingNumber: string, description?: string) => {
    const updatedEvents = events.map((event) => {
      if (event.id === eventId) {
        return {
          ...event,
          materialsSentAt: new Date().toISOString(),
          trackingNumber,
          materialsDescription: description,
          status: 'materials_sent' as const,
        };
      }
      return event;
    });
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    const event = events.find(e => e.id === eventId);
    if (event && event.eventHostId && currentUser && userRole === 'business_owner') {
      try {
        sendMessage({
          fromUserId: currentUser.id,
          fromUserName: currentUser.name,
          fromUserRole: 'business_owner',
          toUserId: event.eventHostId,
          toUserName: event.eventHostName || 'Event Host',
          toUserRole: 'event_host',
          eventId,
          eventTitle: event.title,
          type: 'coordination',
          subject: `Materials sent for ${event.title}`,
          content: `Materials have been sent for \"${event.title}\". Tracking number: ${trackingNumber}. ${description ? `Description: ${description}` : ''}`,
          metadata: { materialsDescription: description },
        });
      } catch (e) {
        console.log('Failed to send materials notification', e);
      }
    }
  }, [events, currentUser, userRole, sendMessage, saveEvents]);

  const markProposalSent = useCallback((eventId: string) => {
    updateEvent(eventId, { proposalSent: true });
  }, [updateEvent]);

  const updateInventoryItem = useCallback((eventId: string, itemId: string, updates: Partial<InventoryItem>) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const inventoryItems = event.inventoryItems || [];
    const updatedItems = inventoryItems.map(item => 
      item.id === itemId ? { ...item, ...updates, checkedAt: new Date().toISOString() } : item
    );

    updateEvent(eventId, { inventoryItems: updatedItems });
  }, [events, updateEvent]);

  const addInventoryItem = useCallback((eventId: string, item: Omit<InventoryItem, 'id' | 'checkedAt'>) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const newItem: InventoryItem = {
      ...item,
      id: Date.now().toString(),
      checkedAt: new Date().toISOString(),
    };

    const inventoryItems = event.inventoryItems || [];
    updateEvent(eventId, { inventoryItems: [...inventoryItems, newItem] });
    return newItem;
  }, [events, updateEvent]);

  const reportInventoryDiscrepancy = useCallback((eventId: string, items: InventoryItem[], notes?: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event || !currentUser) return;

    const discrepancyItems = items.filter(item => 
      item.discrepancyType && item.receivedQuantity !== item.expectedQuantity
    );

    if (discrepancyItems.length === 0) return;

    const discrepancy: InventoryDiscrepancy = {
      id: Date.now().toString(),
      eventId,
      items: discrepancyItems,
      totalDiscrepancies: discrepancyItems.length,
      reportedAt: new Date().toISOString(),
      reportedBy: currentUser.id,
      businessOwnerNotified: false,
      resolved: false,
      notes,
    };

    const existingDiscrepancies = event.inventoryDiscrepancies || [];
    const updatedDiscrepancies = [...existingDiscrepancies, discrepancy];

    updateEvent(eventId, { 
      inventoryDiscrepancies: updatedDiscrepancies,
      inventoryItems: items,
    });

    const toUserId = event.selectedByBusinessId || event.businessOwnerId;
    if (toUserId && userRole === 'event_host') {
      const toUser = businessOwners.find(bo => bo.id === toUserId);
      const toUserName = toUser?.name ?? "Business Owner";
      const fromUserRole: 'business_owner' | 'contractor' | 'event_host' = 'event_host';

      try {
        sendMessage({
          fromUserId: currentUser.id,
          fromUserName: currentUser.name,
          fromUserRole,
          toUserId,
          toUserName,
          toUserRole: 'business_owner',
          eventId,
          eventTitle: event.title,
          type: 'coordination',
          subject: `URGENT: Inventory Discrepancy - ${event.title}`,
          content: `Critical inventory issues reported for "${event.title}". ${discrepancyItems.length} item(s) have discrepancies that may require event cancellation or immediate action. Please review immediately.`,
          metadata: { 
            discrepancyId: discrepancy.id,
            totalDiscrepancies: discrepancyItems.length,
            urgent: true,
            discrepancyTypes: (discrepancyItems.map(item => item.discrepancyType).filter((t): t is NonNullable<InventoryItem['discrepancyType']> => Boolean(t)) as string[])
          },
        });
        
        discrepancy.businessOwnerNotified = true;
        updateEvent(eventId, { inventoryDiscrepancies: updatedDiscrepancies });
        
        console.log('[Events] Urgent inventory discrepancy notification sent for event', eventId);
      } catch (e) {
        console.log('[Events] Failed to send inventory discrepancy notification', e);
      }
    }

    return discrepancy;
  }, [events, currentUser, userRole, businessOwners, sendMessage, updateEvent]);

  const resolveInventoryDiscrepancy = useCallback((eventId: string, discrepancyId: string, notes?: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const discrepancies = event.inventoryDiscrepancies || [];
    const updatedDiscrepancies = discrepancies.map(d => 
      d.id === discrepancyId 
        ? { ...d, resolved: true, resolvedAt: new Date().toISOString(), notes }
        : d
    );

    updateEvent(eventId, { inventoryDiscrepancies: updatedDiscrepancies });
  }, [events, updateEvent]);

  const getPublicListings = useCallback(() => {
    return events.filter(event => 
      event.isPublicListing && 
      event.hostConnected && 
      event.status === 'host_connected'
    );
  }, [events]);

  const getEventsAwaitingContractorSelection = useCallback((businessOwnerId: string) => {
    return events.filter(event => 
      event.businessOwnerId === businessOwnerId &&
      event.hostConnected &&
      event.contractorApplications &&
      event.contractorApplications.length > 0 &&
      !event.selectedContractors
    );
  }, [events]);

  const getEventsAwaitingHost = useCallback(() => {
    return events.filter(event => 
      event.createdBy === 'business_owner' &&
      !event.hostConnected &&
      event.status === 'active' &&
      event.proposalSent === true
    );
  }, [events]);

  return useMemo(() => ({
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    updateVendorCheckIn,
    addVendorToEvent,
    addVendorReview,
    getEventsByState,
    getAvailableStates,
    getSortedEvents,
    connectHostToEvent,
    submitContractorApplication,
    selectContractors,
    sendMaterials,
    getPublicListings,
    getEventsAwaitingContractorSelection,
    getEventsAwaitingHost,
    markProposalSent,
    updateInventoryItem,
    addInventoryItem,
    reportInventoryDiscrepancy,
    resolveInventoryDiscrepancy,
  }), [
    events,
    isLoading,
    addEvent,
    updateEvent,
    deleteEvent,
    updateVendorCheckIn,
    addVendorToEvent,
    addVendorReview,
    getEventsByState,
    getAvailableStates,
    getSortedEvents,
    connectHostToEvent,
    submitContractorApplication,
    selectContractors,
    sendMaterials,
    getPublicListings,
    getEventsAwaitingContractorSelection,
    getEventsAwaitingHost,
    markProposalSent,
    updateInventoryItem,
    addInventoryItem,
    reportInventoryDiscrepancy,
    resolveInventoryDiscrepancy,
  ]);

});