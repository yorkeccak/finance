import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const valyuKeyPresent = !!process.env.VALYU_API_KEY;
    const daytonaKeyPresent = !!process.env.DAYTONA_API_KEY;
    const openaiKeyPresent = !!process.env.OPENAI_API_KEY;
    const aiGatewayKeyPresent = !!process.env.AI_GATEWAY_API_KEY;

    return NextResponse.json(
      {
        valyuKeyPresent,
        daytonaKeyPresent,
        openaiKeyPresent,
        aiGatewayKeyPresent,
      },
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to read env status" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
