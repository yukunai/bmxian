import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type postgres from "postgres";

type PostgresSql = ReturnType<typeof postgres>;

export type DatabaseAdapterId = "json" | "postgres" | "supabase" | "neon";

export type DatabaseAdapterInfo = {
  id: DatabaseAdapterId;
  requestedId: string;
  label: string;
  path: string;
  table?: string;
  key?: string;
  configured: boolean;
  persistent: boolean;
  productionReady: boolean;
  supportsAtomicMutations: boolean;
  availableAdapters: DatabaseAdapterId[];
  requiredEnv: string[];
  missingEnv: string[];
  note: string;
};

export type DatabaseAdapter = {
  info: DatabaseAdapterInfo;
  readText: () => Promise<string | undefined>;
  writeText: (content: string) => Promise<void>;
  mutateText: (mutator: (content: string | undefined) => Promise<string> | string) => Promise<string>;
};

async function ensureDir(path: string) {
  await mkdir(dirname(path), { recursive: true });
}

function requestedAdapterId() {
  return (process.env.BMXIAN_DB_ADAPTER ?? "json").trim() || "json";
}

const availableAdapters: DatabaseAdapterId[] = ["json", "postgres", "supabase", "neon"];
const postgresAliases = new Set(["postgres", "supabase", "neon"]);
const defaultPostgresTable = "bmxian_workspace_store";
const defaultStoreKey = "workspace-state";
const advisoryLockKey = 1_781_595_333;

function isDatabaseAdapterId(value: string): value is DatabaseAdapterId {
  return availableAdapters.includes(value as DatabaseAdapterId);
}

function safeTableName(value: string | undefined) {
  const tableName = (value ?? defaultPostgresTable).trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName) ? tableName : defaultPostgresTable;
}

function safeStoreKey(value: string | undefined) {
  return (value ?? defaultStoreKey).trim() || defaultStoreKey;
}

function databaseUrlFor(requestedId: string) {
  const candidates = requestedId === "neon"
    ? ["NEON_DATABASE_URL", "DATABASE_URL", "POSTGRES_URL"]
    : requestedId === "supabase"
      ? ["SUPABASE_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL"]
      : ["POSTGRES_URL", "DATABASE_URL"];
  const envName = candidates.find((name) => process.env[name]?.trim());

  return {
    envName,
    requiredEnv: candidates,
    url: envName ? process.env[envName]?.trim() : undefined
  };
}

function maskDatabaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "****";
    if (parsed.username) parsed.username = parsed.username ? `${parsed.username.slice(0, 2)}***` : "";
    return parsed.toString();
  } catch {
    return "configured";
  }
}

function jsonAdapterInfo(path: string, requestedId: string, note: string): DatabaseAdapterInfo {
  return {
    id: "json",
    requestedId,
    label: "Local JSON database",
    path,
    configured: true,
    persistent: true,
    productionReady: false,
    supportsAtomicMutations: false,
    availableAdapters,
    requiredEnv: [],
    missingEnv: [],
    note
  };
}

function createJsonAdapter(path: string, requestedId: string, note: string): DatabaseAdapter {
  const info = jsonAdapterInfo(path, requestedId, note);

  return {
    info,
    async readText() {
      await ensureDir(path);
      try {
        return await readFile(path, "utf8");
      } catch {
        return undefined;
      }
    },
    async writeText(content: string) {
      await ensureDir(path);
      const tmpPath = `${path}.${randomUUID()}.tmp`;
      await writeFile(tmpPath, content, "utf8");
      await rename(tmpPath, path);
    },
    async mutateText(mutator) {
      const current = await this.readText();
      const next = await mutator(current);
      await this.writeText(next);
      return next;
    }
  };
}

