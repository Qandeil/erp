import * as XLSX from 'xlsx';
import { Product, Customer, Sale, Expense } from './types';

export function exportToExcel(data: {
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
}) {
  const wb = XLSX.utils.book_new();

  const productsData = data.products.map(p => ({
    Name: p.name,
    'Name (AR)': p.name_ar,
    SKU: p.sku ?? '',
    Barcode: p.barcode ?? '',
    'Cost Price': p.cost_price,
    'Sale Price': p.sale_price,
    'Stock Qty': p.stock_quantity,
    'Low Stock Alert': p.low_stock_threshold,
    Category: p.category,
    Unit: p.unit,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productsData), 'Inventory');

  const customersData = data.customers.map(c => ({
    Name: c.name,
    Phone: c.phone ?? '',
    Email: c.email ?? '',
    Address: c.address,
    'Total Debt': c.total_debt,
    Notes: c.notes,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customersData), 'Customers');

  const salesData = data.sales.map(s => ({
    'Invoice #': s.invoice_number,
    Customer: s.customer_name,
    'Payment Type': s.payment_type,
    'Total Amount': s.total_amount,
    'Paid Amount': s.paid_amount,
    Discount: s.discount,
    Status: s.status,
    Date: new Date(s.created_at).toLocaleDateString(),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), 'Sales');

  const expensesData = data.expenses.map(e => ({
    Title: e.title,
    Category: e.category,
    Amount: e.amount,
    Date: e.expense_date,
    Notes: e.notes,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesData), 'Expenses');

  XLSX.writeFile(wb, `ERP_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
