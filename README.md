# Anmol Jewellers enquiry API

Express app for the storefront **Enquire Now** popup. It stores name, mobile, email, pincode, comments, and the page URL in MongoDB, and returns that list to the Shopify enquiries page.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/enquiries` | None (public, rate limited) | Save one enquiry |
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
4. Deploy. Railway runs `npm start` and checks `/health`.
5. Copy the public URL, without a trailing slash.

`*.myshopify.com`, `*.shopifypreview.com`, and localhost are already allowed so theme preview works.

## Shopify

1. Theme settings → **Enquiry API** → paste the Railway URL.
2. Create a page (for example handle `enquiries`) and assign the **enquiries** template.
3. In that section, paste the same `READ_API_KEY`.
4. Leave the page out of the menu. It lists customer names, phones, and emails. The key is also visible to anyone who can open the page.

The popup still sends the enquiry through Shopify’s contact form after a successful save, so the existing store email keeps working. If the API is down, the popup falls back to the Shopify contact form.
