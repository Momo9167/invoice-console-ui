export type DocType = 'quotation' | 'invoice';
export type Lang = 'en' | 'my';

export interface Settings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  invoicePrefix: string;
  quotationPrefix: string;
  invoiceStart: number | string;
  quotationStart: number | string;
  footer: string;
  footerMy: string;
  uiLang: Lang;
  docLang: Lang;
}

export interface LineItem {
  description: string;
  serials: string[];
  qty: number | string;
  unit: string;
  price: number | string;
  discount: number | string;
  productId?: string;
}

export interface PaymentDTO {
  id: string;
  number: string;
  date: string;
  amount: string;
  method: string;
  reference: string;
  note: string;
}

export interface DocDTO {
  id?: string;
  type: DocType;
  number: string;
  date: string;
  dueDate: string;
  ref: string;
  customer: { name: string; phone: string; address: string };
  customerId: string | null;
  items: LineItem[];
  deliveryFee: string;
  serviceCharge: string;
  serviceDiscount: string;
  notes: string;
  void: boolean;
  locationId: string | null; // invoices take stock out of this location
  payments: PaymentDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerDTO {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface ProductDTO {
  id: string;
  code: string;
  name: string;
  unit: string;
  price: string;
  serialTracked: boolean;
}

export interface LocationDTO { id: string; name: string; sort: number; active: boolean }
export interface UserDTO { id: string; name: string; username: string; active?: boolean }

export type TransferStatus = 'pending' | 'delivering' | 'received' | 'cancelled';

export interface PurchaseItemDTO { id?: string; productId: string; qty: number | string; unitCost: number | string; serials: string[] }
export interface PurchaseDTO {
  id?: string; number: string; date: string; supplier: string; orderRef: string; locationId: string;
  status: 'ordered' | 'cancelled'; notes: string; items: PurchaseItemDTO[];
  createdBy?: string; cancelledBy?: string; cancelledAt?: string | null; createdAt?: string;
  transfers?: { id: string; number: string; status: TransferStatus; toId: string }[];
}

export interface TransferItemDTO { id?: string; productId: string; qty: number | string; serials: string[]; receivedQty?: number | null; receivedSerials?: string[] | null }
export interface TransferDTO {
  id?: string; number: string; date: string; fromId: string; toId: string; status: TransferStatus; notes: string;
  purchaseOrderId?: string | null; previousId?: string | null; items: TransferItemDTO[];
  createdBy?: string; sentBy?: string; sentAt?: string | null; receivedBy?: string; receivedAt?: string | null;
  cancelledBy?: string; cancelledAt?: string | null; createdAt?: string;
}

export interface StockRow {
  id: string; code: string; name: string; unit: string; serialTracked: boolean; avgCost: number;
  byLocation: Record<string, number>; inTransit: Record<string, number>; total: number; transit: number;
}

export type Status = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'overpaid' | 'void';
