import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import WhatsAppCheckout from './WhatsAppCheckout';
import { formatPKR } from '../utils/currencyUtils';

export default function CustomerCartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onRemoveItem,
  restaurant,
}) {
  if (!isOpen) return null;

  const [step, setStep] = useState('cart'); // 'cart' or 'checkout'
  const [orderCompleted, setOrderCompleted] = useState(false);

  const isFreeDelivery = restaurant?.delivery_mode === 'free';
  const isHiddenDelivery = restaurant?.delivery_mode === 'none';
  const deliveryFee = (isFreeDelivery || isHiddenDelivery) ? 0 : (Number(restaurant?.delivery_fee) || 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const finalTotal = subtotal + deliveryFee;

  const handleOrderPlaced = () => {
    setOrderCompleted(true);
  };

  const handleCloseAll = () => {
    setOrderCompleted(false);
    setStep('cart');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-slate-900 text-base">
                {step === 'checkout' ? 'WhatsApp Checkout' : 'Your Order'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} item(s) selected
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseAll}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {orderCompleted ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-700">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-heading font-extrabold text-slate-900">Order Sent to WhatsApp!</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-2 leading-relaxed">
              Your formatted order and delivery address were dispatched directly to <strong>{restaurant?.name}</strong>'s WhatsApp Business. The kitchen will confirm your preparation time!
            </p>
            <button
              onClick={handleCloseAll}
              className="mt-6 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Back to Menu
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
              <ShoppingBag className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-base font-bold text-slate-800">Your cart is empty</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Explore the delicious dishes on the menu and add items to place your direct order.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Browse Menu
            </button>
          </div>
        ) : step === 'checkout' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <WhatsAppCheckout
              cart={cart}
              restaurant={restaurant}
              onBack={() => setStep('cart')}
              onOrderPlaced={handleOrderPlaced}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Cart Items List */}
              <div className="space-y-3">
                {cart.map((cartItem, idx) => (
                  <div
                    key={cartItem.cartItemId || idx}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex-1 min-w-0">
                      {cartItem.item?.variants?.is_deal && (
                        <span className="inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 mb-1">
                          {cartItem.item.variants.badge || '🔥 DEAL'}
                        </span>
                      )}
                      <h4 className="text-sm font-heading font-bold text-slate-900 truncate">{cartItem.item.title}</h4>
                      {cartItem.item?.variants?.is_deal && cartItem.item.variants.deal_items && (
                        <p className="text-[11px] text-amber-800/80 font-medium truncate mt-0.5">
                          📦 {cartItem.item.variants.deal_items}
                        </p>
                      )}
                      {cartItem.choiceDetails && cartItem.choiceDetails.length > 0 && (
                        <div className="space-y-0.5 mt-1">
                          {cartItem.choiceDetails.map((detail, dIdx) => (
                            <p key={dIdx} className="text-[11px] text-slate-500 truncate">
                              ↳ {detail}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-xs font-mono font-bold text-emerald-700 mt-1.5">
                        {formatPKR(cartItem.unitPrice * cartItem.quantity)}
                      </p>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 px-2 py-1 rounded-xl shrink-0 shadow-2xs">
                      <button
                        onClick={() => onUpdateQty(idx, -1)}
                        className="p-1 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                        title="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs font-bold text-slate-800 w-4 text-center">
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQty(idx, 1)}
                        className="p-1 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                        title="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Summary & Proceed to Checkout */}
            <div className="pt-4 border-t border-slate-100 space-y-3 mt-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-800 font-bold">{formatPKR(subtotal)}</span>
                </div>
                {restaurant?.delivery_mode !== 'none' && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery</span>
                    <span className="font-mono font-semibold">
                      {isFreeDelivery ? 'Free' : formatPKR(deliveryFee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2.5 border-t border-slate-200">
                  <span>Total to Pay</span>
                  <span className="font-mono text-emerald-700">{formatPKR(finalTotal)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-between transition cursor-pointer"
              >
                <span>Proceed to WhatsApp Checkout</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
