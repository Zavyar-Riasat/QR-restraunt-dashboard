import { orderService } from '../services/orderService';

/**
 * Core utility function to calculate totals, format order string, log order, and trigger WhatsApp redirect
 */
export const handleWhatsAppCheckout = ({
  cart,
  restaurant,
  customerDetails,
}) => {
  if (!cart || cart.length === 0) {
    alert('Your cart is empty.');
    return false;
  }

  // Check if kitchen is open
  if (restaurant?.is_open === false) {
    alert('This kitchen is currently paused for direct orders. Please check back shortly!');
    return false;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Check minimum order amount if enabled
  const checkMinOrder = restaurant?.show_min_order !== false;
  const minOrder = checkMinOrder ? (Number(restaurant?.min_order_amount) || 0) : 0;
  if (minOrder > 0 && subtotal < minOrder) {
    alert(`Minimum order amount for delivery is Rs. ${minOrder.toLocaleString('en-PK')}. Please add Rs. ${(minOrder - subtotal).toLocaleString('en-PK')} more.`);
    return false;
  }

  // Delivery fee calculation based on manager's delivery_mode
  const isFreeDelivery = restaurant?.delivery_mode === 'free';
  const isHiddenDelivery = restaurant?.delivery_mode === 'none';
  const deliveryFee = (isFreeDelivery || isHiddenDelivery) ? 0 : (Number(restaurant?.delivery_fee) || 0);
  const finalTotal = subtotal + deliveryFee;

  const cleanPhone = (restaurant?.whatsapp_number || '').replace(/\D/g, '');
  if (!cleanPhone) {
    alert('Restaurant WhatsApp number is not configured properly.');
    return false;
  }

  const orderTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const orderId = `DB-${Math.floor(1000 + Math.random() * 9000)}`;

  let message = `*🔔 NEW DIRECT ORDER [${orderId}]*\n`;
  message += `*Restaurant:* ${restaurant?.name || 'Kitchen'}\n`;
  message += `*Time:* ${orderTime}\n`;
  message += `------------------------------------\n`;
  message += `👤 *CUSTOMER DETAILS:*\n`;
  message += `• *Name:* ${customerDetails.name?.trim()}\n`;
  if (customerDetails.phone && customerDetails.phone.trim()) {
    message += `• *Phone:* ${customerDetails.phone.trim()}\n`;
  }
  message += `• *Address:* ${customerDetails.address?.trim()}\n`;
  if (customerDetails.notes && customerDetails.notes.trim()) {
    message += `• *Special Notes:* ${customerDetails.notes.trim()}\n`;
  }
  message += `------------------------------------\n`;
  message += `📦 *ORDER ITEMS:*\n`;

  cart.forEach((cartItem, index) => {
    const itemTotal = Number(cartItem.unitPrice * cartItem.quantity).toLocaleString('en-PK');
    const deal = cartItem.item?.variants?.is_deal ? cartItem.item.variants : null;
    const dealBadge = deal?.badge || (deal ? '🔥 SPECIAL DEAL' : '');

    message += `${index + 1}. *${cartItem.quantity}x ${cartItem.item.title}* ${dealBadge ? `[${dealBadge}] ` : ''}— Rs. ${itemTotal}\n`;

    if (deal && deal.deal_items) {
      message += `   📦 _Bundle: ${deal.deal_items}_\n`;
    }

    if (cartItem.choiceDetails && cartItem.choiceDetails.length > 0) {
      cartItem.choiceDetails.forEach((choice) => {
        message += `   ↳ _${choice}_\n`;
      });
    }
  });

  message += `------------------------------------\n`;
  message += `💵 *PAYMENT SUMMARY:*\n`;
  message += `• Subtotal: Rs. ${Number(subtotal).toLocaleString('en-PK')}\n`;
  if (isFreeDelivery) {
    message += `• Delivery: FREE\n`;
  } else if (deliveryFee > 0) {
    message += `• Delivery Fee: Rs. ${Number(deliveryFee).toLocaleString('en-PK')}\n`;
  }
  message += `• *TOTAL PAYABLE: Rs. ${Number(finalTotal).toLocaleString('en-PK')}*\n`;
  message += `------------------------------------\n`;
  message += `🚀 _Ordered directly via Zero-Commission Web Menu_`;

  // Log order to orderService
  try {
    orderService.createOrder({
      restaurant,
      customerDetails,
      cart,
      subtotal,
      deliveryFee,
      finalTotal,
      orderId,
    });
  } catch (err) {
    console.warn('Failed to log order to orderService:', err);
  }

  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  window.open(whatsappUrl, '_blank');
  return true;
};
