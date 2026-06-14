# Brew & Co. AI Mini CRM

> An AI-native Mini CRM for a coffee brand — segment customers in natural language, draft AI-personalized campaigns, and dispatch across WhatsApp, SMS & Email.

**Live URL:** [TODO: Add deployed URL after deployment]


An AI-native Mini CRM for a coffee brand. It includes a Next.js frontend, an Express + Prisma backend, and a channel-stub service that simulates delivery receipts.

## Architecture

- `frontend/`: Next.js app router UI for dashboard, customers, segments, campaigns, and campaign details.
- `backend/`: Express API with Prisma/PostgreSQL, Gemini-powered AI helpers, campaign dispatch, and receipt handling.
- `channel-stub/`: Express channel gateway. In local simulation mode it fakes delivery receipts; in real mode it sends email through Resend and SMS/WhatsApp through Twilio.

The backend owns all CRM data. The frontend calls `NEXT_PUBLIC_API_URL`. Campaign launches create `Communication` records, then the backend sends them to the channel gateway in batches of 50. The gateway returns immediately and reports delivery events to `POST /api/receipts/callback`.

## Environment

Create these files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
cp channel-stub/.env.example channel-stub/.env
```

Backend:

```bash
DATABASE_URL=postgresql://YOUR_LOCAL_POSTGRES_USER@localhost:5432/brew_co_crm
GEMINI_API_KEY=AIza-your-gemini-key-from-aistudio-google-com
CHANNEL_STUB_URL=http://localhost:3003
FRONTEND_URL=http://localhost:3000
PORT=8000
```

Frontend:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Channel stub:

```bash
CRM_URL=http://localhost:8000
PORT=3003
DELIVERY_MODE=real
RESEND_API_KEY=re_your_api_key
EMAIL_FROM="Brew & Co <hello@yourdomain.com>"
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SMS_FROM=+15551234567
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

If `GEMINI_API_KEY` is missing, the backend uses deterministic local fallbacks for segment SQL, message drafting, insights, and dashboard suggestions so local development still works. To get a free Gemini API key, visit [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

On this machine, the local PostgreSQL role is `chethanakash`, so `backend/.env` is already set to:

```bash
DATABASE_URL="postgresql://chethanakash@localhost:5432/brew_co_crm"
CHANNEL_STUB_URL="http://localhost:3003"
```

For safety, `channel-stub/.env` is currently set to `DELIVERY_MODE=simulate`. To send real email/SMS/WhatsApp, set `DELIVERY_MODE=real` and add your Resend/Twilio credentials. You can also set `TEST_RECIPIENT_EMAIL` and `TEST_RECIPIENT_PHONE` first so every campaign goes only to you while testing.

## Run Locally

Install dependencies:

```bash
cd backend && npm install
cd ../channel-stub && npm install
cd ../frontend && npm install
```

Prepare the database:

```bash
createdb brew_co_crm
cd backend
npm run prisma:migrate
npm run seed
```

Start the services in three terminals:

```bash
cd backend
npm run dev
```

```bash
cd channel-stub
npm run dev
```

```bash
cd frontend
npm run dev
```

Open the URL printed by Next.js. Usually it is `http://localhost:3000`; on this machine it used `http://localhost:3002` because ports `3000` and `3001` were already busy.

## Build

```bash
cd backend && npm run build
cd ../channel-stub && npm run build
cd ../frontend && npm run build
```

## Real Delivery Setup

1. Create and verify a sending domain in Resend.
2. Put your Resend API key in `channel-stub/.env` as `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a verified sender, for example `Brew & Co <hello@yourdomain.com>`.
4. Create a Twilio SMS sender or Messaging Service.
5. Put `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_SMS_FROM` or `TWILIO_MESSAGING_SERVICE_SID` in `channel-stub/.env`.
6. For WhatsApp, set `TWILIO_WHATSAPP_FROM`, for example the Twilio sandbox sender `whatsapp:+14155238886` while testing.
7. Set `DELIVERY_MODE=real`.
8. Restart `channel-stub` and launch a campaign from the CRM.

Provider webhooks are optional but recommended in production:

- Twilio status callbacks: expose the channel gateway publicly and set `CHANNEL_PUBLIC_URL=https://your-domain.com`. The gateway adds `/webhooks/twilio` automatically when sending.
- Resend webhooks: add `https://your-domain.com/webhooks/resend` in the Resend dashboard and select delivered, bounced, opened, and clicked events.

Only send campaigns to customers who have opted in to receive marketing messages.

## Tradeoffs

- AI calls are wrapped with local fallbacks so demos do not fail without a Gemini key.
- Segment SQL is constrained to read-only `SELECT` queries from `customers c` and stripped of dangerous tokens before execution.
- The requested folder notes mention “exactly two folders” and also require a root-level `channel-stub`; this implementation includes all three services because the channel stub is part of the requirements.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed scale assumptions, technology choices, security model, and design rationale.

## Tests

```bash
cd backend && npm test
```

Runs 27 unit tests covering:
- SQL safety validation (injection attacks, forbidden tokens, comment stripping)
- Campaign stats rate calculations (edge cases: 0 sent, 0 delivered, rounding)
- NL-to-SQL fallback function (city, tier, spend, inactive, recent filters)

## Deployment

### Frontend → Vercel
1. Connect your GitHub repo to [vercel.com](https://vercel.com)
2. Set root directory to `frontend/`
3. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
4. Deploy

### Backend + Channel Stub → Render
1. Connect your GitHub repo to [render.com](https://render.com)
2. Use the **Blueprint** feature and point it to `render.yaml` in the repo root
3. Set the `GEMINI_API_KEY` secret in the Render dashboard (get key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
4. Render will auto-provision PostgreSQL, backend, and channel-stub

**Live URL:** [TODO — Add after deployment]
