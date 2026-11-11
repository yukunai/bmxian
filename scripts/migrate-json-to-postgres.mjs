#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));

function argValue(name, fallback) {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function databaseUrl() {
  return argValue("--database-url", process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DATABASE_URL || process.env.NEON_DATABASE_URL);
}

function safeTableName(value) {
  const tableName = (value || "bmxian_workspace_store").trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  return tableName;
}

function planForSnapshot(snapshot, filePath, tableName, storeKey, dryRun) {
  const workspaces = Array.isArray(snapshot.workspaces) ? snapshot.workspaces : [];
  return {
    dryRun,
    source: filePath,
    targetTable: tableName,
    targetKey: storeKey,
    version: snapshot.version ?? "legacy",
    activeWorkspaceId: snapshot.activeWorkspaceId ?? snapshot.workspace?.workspaceId ?? "unknown",
    workspaceCount: workspaces.length || (snapshot.workspace ? 1 : 0),
    byteLength: Buffer.byteLength(JSON.stringify(snapshot))
  };
}

async function main() {
  const dryRun = args.has("--dry-run");
  const filePath = resolve(argValue("--from", "data/bmxian-db.json"));
  const tableName = safeTableName(argValue("--table", process.env.BMXIAN_POSTGRES_TABLE || "bmxian_workspace_store"));
  const storeKey = argValue("--key", process.env.BMXIAN_POSTGRES_STORE_KEY || "workspace-state");
  const raw = await readFile(filePath, "utf8");
  const snapshot = JSON.parse(raw);
  const plan = planForSnapshot(snapshot, filePath, tableName, storeKey, dryRun);

  if (dryRun) {
    console.log(JSON.stringify({ ok: true, plan }, null, 2));
    return;
  }

  const url = databaseUrl();
  if (!url) {
    throw new Error("Missing DATABASE_URL, POSTGRES_URL, SUPABASE_DATABASE_URL, or NEON_DATABASE_URL.");
  }

  const { default: postgres } = await import("postgres");
  const sql = postgres(url, {
    max: Number(process.env.BMXIAN_POSTGRES_POOL_SIZE || 1),
    idle_timeout: Number(process.env.BMXIAN_POSTGRES_IDLE_TIMEOUT || 20),
    connect_timeout: Number(process.env.BMXIAN_POSTGRES_CONNECT_TIMEOUT || 10),
    prepare: false
  });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id text PRIMARY KEY,
        content jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await sql.unsafe(`
      INSERT INTO ${tableName} (id, content, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (id)
      DO UPDATE SET content = EXCLUDED.content, updated_at = now()
    `, [storeKey, raw]);

    console.log(JSON.stringify({ ok: true, migrated: true, plan }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error)
  }, null, 2));
  process.exit(1);
});
