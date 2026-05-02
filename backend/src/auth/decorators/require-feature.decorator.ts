import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'requiredFeature';

/**
 * Require a specific feature to be enabled for the user's role.
 * Checked against RoleFeatureConfig in DB (managed by regional admins).
 *
 * Usage: @RequireFeature('inventory')
 */
export const RequireFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);
