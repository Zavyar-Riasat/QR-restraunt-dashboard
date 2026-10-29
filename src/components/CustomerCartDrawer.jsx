import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import DirectOrderCheckout from './DirectOrderCheckout';
import CustomerOrderTracker from './CustomerOrderTracker';
import ErrorBoundary from './ErrorBoundary';
import { formatPKR } from '../utils/currencyUtils';

export default function CustomerCartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  _onRemoveItem,
  restaurant,
  onCartClear,
  isDeliverableToCustomer = true,
  deliveryAreas = [],
}) {
  const [step, setStep] = useState('cart'); // 'cart' | 'checkout' | 'tracker'
  const [placedOrder, setPlacedOrder] = useState(null);

  if (!isOpen) return null;

  const primaryColor = restaurant?.primary_color || '#F26B1D';
  const isFreeDelivery = restaurant?.delivery_mode === 'free';
  const isHiddenDelivery = restaurant?.delivery_mode === 'none';
  const deliveryFee = (isFreeDelivery || isHiddenDelivery) ? 0 : (Number(restaurant?.delivery_fee) || 0);
  const subtotal = cart.reduce((sum, item) => {
    const price = item.unitPrice ?? item.finalItemPrice ?? item.item?.price ?? 0;
    return sum + price * (item.quantity || 1);
  }, 0);
  const finalTotal = subtotal + deliveryFee;

  const handleOrderPlaced = (newOrder) => {
    setPlacedOrder(newOrder);
    setStep('tracker');
    if (onCartClear) {
      onCartClear();
    }
  };

  const handleCloseAll = () => {
    setPlacedOrder(null);
    setStep('cart');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2B2118]/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border-l border-[#F0E4D7] h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#F0E4D7] flex items-center justify-between bg-[#FFF9F2] shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl bg-[#FFF1E6] border border-[#FCD8BF] flex items-center justify-center text-[#F26B1D]"
              style={{ color: primaryColor }}
            >
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-[#2B2118] text-base">
                {step === 'tracker'
                  ? 'Live Order Tracker'
                  : step === 'checkout'
                  ? 'Direct Kitchen Checkout'
                  : 'Your Order'}
              </h3>
              <p className="text-xs text-[#7A6A5C] font-medium">
                {step === 'tracker'
                  ? `Order #${placedOrder?.id}`
                  : `${cart.reduce((sum, item) => sum + item.quantity, 0)} item(s) selected`}
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseAll}
            className="p-1.5 rounded-full bg-white hover:bg-[#FFF1E6] text-[#7A6A5C] hover:text-[#2B2118] border border-[#F0E4D7] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {step === 'tracker' && placedOrder ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50">
            <ErrorBoundary>
              <CustomerOrderTracker
                order={placedOrder}
                restaurant={restaurant}
                onClose={handleCloseAll}
                onNewOrder={handleCloseAll}
              />
            </ErrorBoundary>
          </div>
        ) : step === 'checkout' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <DirectOrderCheckout
              cart={cart}
              restaurant={restaurant}
              isDeliverableToCustomer={isDeliverableToCustomer}
              deliveryAreas={deliveryAreas}
              onBack={() => setStep('cart')}
              onOrderPlaced={handleOrderPlaced}
            />
          </div>
        ) : cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#7A6A5C]">
            <div className="w-16 h-16 rounded-full bg-[#FFF9F2] border border-[#F0E4D7] flex items-center justify-center mb-3">
              <ShoppingBag className="w-8 h-8 text-[#9E8E81]" />
            </div>
            <p className="text-base font-bold text-[#2B2118]">Your cart is empty</p>
            <p className="text-xs text-[#7A6A5C] mt-1 max-w-xs">
              Explore the delicious dishes on the menu and add items to place your direct kitchen order.
            </p>
            <button
              onClick={onClose}
              style={{ backgroundColor: primaryColor }}
              className="mt-5 px-5 py-2.5 rounded-xl text-white font-bold text-xs transition cursor-pointer shadow-md hover:brightness-95"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Cart Items List */}
              <div className="space-y-3">
                {cart.map((cartItem, idx) => (
                  <div
                    key={cartItem.cartItemId || idx}
                    className="p-3.5 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex-1 min-w-0">
                      {cartItem.item?.variants?.is_deal && (
                        <span className="inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-lg bg-[#FEF3D9] text-[#B87000] border border-[#FCE1A8] mb-1">
                          {cartItem.item.variants.badge || '🔥 DEAL'}
                        </span>
                      )}
                      <h4 className="text-sm font-heading font-extrabold text-[#2B2118] truncate">{cartItem.item.title}</h4>
                      {cartItem.item?.variants?.is_deal && cartItem.item.variants.deal_items && (
                        <p className="text-[11px] text-[#B87000] font-medium truncate mt-0.5">
                          📦 {cartItem.item.variants.deal_items}
                        </p>
                      )}
                      {cartItem.choiceDetails && cartItem.choiceDetails.length > 0 && (
                        <div className="space-y-0.5 mt-1">
                          {cartItem.choiceDetails.map((detail, dIdx) => (
                            <p key={dIdx} className="text-[11px] text-[#7A6A5C] truncate">
                              ↳ {detail}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-xs font-mono font-bold text-[#F26B1D] mt-1.5" style={{ color: primaryColor }}>
                        {formatPKR(((cartItem.unitPrice ?? cartItem.finalItemPrice ?? cartItem.item?.price) || 0) * (cartItem.quantity || 1))}
                      </p>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-2 bg-white border border-[#F0E4D7] px-2 py-1 rounded-xl shrink-0 shadow-2xs">
                      <button
                        onClick={() => onUpdateQty(idx, -1)}
                        className="p-1 text-[#7A6A5C] hover:text-[#2B2118] transition cursor-pointer"
                        title="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs font-bold text-[#2B2118] w-4 text-center">
                        {cartItem.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQty(idx, 1)}
                        className="p-1 text-[#7A6A5C] hover:text-[#2B2118] transition cursor-pointer"
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
            <div className="pt-4 border-t border-[#F0E4D7] space-y-3 mt-6">
              <div className="p-4 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D7] space-y-2 text-xs">
                <div className="flex justify-between text-[#7A6A5C] font-medium">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#2B2118] font-bold">{formatPKR(subtotal)}</span>
                </div>
                {restaurant?.delivery_mode !== 'none' && (
                  <div className="flex justify-between text-[#7A6A5C]">
                    <span>Delivery</span>
                    <span className="font-mono font-semibold">
                      {isFreeDelivery ? 'Free' : formatPKR(deliveryFee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-[#2B2118] pt-2.5 border-t border-[#F0E4D7]">
                  <span>Total to Pay</span>
                  <span className="font-mono text-[#F26B1D]" style={{ color: primaryColor }}>{formatPKR(finalTotal)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('checkout')}
                style={{ backgroundColor: primaryColor }}
                className="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-md flex items-center justify-between transition cursor-pointer hover:brightness-95 active:scale-[0.99]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
