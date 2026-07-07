import type { RegistryEntry, RegistryQuery } from "./index.js";
export interface RegistryConstraint {
    readonly kind: string;
    evaluate(entry: RegistryEntry, query: RegistryQuery): string[];
}
export declare const ID_CONSTRAINT: RegistryConstraint;
export declare const VERSION_CONSTRAINT: RegistryConstraint;
export declare const CAPABILITY_TAGS_CONSTRAINT: RegistryConstraint;
export declare const RENDER_CAPABILITY_CONSTRAINT: RegistryConstraint;
export declare const DOMAIN_PROFILE_CONSTRAINT: RegistryConstraint;
export declare const SAFETY_POLICY_CONSTRAINT: RegistryConstraint;
export declare const AGE_BAND_CONSTRAINT: RegistryConstraint;
export declare const MODALITY_CONSTRAINT: RegistryConstraint;
export declare const MECHANIC_IDS_CONSTRAINT: RegistryConstraint;
export declare const RULE_CATEGORY_CONSTRAINT: RegistryConstraint;
export declare const CONTENT_TYPE_CONSTRAINT: RegistryConstraint;
export declare const FORMAT_CONSTRAINT: RegistryConstraint;
export declare const OFFLINE_ONLY_CONSTRAINT: RegistryConstraint;
export declare const CREDENTIALS_FORBIDDEN_CONSTRAINT: RegistryConstraint;
export declare const SEED_SUPPORT_REQUIRED_CONSTRAINT: RegistryConstraint;
export declare const DEFAULT_REGISTRY_CONSTRAINTS: RegistryConstraint[];
//# sourceMappingURL=registry-constraints.d.ts.map