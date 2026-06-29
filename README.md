# The Private Bar — Website

A two-page Next.js site for a private bartender. Clients browse services on the home page and submit inquiries via a contact form — submissions are emailed directly to you via Resend. No database, no auth.

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Your Resend API key (see below) |
| `ADMIN_EMAIL` | Your Gmail address — where inquiry emails are sent |
| `NEXT_PUBLIC_PHONE_NUMBER` | Your phone number, shown publicly on the site |

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

---

## Setting Up Resend (Free)

1. Go to [resend.com](https://resend.com) and create a free account.
2. In the dashboard, click **API Keys → Create API Key**.
3. Copy the key and paste it as `RESEND_API_KEY` in `.env.local`.
4. **For production**: add and verify your own domain in Resend so emails come from `noreply@yourdomain.com`. Until then, the `from` address uses `onboarding@resend.dev` (Resend's sandbox domain — fine for testing).

> The free Resend plan allows 3,000 emails/month and 100/day — more than enough for an inquiry form.

---

## Deploying to Vercel

### First deploy

1. Push your project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), click **Add New Project**, and import your repo.
3. Vercel detects Next.js automatically — no build settings to change.
4. Before deploying, add your environment variables under **Settings → Environment Variables**:
   - `RESEND_API_KEY`
   - `ADMIN_EMAIL`
   - `NEXT_PUBLIC_PHONE_NUMBER`
5. Click **Deploy**.

### Connecting a Custom Domain

1. In your Vercel project dashboard, go to **Settings → Domains**.
2. Enter your domain name (e.g. `theprivatebar.com`) and click **Add**.
3. Vercel will show you DNS records to add at your domain registrar (usually an `A` record or `CNAME`).
4. Add those records at your registrar and wait for propagation (usually under 10 minutes with Vercel).
5. HTTPS is provisioned automatically.

---

## Customising the Site

### Phone number
Update `NEXT_PUBLIC_PHONE_NUMBER` in `.env.local` (development) and in your Vercel environment variables (production).

### Brand name
Search for `"The Private Bar"` across the project and replace with your preferred name. It appears in:
- `app/layout.tsx` — page title and metadata
- `app/page.tsx` — hero section, footer
- `components/Nav.tsx` — navigation bar
- `app/api/contact/route.ts` — email `from` label and footer

### Email sender address
Once you've verified your domain in Resend, update the `from` field in `app/api/contact/route.ts`:

```ts
from: "The Private Bar <hello@yourdomain.com>",
```

### Services & copy
Edit the `services` and `steps` arrays in `app/page.tsx` to update the cards and how-it-works section.

---

## Project Structure

```
app/
  layout.tsx          # Root layout, fonts, Nav
  page.tsx            # Home page (/)
  globals.css         # Global styles, animations
  contact/
    page.tsx          # Contact page (/contact)
  api/
    contact/
      route.ts        # Form submission API — rate limiting, sanitization, Resend
components/
  Nav.tsx             # Sticky top navigation with mobile hamburger
  ContactForm.tsx     # Client-side form with validation and success/error states
.env.local.example    # Environment variable template
```
