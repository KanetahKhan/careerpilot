import { NextResponse } from "next/server";
import { getCvProfile } from "@/lib/services/profile";
import { requireUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const profile = await getCvProfile(user.id);
    return NextResponse.json(profile);
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}
