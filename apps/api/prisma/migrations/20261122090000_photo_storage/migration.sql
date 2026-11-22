-- Profile photo uploads: object key in photo storage (S3-compatible or local fallback).
ALTER TABLE "Photo" ADD COLUMN "storageKey" TEXT;
CREATE UNIQUE INDEX "Photo_storageKey_key" ON "Photo"("storageKey");
