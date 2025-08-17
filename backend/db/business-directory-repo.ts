import { promises as fs } from "node:fs";
import path from "node:path";

export interface BusinessDirectoryEntry {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  description: string;
  website?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  zipCode?: string;
  state?: string;
  city?: string;
  isVerified: boolean;
  isRevoVendMember: boolean;
  addedBy: string; // host ID who added them
  addedAt: string;
  invitationsSent: number;
  signupConversions: number;
}

export interface ReverseProposal {
  id: string;
  hostId: string;
  businessId: string;
  eventId: string;
  invitationCost: number; // $1 per invitation
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  sentAt: string;
  viewedAt?: string;
  respondedAt?: string;
  emailSent: boolean;
  smsSent: boolean;
  isNewSignup?: boolean;
  conversionReward?: number; // $10 for new signups
}

export interface ExternalProposal {
  id: string;
  businessOwnerId: string;
  businessOwnerName: string;
  businessName: string;
  businessOwnerContactEmail?: string;
  eventId: string;
  eventTitle: string;
  hostName: string;
  hostEmail?: string;
  hostPhone?: string;
  proposedAmount: number;
  contractorsNeeded: number;
  message: string;
  eventDate: string;
  eventLocation: string;
  status: 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  emailSent: boolean;
  smsSent: boolean;
  invitationCode: string; // Unique code for host to connect
  isExternal: boolean;
  hostConnectedAt?: string; // When host signs up and uses the code
  connectedHostId?: string; // ID of the host who connected using the code
  // For reverse proposals (host inviting business owner)
  isReverseProposal?: boolean;
  hostId?: string; // ID of the host who sent the reverse proposal
  hostContactEmail?: string; // Host's contact email for reverse proposals
  tableSpaceOffered?: string;
  managementFee?: number;
  expectedAttendees?: string; // Expected number of attendees for reverse proposals
  connectedBusinessOwnerId?: string; // ID of the business owner who connected using the code
  businessOwnerConnectedAt?: string; // When business owner signs up and uses the code
}

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const BUSINESS_DIRECTORY_FILE = path.join(DATA_DIR, "business-directory.json");
const REVERSE_PROPOSALS_FILE = path.join(DATA_DIR, "reverse-proposals.json");
const EXTERNAL_PROPOSALS_FILE = path.join(DATA_DIR, "external-proposals.json");

async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(BUSINESS_DIRECTORY_FILE);
  } catch {
    await fs.writeFile(BUSINESS_DIRECTORY_FILE, JSON.stringify([]), "utf8");
  }
  try {
    await fs.access(REVERSE_PROPOSALS_FILE);
  } catch {
    await fs.writeFile(REVERSE_PROPOSALS_FILE, JSON.stringify([]), "utf8");
  }
  try {
    await fs.access(EXTERNAL_PROPOSALS_FILE);
  } catch {
    await fs.writeFile(EXTERNAL_PROPOSALS_FILE, JSON.stringify([]), "utf8");
  }
}

async function readBusinessDirectory(): Promise<BusinessDirectoryEntry[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(BUSINESS_DIRECTORY_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) {
      return data as BusinessDirectoryEntry[];
    }
    return [];
  } catch (e) {
    console.error("business-directory-repo readBusinessDirectory error", e);
    return [];
  }
}

async function writeBusinessDirectory(entries: BusinessDirectoryEntry[]): Promise<void> {
  await ensureStorage();
  const tmp = BUSINESS_DIRECTORY_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(entries, null, 2), "utf8");
  await fs.rename(tmp, BUSINESS_DIRECTORY_FILE);
}

async function readReverseProposals(): Promise<ReverseProposal[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(REVERSE_PROPOSALS_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) {
      return data as ReverseProposal[];
    }
    return [];
  } catch (e) {
    console.error("business-directory-repo readReverseProposals error", e);
    return [];
  }
}

async function writeReverseProposals(proposals: ReverseProposal[]): Promise<void> {
  await ensureStorage();
  const tmp = REVERSE_PROPOSALS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(proposals, null, 2), "utf8");
  await fs.rename(tmp, REVERSE_PROPOSALS_FILE);
}

