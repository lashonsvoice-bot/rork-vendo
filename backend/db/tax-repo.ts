import { promises as fs } from "node:fs";
import path from "node:path";

export type TaxStatus = "pending" | "submitted" | "verified" | "rejected";
export type EntityType = "individual" | "sole_proprietor" | "partnership" | "c_corp" | "s_corp" | "llc" | "other";

export interface W9Information {
  id: string;
  contractorId: string;
  businessName?: string;
  individualName: string;
  federalTaxClassification: EntityType;
  otherEntityDescription?: string;
  payeeAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  accountNumbers?: string[];
  taxpayerIdNumber: string; // SSN or EIN
  isBackupWithholdingSubject: boolean;
  certificationDate: string;
  status: TaxStatus;
  submittedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  documentUrl?: string;
}

export interface PaymentRecord {
  id: string;
  contractorId: string;
  businessOwnerId: string;
  eventId?: string;
  amount: number;
  paymentDate: string;
  description: string;
  taxYear: number;
  isSubjectToBackupWithholding: boolean;
  backupWithholdingAmount?: number;
  createdAt: string;
}

export interface Tax1099Record {
  id: string;
  contractorId: string;
  businessOwnerId: string;
  taxYear: number;
  totalPayments: number;
  backupWithholding: number;
  status: "draft" | "generated" | "sent" | "filed";
  generatedAt?: string;
  sentAt?: string;
  filedAt?: string;
  formUrl?: string;
  paymentRecordIds: string[];
}

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const W9_FILE = path.join(DATA_DIR, "w9-forms.json");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");
const TAX1099_FILE = path.join(DATA_DIR, "tax-1099.json");

async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  
  const files = [W9_FILE, PAYMENTS_FILE, TAX1099_FILE];
  for (const file of files) {
    try {
      await fs.access(file);
    } catch {
      await fs.writeFile(file, JSON.stringify([]), "utf8");
    }
  }
}

async function readW9Forms(): Promise<W9Information[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(W9_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("tax-repo readW9Forms error", e);
    return [];
  }
}

async function writeW9Forms(forms: W9Information[]): Promise<void> {
  await ensureStorage();
  const tmp = W9_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(forms, null, 2), "utf8");
  await fs.rename(tmp, W9_FILE);
}

async function readPayments(): Promise<PaymentRecord[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(PAYMENTS_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("tax-repo readPayments error", e);
    return [];
  }
}

async function writePayments(payments: PaymentRecord[]): Promise<void> {
  await ensureStorage();
  const tmp = PAYMENTS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(payments, null, 2), "utf8");
  await fs.rename(tmp, PAYMENTS_FILE);
}

async function read1099Records(): Promise<Tax1099Record[]> {
  await ensureStorage();
  try {
    const raw = await fs.readFile(TAX1099_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("tax-repo read1099Records error", e);
    return [];
  }
}

async function write1099Records(records: Tax1099Record[]): Promise<void> {
  await ensureStorage();
  const tmp = TAX1099_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(records, null, 2), "utf8");
  await fs.rename(tmp, TAX1099_FILE);
}

// W-9 Form Operations
async function submitW9Form(form: Omit<W9Information, "id" | "submittedAt">): Promise<W9Information> {
  const forms = await readW9Forms();
  const newForm: W9Information = {
    ...form,
    id: Date.now().toString(),
    submittedAt: new Date().toISOString(),
  };
  
  const updated = [...forms, newForm];
  await writeW9Forms(updated);
  return newForm;
}

async function updateW9Status(id: string, status: TaxStatus, rejectionReason?: string): Promise<W9Information | null> {
  const forms = await readW9Forms();
  const index = forms.findIndex(f => f.id === id);
  
  if (index === -1) return null;
  
  const updated = {
    ...forms[index],
    status,
    rejectionReason,
    verifiedAt: status === "verified" ? new Date().toISOString() : forms[index].verifiedAt,
  };
  
  forms[index] = updated;
  await writeW9Forms(forms);
  return updated;
}

