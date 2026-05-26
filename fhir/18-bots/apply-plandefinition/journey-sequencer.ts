import { Duration, PlanDefinitionAction, Range, Timing } from '@medplum/fhirtypes';

export interface ScheduledAction {
  action: PlanDefinitionAction;
  /** Offset from journey start, in ms (never negative). */
  offsetMs: number;
  /** Step duration in ms, if derivable. */
  durationMs?: number;
  /** Absolute datetime if the action pins one via timingDateTime. */
  absoluteStart?: string;
}

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  min: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  wk: 604_800_000,
  mo: 2_592_000_000, // 30d
  a: 31_536_000_000, // 365d
};

/**
 * Flattens the action tree and resolves each action's start offset relative to the
 * journey start. Ordering signals, in precedence:
 *   1. relatedAction (relationship after/before + offsetDuration|offsetRange) chained to a peer
 *   2. timingDuration (offset from start)
 *   3. timingTiming.repeat.boundsDuration (offset from start)
 *   4. timingDateTime (absolute pin; offsetMs left at 0 and surfaced as absoluteStart)
 * Cyclic relatedAction graphs are guarded and collapse to offset 0.
 */
export function sequenceActions(actions: PlanDefinitionAction[]): ScheduledAction[] {
  const flat = flatten(actions);
  const byId = new Map<string, PlanDefinitionAction>();
  for (const a of flat) {
    if (a.id) {
      byId.set(a.id, a);
    }
  }

  const cache = new Map<PlanDefinitionAction, number>();
  const inFlight = new Set<PlanDefinitionAction>();

  const offsetOf = (a: PlanDefinitionAction): number => {
    const cached = cache.get(a);
    if (cached !== undefined) {
      return cached;
    }
    if (inFlight.has(a)) {
      return 0; // cycle guard
    }
    inFlight.add(a);

    let offset = 0;
    const related = a.relatedAction?.find(
      (r) => r.relationship === 'after' || r.relationship === 'before',
    );
    if (related?.actionId && byId.has(related.actionId)) {
      const base = offsetOf(byId.get(related.actionId)!);
      const delta = durationToMs(related.offsetDuration) ?? rangeToMs(related.offsetRange) ?? 0;
      offset = related.relationship === 'before' ? base - delta : base + delta;
    } else {
      offset = timingOffsetMs(a);
    }

    inFlight.delete(a);
    cache.set(a, offset);
    return offset;
  };

  return flat.map((action) => ({
    action,
    offsetMs: Math.max(0, offsetOf(action)),
    durationMs: stepDurationMs(action),
    absoluteStart: action.timingDateTime,
  }));
}

function flatten(actions: PlanDefinitionAction[] | undefined): PlanDefinitionAction[] {
  const out: PlanDefinitionAction[] = [];
  for (const a of actions ?? []) {
    out.push(a);
    if (a.action?.length) {
      out.push(...flatten(a.action));
    }
  }
  return out;
}

function timingOffsetMs(a: PlanDefinitionAction): number {
  return (
    durationToMs(a.timingDuration) ??
    durationToMs(a.timingTiming?.repeat?.boundsDuration) ??
    0
  );
}

function stepDurationMs(a: PlanDefinitionAction): number | undefined {
  const t: Timing | undefined = a.timingTiming;
  return (
    durationToMs(t?.repeat?.boundsDuration) ??
    periodMs(a.timingPeriod?.start, a.timingPeriod?.end)
  );
}

function periodMs(start?: string, end?: string): number | undefined {
  if (!start || !end) {
    return undefined;
  }
  const ms = Date.parse(end) - Date.parse(start);
  return Number.isFinite(ms) && ms > 0 ? ms : undefined;
}

function durationToMs(d?: Duration): number | undefined {
  if (d?.value === undefined) {
    return undefined;
  }
  const unit = d.code ?? d.unit ?? 'd';
  return d.value * (UNIT_MS[unit] ?? UNIT_MS.d);
}

function rangeToMs(r?: Range): number | undefined {
  // Use the high bound as the conservative "after" offset; fall back to low.
  return durationToMs(r?.high as Duration | undefined) ?? durationToMs(r?.low as Duration | undefined);
}
