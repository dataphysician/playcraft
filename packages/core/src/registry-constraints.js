function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function getStringArrayFromRecord(record, key) {
    if (typeof record !== "object" || record === null || Array.isArray(record)) {
        return [];
    }
    const value = record[key];
    return isStringArray(value) ? value : [];
}
function getStringArray(entry, key) {
    return getStringArrayFromRecord(entry, key);
}
function contractCompatibilityForEntry(entry) {
    if (entry.kind !== "mechanic" && entry.kind !== "rule-module") {
        return undefined;
    }
    const compatibility = entry.compatibility;
    if (!isContractCompatibilityFields(compatibility)) {
        return undefined;
    }
    return compatibility;
}
function isContractCompatibilityFields(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }
    const candidate = value;
    return (isStringArray(candidate.ageBands) &&
        isStringArray(candidate.domainProfileIds) &&
        isStringArray(candidate.modalities) &&
        isStringArray(candidate.safetyPolicyIds));
}
function domainProfileIdsForEntry(entry) {
    if (entry.kind === "domain-profile") {
        return [entry.id];
    }
    if (entry.kind === "component" || entry.kind === "theme" || entry.kind === "safety-policy") {
        return getStringArray(entry, "supportedDomains");
    }
    return contractCompatibilityForEntry(entry)?.domainProfileIds ?? [];
}
function safetyPolicyIdsForEntry(entry) {
    if (entry.kind === "component") {
        return getStringArray(entry, "safetyPolicyIds");
    }
    if (entry.kind === "domain-profile" && typeof entry.defaultSafetyPolicyId === "string") {
        return [entry.defaultSafetyPolicyId];
    }
    return contractCompatibilityForEntry(entry)?.safetyPolicyIds ?? [];
}
function ageBandsForEntry(entry) {
    if (entry.kind === "mechanic" || entry.kind === "component" || entry.kind === "theme") {
        return getStringArray(entry, "supportedAgeBands");
    }
    if (entry.kind === "domain-profile" || entry.kind === "safety-policy") {
        return getStringArray(entry, "ageBands");
    }
    return contractCompatibilityForEntry(entry)?.ageBands ?? [];
}
function modalitiesForEntry(entry) {
    if (entry.kind === "mechanic") {
        return getStringArray(entry, "supportedModalities");
    }
    if (entry.kind === "domain-profile") {
        return getStringArray(entry, "modalities");
    }
    return contractCompatibilityForEntry(entry)?.modalities ?? [];
}
export const ID_CONSTRAINT = {
    kind: "ids",
    evaluate(entry, query) {
        if (query.ids && !query.ids.includes(entry.id)) {
            return [`id ${entry.id} not requested`];
        }
        return [];
    }
};
export const VERSION_CONSTRAINT = {
    kind: "version",
    evaluate(entry, query) {
        if (query.version && entry.version !== query.version) {
            return [`version ${entry.version} does not match ${query.version}`];
        }
        return [];
    }
};
export const CAPABILITY_TAGS_CONSTRAINT = {
    kind: "capability-tags",
    evaluate(entry, query) {
        const reasons = [];
        for (const capability of query.capabilityTags ?? []) {
            if (!getStringArray(entry, "capabilityTags").includes(capability)) {
                reasons.push(`missing capability ${capability}`);
            }
        }
        return reasons;
    }
};
export const RENDER_CAPABILITY_CONSTRAINT = {
    kind: "render-capability",
    evaluate(entry, query) {
        if (query.renderCapability && entry.renderCapability !== query.renderCapability) {
            return [`render capability ${String(entry.renderCapability)} does not match ${query.renderCapability}`];
        }
        return [];
    }
};
export const DOMAIN_PROFILE_CONSTRAINT = {
    kind: "domain-profile",
    evaluate(entry, query) {
        if (!query.domainProfileId)
            return [];
        const domains = domainProfileIdsForEntry(entry);
        if (domains.length > 0 && !domains.includes(query.domainProfileId)) {
            return [`domain ${query.domainProfileId} is not supported`];
        }
        return [];
    }
};
export const SAFETY_POLICY_CONSTRAINT = {
    kind: "safety-policy",
    evaluate(entry, query) {
        if (!query.safetyPolicyId)
            return [];
        const policies = safetyPolicyIdsForEntry(entry);
        if (policies.length > 0 && !policies.includes(query.safetyPolicyId)) {
            return [`safety policy ${query.safetyPolicyId} is not supported`];
        }
        return [];
    }
};
export const AGE_BAND_CONSTRAINT = {
    kind: "age-band",
    evaluate(entry, query) {
        if (!query.ageBand)
            return [];
        const ageBands = ageBandsForEntry(entry);
        if (ageBands.length > 0 && !ageBands.includes(query.ageBand)) {
            return [`age band ${query.ageBand} is not supported`];
        }
        return [];
    }
};
export const MODALITY_CONSTRAINT = {
    kind: "modality",
    evaluate(entry, query) {
        if (!query.modality)
            return [];
        const modalities = modalitiesForEntry(entry);
        if (modalities.length > 0 && !modalities.includes(query.modality)) {
            return [`modality ${query.modality} is not supported`];
        }
        return [];
    }
};
export const MECHANIC_IDS_CONSTRAINT = {
    kind: "mechanic-ids",
    evaluate(entry, query) {
        if (!query.mechanicIds)
            return [];
        const supportedMechanics = getStringArray(entry, "supportedMechanicIds");
        if (supportedMechanics.length === 0)
            return [];
        const hasCompatibleMechanic = query.mechanicIds.some((mechanicId) => supportedMechanics.includes(mechanicId));
        if (!hasCompatibleMechanic) {
            return [`none of the requested mechanics are supported`];
        }
        return [];
    }
};
export const RULE_CATEGORY_CONSTRAINT = {
    kind: "rule-category",
    evaluate(entry, query) {
        if (query.ruleCategory && entry.category !== query.ruleCategory) {
            return [`rule category ${String(entry.category)} does not match ${query.ruleCategory}`];
        }
        return [];
    }
};
export const CONTENT_TYPE_CONSTRAINT = {
    kind: "content-type",
    evaluate(entry, query) {
        if (query.contentType && !getStringArray(entry, "contentTypes").includes(query.contentType)) {
            return [`content type ${query.contentType} is not supported`];
        }
        return [];
    }
};
export const FORMAT_CONSTRAINT = {
    kind: "format",
    evaluate(entry, query) {
        if (query.format && !getStringArray(entry, "formats").includes(query.format)) {
            return [`format ${query.format} is not supported`];
        }
        return [];
    }
};
export const OFFLINE_ONLY_CONSTRAINT = {
    kind: "offline-only",
    evaluate(entry, query) {
        if (query.offlineOnly && entry.offline !== true) {
            return ["candidate is not offline"];
        }
        return [];
    }
};
export const CREDENTIALS_FORBIDDEN_CONSTRAINT = {
    kind: "credentials-forbidden",
    evaluate(entry, query) {
        if (query.credentialsForbidden && entry.requiresCredentials === true) {
            return ["candidate requires credentials"];
        }
        return [];
    }
};
export const SEED_SUPPORT_REQUIRED_CONSTRAINT = {
    kind: "seed-support-required",
    evaluate(entry, query) {
        if (query.seedSupportRequired && entry.seedSupport !== true) {
            return ["candidate does not support deterministic seeds"];
        }
        return [];
    }
};
// Iteration order is significant: constraints emit reasons in the same
// sequence as the previous imperative chain so existing rejection-string
// expectations and downstream consumers see stable output.
export const DEFAULT_REGISTRY_CONSTRAINTS = [
    ID_CONSTRAINT,
    VERSION_CONSTRAINT,
    CAPABILITY_TAGS_CONSTRAINT,
    RENDER_CAPABILITY_CONSTRAINT,
    DOMAIN_PROFILE_CONSTRAINT,
    SAFETY_POLICY_CONSTRAINT,
    AGE_BAND_CONSTRAINT,
    MODALITY_CONSTRAINT,
    MECHANIC_IDS_CONSTRAINT,
    RULE_CATEGORY_CONSTRAINT,
    CONTENT_TYPE_CONSTRAINT,
    FORMAT_CONSTRAINT,
    OFFLINE_ONLY_CONSTRAINT,
    CREDENTIALS_FORBIDDEN_CONSTRAINT,
    SEED_SUPPORT_REQUIRED_CONSTRAINT
];
//# sourceMappingURL=registry-constraints.js.map