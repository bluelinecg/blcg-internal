export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

export type ExpenseCategory =
  | 'software'
  | 'contractors'
  | 'marketing'
  | 'equipment'
  | 'travel'
  | 'office'
  | 'other';

export type PaymentMethod = 'ach' | 'check' | 'credit_card';

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  subDescription?: string;   // optional detail line beneath main description
  quantity?: number;         // null for flat-fee lines
  unitPrice?: number;        // null for flat-fee lines
  total: number;
  isIncluded: boolean;       // true = included in package, shown as $0
  sortOrder: number;
}

export interface Invoice {
  id: string;
  clientId: string;
  projectId?: string;
  proposalId?: string;       // Agreement # reference (BL-YYYY-NNN)
  invoiceNumber: string;     // BL-YYYY-NNN
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  depositAmount?: number;
  balanceDue?: number;
  paymentTerms: string;      // default 'Net 15'
  paymentMethod?: PaymentMethod;
  dueDate: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  projectId?: string;
  vendor?: string;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
