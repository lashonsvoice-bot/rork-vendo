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
  fundsReleasedAt?: string;
  fundsReleasedBy?: string;
  review?: VendorReview;
  tableLabel?: string;
  stipendReleased?: boolean;
  stipendReleasedAt?: string;
  stipendReleasedBy?: string;
}

export interface TableOption {
  id: string;
  size: string;
  price: number;
  quantity: number;
  contractorsPerTable: number;
  availableQuantity: number;
}

export interface ContractorApplication {
  id: string;
  contractorId: string;
  contractorName: string;
  appliedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  rating?: number;
  experience?: string;
  w9Required?: boolean;
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

export interface EventCancellation {
  id: string;
  eventId: string;
  cancelledBy: string; // userId
  cancelledByRole: 'host' | 'business_owner' | 'contractor';
  reason: string;
  cancellationTime: Date;
  eventTime: Date;
  hoursNotice: number;
  automaticRating?: number;
  penaltyAmount?: number;
  compensationAmount?: number;
  proofFiles?: string[]; // For contractor cancellations
  status: 'pending' | 'processed' | 'appealed';
  appealReason?: string;
  appealSubmittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CancellationStats {
  userId: string;
  role: 'host' | 'business_owner' | 'contractor';
  totalCancellations: number;
  last24HourCancellations: number;
  suspensionStatus: 'active' | 'suspended' | 'permanently_suspended';
  suspensionReason?: string;
  suspensionDate?: Date;
  appealEmail?: string;
}

export interface NoShowRecord {
  id: string;
  eventId: string;
  contractorId: string;
  eventTime: Date;
  reportedBy: string;
  reportedAt: Date;
  status: 'reported' | 'confirmed' | 'disputed';
  terminationNoticeId?: string;
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
  createdBy: 'business_owner' | 'event_host' | 'contractor' | 'ambassador';
  contactEmail: string;
  contactPhone?: string;
  ambassadorId?: string;
  isAmbassadorListing?: boolean;
  status: 'draft' | 'active' | 'filled' | 'completed' | 'cancelled' | 'awaiting_host' | 'host_connected' | 'contractors_hired' | 'pending_w9_forms' | 'materials_sent' | 'ready_for_event';
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
  contractorsNeedingW9?: string[];
  materialsSentAt?: string;
  trackingNumber?: string;
  isPublicListing?: boolean;
  originalEventId?: string;
  hostEventId?: string;
  proposalSent?: boolean;
  cancellation?: EventCancellation;
  createdAt?: string;
  updatedAt?: string;
}

class EventRepository {
  private events: Map<string, Event> = new Map();
  private cancellations: EventCancellation[] = [];
  private cancellationStats: CancellationStats[] = [];
  private noShowRecords: NoShowRecord[] = [];
  private nextId = 1;