async function addBusinessToDirectory(business: Omit<BusinessDirectoryEntry, 'id' | 'addedAt' | 'invitationsSent' | 'signupConversions'>): Promise<BusinessDirectoryEntry> {
  const entries = await readBusinessDirectory();
  
  // Check if business already exists
  const exists = entries.some(entry => 
    entry.email.toLowerCase() === business.email.toLowerCase() ||
    (entry.businessName.toLowerCase() === business.businessName.toLowerCase() && entry.location === business.location)
  );
  
  if (exists) {
    throw new Error("Business already exists in directory");
  }
  
  const newEntry: BusinessDirectoryEntry = {
    ...business,
    id: Date.now().toString(),
    addedAt: new Date().toISOString(),
    invitationsSent: 0,
    signupConversions: 0,
  };
  
  const updated = [...entries, newEntry];
  await writeBusinessDirectory(updated);
  return newEntry;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function searchBusinessDirectory(
  query: string, 
  location?: string, 
  userLat?: number, 
  userLon?: number, 
  maxDistance?: number
): Promise<BusinessDirectoryEntry[]> {
  const entries = await readBusinessDirectory();
  const searchTerm = query.toLowerCase();
  
  return entries.filter(entry => {
    const matchesQuery = 
      entry.businessName.toLowerCase().includes(searchTerm) ||
      entry.ownerName.toLowerCase().includes(searchTerm) ||
      entry.businessType.toLowerCase().includes(searchTerm) ||
      entry.description.toLowerCase().includes(searchTerm);
    
    const matchesLocation = !location || 
      entry.location.toLowerCase().includes(location.toLowerCase()) ||
      entry.zipCode?.toLowerCase().includes(location.toLowerCase()) ||
      entry.state?.toLowerCase().includes(location.toLowerCase()) ||
      entry.city?.toLowerCase().includes(location.toLowerCase());
    
    // Distance filtering
    let withinDistance = true;
    if (userLat && userLon && maxDistance && entry.latitude && entry.longitude) {
      const distance = calculateDistance(userLat, userLon, entry.latitude, entry.longitude);
      withinDistance = distance <= maxDistance;
    }
    
    return matchesQuery && matchesLocation && withinDistance;
  });
}

async function searchBusinessesByDistance(
  userLat: number, 
  userLon: number, 
  maxDistance: number,
  businessType?: string
): Promise<(BusinessDirectoryEntry & { distance: number })[]> {
  const entries = await readBusinessDirectory();
  
  const businessesWithDistance = entries
    .filter(entry => {
      if (!entry.latitude || !entry.longitude) return false;
      if (businessType && !entry.businessType.toLowerCase().includes(businessType.toLowerCase())) return false;
      return true;
    })
    .map(entry => {
      const distance = calculateDistance(userLat, userLon, entry.latitude!, entry.longitude!);
      return { ...entry, distance };
    })
    .filter(entry => entry.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
  
  return businessesWithDistance;
}

async function sendReverseProposal(proposal: Omit<ReverseProposal, 'id' | 'sentAt'>): Promise<ReverseProposal> {
  const proposals = await readReverseProposals();
  
  // Check if proposal already sent for this business/event combo
  const exists = proposals.some(p => 
    p.businessId === proposal.businessId && 
    p.eventId === proposal.eventId &&
    p.status !== 'expired'
  );
  
  if (exists) {
    throw new Error("Invitation already sent to this business for this event");
  }
  
  const newProposal: ReverseProposal = {
    ...proposal,
    id: Date.now().toString(),
    sentAt: new Date().toISOString(),
  };
  
  const updated = [...proposals, newProposal];
  await writeReverseProposals(updated);
  
  // Update invitation count for business
  const entries = await readBusinessDirectory();
  const updatedEntries = entries.map(entry => 
    entry.id === proposal.businessId 
      ? { ...entry, invitationsSent: entry.invitationsSent + 1 }
      : entry
  );
  await writeBusinessDirectory(updatedEntries);
  
  return newProposal;
}

async function updateReverseProposalStatus(proposalId: string, status: ReverseProposal['status'], isNewSignup?: boolean): Promise<ReverseProposal> {
  const proposals = await readReverseProposals();
  const proposalIndex = proposals.findIndex(p => p.id === proposalId);
  
  if (proposalIndex === -1) {
    throw new Error("Proposal not found");
  }
  
  const proposal = proposals[proposalIndex];
  const updatedProposal: ReverseProposal = {
    ...proposal,
    status,
    respondedAt: status !== 'sent' && status !== 'viewed' ? new Date().toISOString() : proposal.respondedAt,
    viewedAt: status === 'viewed' && !proposal.viewedAt ? new Date().toISOString() : proposal.viewedAt,
    isNewSignup,
    conversionReward: isNewSignup ? 10 : proposal.conversionReward,
  };
  
  proposals[proposalIndex] = updatedProposal;
  await writeReverseProposals(proposals);
  
  // Update conversion count if new signup
  if (isNewSignup) {
    const entries = await readBusinessDirectory();
    const updatedEntries = entries.map(entry => 
      entry.id === proposal.businessId 
        ? { ...entry, signupConversions: entry.signupConversions + 1 }
        : entry
    );
    await writeBusinessDirectory(updatedEntries);
  }
  
  return updatedProposal;
}

async function getHostReverseProposals(hostId: string): Promise<ReverseProposal[]> {
  const proposals = await readReverseProposals();
  return proposals.filter(p => p.hostId === hostId);
}

async function getBusinessReverseProposals(businessId: string): Promise<ReverseProposal[]> {
  const proposals = await readReverseProposals();
  return proposals.filter(p => p.businessId === businessId);
}

async function readExternalProposals(): Promise<ExternalProposal[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(EXTERNAL_PROPOSALS_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) {
      return data as ExternalProposal[];
    }
    return [];
  } catch (e) {
    console.error("business-directory-repo readExternalProposals error", e);
    return [];
  }
}

async function writeExternalProposals(proposals: ExternalProposal[]): Promise<void> {
  await ensureStorage();
  const tmp = EXTERNAL_PROPOSALS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(proposals, null, 2), "utf8");
  await fs.rename(tmp, EXTERNAL_PROPOSALS_FILE);
}

