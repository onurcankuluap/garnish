import { chatDepsFromEnv } from "@/lib/chat/deps";
import { handleChat } from "@/lib/chat/handler";
import { methodNotAllowed } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleChat(request, chatDepsFromEnv());
}

const notAllowed = () => methodNotAllowed("POST");
export { notAllowed as GET, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
