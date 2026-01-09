# Primer Payment Demo

A Next.js application for testing Primer SDK payment tokenization. This app allows you to generate `payment_method_token` for various payment methods that can be used with Primer's Payment API.

![Primer Payment Demo](docs/screenshot.png)

## Features

- **Multiple Payment Methods Support**
  - Credit/Debit Card (hosted input fields)
  - PayPal (native button)
  - Google Pay (native button)
  - Apple Pay (native button)
  - Klarna (Buy Now Pay Later)
  - Redirect-based methods (iDEAL, Sofort, Bancontact, etc.)

- **Client Token Input** - Paste your Primer client token to load available payment methods
- **Payment Method Token Output** - Get the token to use in your API requests
- **Copy to Clipboard** - Easy one-click copy functionality

## Prerequisites

- Node.js 18+
- Primer Sandbox Account ([Sign up here](https://dashboard.primer.io))
- API Key from Primer Dashboard

## Installation

```bash
# Clone the repository
git clone https://github.com/jonathan-purnomo/primer-fe.git
cd primer-fe

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Generate Client Token

First, create a client session via Primer API:

```bash
curl --location 'https://api.sandbox.primer.io/client-session' \
--header 'Content-Type: application/json' \
--header 'X-API-KEY: <your-api-key>' \
--header 'X-API-VERSION: 2.2' \
--data '{
  "orderId": "order-123",
  "currencyCode": "EUR",
  "amount": 1000,
  "order": {
    "lineItems": [{
      "itemId": "item-1",
      "amount": 1000,
      "quantity": 1,
      "description": "Test Item"
    }]
  }
}'
```

### 2. Load Payment Methods

1. Paste the `clientToken` from the API response into the app
2. Click "Load Payment Methods"
3. Available payment methods will appear based on your Primer Dashboard configuration

### 3. Complete Payment Flow

- **Card**: Fill in card details → Click "Get Payment Method Token"
- **PayPal**: Click PayPal button → Authenticate in popup
- **Klarna**: Click Klarna button → Complete Klarna flow
- **Redirect**: Click continue → Complete on provider page

### 4. Use the Token

Copy the generated `payment_method_token` and use it in your payment API:

```bash
curl --location 'https://api.sandbox.primer.io/payments' \
--header 'Content-Type: application/json' \
--header 'X-API-KEY: <your-api-key>' \
--header 'X-API-VERSION: 2.2' \
--data '{
  "orderId": "order-123",
  "currencyCode": "EUR",
  "amount": 1000,
  "paymentMethodToken": "<token-from-app>"
}'
```

## Test Credentials

### Card
| Field | Value |
|-------|-------|
| Card Number | `4111 1111 1111 1111` |
| Expiry | `03/30` |
| CVV | `123` |
| Cardholder | Any name |

### PayPal Sandbox
Use your PayPal Sandbox buyer account credentials.

## Configuration

Payment methods shown in the app depend on your Primer Dashboard configuration:

1. Go to [Primer Dashboard](https://sandbox-dashboard.primer.io) → Integrations
2. Click on your integration → Edit Merchant Account
3. Enable desired payment methods (Card, PayPal, Klarna, etc.)
4. Click "Finish" and wait 60 seconds
5. Generate a **new client token** to see the changes

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main page with client token input
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles + Primer input styles
└── components/
    └── PrimerCheckout.tsx  # Primer SDK integration component
```

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React Framework
- [Primer Web SDK](https://www.npmjs.com/package/@primer-io/checkout-web) - Payment SDK
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [TypeScript](https://www.typescriptlang.org/) - Type Safety

## API Reference

- [Primer API Docs](https://apiref.primer.io/)
- [Primer Web SDK Docs](https://primer.io/docs/sdks/web)
- [Client Session API](https://apiref.primer.io/reference/create_client_side_token_client_session_post)
- [Payments API](https://apiref.primer.io/reference/create_payment)

## License

MIT
