import { rm } from "node:fs/promises";
import { join } from "node:path";

// The e2e suite shares one server-side JSON database (data/bmxian-db.json) and a
// reused dev server. Without a reset, state accumulates across runs (artifacts,
// tasks, installed skills, messages), which makes the suite pass on a clean
// checkout but fail on a second local `pnpm e2e`. Delete the DB before each run
// so every run starts from the seeded default workspace. The store recreates the
// default file lazily on the next read, so this is order-independent relative to
// the dev server starting up.
export default async function globalSetup() {
  const dbPath = join(process.cwd(), "data", "bmxian-db.json");
  await rm(dbPath, { force: true });
}
