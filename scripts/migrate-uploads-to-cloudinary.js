#!/usr/bin/env node
/**
 * One-time migration: push every file in apps/api/uploads/ to Cloudinary and
 * emit SQL that rewrites all DB URLs referencing those files to the new
 * Cloudinary URLs.
 *
 * Usage:
 *   CLOUDINARY_CLOUD_NAME=xxx CLOUDINARY_API_KEY=xxx CLOUDINARY_API_SECRET=xxx \
 *     node scripts/migrate-uploads-to-cloudinary.js
 *
 * Then apply the generated SQL to the production DB:
 *   psql "$DATABASE_PUBLIC_URL" -f scripts/upload-url-rewrites.sql
 */
const { v2: cloudinary } = require('../apps/api/node_modules/cloudinary');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'apps', 'api', 'uploads');
const OUT_SQL = path.join(__dirname, 'upload-url-rewrites.sql');
const FOLDER = 'totalstore';

// (table, column, kind) — every column that can hold an /uploads/ URL
const TEXT_COLUMNS = [
  ['products', 'thumbnailUrl'],
  ['products', 'videoUrl'],
  ['products', 'adVideoUrl'],
  ['categories', 'image'],
  ['banners', 'image'],
  ['banners', 'targetUrl'],
  ['banners', 'buttonUrl'],
  ['banners', 'button2Url'],
  ['users', 'avatar'],
  ['seller_profiles', 'storeLogo'],
  ['brands', 'logo'],
  ['product_variants', 'image'],
  ['blog_posts', 'coverImage'],
  ['order_items', 'productImage'],
  ['settings', 'value'],
  ['reels', 'videoUrl'],
  ['reels', 'thumbnailUrl'],
  ['live_streams', 'thumbnailUrl'],
  ['messages', 'mediaUrl'],
];
const ARRAY_COLUMNS = [
  ['products', 'images'],
  ['reviews', 'images'],
  ['return_requests', 'images'],
];

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  process.exit(1);
}
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const esc = (s) => s.replace(/'/g, "''");

async function main() {
  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => !f.startsWith('.'));
  console.log(`Uploading ${files.length} files from ${UPLOADS_DIR}`);

  const stmts = ['BEGIN;'];
  let ok = 0;
  for (const file of files) {
    const filePath = path.join(UPLOADS_DIR, file);
    const publicId = path.basename(file, path.extname(file));
    try {
      const res = await cloudinary.uploader.upload(filePath, {
        folder: FOLDER,
        public_id: publicId,
        resource_type: 'auto',
        overwrite: false,
      });
      ok++;
      const newUrl = res.secure_url;
      console.log(`  ✓ ${file} → ${newUrl}`);

      // Match any historical base URL by keying on the /uploads/<file> suffix.
      // regexp_replace rewrites the WHOLE value when it contains that suffix.
      const pattern = `%/uploads/${file}%`;
      for (const [table, col] of TEXT_COLUMNS) {
        stmts.push(
          `UPDATE "${table}" SET "${col}" = '${esc(newUrl)}' WHERE "${col}" LIKE '${esc(pattern)}';`,
        );
      }
      for (const [table, col] of ARRAY_COLUMNS) {
        stmts.push(
          `UPDATE "${table}" SET "${col}" = ARRAY(SELECT CASE WHEN u LIKE '${esc(pattern)}' THEN '${esc(newUrl)}' ELSE u END FROM unnest("${col}") u) ` +
            `WHERE EXISTS (SELECT 1 FROM unnest("${col}") u WHERE u LIKE '${esc(pattern)}');`,
        );
      }
    } catch (e) {
      console.error(`  ✗ ${file}: ${e.message}`);
    }
  }
  stmts.push('COMMIT;');
  fs.writeFileSync(OUT_SQL, stmts.join('\n') + '\n');
  console.log(`\n${ok}/${files.length} uploaded. SQL written to ${OUT_SQL}`);
  console.log('Apply with: psql "$DATABASE_PUBLIC_URL" -f scripts/upload-url-rewrites.sql');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
