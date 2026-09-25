import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const message =
      typeof body?.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 3000) {
      return NextResponse.json(
        { error: "Message is too long" },
        { status: 400 }
      );
    }

    const awsEndpoint = process.env.GARNISH_AI_API_URL;

    if (!awsEndpoint) {
      console.error("GARNISH_AI_API_URL is not configured");

      return NextResponse.json(
        { error: "Chat service is unavailable" },
        { status: 500 }
      );
    }

    const response = await fetch(awsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        "Garnish AI backend error:",
        response.status
      );

      return NextResponse.json(
        { error: "Chat service is temporarily unavailable" },
        { status: 502 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      reply: data.reply,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
