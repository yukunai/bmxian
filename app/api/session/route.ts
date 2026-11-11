import { NextResponse } from "next/server";
import { z } from "zod";
import { authAdapterInfo, readServerSession, writeSessionCookies } from "@/lib/server/session";
import { listWorkspaces, setActiveWorkspace } from "@/lib/server/store";

const sessionUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  workspaceId: z.string().min(1).optional()
});

export async function GET() {
  const session = await readServerSession();
  const directory = await listWorkspaces();
  const response = NextResponse.json({
    user: {
      email: session.email,
      name: session.name
    },
    auth: {
      ...authAdapterInfo(),
      authenticated: session.authenticated,
      source: session.source,
      warning: session.authWarning
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
  const parsed = sessionUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const session = await readServerSession();
  const nextUser = session.authAdapter === "trusted-headers"
    ? {
        email: session.email,
        name: session.name
      }
    : {
        email: parsed.data.email ?? session.email,
        name: parsed.data.name ?? session.name
      };
  let directory = await listWorkspaces();

  if (parsed.data.workspaceId) {
    const workspaceExists = directory.workspaces.some((workspace) => workspace.id === parsed.data.workspaceId);
    if (!workspaceExists) {
      return NextResponse.json({ error: "workspace_not_found" }, { status: 404 });
    }
    directory = await setActiveWorkspace(parsed.data.workspaceId);
  }

  const response = NextResponse.json({
    user: nextUser,
    auth: {
      ...authAdapterInfo(),
      authenticated: session.authenticated,
      source: session.source,
      warning: session.authWarning
    },
    ...directory
  });

  writeSessionCookies(response, {
    ...nextUser,
    workspaceId: directory.activeWorkspaceId
  });

  return response;
}
