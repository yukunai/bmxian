import { NextResponse } from "next/server";
import { authAdapterInfo, readServerSession } from "@/lib/server/session";

export async function GET() {
  const session = await readServerSession();
  const auth = authAdapterInfo();

  return NextResponse.json({
    auth: {
      ...auth,
      authenticated: session.authenticated,
      source: session.source,
      warning: session.authWarning,
      role: session.role
    },
    user: {
      email: session.email,
      name: session.name
    }
  });
}
