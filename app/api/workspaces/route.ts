import { NextResponse } from "next/server";
import { z } from "zod";
import { readServerSession, writeSessionCookies } from "@/lib/server/session";
import { createWorkspace, listWorkspaces } from "@/lib/server/store";

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(80).optional()
});

export async function GET() {
  const session = await readServerSession();
  const directory = await listWorkspaces();
  const response = NextResponse.json({
    user: {
      email: session.email,
      name: session.name
    },
    ...directory
  });

  writeSessionCookies(response, {
    email: session.email,
    name: session.name,
    workspaceId: directory.activeWorkspaceId
  });

  return response;
}

export async function POST(request: Request) {
  const parsed = createWorkspaceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const session = await readServerSession();
  const directory = await createWorkspace(parsed.data.name ?? "", session.email);
  const response = NextResponse.json({
    user: {
      email: session.email,
      name: session.name
    },
    ...directory
  }, { status: 201 });

  writeSessionCookies(response, {
    email: session.email,
    name: session.name,
    workspaceId: directory.activeWorkspaceId
  });

  return response;
}
