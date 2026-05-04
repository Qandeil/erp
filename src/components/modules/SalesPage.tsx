import { useEffect, useState, useRef } from 'react';
import {
  Search, Plus, Minus, Trash2, Printer, CheckCircle,
  ShoppingCart, User, Tag, ScanLine
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/logger';
import { Product, CartItem, Customer, Sale } from '../../lib/types';
import Modal from '../ui/Modal';

export default function SalesPage() {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentType, setPaymentType] = useState<'paid' | 'postpaid'>('paid');
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<Sale | null>(null);
  const [printModal, setPrintModal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).gt('stock_quantity', 0).then(({ data }) => setProducts(data ?? []));
    supabase.from('customers').select('*').eq('is_active', true).then(({ data }) => setCustomers(data ?? []));
  }, []);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.name_ar.includes(search) ||
    (p.barcode ?? '') === search
  );

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone ?? '').includes(customerSearch)
  );

  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === p.id);
      if (existing) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1, unit_price: p.sale_price }];
    });
    setSearch('');
    searchRef.current?.focus();
  }

  function updateQty(id: string, qty: number) {
    if (qty <= 0) setCart(prev => prev.filter(i => i.product.id !== id));
    else setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: qty } : i));
  }

  function updatePrice(id: string, price: number) {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, unit_price: price } : i));
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = subtotal - discount;
  const change = paymentType === 'paid' ? paidAmount - total : 0;

  async function checkout() {
    if (cart.length === 0) return;
    setSaving(true);
    const invoiceNumber = `INV-${Date.now()}`;
    const { data: sale, error } = await supabase.from('sales').insert({
      invoice_number: invoiceNumber,
      customer_id: selectedCustomer?.id ?? null,
      customer_name: selectedCustomer?.name ?? t('walkInCustomer'),
      payment_type: paymentType,
      total_amount: total,
      paid_amount: paymentType === 'paid' ? paidAmount : 0,
      discount,
      status: 'completed',
      notes,
      created_by: profile?.id,
    }).select().single();

    if (!error && sale) {
      // Insert items + decrement stock
      for (const item of cart) {
        await supabase.from('sale_items').insert({
          sale_id: sale.id,
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.product.cost_price,
          total_price: item.quantity * item.unit_price,
        });
        await supabase.from('products').update({
          stock_quantity: item.product.stock_quantity - item.quantity,
        }).eq('id', item.product.id);
      }

      // Update customer debt if postpaid
      if (paymentType === 'postpaid' && selectedCustomer) {
        await supabase.from('customers').update({
          total_debt: selectedCustomer.total_debt + total
        }).eq('id', selectedCustomer.id);
      }

      logActivity(profile!.id, profile!.full_name, 'created', 'sale', sale.id, { invoice: invoiceNumber, total });

      // Refresh products for stock
      const { data: freshProducts } = await supabase.from('products').select('*').eq('is_active', true).gt('stock_quantity', 0);
      setProducts(freshProducts ?? []);

      setLastInvoice(sale);
      setPrintModal(true);
      setCart([]);
      setDiscount(0);
      setPaidAmount(0);
      setNotes('');
      setSelectedCustomer(null);
      setPaymentType('paid');
    }
    setSaving(false);
  }

  function printReceipt() {
    window.print();
  }

  return (
    <div className={`flex gap-4 h-full ${isRTL ? 'flex-row-reverse' : ''}`} style={{ minHeight: 'calc(100vh - 130px)' }}>
      {/* Products panel */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <div className="relative">
          <ScanLine className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} strokeWidth={1.5} />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && filteredProducts.length === 1) addToCart(filteredProducts[0]); }}
            placeholder={t('searchProduct')}
            className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#714B67]/30 bg-white ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(search ? filteredProducts : products).slice(0, 30).map(p => (
            <button key={p.id} onClick={() => addToCart(p)}
              className="bg-white border border-gray-100 rounded-xl p-3 text-start hover:border-[#00A09D] hover:shadow-sm transition-all group">
              <div className="text-sm font-medium text-gray-800 group-hover:text-[#00A09D] truncate">
                {isRTL && p.name_ar ? p.name_ar : p.name}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{p.unit} · {p.stock_quantity} left</div>
              <div className="text-sm font-bold text-[#714B67] mt-1">{p.sale_price.toFixed(2)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cart header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-[#714B67]" strokeWidth={1.5} />
          <span className="font-semibold text-gray-800 text-sm">{t('cart')}</span>
          <span className="ms-auto bg-[#714B67] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cart.length}</span>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-300">
              <ShoppingCart className="w-8 h-8 mb-2" strokeWidth={1} />
              <p className="text-xs">{t('noData')}</p>
            </div>
          )}
          {cart.map(item => (
            <div key={item.product.id} className="bg-gray-50 rounded-xl p-2.5 space-y-1.5">
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-medium text-gray-700 flex-1 truncate">
                  {isRTL && item.product.name_ar ? item.product.name_ar : item.product.name}
                </span>
                <button onClick={() => updateQty(item.product.id, 0)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.product.id, item.quantity - 1)}
                  className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                  <Minus className="w-3 h-3" strokeWidth={2} />
                </button>
                <input type="number" value={item.quantity} min={1}
                  onChange={e => updateQty(item.product.id, parseInt(e.target.value) || 0)}
                  className="w-10 text-center text-xs font-semibold border border-gray-200 rounded-lg py-0.5 focus:outline-none" />
                <button onClick={() => updateQty(item.product.id, item.quantity + 1)}
                  className="w-6 h-6 rounded-lg bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                  <Plus className="w-3 h-3" strokeWidth={2} />
                </button>
                <input type="number" value={item.unit_price} step="0.01"
                  onChange={e => updatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                  className="flex-1 text-center text-xs font-semibold border border-gray-200 rounded-lg py-0.5 focus:outline-none" />
              </div>
              <div className="text-end text-xs font-bold text-[#714B67]">
                {(item.quantity * item.unit_price).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Customer */}
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          <div className="relative">
            <User className={`absolute top-2.5 ${isRTL ? 'right-2.5' : 'left-2.5'} w-3.5 h-3.5 text-gray-400`} strokeWidth={1.5} />
            <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
              placeholder={t('selectCustomer')}
              className={`w-full border border-gray-200 rounded-lg py-2 text-xs ${isRTL ? 'pr-7 pl-2' : 'pl-7 pr-2'} focus:outline-none focus:ring-1 focus:ring-[#714B67]/30`} />
          </div>
          {customerSearch && filteredCustomers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm max-h-28 overflow-y-auto">
              {filteredCustomers.map(c => (
                <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); }}
                  className="w-full text-start px-3 py-1.5 text-xs hover:bg-gray-50 border-b border-gray-50 last:border-0">
                  <div className="font-medium">{c.name}</div>
                  {c.total_debt > 0 && <div className="text-orange-500">Debt: {c.total_debt.toFixed(2)}</div>}
                </button>
              ))}
            </div>
          )}

          {/* Payment type */}
          <div className="flex gap-2">
            {(['paid', 'postpaid'] as const).map(pt => (
              <button key={pt} onClick={() => setPaymentType(pt)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${paymentType === pt ? 'bg-[#714B67] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {t(pt)}
              </button>
            ))}
          </div>

          {/* Discount + paid */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-0.5 block">{t('discount')}</label>
              <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
            </div>
            {paymentType === 'paid' && (
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-0.5 block">{t('paidAmount')}</label>
                <input type="number" value={paidAmount} onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs">
            <div className="flex justify-between text-gray-600"><span>{t('subtotal')}</span><span className="font-medium">{subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-red-500"><span>{t('discount')}</span><span>-{discount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-gray-800 font-bold text-sm pt-1 border-t border-gray-200">
              <span>{t('total')}</span><span>{total.toFixed(2)}</span>
            </div>
            {paymentType === 'paid' && paidAmount > 0 && (
              <div className={`flex justify-between font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                <span>Change</span><span>{change.toFixed(2)}</span>
              </div>
            )}
          </div>

          <button onClick={checkout} disabled={saving || cart.length === 0}
            className="w-full bg-[#00A09D] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#008f8c] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
            {saving ? t('loading') : t('confirmSale')}
          </button>
        </div>
      </div>

      {/* Print modal */}
      {printModal && lastInvoice && (
        <Modal title={t('invoice')} onClose={() => setPrintModal(false)} size="sm">
          <div id="receipt" className="font-mono text-xs space-y-1 text-center">
            <p className="text-base font-bold">ERP Pro</p>
            <p className="text-gray-500">{new Date(lastInvoice.created_at).toLocaleString()}</p>
            <p className="font-semibold">{lastInvoice.invoice_number}</p>
            <div className="border-t border-dashed border-gray-300 my-2" />
            <p className="text-start font-medium">{t('customer')}: {lastInvoice.customer_name}</p>
            <div className="border-t border-dashed border-gray-300 my-2" />
            <div className="flex justify-between font-bold">
              <span>{t('total')}</span>
              <span>{lastInvoice.total_amount.toFixed(2)}</span>
            </div>
            <div className="border-t border-dashed border-gray-300 my-2" />
            <p className="text-gray-400">Thank you!</p>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setPrintModal(false)}
              className="flex-1 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50">{t('close')}</button>
            <button onClick={printReceipt}
              className="flex-1 py-2 text-sm bg-[#714B67] text-white rounded-xl hover:bg-[#8a5d7e] flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" strokeWidth={1.5} />{t('printReceipt')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
