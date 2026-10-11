import { contactDepsFromEnv } from "@/lib/contact/deps";
import { handleContact } from "@/lib/contact/handler";
import { methodNotAllowed } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleContact(req, contactDepsFromEnv());
}

const notAllowed = () => methodNotAllowed("POST");
export { notAllowed as GET, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
