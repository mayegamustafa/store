import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY_META = 'feature_setting_key';

/**
 * Gates a controller or handler behind a Setting flag. When the flag is
 * `"false"` (or the key doesn't exist with default-true semantics), the route
 * returns 404 — outwardly indistinguishable from "this feature doesn't exist",
 * which is the safer disclosure than an explicit "disabled" hint.
 *
 * Setting keys correspond to entries in SETTING_DEFINITIONS, e.g.:
 *   @Feature('FEATURE_LIVE_STREAMS')
 *   @Feature('FEATURE_REELS')
 *   @Feature('FEATURE_POS')
 *
 * Defaults to `true` (enabled) when the Setting row is missing — preserves
 * existing behavior for features that have always been on.
 */
export const Feature = (settingKey: string) => SetMetadata(FEATURE_KEY_META, settingKey);
