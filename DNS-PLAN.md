# DNS plan: verify garnish.info for Resend

**Status: PREPARED, NOT APPLIED.** Nothing in DNS was changed. The owner must
copy the exact values from the Resend dashboard (Domains → Add domain →
`garnish.info`) and enter them at IONOS. The DKIM key below is a placeholder:
Resend generates a unique key per domain.

## 1. Current records (read with `dig`, 2026-10-10)

Authoritative nameservers (IONOS): `ns1058.ui-dns.de`, `ns1069.ui-dns.biz`,
`ns1083.ui-dns.com`, `ns1089.ui-dns.org`.

| Name | Type | Value | Notes |
|---|---|---|---|
| `garnish.info` | A | `216.198.79.1` | Vercel |
| `www.garnish.info` | CNAME | `40893fa9f240c229.vercel-dns-017.com` | Vercel |
| `garnish.info` | MX | `10 mx00.ionos.com`, `10 mx01.ionos.com` | IONOS mailboxes; **leave as is** |
| `garnish.info` | TXT | `v=spf1 include:_spf-us.ionos.com ~all` | the apex SPF record; **leave as is** |
| `garnish.info` | TXT | `google-site-verification=…` | leave as is |
| `_dmarc.garnish.info` | CNAME | `dmarc.ionos.com` → `v=DMARC1; p=none;` | IONOS-managed DMARC |
| `s1-ionos._domainkey` / `s2-ionos._domainkey` | CNAME | `s1.dkim.ionos.com` / `s2.dkim.ionos.com` | IONOS DKIM; leave as is |
| `send.garnish.info` | any | none | free for Resend |
| `resend._domainkey.garnish.info` | any | none | free for Resend |
| `garnish.info` | CAA | none | no CA restriction (nothing to change) |

## 2. Records to add at IONOS (from Resend; confirm exact values in the dashboard)

Resend uses a sending subdomain (`send`) for the bounce/return path, so its
MX and SPF records live on `send.garnish.info` and **do not touch** the apex
MX or the apex SPF record. There will still be exactly one SPF record per
name: the apex keeps the IONOS one, and `send` gets its own.

| # | Type | Host (IONOS "Host name") | Value | Priority | TTL |
|---|---|---|---|---|---|
| 1 | MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 | default (1 h) |
| 2 | TXT | `send` | `v=spf1 include:amazonses.com ~all` | | default |
| 3 | TXT | `resend._domainkey` | `p=<DKIM PUBLIC KEY FROM RESEND DASHBOARD>` | | default |

Notes:

- The region in record 1 (`us-east-1`) must match the region chosen when the
  domain is added in Resend. Copy the value exactly from the dashboard.
- **Do not** add `include:amazonses.com` to the apex SPF record. It is not
  needed (Resend's SPF check is on `send.garnish.info`) and would only lengthen
  the apex record's DNS lookup chain.
- **Tracking:** leave Resend open/click tracking **off** (privacy; the owner
  notification does not need it). Then no `links` CNAME is needed.
- **DMARC:** no change is required. The existing policy (`p=none` via the
  IONOS CNAME) already passes. DKIM `d=garnish.info` aligns with the From
  domain. If the owner later wants a stricter policy or reports (`rua=`), the
  `_dmarc` CNAME must be **replaced** by a TXT record; a name cannot hold a
  CNAME and a TXT at once.
- IONOS's DNS UI appends the domain automatically: enter `send`, not
  `send.garnish.info`.

## 3. After DNS propagates

1. In Resend, click **Verify** and wait for all three records to show
   *Verified* (usually minutes; up to 72 h).
2. Create a **sending-only** API key restricted to `garnish.info`; replace
   `RESEND_API_KEY` in Vercel **Production only**.
3. Set Vercel **Production** env `CONTACT_FROM` to
   `Garnish <bookings@garnish.info>` (the From address is on the verified
   apex domain; `send.garnish.info` is only the return path). Any local part
   works; it does not need a mailbox, but replies go to the visitor via
   Reply-To.
4. Keep `ADMIN_EMAIL` as the inbox that receives inquiries.
5. Do **not** set these on Preview (see STAGE1-REPORT.md, preview isolation).
6. Send one real test inquiry on Production after the release, and confirm
   the email arrives with DKIM and SPF `pass` (Gmail → Show original).

## 4. Rollback

Delete the three records above. Nothing else depends on them; the apex MX,
SPF and DMARC are untouched, so IONOS mail keeps working throughout.
