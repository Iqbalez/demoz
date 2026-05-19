# Payment Provider API Documentation Research

This document summarizes the technical details for integrating Ethiopian payment providers for single and bulk disbursements.

## 1. Chapa (Unified Payment Gateway)

Chapa provides a unified REST API to reach Telebirr, CBE Birr, and various commercial banks.

### Authentication
*   **Method:** HMAC SHA256 Signature + Bearer Token.
*   **Header:** `Chapa-Signature` - HMAC SHA256 signature of your request body signed using your Secret Key.
*   **Authorization:** `Bearer {SECRET_KEY}`.

### Bulk Transfer Request
*   **Endpoint:** `POST https://api.chapa.co/v1/bulk-transfers`
*   **Payload Example:**
```json
{
    "title": "Staff Salaries May 2026",
    "transfers": [
        {
            "amount": "5000.00",
            "currency": "ETB",
            "reference": "SAL-001-MAY26",
            "bank": "telebirr",
            "account_name": "Abebe Bikila",
            "account_number": "251911XXXXXX"
        },
        {
            "amount": "4500.00",
            "currency": "ETB",
            "reference": "SAL-002-MAY26",
            "bank": "cbe",
            "account_name": "Almaz Ayana",
            "account_number": "1000XXXXXXXX"
        }
    ]
}
```

### Webhooks / Callbacks
*   **Configuration:** Set a `webhook_url` in the Chapa Dashboard.
*   **Event:** `transfer.completed`.
*   **Payload:** Includes `id`, `reference`, `status` (`success`, `failed`, `queued`), and `amount`.

---

## 2. Telebirr B2C (Business to Customer)

Telebirr's direct API is often used for higher-volume disbursements.

### Authentication & Security
*   **Credentials:** `AppId`, `AppKey`, `ShortCode`.
*   **Encryption:** Uses RSA public key encryption for sensitive fields in the request (e.g., `amount`, `msisdn`).
*   **Signature:** HMAC-SHA256 signature calculated from the sorted request parameters.

### Request Payload (JSON)
*   **Endpoint:** `POST https://app.telebirr.com.et/api/b2c/payment`
*   **Common Fields:**
    *   `appid`: Application ID.
    *   `sign`: Digital signature.
    *   `ussd`: Encrypted payload containing `amount`, `msisdn`, `shortcode`, and `nonce`.

---

## 3. CBE Birr Bulk Payment

CBE Birr offers direct integration for corporate banking clients.

### Integration Methods
1.  **Corporate Banking Portal:** Bulk upload via Excel/CSV (Manual).
2.  **API (Web Services):** Usually SOAP or REST based on the partner agreement.
    *   **Auth:** Certificate-based or API Key + IP Whitelisting.
    *   **Workflow:** 
        *   Initiate bulk request with a batch reference.
        *   CBE Birr processes and provides a reconciliation file or webhook response.

---

## Technical Summary for Engineering Team

| Provider | Integration Ease | Reach | Best For |
| :--- | :--- | :--- | :--- |
| **Chapa** | High (REST/JSON) | All Banks + Wallets | Rapid development, unified reporting. |
| **Telebirr** | Medium (RSA/HMAC) | Telebirr Users Only | Low transaction fees for Ethio Telecom users. |
| **CBE Birr** | Medium/Low | CBE Users Only | Direct bank-to-bank settlement (High volume). |

**Recommendation:** Start with **Chapa** for the MVP to minimize integration time and maximize reach. Transition to direct **Telebirr** and **CBE Birr** integrations later for cost optimization if volume justifies the effort.
