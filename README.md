# Wizklub Payment Dashboard

Next.js app for checking payment table data by admission number and verifying a transaction ID.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API configuration

Create `.env.local` from `.env.example`:

```bash
PAYMENT_LOOKUP_API_URL=https://api.srichaitanyaschool.net/v3/grievance-api/get-book-payments
TRANSACTION_VERIFY_API_URL=https://srichaitanyaschool.net/book-kits-payments/check-book-sales-payment-razorpay
```

`PAYMENT_LOOKUP_API_URL` is called as a `GET` request with `?admission_no=VALUE`.

`TRANSACTION_VERIFY_API_URL` is called as a `GET` request with `?transaction_id=VALUE`.

If `TRANSACTION_VERIFY_API_URL` is not set, the app uses the Sri Chaitanya Razorpay check URL by default.