  async create(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const id = this.nextId.toString();
    this.nextId++;
    
    const event: Event = {
      ...eventData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.events.set(id, event);
    return event;
  }

  async findById(id: string): Promise<Event | null> {
    return this.events.get(id) || null;
  }

  async findAll(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async findByUserId(userId: string, userRole: 'business_owner' | 'event_host' | 'contractor'): Promise<Event[]> {
    const events = Array.from(this.events.values());
    
    switch (userRole) {
      case 'business_owner':
        return events.filter(event => event.businessOwnerId === userId);
      case 'event_host':
        return events.filter(event => event.eventHostId === userId);
      case 'contractor':
        return events.filter(event => 
          event.selectedContractors?.includes(userId) ||
          event.contractorApplications?.some(app => app.contractorId === userId)
        );
      default:
        return [];
    }
  }

  async findPublicListings(): Promise<Event[]> {
    const events = Array.from(this.events.values());
    return events.filter(event => 
      event.isPublicListing && 
      event.hostConnected && 
      event.status === 'host_connected'
    );
  }

  async findByStatus(status: Event['status']): Promise<Event[]> {
    const events = Array.from(this.events.values());
    return events.filter(event => event.status === status);
  }

  async update(id: string, updates: Partial<Event>): Promise<Event | null> {
    const event = this.events.get(id);
    if (!event) return null;
    
    const updatedEvent: Event = {
      ...event,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async delete(id: string): Promise<boolean> {
    return this.events.delete(id);
  }

  async addVendorCheckIn(eventId: string, vendor: VendorCheckIn): Promise<Event | null> {
    const event = this.events.get(eventId);
    if (!event) return null;
    
    const vendors = event.vendors || [];
    const updatedEvent: Event = {
      ...event,
      vendors: [...vendors, vendor],
      updatedAt: new Date().toISOString(),
    };
    
    this.events.set(eventId, updatedEvent);
    return updatedEvent;
  }

  async updateVendorCheckIn(eventId: string, vendorId: string, updates: Partial<VendorCheckIn>): Promise<Event | null> {
    const event = this.events.get(eventId);
    if (!event || !event.vendors) return null;
    
    const updatedVendors = event.vendors.map(vendor =>
      vendor.id === vendorId ? { ...vendor, ...updates } : vendor
    );
    
    const updatedEvent: Event = {
      ...event,
      vendors: updatedVendors,
      updatedAt: new Date().toISOString(),
    };
    
    this.events.set(eventId, updatedEvent);
    return updatedEvent;
  }

  async addContractorApplication(eventId: string, application: ContractorApplication): Promise<Event | null> {
    const event = this.events.get(eventId);
    if (!event) return null;
    
    const applications = event.contractorApplications || [];
    const updatedEvent: Event = {
      ...event,
      contractorApplications: [...applications, application],
      updatedAt: new Date().toISOString(),
    };
    
    this.events.set(eventId, updatedEvent);
    return updatedEvent;
  }

  async updateContractorApplications(eventId: string, applications: ContractorApplication[]): Promise<Event | null> {
    const event = this.events.get(eventId);
    if (!event) return null;
    
    const updatedEvent: Event = {
      ...event,
      contractorApplications: applications,
      updatedAt: new Date().toISOString(),
    };
    
    this.events.set(eventId, updatedEvent);
    return updatedEvent;
  }

  // Cancellation Methods
  async cancelEvent(eventId: string, cancelledBy: string, cancelledByRole: 'host' | 'business_owner' | 'contractor', reason: string): Promise<{ cancellation: EventCancellation; penalties: any }> {
    const event = this.events.get(eventId);
    if (!event) throw new Error('Event not found');
    
    const eventDateTime = new Date(`${event.date} ${event.time}`);
    const cancellationTime = new Date();
    const hoursNotice = Math.floor((eventDateTime.getTime() - cancellationTime.getTime()) / (1000 * 60 * 60));
    
    const cancellation: EventCancellation = {
      id: Math.random().toString(36).substr(2, 9),
      eventId,
      cancelledBy,
      cancelledByRole,
      reason,
      cancellationTime,
      eventTime: eventDateTime,
      hoursNotice,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let penalties: any = {};

    // Apply cancellation rules
    if (hoursNotice < 24) {
      if (cancelledByRole === 'host') {
        cancellation.automaticRating = 1;
        penalties.automaticRating = true;
      } else if (cancelledByRole === 'business_owner') {
        const compensationAmount = (event.contractorPay + (event.hostSupervisionFee || 0)) * 0.1;
        cancellation.compensationAmount = compensationAmount;
        penalties.compensationAmount = compensationAmount;
      }
    }

    this.cancellations.push(cancellation);
    await this.updateCancellationStats(cancelledBy, cancelledByRole);
    
    // Update event status
    await this.update(eventId, { 
      status: 'cancelled',
      cancellation 
    });

    return { cancellation, penalties };
  }

  async reportNoShow(eventId: string, contractorId: string, reportedBy: string): Promise<NoShowRecord> {
    const event = this.events.get(eventId);
    if (!event) throw new Error('Event not found');
    
    const record: NoShowRecord = {
      id: Math.random().toString(36).substr(2, 9),
      eventId,
      contractorId,
      eventTime: new Date(`${event.date} ${event.time}`),
      reportedBy,
      reportedAt: new Date(),
      status: 'reported',
    };
    
    this.noShowRecords.push(record);
    
    // Auto-suspend contractor for no-show
    await this.suspendUser(contractorId, 'contractor', 'No-show at event');
    
    return record;
  }

  async updateCancellationStats(userId: string, role: 'host' | 'business_owner' | 'contractor'): Promise<void> {
    let stats = this.cancellationStats.find(s => s.userId === userId);
    
    if (!stats) {
      stats = {
        userId,
        role,
        totalCancellations: 0,
        last24HourCancellations: 0,
        suspensionStatus: 'active',
      };
      this.cancellationStats.push(stats);
    }

    const userCancellations = this.cancellations.filter(c => c.cancelledBy === userId);
    stats.totalCancellations = userCancellations.length;
    
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    stats.last24HourCancellations = userCancellations.filter(
      c => c.cancellationTime > last24Hours
    ).length;

    // Auto-suspend if more than 3 cancellations
    if (stats.totalCancellations > 3 && stats.suspensionStatus === 'active') {
      stats.suspensionStatus = 'permanently_suspended';
      stats.suspensionReason = 'Exceeded maximum cancellation limit (3)';
      stats.suspensionDate = new Date();
      stats.appealEmail = 'appeals@revovend.com';
    }
  }

  async suspendUser(userId: string, role: 'host' | 'business_owner' | 'contractor', reason: string): Promise<void> {
    let stats = this.cancellationStats.find(s => s.userId === userId);
    
    if (!stats) {
      stats = {
        userId,
        role,
        totalCancellations: 0,
        last24HourCancellations: 0,
        suspensionStatus: 'active',
      };
      this.cancellationStats.push(stats);
    }

    stats.suspensionStatus = 'permanently_suspended';
    stats.suspensionReason = reason;
    stats.suspensionDate = new Date();
    stats.appealEmail = 'appeals@revovend.com';
  }

  async getCancellationStats(userId: string): Promise<CancellationStats | null> {
    return this.cancellationStats.find(s => s.userId === userId) || null;
  }

  async isUserSuspended(userId: string): Promise<boolean> {
    const stats = await this.getCancellationStats(userId);
    return stats?.suspensionStatus !== 'active';
  }

  async submitAppeal(cancellationId: string, appealReason: string): Promise<void> {
    const cancellation = this.cancellations.find(c => c.id === cancellationId);
    if (cancellation) {
      cancellation.status = 'appealed';
      cancellation.appealReason = appealReason;
      cancellation.appealSubmittedAt = new Date();
      cancellation.updatedAt = new Date();
    }
  }

  async cancelContractorEvent(eventId: string, contractorId: string, reason: string, proofFiles: string[] = []): Promise<{ cancellation: EventCancellation; penalties: any; suspended: boolean }> {
    const event = this.events.get(eventId);
    if (!event) throw new Error('Event not found');
    
    const eventDateTime = new Date(`${event.date} ${event.time}`);
    const cancellationTime = new Date();
    const hoursNotice = Math.floor((eventDateTime.getTime() - cancellationTime.getTime()) / (1000 * 60 * 60));
    
    const cancellation: EventCancellation = {
      id: Math.random().toString(36).substr(2, 9),
      eventId,
      cancelledBy: contractorId,
      cancelledByRole: 'contractor',
      reason,
      cancellationTime,
      eventTime: eventDateTime,
      hoursNotice,
      proofFiles,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let penalties: any = {};
    let suspended = false;

    // Contractor-specific cancellation rules
    if (hoursNotice < 12) {
      // Immediate suspension for cancellations within 12 hours
      suspended = true;
      await this.suspendUser(contractorId, 'contractor', 'Cancellation within 12 hours of event');
      cancellation.automaticRating = 1;
      penalties.automaticRating = true;
      penalties.paymentLoss = true;
    } else if (hoursNotice < 24) {
      // Penalties for cancellations within 24 hours
      cancellation.automaticRating = 1;
      penalties.automaticRating = true;
      penalties.paymentLoss = true;
    }

    this.cancellations.push(cancellation);
    await this.updateCancellationStats(contractorId, 'contractor');
    
    // Update event status and remove contractor
    const updatedSelectedContractors = event.selectedContractors?.filter(id => id !== contractorId) || [];
    await this.update(eventId, { 
      status: 'active', // Event continues without this contractor
      selectedContractors: updatedSelectedContractors,
      contractorsNeeded: event.contractorsNeeded + 1, // Increase needed contractors
      cancellation 
    });

    return { cancellation, penalties, suspended };
  }

  async getCancellationsByUser(userId: string): Promise<EventCancellation[]> {
    return this.cancellations.filter(c => c.cancelledBy === userId);
  }

  async getAllSuspendedUsers(): Promise<CancellationStats[]> {
    return this.cancellationStats.filter(s => s.suspensionStatus !== 'active');
  }

  async readAll(): Promise<Event[]> {
    return this.findAll();
  }
}

export const eventRepo = new EventRepository();