async function storeExternalProposal(proposal: any): Promise<ExternalProposal> {
  const proposals = await readExternalProposals();
  
  const externalProposal: ExternalProposal = {
    ...proposal,
    status: 'sent' as const,
  };
  
  const updated = [...proposals, externalProposal];
  await writeExternalProposals(updated);
  
  return externalProposal;
}

async function findExternalProposalByCode(invitationCode: string): Promise<ExternalProposal | null> {
  const proposals = await readExternalProposals();
  return proposals.find(p => p.invitationCode === invitationCode) || null;
}

async function connectHostToExternalProposal(invitationCode: string, hostId: string): Promise<ExternalProposal | null> {
  const proposals = await readExternalProposals();
  const proposalIndex = proposals.findIndex(p => p.invitationCode === invitationCode);
  
  if (proposalIndex === -1) {
    return null;
  }
  
  const proposal = proposals[proposalIndex];
  const updatedProposal: ExternalProposal = {
    ...proposal,
    connectedHostId: hostId,
    hostConnectedAt: new Date().toISOString(),
    status: 'viewed',
  };
  
  proposals[proposalIndex] = updatedProposal;
  await writeExternalProposals(proposals);
  
  return updatedProposal;
}

async function getExternalProposalsForHost(hostId: string): Promise<ExternalProposal[]> {
  const proposals = await readExternalProposals();
  return proposals.filter(p => p.connectedHostId === hostId);
}

async function getExternalProposalsForBusiness(businessOwnerId: string): Promise<ExternalProposal[]> {
  const proposals = await readExternalProposals();
  return proposals.filter(p => p.businessOwnerId === businessOwnerId);
}

async function connectBusinessOwnerToReverseProposal(invitationCode: string, businessOwnerId: string): Promise<ExternalProposal | null> {
  const proposals = await readExternalProposals();
  const proposalIndex = proposals.findIndex(p => p.invitationCode === invitationCode && p.isReverseProposal);
  
  if (proposalIndex === -1) {
    return null;
  }
  
  const proposal = proposals[proposalIndex];
  const updatedProposal: ExternalProposal = {
    ...proposal,
    connectedBusinessOwnerId: businessOwnerId,
    businessOwnerConnectedAt: new Date().toISOString(),
    status: 'viewed',
  };
  
  proposals[proposalIndex] = updatedProposal;
  await writeExternalProposals(proposals);
  
  return updatedProposal;
}

async function findReverseProposalByCode(invitationCode: string): Promise<ExternalProposal | null> {
  const proposals = await readExternalProposals();
  return proposals.find(p => p.invitationCode === invitationCode && p.isReverseProposal) || null;
}

async function getReverseProposalsForHost(hostId: string): Promise<ExternalProposal[]> {
  const proposals = await readExternalProposals();
  return proposals.filter(p => p.hostId === hostId && p.isReverseProposal);
}

async function getReverseProposalsForBusiness(businessOwnerId: string): Promise<ExternalProposal[]> {
  const proposals = await readExternalProposals();
  return proposals.filter(p => p.connectedBusinessOwnerId === businessOwnerId && p.isReverseProposal);
}

export const businessDirectoryRepo = {
  readBusinessDirectory,
  writeBusinessDirectory,
  readReverseProposals,
  writeReverseProposals,
  addBusinessToDirectory,
  searchBusinessDirectory,
  searchBusinessesByDistance,
  sendReverseProposal,
  updateReverseProposalStatus,
  getHostReverseProposals,
  getBusinessReverseProposals,
  // External proposal methods
  readExternalProposals,
  writeExternalProposals,
  storeExternalProposal,
  findExternalProposalByCode,
  connectHostToExternalProposal,
  getExternalProposalsForHost,
  getExternalProposalsForBusiness,
  // Reverse proposal methods
  connectBusinessOwnerToReverseProposal,
  findReverseProposalByCode,
  getReverseProposalsForHost,
  getReverseProposalsForBusiness,
};