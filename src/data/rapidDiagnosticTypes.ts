export type BcidTargetCategory = "Gram-negative bacteria" | "Gram-positive bacteria" | "Yeast";
export type RapidDiagnosticTargetType = "group" | "species" | "complex" | "genus";
export interface RapidDiagnosticTarget { id: string; name: string; category: BcidTargetCategory; parentId?: string; scientificName?: string; targetType: RapidDiagnosticTargetType; aliases: string[] }
export type BcidPanelTarget = RapidDiagnosticTarget;
export interface RapidDiagnosticMarker { id: string; label: string; category: "Carbapenemase" | "ESBL" | "Colistin resistance" | "Methicillin resistance" | "Vancomycin resistance"; mechanismId?: string; mechanismFamily?: "Serine carbapenemase" | "Metallo-beta-lactamase" }
export type BcidResistanceMarker = RapidDiagnosticMarker;
export type MarkerAssociation = "Strongly associated in this BCID context" | "Potential association" | "Organism attribution uncertain" | "Not a typical BCID interpretation context" | "Not applicable";
export type BcidCompatibility = "primary" | "possible" | "not-applicable";
export interface BcidCompatibilityRule { organismId: string; markerId: string; compatibility: BcidCompatibility; explanation: string; sourceIds: string[] }
export interface BcidDetectedResult { organismIds: string[]; markerIds: string[] }
export interface BcidPairAssessment { organismId: string; markerId: string; compatibility: BcidCompatibility; attribution: "clear-context" | "ambiguous" | "not-applicable"; explanation: string }
export interface PanelAssociationRule { organismId: string; markerId: string; association: MarkerAssociation; explanation: string; sourceIds: string[] }
export interface RapidDiagnosticPanel { id: string; shortName: string; name: string; manufacturer: string; sampleType: string; targets: RapidDiagnosticTarget[]; markers: RapidDiagnosticMarker[]; associationRules: PanelAssociationRule[]; metadata: { totalTargets: number; bacterialTargets: number; yeastTargets: number; resistanceTargets: number; sourceIds: readonly string[]; lastVerified: string } }
