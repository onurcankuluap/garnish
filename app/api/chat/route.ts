import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/*
 * Shared Redis connection.
 *
 * Vercel created these environment variables:
 * KV_REST_API_URL
 * KV_REST_API_TOKEN
 */
const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;

if (!redisUrl || !redisToken) {
  console.warn("Redis rate-limit environment variables are not configured.");
}

const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

/*
 * Shared distributed rate limiter.
 *
 * 12 requests per 60 seconds per client IP.
 */
const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(12, "60 s"),
      analytics: true,
      prefix: "garnish:chat",
    })
  : null;

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    /*
     * -----------------------------
     * Distributed rate limiting
     * -----------------------------
     */
    const ip = getClientIp(request);

    if (!ratelimit) {
      console.error("Redis rate limiter is unavailable.");

      return NextResponse.json(
        {
          error: "Chat service is temporarily unavailable",
        },
        {
          status: 503,
        }
      );
    }

    const rateLimitResult = await ratelimit.limit(ip);

    const {
      success,
      limit,
      remaining,
      reset,
    } = rateLimitResult;

    if (!success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((reset - Date.now()) / 1000)
      );

      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      );
    }

    /*
     * -----------------------------
     * Parse user input
     * -----------------------------
     */
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

    /*
     * Prevent oversized prompts.
     */
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

    /*
     * -----------------------------
     * AWS backend
     * -----------------------------
     */
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

    /*
     * Prevent hanging backend calls.
     */
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 10_000);

    let response: Response;

    try {
      response = await fetch(awsEndpoint, {
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
    } finally {
      clearTimeout(timeout);
    }

    /*
     * -----------------------------
     * AWS backend errors
     * -----------------------------
     */
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

    /*
     * -----------------------------
     * Successful response
     * -----------------------------
     */
    return NextResponse.json(
      {
        reply:
          data?.reply ||
          "I'm not sure about that. Please contact Garnish directly.",
      },
      {
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      }
    );
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