function createPostgresAdapter(
  requestedId: DatabaseAdapterId,
  databaseUrl: string,
  envName: string,
  tableName: string,
  storeKey: string
): DatabaseAdapter {
  let sqlPromise: Promise<PostgresSql> | undefined;
  let tableReady: Promise<void> | undefined;

  async function sqlClient() {
    if (!sqlPromise) {
      sqlPromise = import("postgres").then(({ default: createSql }) =>
        createSql(databaseUrl, {
          max: Number(process.env.BMXIAN_POSTGRES_POOL_SIZE ?? 3),
          idle_timeout: Number(process.env.BMXIAN_POSTGRES_IDLE_TIMEOUT ?? 20),
          connect_timeout: Number(process.env.BMXIAN_POSTGRES_CONNECT_TIMEOUT ?? 10),
          prepare: false
        })
      );
    }
    return sqlPromise;
  }

  async function ensureTable() {
    if (!tableReady) {
      tableReady = sqlClient().then((sql) =>
        sql.unsafe(`
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id text PRIMARY KEY,
            content jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          )
        `).then(() => undefined)
      );
    }
    return tableReady;
  }

  return {
    info: {
      id: requestedId,
      requestedId,
      label: requestedId === "neon"
        ? "Neon Postgres database"
        : requestedId === "supabase"
          ? "Supabase Postgres database"
          : "Postgres database",
      path: maskDatabaseUrl(databaseUrl),
      table: tableName,
      key: storeKey,
      configured: true,
      persistent: true,
      productionReady: true,
      supportsAtomicMutations: true,
      availableAdapters,
      requiredEnv: [envName],
      missingEnv: [],
      note: `Using ${requestedId} via ${envName}; workspace snapshots are stored in ${tableName}.${storeKey}.`
    },
    async readText() {
      await ensureTable();
      const sql = await sqlClient();
      const rows = await sql.unsafe<{ content: string }[]>(
        `SELECT content::text AS content FROM ${tableName} WHERE id = $1 LIMIT 1`,
        [storeKey]
      );
      return rows[0]?.content;
    },
    async writeText(content: string) {
      await ensureTable();
      const sql = await sqlClient();
      await sql.unsafe(
        `
          INSERT INTO ${tableName} (id, content, updated_at)
          VALUES ($1, $2::jsonb, now())
          ON CONFLICT (id)
          DO UPDATE SET content = EXCLUDED.content, updated_at = now()
        `,
        [storeKey, content]
      );
    },
    async mutateText(mutator) {
      await ensureTable();
      const sql = await sqlClient();

      return sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${advisoryLockKey})`;
        const rows = await tx.unsafe<{ content: string }[]>(
          `SELECT content::text AS content FROM ${tableName} WHERE id = $1 FOR UPDATE`,
          [storeKey]
        );
        const next = await mutator(rows[0]?.content);
        await tx.unsafe(
          `
            INSERT INTO ${tableName} (id, content, updated_at)
            VALUES ($1, $2::jsonb, now())
            ON CONFLICT (id)
            DO UPDATE SET content = EXCLUDED.content, updated_at = now()
          `,
          [storeKey, next]
        );
        return next;
      });
    }
  };
}

export function createDatabaseAdapter(path: string): DatabaseAdapter {
  const requestedId = requestedAdapterId();

  if (!isDatabaseAdapterId(requestedId)) {
    return createJsonAdapter(
      path,
      requestedId,
      `Requested ${requestedId}, but supported adapters are ${availableAdapters.join(", ")}. Falling back to local JSON.`
    );
  }

  if (requestedId === "json") {
    return createJsonAdapter(path, requestedId, "Using the local JSON adapter for development and single-machine demos.");
  }

  if (postgresAliases.has(requestedId)) {
    const databaseUrl = databaseUrlFor(requestedId);
    const tableName = safeTableName(process.env.BMXIAN_POSTGRES_TABLE);
    const storeKey = safeStoreKey(process.env.BMXIAN_POSTGRES_STORE_KEY);

    if (databaseUrl.url && databaseUrl.envName) {
      return createPostgresAdapter(requestedId, databaseUrl.url, databaseUrl.envName, tableName, storeKey);
    }

    const fallback = createJsonAdapter(
      path,
      requestedId,
      `Requested ${requestedId}, but no database URL was found. Falling back to local JSON until one of ${databaseUrl.requiredEnv.join(", ")} is configured.`
    );
    fallback.info.configured = false;
    fallback.info.requiredEnv = databaseUrl.requiredEnv;
    fallback.info.missingEnv = databaseUrl.requiredEnv;
    return fallback;
  }

  return createJsonAdapter(path, requestedId, "Using the local JSON adapter.");
}
