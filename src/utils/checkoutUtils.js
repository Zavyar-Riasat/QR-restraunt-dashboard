import { orderService } from '../services/orderService.js';

/**
 * Validates Pakistani mobile phone format:
 * Accepts:
 * - 03001234567, 0300-1234567, 0300 1234567
 * - +923001234567, 923001234567
 */
export const validatePakistaniPhone = (phoneInput) => {
  if (!phoneInput) {
    return { isValid: false, normalized: '', error: 'Phone number is required.' };
  }

  const clean = String(phoneInput).trim().replace(/[\s\-\(\)]/g, '');

  // 1. Format: +923XXXXXXXXX (13 chars) or 923XXXXXXXXX (12 chars)
  if (/^(\+?92)3\d{9}$/.test(clean)) {
    const raw10 = clean.replace(/^\+?92/, '');
    return {
      isValid: true,
      normalized: `0${raw10}`,
      display: `0${raw10.slice(0, 3)} ${raw10.slice(3)}`,
    };
  }

  // 2. Format: 03XXXXXXXXX (11 chars)
  if (/^03\d{9}$/.test(clean)) {
    return {
      isValid: true,
      normalized: clean,
      display: `${clean.slice(0, 4)} ${clean.slice(4)}`,
    };
  }

  // 3. Format: 3XXXXXXXXX (10 chars, missing leading 0)
  if (/^3\d{9}$/.test(clean)) {
    return {
      isValid: true,
      normalized: `0${clean}`,
      display: `0${clean.slice(0, 3)} ${clean.slice(3)}`,
    };
  }

  return {
    isValid: false,
    normalized: clean,
    error: 'Enter a valid Pakistani mobile number (e.g. 0300 1234567).',
  };
};

/**
 * Core utility function to calculate totals, validate input, and place order directly inside the app
 * Direct in-app kitchen order.
 */
export const handleDirectOrderCheckout = async ({
  cart,
  restaurant,
  customerDetails,
}) => {
  if (!cart || cart.length === 0) {
    throw new Error('Your cart is empty.');
  }

  // Check if kitchen is open
  if (restaurant?.is_open === false) {
    throw new Error('This kitchen is currently paused for orders. Please check back shortly!');
  }

  const orderType = customerDetails?.orderType || 'delivery';

  // Validate Name (optional fallback for dine-in if not provided)
  const customerName = (customerDetails?.name || '').trim();
  if (!customerName && orderType !== 'dine_in') {
    throw new Error('Please enter your full name.');
  }

  // Validate Phone (Required for delivery & takeaway, optional for dine-in)
  let normalizedPhone = '';
  const rawPhone = String(customerDetails?.phone || '').trim();
  if (rawPhone) {
    const phoneValidation = validatePakistaniPhone(rawPhone);
    if (!phoneValidation.isValid && orderType !== 'dine_in') {
      throw new Error(phoneValidation.error || 'Please enter a valid phone number.');
    }
    normalizedPhone = phoneValidation.isValid ? phoneValidation.normalized : rawPhone;
  } else if (orderType !== 'dine_in') {
    throw new Error('Please enter a valid phone number.');
  }

  // Validate Table if Dine-in
  if (orderType === 'dine_in') {
    if (!customerDetails?.tableNumber || !String(customerDetails.tableNumber).trim()) {
      throw new Error('Please enter your dine-in table number.');
    }
  }

  // Validate Delivery Address
  if (orderType === 'delivery') {
    if (!customerDetails?.address || !customerDetails.address.trim()) {
      throw new Error('Please enter your complete delivery address (House / Street / Area).');
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Delivery fee calculation based on manager's delivery_mode and orderType
  const isFreeDelivery = restaurant?.delivery_mode === 'free';
  const isHiddenDelivery = restaurant?.delivery_mode === 'none';
  let deliveryFee = 0;

  if (orderType === 'delivery') {
    deliveryFee = (isFreeDelivery || isHiddenDelivery) ? 0 : (Number(restaurant?.delivery_fee) || 0);

    // Check minimum order amount if enabled (only applies to delivery)
    const checkMinOrder = restaurant?.show_min_order !== false;
    const minOrder = checkMinOrder ? (Number(restaurant?.min_order_amount) || 0) : 0;
    if (minOrder > 0 && subtotal < minOrder) {
      throw new Error(
        `Minimum order amount for delivery is Rs. ${minOrder.toLocaleString('en-PK')}. Please add Rs. ${(minOrder - subtotal).toLocaleString('en-PK')} more.`
      );
    }
  }

  const finalTotal = subtotal + deliveryFee;
  const orderId = `DB-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create order directly in the app
  const newOrder = await orderService.createOrder({
    restaurant,
    customerDetails: {
      ...customerDetails,
      name: customerName || (orderType === 'dine_in' ? `Table ${customerDetails.tableNumber}` : 'Guest Customer'),
      phone: normalizedPhone,
      orderType,
    },
    cart,
    subtotal,
    deliveryFee,
    finalTotal,
    orderId,
  });

  return { success: true, order: newOrder };
};
