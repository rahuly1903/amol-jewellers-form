# Anmol Jewellers enquiry API

Express app for the storefront **Enquire Now** popup. It stores name, mobile, email, pincode, comments, and the page URL in MongoDB, emails that submission through Resend, and returns the list to the Shopify enquiries page.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/enquiries` | None (public, rate limited) | Save one enquiry and email it |
| `GET` | `/api/enquiries` | `x-api-key: READ_API_KEY` | List enquiries, newest first |
| `GET` | `/health` | None | Railway health check |

`GET /api/enquiries` accepts `page` and `limit` (max 50).

## Railway

1. Create a Railway project from this folder.
2. Add MongoDB (Railway MongoDB, or MongoDB Atlas).
3. Set variables:
   - `MONGODB_URI` — connection string. Railway’s MongoDB plugin often injects `MONGO_URL`, which this app also accepts.
   - `READ_API_KEY` — long random string. Generate one with `openssl rand -hex 24`.
   - `ALLOWED_ORIGINS` — `https://anmoljewellers.in,https://www.anmoljewellers.in`
   - `RESEND_API_KEY` — API key from the Resend dashboard.
   - `RESEND_FROM` — sender on a domain verified in Resend, for example `Anmol Jewellers <enquiries@anmoljewellers.in>`.
   - `ENQUIRY_TO_EMAIL` — optional. Defaults to `cre1.anmoljewellers@gmail.com`.
4. Deploy. Railway runs `npm start` and checks `/health`.
5. Copy the public URL, without a trailing slash.

`*.myshopify.com`, `*.shopifypreview.com`, and localhost are already allowed so theme preview works.

## Shopify

1. Theme settings → **Enquiry API** → paste the Railway URL.
2. Create a page (for example handle `enquiries`) and assign the **enquiries** template.
3. In that section, paste the same `READ_API_KEY`.
4. Leave the page out of the menu. It lists customer names, phones, and emails. The key is also visible to anyone who can open the page.

After a successful save, the API emails the form fields to `cre1.anmoljewellers@gmail.com`. Reply goes to the customer’s address. If Resend rejects the send, the enquiry stays in MongoDB and the popup asks the customer to try again.
