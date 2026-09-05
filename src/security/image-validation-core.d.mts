export type AstImageValidation = { valid: boolean; reason: "missing" | "size" | "format" | "signature" | null };
export function validateAstImageFile(file: File): Promise<AstImageValidation>;
