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

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const BUSINESS_DIRECTORY_FILE = path.join(DATA_DIR, "business-directory.json");
const REVERSE_PROPOSALS_FILE = path.join(DATA_DIR, "reverse-proposals.json");

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

async function searchBusinessDirectory(query: string, location?: string): Promise<BusinessDirectoryEntry[]> {
  const entries = await readBusinessDirectory();
  const searchTerm = query.toLowerCase();
  
  return entries.filter(entry => {
    const matchesQuery = 
      entry.businessName.toLowerCase().includes(searchTerm) ||
      entry.ownerName.toLowerCase().includes(searchTerm) ||
      entry.businessType.toLowerCase().includes(searchTerm) ||
      entry.description.toLowerCase().includes(searchTerm);
    
    const matchesLocation = !location || entry.location.toLowerCase().includes(location.toLowerCase());
    
    return matchesQuery && matchesLocation;
  });
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

export const businessDirectoryRepo = {
  readBusinessDirectory,
  writeBusinessDirectory,
  readReverseProposals,
  writeReverseProposals,
  addBusinessToDirectory,
  searchBusinessDirectory,
  sendReverseProposal,
  updateReverseProposalStatus,
  getHostReverseProposals,
  getBusinessReverseProposals,
};