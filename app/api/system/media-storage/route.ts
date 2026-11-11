import { NextResponse } from "next/server";
import { mediaStorageAdapterInfo } from "@/lib/server/media-storage-adapter";

export async function GET() {
  const mediaStorage = mediaStorageAdapterInfo();

  return NextResponse.json({
    mediaStorage,
    nextAdapters: mediaStorage.availableAdapters.filter((adapter) => adapter !== mediaStorage.id),
    productionAdapters: mediaStorage.availableAdapters.filter((adapter) => adapter !== "local")
  });
}
