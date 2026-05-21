/**
 * BIOWELLNESS Decision Logic — Helper functions
 */

import type { Observation, QuestionnaireResponse } from '@medplum/fhirtypes';

export function computeAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function extractLatestObservation(
  observations: Observation[],
  loincCode: string,
): number | null {
  const matching = observations
    .filter((o) =>
      o.code?.coding?.some(
        (c) => c.system === 'http://loinc.org' && c.code === loincCode,
      ),
    )
    .filter((o) => o.valueQuantity?.value !== undefined)
    .sort((a, b) =>
      (b.effectiveDateTime ?? '').localeCompare(a.effectiveDateTime ?? ''),
    );

  return matching[0]?.valueQuantity?.value ?? null;
}

export function extractQuestionnaireScore(
  responses: QuestionnaireResponse[],
  questionnaireUrl: string,
  linkId: string,
): number | null {
  const qr = responses.find(
    (r) =>
      r.questionnaire === questionnaireUrl ||
      r.questionnaire?.endsWith(`/${questionnaireUrl}`),
  );
  if (!qr) return null;

  const item = findItem(qr.item ?? [], linkId);
  const value = item?.answer?.[0];

  if (value?.valueInteger !== undefined) return value.valueInteger;
  if (value?.valueDecimal !== undefined) return value.valueDecimal;
  if (value?.valueQuantity?.value !== undefined) return value.valueQuantity.value;
  return null;
}

function findItem(
  items: NonNullable<QuestionnaireResponse['item']>,
  linkId: string,
): NonNullable<QuestionnaireResponse['item']>[number] | undefined {
  for (const item of items) {
    if (item.linkId === linkId) return item;
    if (item.item) {
      const nested = findItem(item.item, linkId);
      if (nested) return nested;
    }
  }
  return undefined;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
