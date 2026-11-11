import { NextResponse } from "next/server";
import { mediaStorageAdapterInfo } from "@/lib/server/media-storage-adapter";
import { databaseAdapterInfo } from "@/lib/server/store";

export async function GET() {
  const storage = databaseAdapterInfo();
  const mediaStorage = mediaStorageAdapterInfo();

  return NextResponse.json({
    storage,
    mediaStorage,
    nextAdapters: storage.availableAdapters.filter((adapter) => adapter !== storage.id),
    productionAdapters: storage.availableAdapters.filter((adapter) => adapter !== "json")
  });
}
