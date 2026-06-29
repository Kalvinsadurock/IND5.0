import { db } from "../db";
import { customFieldDefinitions, customFieldOptions } from "../../shared/schema";
import { and, eq } from "drizzle-orm";

export async function validateCustomFields(
  tenantId: string,
  objectType: string,
  payload: Record<string, any>
): Promise<{ valid: boolean; errors: Array<{ field: string; error: string }> }> {
  const errors: Array<{ field: string; error: string }> = [];

  // Fetch definitions for the tenant & objectType
  const fields = await db.select().from(customFieldDefinitions).where(
    and(
      eq(customFieldDefinitions.tenantId, tenantId),
      eq(customFieldDefinitions.objectType, objectType),
      eq(customFieldDefinitions.isActive, true)
    )
  );

  for (const field of fields) {
    const value = payload ? payload[field.fieldKey] : undefined;
    const hasValue = value !== undefined && value !== null && String(value).trim() !== "";

    // 1. Requirement check
    if (field.isRequired && !hasValue) {
      errors.push({ field: field.fieldKey, error: `${field.fieldLabel} is required` });
      continue;
    }

    if (!hasValue) continue;

    const rules = (field.validationRules || {}) as any;

    // 2. Type validation
    if (field.fieldType === "number" || field.fieldType === "decimal") {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        errors.push({ field: field.fieldKey, error: `${field.fieldLabel} must be a number` });
      } else {
        if (rules.min !== undefined && numValue < rules.min) {
          errors.push({ field: field.fieldKey, error: `${field.fieldLabel} must be at least ${rules.min}` });
        }
        if (rules.max !== undefined && numValue > rules.max) {
          errors.push({ field: field.fieldKey, error: `${field.fieldLabel} cannot exceed ${rules.max}` });
        }
      }
    } else if (field.fieldType === "boolean") {
      if (typeof value !== "boolean" && value !== "true" && value !== "false") {
        errors.push({ field: field.fieldKey, error: `${field.fieldLabel} must be a boolean` });
      }
    } else if (field.fieldType === "select") {
      // Fetch allowed options for this field definition
      const options = await db.select().from(customFieldOptions).where(
        and(
          eq(customFieldOptions.fieldId, field.id),
          eq(customFieldOptions.isActive, true)
        )
      );
      const allowedValues = options.map(o => o.optionValue);
      if (allowedValues.length > 0 && !allowedValues.includes(String(value))) {
        errors.push({ field: field.fieldKey, error: `${field.fieldLabel} must be one of: ${allowedValues.join(", ")}` });
      }
    }

    // 3. Regex validation
    if (rules.regex && typeof value === "string") {
      try {
        const regex = new RegExp(rules.regex);
        if (!regex.test(value)) {
          errors.push({ field: field.fieldKey, error: rules.message || `${field.fieldLabel} format is invalid` });
        }
      } catch (e) {
        // Ignore invalid regex config
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
