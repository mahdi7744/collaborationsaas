/*
  Warnings:

  - You are about to drop the column `nonRegisteredEmail` on the `SharedFile` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SharedFile_fileId_sharedWithId_key";

-- AlterTable
ALTER TABLE "SharedFile" DROP COLUMN "nonRegisteredEmail";
