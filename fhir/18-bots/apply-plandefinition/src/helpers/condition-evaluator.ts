import { evalFhirPathTyped, toTypedValue, TypedValue } from '@medplum/core';
import { PlanDefinitionActionCondition } from '@medplum/fhirtypes';
import { JourneyContext } from './types';

/**
 * Decides whether a PlanDefinition.action should be materialized for this patient.
 *
 * Only `applicability` conditions gate inclusion. The expression is evaluated as
 * FHIRPath with:
 *   - the Patient as the evaluation root
 *   - `%profile` -> the confirmed phenotype profile (Bot input)
 *   - `%patient` -> the Patient resource
 *
 * Fail-closed: anything we cannot evaluate (unknown language, parse/runtime error)
 * resolves to `false`, so we never emit a resource off an unverified rule.
 */
export function actionApplies(
  conditions: PlanDefinitionActionCondition[] | undefined,
  ctx: JourneyContext,
): boolean {
  if (!conditions?.length) {
    return true;
  }
  return conditions
    .filter((c) => c.kind === 'applicability' && c.expression?.expression)
    .every((c) => evaluate(c, ctx));
}

function evaluate(condition: PlanDefinitionActionCondition, ctx: JourneyContext): boolean {
  const expr = condition.expression;
  if (!expr?.expression) {
    return true;
  }

  const language = expr.language ?? 'text/fhirpath';
  if (language !== 'text/fhirpath') {
    console.warn(`[apply-plandefinition] unsupported condition language "${language}" -> not applying`);
    return false;
  }

  try {
    // Variable keys MUST include the leading "%" in this @medplum/core version.
    // Conditions read the RESOLVED phenotype via %profile (an Observation when resolved
    // from fenotipo-confirmado). %patient/%subject are the Patient. NOTE: FHIRPath has no
    // reverse navigation, so `%subject.observation...` does NOT work — read %profile.
    const patientTyped = toTypedValue(ctx.patient);
    const variables: Record<string, TypedValue> = {
      '%profile': toTypedValue(ctx.profile),
      '%patient': patientTyped,
      '%subject': patientTyped,
    };
    const result = evalFhirPathTyped(expr.expression, [toTypedValue(ctx.patient)], variables);
    return toBoolean(result);
  } catch (err) {
    console.warn(
      `[apply-plandefinition] condition eval failed for "${expr.expression}": ${(err as Error).message}`,
    );
    return false;
  }
}

function toBoolean(values: TypedValue[]): boolean {
  if (!values.length) {
    return false;
  }
  if (values.length === 1) {
    const v = values[0].value;
    return typeof v === 'boolean' ? v : v !== undefined && v !== null;
  }
  return true;
}
