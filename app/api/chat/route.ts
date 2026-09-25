import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

const requestLog = new Map<
  string,
  {
    count: number;
    windowStart: number;
  }
>();

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const record = requestLog.get(ip);

  if (!record) {
    requestLog.set(ip, {
      count: 1,
      windowStart: now,
    });

    return false;
  }

  if (now - record.windowStart > WINDOW_MS) {
    requestLog.set(ip, {
      count: 1,
      windowStart: now,
    });

    return false;
  }

  record.count += 1;

  if (record.count > MAX_REQUESTS) {
    return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
          },
        }
      );
    }

    const body = await request.json();

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return NextResponse.json(
        {
          error: "Message is required",
        },
        {
          status: 400,
        }
      );
    }

    if (message.length > 3000) {
      return NextResponse.json(
        {
          error: "Message is too long",
        },
        {
          status: 400,
        }
      );
    }

    const awsEndpoint = process.env.GARNISH_AI_API_URL;

    if (!awsEndpoint) {
      console.error("GARNISH_AI_API_URL is not configured");

      return NextResponse.json(
        {
          error: "Chat service is unavailable",
        },
        {
          status: 500,
        }
      );
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 10_000);

    const response = await fetch(awsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        "Garnish AI backend error:",
        response.status
      );

      return NextResponse.json(
        {
          error: "Chat service is temporarily unavailable",
        },
        {
          status: 502,
        }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      reply:
        data?.reply ||
        "I'm not sure about that. Please contact Garnish directly.",
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return NextResponse.json(
        {
          error: "Chat service timed out",
        },
        {
          status: 504,
        }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
