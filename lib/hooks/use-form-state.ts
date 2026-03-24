'use client';

import { useState } from 'react';

/**
 * Shared form scaffolding for create/edit modals.
 *
 * Returns:
 *   form      — current field values
 *   errors    — per-field validation messages
 *   setField  — updates a field and clears its error
 *   reset     — restores defaults (merging optional initial values) and clears errors
 *   setErrors — exposed for custom validation in the host component
 */
export function useFormState<T extends object>(
  defaults: T,
  initial?: Partial<T>,
) {
  const [form, setForm] = useState<T>({ ...defaults, ...initial } as T);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  function setField<K extends keyof T>(key: K, value: T[K]) {
    setForm((prev) => ({ ...prev, [key]: value } as T));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function reset(nextDefaults: T, nextInitial?: Partial<T>) {
    setForm({ ...nextDefaults, ...nextInitial } as T);
    setErrors({});
  }

  return { form, errors, setField, reset, setErrors };
}
