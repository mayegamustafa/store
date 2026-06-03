CREATE TABLE IF NOT EXISTS "app_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_config_key_key" ON "app_config"("key");

INSERT INTO "app_config" ("id", "key", "value") VALUES
  ('cfg_api_base_url', 'API_BASE_URL', 'https://store.saktech.org/api/v1'),
  ('cfg_api_backup_url', 'API_BACKUP_URL', ''),
  ('cfg_app_version_buyer', 'APP_VERSION_BUYER', '1.0.0'),
  ('cfg_app_version_seller', 'APP_VERSION_SELLER', '1.0.0'),
  ('cfg_app_version_rider', 'APP_VERSION_RIDER', '1.0.0')
ON CONFLICT ("key") DO NOTHING;
