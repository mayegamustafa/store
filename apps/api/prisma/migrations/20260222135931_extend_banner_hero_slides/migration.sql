-- AlterTable
ALTER TABLE "banners" ADD COLUMN     "badgeText" TEXT,
ADD COLUMN     "bgColor" TEXT,
ADD COLUMN     "button2Text" TEXT,
ADD COLUMN     "button2Url" TEXT,
ADD COLUMN     "buttonText" TEXT,
ADD COLUMN     "buttonUrl" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "textAlign" TEXT NOT NULL DEFAULT 'center';
