-- DropForeignKey
ALTER TABLE "SharedFile" DROP CONSTRAINT "SharedFile_fileId_fkey";

-- AddForeignKey
ALTER TABLE "SharedFile" ADD CONSTRAINT "SharedFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
