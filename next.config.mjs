// Security headers for every route.
//
// Content-Security-Policy is enforced, without nonces: nonces would force
// every page into dynamic rendering (Next.js CSP guide), and the pages here
// are static. Next's own inline bootstrap scripts (self.__next_f) and the
// pre-paint motion script in app/layout.tsx therefore need 'unsafe-inline'
// in script-src. Everything else is locked to this origin: no third-party
// script, style, font, image, frame or connection can load, plugins are off,
// and the site cannot be framed. React's style={} props need 'unsafe-inline'
// in style-src.
//
// Vercel Preview deployments (VERCEL_ENV=preview at build time) also allow the
// Vercel Toolbar's origins, per Vercel's "Managing the toolbar" docs, so the
// toolbar does not fill a preview's console with CSP errors. Production and
// local builds never include them.
const isDev = process.env.NODE_ENV === "development";
const isPreview = process.env.VERCEL_ENV === "preview";
const toolbar = (...sources) => (isPreview ? sources : []);

const csp = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...toolbar("https://vercel.live")],
  "style-src": ["'self'", "'unsafe-inline'", ...toolbar("https://vercel.live")],
  "img-src": ["'self'", "data:", "blob:", ...toolbar("https://vercel.live", "https://vercel.com")],
  "font-src": ["'self'", ...toolbar("https://vercel.live", "https://assets.vercel.com")],
  "connect-src": ["'self'", ...(isDev ? ["ws:"] : []), ...toolbar("https://vercel.live", "wss://ws-us3.pusher.com")],
  "media-src": ["'self'"],
  "frame-src": isPreview ? ["https://vercel.live"] : ["'none'"],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
};
const cspHeader = Object.entries(csp)
  .map(([k, v]) => [k, ...v].join(" "))
  .join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          // Two years, this host only. includeSubDomains/preload are an owner
          // decision (they bind every garnish.info subdomain to HTTPS).
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
