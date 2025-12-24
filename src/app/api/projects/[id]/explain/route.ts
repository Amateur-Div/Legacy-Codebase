import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { explainCodeChunked } from "@/app/api/lib/ai/explainCodeChunked";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { params } = await context;
  const { id } = await params;

  try {
    const body = await req.json();
    const code = body.code?.trim();

    if (!code) {
      return NextResponse.json(
        { error: "Missing code to explain" },
        { status: 400 }
      );
    }

    const explanation = await explainCodeChunked(code);
    return NextResponse.json({ explanation });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
