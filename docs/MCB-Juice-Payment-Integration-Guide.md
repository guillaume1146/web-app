# MCB Juice Payment Integration Guide for MediWyz

> **For:** MediWyz Development Team & Trainees
> **Last Updated:** March 2026
> **Status:** Pre-integration Planning

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites — What You Need Before Starting](#2-prerequisites--what-you-need-before-starting)
3. [Step 1: Company Registration & MCB Business Account](#3-step-1-company-registration--mcb-business-account)
4. [Step 2: Become an MCB Juice Merchant](#4-step-2-become-an-mcb-juice-merchant)
5. [Step 3: Register with Peach Payments (E-Commerce Integration)](#5-step-3-register-with-peach-payments-e-commerce-integration)
6. [Step 4: Technical Integration — Peach Payments API](#6-step-4-technical-integration--peach-payments-api)
7. [Step 5: Sandbox Testing](#7-step-5-sandbox-testing)
8. [Step 6: Go Live](#8-step-6-go-live)
9. [How Users Pay on MediWyz](#9-how-users-pay-on-mediwyz)
10. [Fees & Pricing](#10-fees--pricing)
11. [Locations to Visit in Mauritius](#11-locations-to-visit-in-mauritius)
12. [Contacts & Resources](#12-contacts--resources)
13. [FAQ](#13-faq)

---

## 1. Overview

### What is MCB Juice?

MCB Juice is the leading mobile payment solution in Mauritius, developed by Mauritius Commercial Bank (MCB). It has **over 420,000 subscribers** and processes **more than 7 million transactions monthly**. It allows users to make payments via:

- **QR Code scan** (in-store / physical)
- **Phone number entry** (online e-commerce)
- **Juice Tap (NFC)** — contactless payments via Visa

### How Will It Work on MediWyz?

When a patient books a consultation or pays for a service on MediWyz:

1. Patient selects "Pay with MCB Juice" at checkout
2. Patient enters their **8-digit phone number** linked to MCB Juice
3. Patient receives a **push notification** on their MCB Juice app
4. Patient **authenticates** using biometrics or Mobile PIN on the Juice app
5. Payment is confirmed instantly
6. MediWyz receives a webhook confirmation and marks the booking as paid

### Two Integration Paths

| Path | Use Case | Provider |
|------|----------|----------|
| **Path A: QR Code (In-Store)** | Physical reception desk, pharmacy counter | MCB directly (Juice Merchant) |
| **Path B: Online E-Commerce** | Website/app checkout for consultations, prescriptions | Peach Payments API (recommended for MediWyz) |

**We will use Path B (Peach Payments API)** for MediWyz since our platform is web-based.

---

## 2. Prerequisites — What You Need Before Starting

### Business Prerequisites

| Requirement | Details | Status |
|-------------|---------|--------|
| Registered company in Mauritius | Must have a valid Business Registration Number (BRN) | Needed |
| MCB Business Bank Account | Current account with MCB | Needed |
| Company incorporation documents | Certificate of Incorporation, Memorandum & Articles of Association | Needed |
| Valid ID of directors/signatories | National ID card or passport for each director | Needed |
| Company address proof | Utility bill or official document | Needed |
| Website/app live | MediWyz must be accessible at mediwyz.com | Done |

### Technical Prerequisites

| Requirement | Details | Status |
|-------------|---------|--------|
| HTTPS on website | SSL certificate on mediwyz.com | Done |
| Backend API endpoint | To receive payment webhooks | To build |
| Payment UI component | Checkout form on MediWyz | Exists (PaymentMethodForm) |

---

## 3. Step 1: Company Registration & MCB Business Account

### 3.1 — Register Your Company (if not already done)

If MediWyz does not yet have a Mauritius-registered company:

**Where:** Corporate and Business Registration Department (CBRD)
- **Address:** One Cathedral Square, Jules Koenig Street, Port Louis
- **Phone:** +230 202 0600
- **Email:** comd@govmu.org
- **Website:** https://companies.govmu.org
- **Online Portal (CBRIS):** https://portalmns.mu/cbris/

**How to register online (recommended — takes ~3 working days):**

1. Create an account on **CBRIS** (Companies and Business Registration Integrated System) at https://portalmns.mu/cbris/
2. Fill in the application forms:
   - **Form 1** — Application for incorporation of a company
   - **Form 7** — Consent of every director
   - **Form 8** — Consent of every secretary (if applicable)
   - **Form 9** — Consent of every shareholder
3. Upload required documents
4. Pay the registration fee online by credit card:
   - Up to 10 employees: **MUR 125**
   - 11-50 employees: **MUR 250**
   - 51-100 employees: **MUR 600**
   - Over 100 employees: **MUR 1,500**
5. Receive your **Certificate of Incorporation** and **Business Registration Number (BRN)**
6. Collect your electronic **Business Registration Card** (physical copy available at CBRD counter)

**Alternatively:** Submit documents in person at the CBRD office in Port Louis (generally takes half a day).

### 3.2 — Open an MCB SME Business Account

**Where to go:** Any MCB branch in Mauritius (see [Section 11](#11-locations-to-visit-in-mauritius))

**How to apply:**
- Online: https://app.mcb.mu/app/sme/onboarding/landing-page (20 minutes)
- Or visit any MCB branch in person

**Documents required:**

| Document | Details |
|----------|---------|
| Certificate of Incorporation | Certified true copy |
| Memorandum & Articles of Association (Constitution) | Certified true copy or signed confirmation from a Director |
| Business Registration Number (BRN) | From Registrar of Companies |
| Board Resolution | Original or certified copy authorising account opening, listing signatories and specimen signatures |
| National ID / Passport of each signatory | Certified true copies |
| Proof of registered address | Utility bill or official letter (less than 3 months old) |
| Bank reference letter | From another bank if company is older than 6 months |
| Declaration of Beneficial Ownership | Signed by directors/administrators |
| Self-Certification Form (F2064) | Signed by directors — provided by MCB |
| Business plan or description | Brief description of MediWyz and its services |

**Timeline:** Account up and running within **72 hours** after submitting complete documentation.

**What you get:**
- MUR Current Account (no service fee)
- Access to **MCB JuicePro** mobile banking app
- Business deposit card for ATM transactions
- Dedicated account officer (if turnover > MUR 3M)

### 3.3 — Do We Need an Appointment?

- **Online application:** No appointment needed — apply at https://app.mcb.mu
- **Branch visit:** No appointment needed but recommended to call ahead
- **For Relationship Manager meeting:** Request a callback via the MCB website or call the branch

---

## 4. Step 2: Become an MCB Juice Merchant

### 4.1 — Register as Juice Merchant

**For existing MCB customers:**

1. Go to: https://mcb.mu/sme/campaign/juice-merchant
2. Fill in the form:

| Field | What to enter |
|-------|---------------|
| Company Name | MediWyz Ltd (or your registered company name) |
| Business Area | Health & Medical |
| Contact Person | Your name |
| Email | Your business email |
| Phone Number | Your phone number |
| Location | Select your district in Mauritius |
| Data Protection Agreement | Accept |

3. Submit the form
4. MCB will contact you to finalize setup

**For non-MCB customers:**
- First complete Step 1 (open MCB business account)
- Or use the "Become a customer" link on the form page

### 4.2 — What Happens After Registration

1. A **merchant representative** from MCB will contact you
2. They will brief you on the service and provide an **agreement to sign**
3. MCB sets up your mobile phone for **payment acknowledgment** (SMS notifications)
4. You receive a **unique QR Code** and promotional materials
5. Download the **MCB JuicePro** app to manage transactions

### 4.3 — Do We Need to Visit MCB?

- **For QR Code merchant setup:** The representative may visit you OR you visit a branch
- **For e-commerce integration:** You also need to register with **Peach Payments** (next step)

---

## 5. Step 3: Register with Peach Payments (E-Commerce Integration)

Peach Payments is the **official payment gateway partner** for MCB Juice online payments. This is required for integrating MCB Juice into MediWyz's website/app checkout.

### 5.1 — Sign Up with Peach Payments

1. Go to: https://www.peachpayments.com/mcb-juice
2. Click "Get Started" or "Contact Sales"
3. Or email: **sales@peachpayments.com**

### 5.2 — Onboarding Documents (KYC)

Peach Payments requires the following for merchant onboarding:

| Document | Details |
|----------|---------|
| Business Registration Number (BRN) | Mauritius company registration |
| Certificate of Incorporation | Certified copy |
| Company directors' ID | National ID or passport copies |
| Bank account details | MCB business account confirmation |
| Website URL | https://mediwyz.com |
| Business description | Healthcare platform description |
| Expected monthly transaction volume | Estimated volume |
| Proof of address | Company registered address |

### 5.3 — Onboarding Timeline

| Step | Duration |
|------|----------|
| Submit application | Day 1 |
| KYC review | 3-5 business days |
| Sandbox credentials issued | After KYC approval |
| Integration & testing | 1-2 weeks (depends on developer) |
| Go-live approval | 1-3 business days after testing |

### 5.4 — What You Receive from Peach Payments

After approval, you get access to the **Peach Payments Dashboard** with:

- **Entity ID** — identifies your merchant account
- **Username** — API authentication
- **Password** — API authentication
- **Sandbox credentials** — for testing
- **Production credentials** — for live transactions

---

## 6. Step 4: Technical Integration — Peach Payments API

### 6.1 — API Endpoints

| Environment | Base URL |
|-------------|----------|
| **Sandbox (Testing)** | `https://testapi-v2.peachpayments.com` |
| **Production (Live)** | `https://api-v2.peachpayments.com` |

### 6.2 — Payment Flow for MCB Juice

```
Customer clicks "Pay with MCB Juice"
       │
       ▼
MediWyz frontend collects phone number (8 digits)
       │
       ▼
MediWyz backend calls Peach Payments API
  POST https://api-v2.peachpayments.com/payments
  {
    "authentication.entityId": "8ac7a4c8XXXXXXXXXXXXXXXXXXXXXXXX",
    "authentication.userId": "8ac7a4c8XXXXXXXXXXXXXXXXXXXXXXXX",
    "authentication.password": "XXXXXXXXXX",
    "merchantTransactionId": "MED-20260316-001",
    "amount": "500.00",
    "currency": "MUR",
    "paymentType": "DB",
    "paymentBrand": "MCBJUICE",
    "virtualAccount.accountId": "59XXXXXX",
    "shopperResultUrl": "https://mediwyz.com/payments/callback"
  }
       │
       ▼
API returns pending status (code: 000.200.000)
  + a redirect URL for the second factor page
       │
       ▼
MediWyz loads the second factor (waiting/OTP) page
       │
       ▼
Customer receives push notification on MCB Juice app
       │
       ▼
Customer authenticates (biometrics / Mobile PIN)
       │
       ▼
Peach Payments sends webhook to MediWyz
  POST /api/payments/webhook
  { "result": { "code": "000.000.000", ... } }
       │
       ▼
MediWyz marks booking/payment as confirmed
```

> **Note:** MCB Juice is an **asynchronous** payment method. The initial API response returns a pending status (`000.200.000`) with a URL that you must load/redirect the customer to. The payment completes when the customer authenticates on their Juice app. You receive the final result via webhook.

### 6.3 — Required API Parameters for MCB Juice

| Parameter | Required | Description |
|-----------|----------|-------------|
| `authentication.entityId` | Yes | 32-char hex string from Peach dashboard |
| `authentication.userId` | Yes | 32-char hex string from Peach dashboard |
| `authentication.password` | Yes | String credential from Peach dashboard |
| `merchantTransactionId` | Yes | Unique ID (8-16 alphanumeric chars), e.g. `MED-20260316-001` |
| `amount` | Yes | Payment amount in decimal format (e.g. `"500.00"`) |
| `currency` | Yes | `"MUR"` (Mauritian Rupee) |
| `paymentType` | Yes | `"DB"` (debit/charge) |
| `paymentBrand` | Yes | `"MCBJUICE"` |
| `virtualAccount.accountId` | Yes | Customer's **8-digit MCB Juice phone number** |
| `shopperResultUrl` | Yes | URL where customer is redirected after payment |

### 6.4 — API Authentication

Authentication credentials are sent **in the request body** (not as headers):

```json
{
  "authentication.entityId": "8ac7a4c8XXXXXXXXXXXXXXXXXXXXXXXX",
  "authentication.userId": "8ac7a4c8XXXXXXXXXXXXXXXXXXXXXXXX",
  "authentication.password": "XXXXXXXXXX"
}
```

You obtain these credentials from the **API keys** section of your Peach Payments Dashboard. You will have separate credentials for sandbox and production.

### 6.5 — Webhook (Payment Notification)

Set up a webhook endpoint on MediWyz to receive payment confirmations:

```
POST /api/payments/webhook
```

Peach Payments will POST the transaction result to this URL when payment is completed or fails. The webhook payload is **encrypted** and contains:

```json
{
  "id": "41a57893d4a44191be8cd410398464e6",
  "paymentBrand": "MCBJUICE",
  "paymentType": "DB",
  "amount": "500.00",
  "currency": "MUR",
  "merchantTransactionId": "MED-20260316-001",
  "result": {
    "code": "000.000.000",
    "description": "Transaction succeeded"
  },
  "timestamp": "2026-03-16T10:30:25.519Z"
}
```

**Key result codes:**
| Code | Meaning |
|------|---------|
| `000.000.000` | Transaction succeeded |
| `000.200.000` | Transaction pending (waiting for customer auth) |
| `100.380.501` | Consent expired (customer didn't authenticate in time) |
| `900.100.201` | General error |

> **Important:** Peach Payments uses a retry mechanism for webhooks. Always respond with HTTP 200 to acknowledge receipt. Transaction status can also be queried via GET (limited to 2 queries per minute per transaction).

### 6.6 — What to Build on MediWyz

| Component | Location | Description |
|-----------|----------|-------------|
| Payment API route | `app/api/payments/mcb-juice/route.ts` | Initiates payment via Peach Payments API |
| Webhook handler | `app/api/payments/webhook/route.ts` | Receives payment confirmation |
| Callback page | `app/payments/callback/page.tsx` | Shows payment success/failure to user |
| Checkout UI update | `components/shared/PaymentMethodForm.tsx` | Add MCB Juice phone number input |
| Payment status | Database | Store payment status in Prisma `BillingInfo` table |

---

## 7. Step 5: Sandbox Testing

### 7.1 — Enable Test Mode

Add this parameter to your API request body when testing:

```json
{
  "customParameters[enableTestMode]": "true"
}
```

This is required for the **Payments API** in sandbox. Not needed if testing via Checkout.

### 7.2 — Test Scenarios

| Scenario | Amount to Use | Expected Result Code |
|----------|---------------|---------------------|
| Consent expired | 1.25 | `100.380.501` |
| General error | 1.40 | `900.100.201` |

> **Important:** You **cannot test a successful end-to-end transaction** in sandbox. The sandbox only simulates error scenarios. For full success testing, you need to go live with small real amounts.

### 7.3 — Sandbox Dashboard

Access your test transactions at:
- **Sandbox Dashboard:** Peach Payments dashboard (sandbox mode)
- View all test API calls and responses
- Use the **API Playground** or **Postman Collection** provided by Peach Payments

---

## 8. Step 6: Go Live

### 8.1 — Checklist Before Going Live

- [ ] MCB business account is active
- [ ] MCB Juice Merchant registration is complete
- [ ] Peach Payments KYC approved
- [ ] Integration tested in sandbox
- [ ] Webhook endpoint is production-ready
- [ ] Error handling is implemented
- [ ] Payment confirmation emails/notifications work
- [ ] Refund flow is tested

### 8.2 — Switch to Production

1. Replace sandbox credentials with **production credentials** from Peach Payments dashboard
2. Change API base URL from `testapi-v2.peachpayments.com` to `api-v2.peachpayments.com`
3. Remove `customParameters[enableTestMode]` from requests
4. Do a small real transaction (e.g. MUR 10) to verify end-to-end
5. Monitor first few transactions in the Peach Payments dashboard

---

## 9. How Users Pay on MediWyz

### Patient Experience (Online Payment)

1. Patient books a consultation on MediWyz
2. At checkout, patient selects **"Pay with MCB Juice"**
3. Patient enters their **MCB Juice phone number** (8 digits, e.g. 5912XXXX)
4. Patient clicks **"Pay Now"**
5. Patient receives a **push notification** on the MCB Juice app on their phone
6. Patient opens the notification and **authenticates** with biometrics or PIN
7. Payment is **confirmed instantly**
8. MediWyz shows **"Payment Successful"** and confirms the booking

### Alternative: QR Code Payment (Future Enhancement)

For in-person payments (e.g. at a physical clinic):

1. MediWyz displays a **QR code** on screen
2. Patient opens MCB Juice app → **Scan to Pay**
3. Patient scans the QR code
4. Patient enters the amount and confirms
5. Payment is credited to the merchant instantly

---

## 10. Fees & Pricing

### MCB Juice Merchant Fees

| Item | Cost |
|------|------|
| Setup / installation | **FREE** (zero setup costs) |
| Equipment | **None needed** (no terminal required) |
| Transaction fee (current promo) | **FREE** until 30 June 2026 |
| Transaction fee (after promo) | Normal fees apply from 1 July 2026 |

### Peach Payments Processing Fees

| Package | Fee per Transaction |
|---------|-------------------|
| **SME Package** | 1.50% + MUR 3.50 per transaction |
| **Enterprise Package** | Volume-based pricing (contact Peach) |

### Example Calculation

For a MUR 1,500 consultation fee (after promo ends):
- Peach Payments fee: MUR 1,500 × 1.50% + MUR 3.50 = **MUR 26.00**
- MCB Juice merchant fee: TBD (after promo)
- Net received: ~MUR 1,474.00

---

## 11. Locations to Visit in Mauritius

### MCB Branches (for Business Account Opening)

You need to visit an MCB branch for:
- Opening a business account
- Signing the Juice Merchant agreement
- Providing original documents

**Key MCB branches:**

| Branch | Address | Phone |
|--------|---------|-------|
| MCB Head Office | 9-15 Sir William Newton Street, Port Louis | +230 202 5000 |
| MCB Ebène | Cybercity, Ebène | +230 202 5000 |
| MCB Curepipe | Royal Road, Curepipe | +230 202 5000 |
| MCB Quatre Bornes | St Jean Road, Quatre Bornes | +230 202 5000 |

**MCB Customer Service:** +230 202 6060
**Website:** https://mcb.mu

### Registrar of Companies (for BRN)

- **Address:** One Cathedral Square, Jules Koenig Street, Port Louis
- **Website:** companies.govmu.org

### No Physical Visit Needed For

- Peach Payments registration (fully online)
- MCB Juice Merchant form (online)
- Technical integration (API-based)

---

## 12. Contacts & Resources

### MCB Contacts

| Contact | Details |
|---------|---------|
| MCB General | +230 202 5000 |
| MCB Customer Service | +230 202 6060 |
| MCB Juice Merchant Page | https://mcb.mu/sme/campaign/juice-merchant |
| MCB E-Commerce Gateway | https://mcb.mu/corporate/payment-cash/collect/e-commerce |
| MCB Business Account | https://mcb.mu/sme/bank/business-account |
| MCB Online Application | https://app.mcb.mu/app/sme/onboarding/landing-page |

### Peach Payments Contacts

| Contact | Details |
|---------|---------|
| Sales | sales@peachpayments.com |
| MCB Juice Page | https://www.peachpayments.com/mcb-juice |
| Developer Docs | https://developer.peachpayments.com |
| API Reference | https://developer.peachpayments.com/reference/payment |
| Sandbox API | https://testapi-v2.peachpayments.com |
| Production API | https://api-v2.peachpayments.com |
| Mauritius Onboarding | https://support.peachpayments.com/support/solutions/articles/47001269013 |
| Onboarding Academy | https://peach-payments-academy-f06d.thinkific.com/courses/mauritius-onboarding |

### Alternative Payment Gateway (MIPS)

| Contact | Details |
|---------|---------|
| MIPS Website | https://www.mips.mu |
| MIPS also supports | MCB Juice, MyT Money, Blink, Pop |

---

## 13. FAQ

### Do we need an MCB bank account?
**Yes.** You must be an MCB customer to become a Juice Merchant. Funds are credited to your MCB business account.

### Do we need to visit the bank in person?
**Yes, at least once** — to open the business account and sign the merchant agreement. After that, everything is managed via the JuicePro app and Peach Payments dashboard.

### Can we use MCB Juice without Peach Payments?
**For QR code (in-store) payments:** Yes, MCB provides a QR code directly.
**For online/e-commerce payments:** No, you need Peach Payments (or MIPS) as the payment gateway.

### How long does the full setup take?
| Step | Duration |
|------|----------|
| Company registration via CBRIS (if needed) | 3 working days (online) or half a day (in person) |
| MCB business account | 3-5 days |
| MCB Juice Merchant registration | 1-3 days |
| Peach Payments onboarding | 3-7 days |
| Technical integration | 1-2 weeks |
| **Total (from scratch)** | **3-5 weeks** |

### Can customers pay without the MCB Juice app?
**No.** The customer must have the MCB Juice app installed on their phone and linked to their MCB account. This is the most popular banking app in Mauritius, so most MCB customers already have it.

### What about refunds?
Refunds can be processed through the Peach Payments API using the original transaction ID. Funds are returned to the customer's MCB Juice wallet.

### Is there a minimum/maximum transaction amount?
This is determined by MCB's policies. Typically:
- Minimum: MUR 1
- Maximum: Subject to customer's Juice wallet/account limits

---

## Summary of Next Steps (Action Items)

1. **Riana / Guillaume:** Initiate company incorporation if not done → Get BRN
2. **Riana / Guillaume:** Visit MCB branch → Open SME business account
3. **Guillaume:** Fill MCB Juice Merchant form online → https://mcb.mu/sme/campaign/juice-merchant
4. **Guillaume:** Contact Peach Payments sales → sales@peachpayments.com
5. **Guillaume:** Complete Peach Payments KYC with documents
6. **Trainee:** Receive sandbox credentials → Start API integration
7. **Trainee:** Build payment API routes, webhook handler, and checkout UI
8. **Trainee:** Test in sandbox environment
9. **Guillaume:** Approve go-live → Switch to production credentials
10. **Team:** Monitor first real transactions

---

*Sources:*
- *[CBRD — How to Register a Business](https://companies.govmu.org/Pages/Guidelines/How-to-register-a-business.aspx)*
- *[MCCI — Registration of Business](https://www.mcci.org/en/inside-mauritius/doing-business/start-a-business/registration-of-business/)*
- *[MCCI — Incorporation of Company](https://www.mcci.org/en/inside-mauritius/doing-business/start-a-business/incorporation-of-company/)*
- *[MCB Juice Merchant](https://mcb.mu/sme/campaign/juice-merchant)*
- *[MCB Online Payment Gateway](https://mcb.mu/corporate/payment-cash/collect/e-commerce/online-payment-gateway)*
- *[MCB Mobile Banking Corporate](https://mcb.mu/corporate/payment-cash/collect/mobile-banking)*
- *[MCB SME Business Account](https://mcb.mu/sme/bank/business-account)*
- *[Peach Payments Developer Docs](https://developer.peachpayments.com)*
- *[Peach Payments MCB Juice](https://www.peachpayments.com/mcb-juice)*
- *[MCB & Peach Payments Partnership](https://mcbgroup.com/news/article/ecommerce-partnership-with-peach-payments-for-mcb-juice)*
- *[MCB Gateway Integration Guide](https://mcb.gateway.mastercard.com/api/documentation/integrationGuidelines/gettingStarted/obtainTestAccount.html)*
- *[MIPS Mauritius](https://www.mips.mu)*
