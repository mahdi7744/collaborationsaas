/*
  Warnings:

  - A unique constraint covering the columns `[fileId,sharedWithId]` on the table `SharedFile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SharedFile_fileId_sharedWithId_key" ON "SharedFile"("fileId", "sharedWithId");
