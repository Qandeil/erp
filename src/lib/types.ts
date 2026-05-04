export type Role = 'admin' | 'staff';
export type PaymentType = 'paid' | 'postpaid';
export type SaleStatus = 'completed' | 'pending' | 'cancelled';
export type Language = 'en' | 'ar';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  name_ar: string;
  sku: string | null;
  barcode: string | null;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  category: string;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Customer {
  id: string;
  name: string;
  name_ar: string;
  phone: string | null;
  email: string | null;
  address: string;
  total_debt: number;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Sale {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string;
  payment_type: PaymentType;
  total_amount: number;
  paid_amount: number;
  discount: number;
  status: SaleStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total_price: number;
  created_at: string;
}

export interface Expense {
  id: string;
  title: string;
  title_ar: string;
  category: string;
  amount: number;
  expense_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

// Petty Cash (العهدة)
export interface PettyCashShift {
  id: string;
  assigned_to: string | null;
  assigned_to_name: string;
  assigned_by: string | null;
  assigned_by_name: string;
  starting_cash: number;
  cash_sales: number;
  total_expenses: number;
  expected_cash: number;
  actual_cash: number | null;
  difference: number | null;
  status: 'open' | 'settled';
  shift_date: string;
  opened_at: string;
  settled_at: string | null;
  notes: string;
}

export interface PettyCashExpense {
  id: string;
  shift_id: string;
  title: string;
  amount: number;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
}

// Debt payments
export interface DebtPayment {
  id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  notes: string;
  created_by: string | null;
  created_at: string;
}