async function getW9ByContractor(contractorId: string): Promise<W9Information | null> {
  const forms = await readW9Forms();
  return forms.find(f => f.contractorId === contractorId) ?? null;
}

// Payment Operations
async function recordPayment(payment: Omit<PaymentRecord, "id" | "createdAt">): Promise<PaymentRecord> {
  const payments = await readPayments();
  const newPayment: PaymentRecord = {
    ...payment,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  
  const updated = [...payments, newPayment];
  await writePayments(updated);
  return newPayment;
}

async function getPaymentsByContractor(contractorId: string, taxYear?: number): Promise<PaymentRecord[]> {
  const payments = await readPayments();
  return payments.filter(p => {
    if (p.contractorId !== contractorId) return false;
    if (taxYear && p.taxYear !== taxYear) return false;
    return true;
  });
}

async function getPaymentsByBusinessOwner(businessOwnerId: string, taxYear?: number): Promise<PaymentRecord[]> {
  const payments = await readPayments();
  return payments.filter(p => {
    if (p.businessOwnerId !== businessOwnerId) return false;
    if (taxYear && p.taxYear !== taxYear) return false;
    return true;
  });
}

// 1099 Operations
async function generate1099Records(taxYear: number): Promise<Tax1099Record[]> {
  const payments = await readPayments();
  const w9Forms = await readW9Forms();
  
  // Group payments by contractor and business owner
  const paymentGroups = new Map<string, PaymentRecord[]>();
  
  payments
    .filter(p => p.taxYear === taxYear)
    .forEach(payment => {
      const key = `${payment.contractorId}-${payment.businessOwnerId}`;
      if (!paymentGroups.has(key)) {
        paymentGroups.set(key, []);
      }
      paymentGroups.get(key)!.push(payment);
    });
  
  const records: Tax1099Record[] = [];
  
  for (const [key, groupPayments] of paymentGroups) {
    const [contractorId, businessOwnerId] = key.split('-');
    const totalPayments = groupPayments.reduce((sum, p) => sum + p.amount, 0);
    
    // Only generate 1099 if total payments >= $600
    if (totalPayments >= 600) {
      const backupWithholding = groupPayments.reduce((sum, p) => sum + (p.backupWithholdingAmount || 0), 0);
      
      const record: Tax1099Record = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        contractorId,
        businessOwnerId,
        taxYear,
        totalPayments,
        backupWithholding,
        status: "draft",
        paymentRecordIds: groupPayments.map(p => p.id),
      };
      
      records.push(record);
    }
  }
  
  const existing1099s = await read1099Records();
  const updated = [...existing1099s, ...records];
  await write1099Records(updated);
  
  return records;
}

async function update1099Status(id: string, status: Tax1099Record['status'], url?: string): Promise<Tax1099Record | null> {
  const records = await read1099Records();
  const index = records.findIndex(r => r.id === id);
  
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  const updated = {
    ...records[index],
    status,
    formUrl: url || records[index].formUrl,
    generatedAt: status === "generated" ? now : records[index].generatedAt,
    sentAt: status === "sent" ? now : records[index].sentAt,
    filedAt: status === "filed" ? now : records[index].filedAt,
  };
  
  records[index] = updated;
  await write1099Records(records);
  return updated;
}

async function get1099sByBusinessOwner(businessOwnerId: string, taxYear?: number): Promise<Tax1099Record[]> {
  const records = await read1099Records();
  return records.filter(r => {
    if (r.businessOwnerId !== businessOwnerId) return false;
    if (taxYear && r.taxYear !== taxYear) return false;
    return true;
  });
}

export const taxRepo = {
  // W-9 Operations
  submitW9Form,
  updateW9Status,
  getW9ByContractor,
  readW9Forms,
  
  // Payment Operations
  recordPayment,
  getPaymentsByContractor,
  getPaymentsByBusinessOwner,
  readPayments,
  
  // 1099 Operations
  generate1099Records,
  update1099Status,
  get1099sByBusinessOwner,
  read1099Records,
};