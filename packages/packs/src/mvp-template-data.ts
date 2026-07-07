import { GameTemplateDefinitionSchema, PLAYCRAFT_SCHEMA_VERSION, type GameTemplateDefinition, type PlaycraftAssemblyRequest } from "@playcraft/contracts";
import { type AssemblyRecipe, type AssemblyRecipeBuildContext } from "@playcraft/core";
import {
  buildProfileFromTemplate, findComponentByCapability, findMechanicByCapability, findRuleByCategory, request,
  type MvpProfileTemplate
} from "./templates.js";
import {
  animalSoundPatternTemplate, cleanUpSortingTemplate, colorMemoryTemplate, colorPatternTemplate, colorSortingTemplate,
  countAlongTemplate, dailyRoutineTemplate, emotionMatchTemplate, foodSortingTemplate, habitatSortingTemplate,
  letterMemoryTemplate, memoryMatchTemplate, movementPatternTemplate, numberMemoryTemplate, patternSortingTemplate,
  pictureWordMatchTemplate, rhythmRepeatTemplate, sequenceRepeatTemplate, shapeMemoryTemplate, shapePatternTemplate,
  shapeSortingTemplate, sizeSortingTemplate, sortingTemplateProfile, soundPictureMatchTemplate
} from "./mvp-templates/index.js";

const mvpTemplates: MvpProfileTemplate[] = [
  memoryMatchTemplate, sortingTemplateProfile, sequenceRepeatTemplate, shapeMemoryTemplate, colorMemoryTemplate,
  numberMemoryTemplate, letterMemoryTemplate, emotionMatchTemplate, soundPictureMatchTemplate, colorSortingTemplate,
  shapeSortingTemplate, sizeSortingTemplate, habitatSortingTemplate, foodSortingTemplate, cleanUpSortingTemplate,
  colorPatternTemplate, rhythmRepeatTemplate, countAlongTemplate, dailyRoutineTemplate, movementPatternTemplate,
  animalSoundPatternTemplate, pictureWordMatchTemplate, patternSortingTemplate, shapePatternTemplate
];

export { mvpTemplates };

export const mvpAssemblyRequests: PlaycraftAssemblyRequest[] = mvpTemplates.map((template) =>
  request(
    `request.${template.id.slice("template.".length)}.mvp`,
    template.requestLabel, template.requestedCapabilities, template.deterministicSeed
  )
);

export const gameTemplateDefinitions: GameTemplateDefinition[] = mvpTemplates.map((template, index) =>
  GameTemplateDefinitionSchema.parse({
    schemaVersion: PLAYCRAFT_SCHEMA_VERSION, id: template.id, version: "1.0.0", kind: "game-template",
    displayName: template.profileName, displayLabel: template.displayLabel, description: template.description,
    capabilityTags: template.capabilityTags, requestAliases: template.requestAliases,
    requestAliasSummary: template.requestAliasSummary, exampleRequest: template.exampleRequest,
    assetPromptKind: template.assetPromptKind, assetEditOperations: template.assetEditOperations,
    liveSurface: template.liveSurface, assemblyRequestId: mvpAssemblyRequests[index].id, profileId: template.profileId,
    supportedAgeBands: ["2-3", "4-6", "7-9"], supportedModalities: ["touch", "pointer"],
    requiredMechanicIds: template.mechanicCapabilities.map((capability) => findMechanicByCapability(capability).id),
    requiredRuleIds: template.ruleCategories.map((category) => findRuleByCategory(category).id),
    requiredComponentIds: template.componentCapabilities.map((capability) => findComponentByCapability(capability).id),
    defaultAssetContentTypes: ["image"], localFirst: true,
    retrieval: { current: "bundled-local" }
  })
);

export const mvpAssemblyRecipes = mvpTemplates.map((template) => ({
  id: `recipe.bundled.${template.id.slice("template.".length)}`,
  version: "1.0.0",
  capabilityTags: template.capabilityTags,
  build: (context: AssemblyRecipeBuildContext) => buildProfileFromTemplate(template, context)
})) satisfies AssemblyRecipe[];
