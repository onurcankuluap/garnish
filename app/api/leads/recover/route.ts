import { notifierFromEnv } from "@/lib/contact/notifier";
import { storeFromEnv } from "@/lib/contact/deps";
import { handleRecover } from "@/lib/leads/recoverHandler";
import { methodNotAllowed } from "@/lib/server/http";
import { serviceMode } from "@/lib/server/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const mode = serviceMode();
  return handleRecover(req, {
    secret: process.env.CRON_SECRET,
    store: storeFromEnv(mode),
    notifier: notifierFromEnv(mode).notifier,
    now: () => new Date(),
  });
}

const notAllowed = () => methodNotAllowed("GET");
export { notAllowed as POST, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
