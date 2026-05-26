import {
  ActivityDefinition,
  Appointment,
  CodeableConcept,
  MedicationRequest,
  PlanDefinitionAction,
  ServiceRequest,
  Task,
} from '@medplum/fhirtypes';
import { JourneyContext, RequestResource } from './types';

export interface BuildArgs {
  activityDefinition: ActivityDefinition;
  ctx: JourneyContext;
  /** Computed scheduled start (ISO-8601). */
  scheduledStart: string;
  /** Computed scheduled end (ISO-8601), if known. */
  scheduledEnd?: string;
  /** urn:uuid of the owning CarePlan within the transaction bundle. */
  carePlanFullUrl: string;
  /** Title inherited from PlanDefinition.action when the AD lacks one. */
  fallbackTitle?: string;
}

/**
 * Materializes an ActivityDefinition into the concrete request resource named by
 * `ActivityDefinition.kind`. Unknown kinds degrade to a Task so no journey step is
 * silently dropped.
 */
export function buildRequestResource(args: BuildArgs): RequestResource {
  switch (args.activityDefinition.kind) {
    case 'ServiceRequest':
      return buildServiceRequest(args);
    case 'Appointment':
      return buildAppointment(args);
    case 'MedicationRequest':
      return buildMedicationRequest(args);
    case 'Task':
      return buildTask(args);
    default:
      return buildTask(args);
  }
}

/** For PlanDefinition.action steps that have no definitionCanonical: emit a plain Task. */
export function buildTaskFromAction(
  action: PlanDefinitionAction,
  ctx: JourneyContext,
  scheduledStart: string,
  scheduledEnd: string | undefined,
  carePlanFullUrl: string,
): Task {
  return {
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    code: action.code?.[0] ?? text(action.title),
    description: action.description ?? action.title,
    for: ctx.patientRef,
    requester: ctx.author,
    authoredOn: ctx.start.toISOString(),
    basedOn: [{ reference: carePlanFullUrl }],
    restriction: { period: { start: scheduledStart, end: scheduledEnd } },
    executionPeriod: { start: scheduledStart, end: scheduledEnd },
  };
}

function buildServiceRequest(args: BuildArgs): ServiceRequest {
  const { activityDefinition: ad, ctx, scheduledStart } = args;
  return {
    resourceType: 'ServiceRequest',
    status: 'active',
    intent: 'order',
    code: ad.code ?? text(ad.title ?? args.fallbackTitle),
    subject: ctx.patientRef,
    requester: ctx.author,
    authoredOn: ctx.start.toISOString(),
    occurrenceDateTime: scheduledStart,
    bodySite: ad.bodySite,
    instantiatesCanonical: ad.url ? [ad.url] : undefined,
    basedOn: [{ reference: args.carePlanFullUrl }],
  };
}

function buildAppointment(args: BuildArgs): Appointment {
  const { activityDefinition: ad, ctx, scheduledStart, scheduledEnd } = args;
  // R4 Appointment.basedOn only permits ServiceRequest, so the CarePlan back-link
  // lives on CarePlan.activity[].reference (set by the transaction builder) instead.
  return {
    resourceType: 'Appointment',
    status: 'proposed',
    serviceType: ad.code ? [ad.code] : undefined,
    description: ad.title ?? args.fallbackTitle,
    start: scheduledStart,
    end: scheduledEnd,
    requestedPeriod: [{ start: scheduledStart, end: scheduledEnd }],
    participant: [{ actor: ctx.patientRef, status: 'needs-action', required: 'required' }],
  };
}

function buildMedicationRequest(args: BuildArgs): MedicationRequest {
  const { activityDefinition: ad, ctx, scheduledStart } = args;
  const base: MedicationRequest = {
    resourceType: 'MedicationRequest',
    status: 'active',
    intent: 'order',
    subject: ctx.patientRef,
    requester: ctx.author,
    authoredOn: ctx.start.toISOString(),
    dosageInstruction: ad.dosage,
    dispenseRequest: { validityPeriod: { start: scheduledStart } },
    basedOn: [{ reference: args.carePlanFullUrl }],
  };
  // medication[x] is a choice type: set exactly one branch.
  if (ad.productReference) {
    base.medicationReference = ad.productReference as MedicationRequest['medicationReference'];
  } else {
    base.medicationCodeableConcept = ad.productCodeableConcept ?? ad.code ?? text(ad.title);
  }
  return base;
}

function buildTask(args: BuildArgs): Task {
  const { activityDefinition: ad, ctx, scheduledStart, scheduledEnd } = args;
  return {
    resourceType: 'Task',
    status: 'requested',
    intent: 'order',
    code: ad.code ?? text(ad.title ?? args.fallbackTitle),
    description: ad.description ?? ad.title ?? args.fallbackTitle,
    for: ctx.patientRef,
    requester: ctx.author,
    authoredOn: ctx.start.toISOString(),
    basedOn: [{ reference: args.carePlanFullUrl }],
    restriction: { period: { start: scheduledStart, end: scheduledEnd } },
    executionPeriod: { start: scheduledStart, end: scheduledEnd },
  };
}

function text(value?: string): CodeableConcept | undefined {
  return value ? { text: value } : undefined;
}
