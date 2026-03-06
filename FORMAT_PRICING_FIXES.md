# Format-Specific Pricing Implementation

## Overview
Fixed product format selection to show correct prices for physical, digital, and print-on-demand formats. Products can now be digital, physical, or both.

## Changes Made

### 1. Product Detail Page (`apps/web/src/app/product/[slug]/page.jsx`)

**Key Features:**
- `selectedFormat` state initialized from product.formats array
- Added `getFormatPrice()` function to return format-specific pricing
- Added `getFormatOriginalPrice()` function for discounts
- Dynamic price display updates when format changes
- Format buttons now show price: `Digital ₹300`, `Physical ₹500`
- Print-on-Demand option appears only when:
  - Current format is 'digital'
  - Product has `isPrintable: true`
- Price displays "₹0" for print-on-demand until backend pricing is set

**Format-Specific Pricing Logic:**
```javascript
const getFormatPrice = (format) => {
  if (format === 'digital') return product.digitalPrice || 0;
  if (format === 'print-on-demand') return product.printPrice || 0;
  if (format === 'physical') return product.price || 0;
  return 0;
};
```

**Supported Formats:**
- `physical` → Uses `product.price` and `product.originalPrice`
- `digital` → Uses `product.digitalPrice`
- `print-on-demand` → Uses `product.printPrice` (shows when `isPrintable: true`)

**Cart Submission:**
- Converts `print-on-demand` to `digital` format in cart request
- Adds `subFormat: 'print-on-demand'` to track in cart
- Digital products (including print-on-demand) reject duplicate additions

**UI Enhancements:**
- Format-specific info notes below Add to Cart button
- 📱 Digital: Download link immediately after purchase
- 🖨️ Print on Demand: Shipped within 5-7 business days
- 📦 Physical: Free shipping for orders above ₹500

### 2. Cart Model (`packages/database/src/models/Cart.js`)

**New Field Added:**
```javascript
subFormat: {
  type: String,
  enum: ['print-on-demand', null],
  default: null,
}
```

This tracks special variants of main formats.

### 3. Cart Controller (`services/transaction-service/src/controllers/cartController.js`)

**Updated addToCart Function:**
- Now checks `subFormat` when finding duplicate items
- Digital items (regardless of subFormat) still restricted to 1 copy
- Properly stores `subFormat: 'print-on-demand'` for tracking
- Validates that digital products cannot be added twice

**Logic Flow:**
```javascript
const existingIdx = cart.items.findIndex(
  (item) => item.product.toString() === productId 
    && item.format === format 
    && item.subFormat === subFormat
);
```

### 4. Cart Display Page (`apps/web/src/app/cart/page.jsx`)

**New Helper Function:**
```javascript
const getItemPrice = (item) => {
  if (item.format === 'digital') return item.product?.digitalPrice || 0;
  if (item.subFormat === 'print-on-demand') return item.product?.printPrice || 0;
  return item.product?.price || 0;
};
```

**Updates:**
- Calculates correct price based on format and subFormat
- Displays format correctly: "Digital (Print on Demand)" or "Physical"
- Total calculation uses format-specific prices
- Line item totals are correct for each format

## Product Schema Requirements

Products should have:
- `price` (physical format price)
- `originalPrice` (physical original price for discount)
- `digitalPrice` (digital format price)
- `isPrintable` (boolean, enables print-on-demand option)
- `printPrice` (price for print-on-demand when `isPrintable: true`)
- `formats` (array of 'physical', 'digital', or both)

## Example Product

```javascript
{
  title: "Programming Guide",
  price: 499,              // Physical price
  originalPrice: 699,      // Physical original
  digitalPrice: 199,       // Digital only
  isPrintable: true,       // Enable print-on-demand
  printPrice: 399,         // Print-on-demand price
  formats: ['physical', 'digital']
}
```

## Behavior

### New Product Flow
1. User clicks format button (shows prices)
2. Price updates dynamically based on selected format
3. Print-on-Demand option appears if digital is selected and `isPrintable: true`
4. User adds to cart with selected format
5. Cart shows correct price for that format

### Cart Restrictions
- Digital products: Can only add one copy (any subFormat)
- Physical products: Can add multiple quantities
- Duplicate digital purchases rejected with error message

### Display
- Cart shows format clearly: "Physical", "Digital", or "Digital (Print on Demand)"
- Prices match what was configured for that format
- Total calculation is accurate across mixed formats

## Testing Checklist

- [ ] Toggle between formats on product detail
- [ ] Price updates correctly for each format
- [ ] Print-on-Demand appears only for digital+isPrintable
- [ ] Adding digital product twice shows error
- [ ] Adding digital print-on-demand twice shows error
- [ ] Physical products can be added multiple times
- [ ] Cart shows correct prices for each format
- [ ] Cart total is calculated correctly
- [ ] Format names display properly in cart

## Notes

- Products don't need all formats (can be digital-only, physical-only, or both)
- Prices are independent per format (no automatic calculations)
- Print-on-Demand is a variant of digital format (occupies same cart slot if both added)
- Existing physical-only products work unchanged
