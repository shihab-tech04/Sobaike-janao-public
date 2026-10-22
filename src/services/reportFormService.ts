import type { PublicPublishedForm, PublicPublishedFormField } from './taxonomyService';

export interface PublishedFieldOption {
  value: string;
  labelEn: string;
  labelBn: string;
}

/** Only fields explicitly published for the citizen UI may collect answers. */
export function getVisibleCustomFields(form?: PublicPublishedForm): PublicPublishedFormField[] {
  if (!form || form.engineMode !== 'schema') return [];
  return form.fields
    .filter((field) => {
      const config = field.config as { publicVisible?: boolean } | null;
      return field.active === true && field.storageMode === 'custom_json'
        && config?.publicVisible !== false && Boolean(field.storageKey);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getFieldOptions(field: PublicPublishedFormField): PublishedFieldOption[] {
  if (!Array.isArray(field.options)) return [];
  return field.options.filter((item): item is PublishedFieldOption => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<PublishedFieldOption>;
    return typeof candidate.value === 'string'
      && typeof candidate.labelEn === 'string'
      && typeof candidate.labelBn === 'string';
  });
}

/** Accept only currently published answer keys and options, rejecting stale drafts. */
export function validateConfiguredAnswers(
  form: PublicPublishedForm,
  answers: Record<string, unknown> = {},
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of getVisibleCustomFields(form)) {
    const raw = answers[field.storageKey];
    const missing = raw === null || raw === undefined || raw === '';
    if (field.required && missing) {
      errors[field.storageKey] = 'required';
      continue;
    }
    if (missing) continue;
    if (field.fieldType === 'select' || field.fieldType === 'radio') {
      if (typeof raw !== 'string' || !getFieldOptions(field).some((option) => option.value === raw)) {
        errors[field.storageKey] = 'invalid_option';
      }
    } else if (field.fieldType === 'text' || field.fieldType === 'textarea') {
      const validation = (field.validation || {}) as { maxLength?: number };
      if (typeof raw !== 'string' || (typeof validation.maxLength === 'number' && raw.length > validation.maxLength)) {
        errors[field.storageKey] = 'invalid_text';
      }
    } else {
      // Unsupported dynamic field kinds must not be sent by the Public client.
      errors[field.storageKey] = 'unsupported_field';
    }
  }
  return errors;
}

export function publishedCustomAnswers(
  form: PublicPublishedForm,
  answers: Record<string, unknown> = {},
): Record<string, unknown> {
  const accepted: Record<string, unknown> = {};
  for (const field of getVisibleCustomFields(form)) {
    if (answers[field.storageKey] !== undefined && answers[field.storageKey] !== '') {
      accepted[field.storageKey] = answers[field.storageKey];
    }
  }
  return accepted;
}
