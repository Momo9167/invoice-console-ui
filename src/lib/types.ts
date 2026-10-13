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
  notes: string;
  void: boolean;
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
}

export type Status = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'overpaid' | 'void';
