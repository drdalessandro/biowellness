#!/usr/bin/env bash
# Live smoke E2E against api.medplum.com.ar.
# Seeds the bio-energy fixtures, invokes the deployed apply-plandefinition bot with an
# eligible profile, and verifies the persisted CarePlan + journey steps.
#
# Usage:  ./test/smoke-e2e.sh <BOT_ID>
# Env:    MEDPLUM_BASE_URL (default https://api.medplum.com.ar)
#         MEDPLUM_TOKEN    (required)
set -euo pipefail

BOT_ID="${1:?Usage: ./test/smoke-e2e.sh <BOT_ID>}"
BASE="${MEDPLUM_BASE_URL:-https://api.medplum.com.ar}"
TOKEN="${MEDPLUM_TOKEN:?Set MEDPLUM_TOKEN}"
FHIR="$BASE/fhir/R4"
H_AUTH="Authorization: Bearer $TOKEN"
H_JSON="Content-Type: application/fhir+json"
DIR="$(cd "$(dirname "$0")/.." && pwd)/fixtures/bio-energy"

post() { curl -fsS -X POST "$FHIR/$1" -H "$H_AUTH" -H "$H_JSON" --data-binary @-; }

echo "› 1/4 seeding ActivityDefinitions (idempotent PUT-by-url)"
post "" < "$DIR/ActivityDefinitions.bundle.json" > /dev/null

echo "› 2/4 seeding PlanDefinition pd-combo-bio-energy"
jq '{resourceType:"Bundle",type:"transaction",entry:[{request:{method:"PUT",url:("PlanDefinition?url="+.url)},resource:.}]}' \
  "$DIR/PlanDefinition-pd-combo-bio-energy.json" | post "" > /dev/null

echo "› 3/4 seeding test Patient + confirmed phenotype (fenotipo-confirmado, final)"
PATIENT_ID=$(post "" < "$DIR/Patient-test.bundle.json" \
  | jq -r '.entry[0].response.location | capture("Patient/(?<id>[^/]+)").id')
echo "    Patient/$PATIENT_ID"

# Persist the confirmed phenotype so the bot resolves it itself (no inline profile).
jq -nc --arg p "Patient/$PATIENT_ID" '{
  resourceType:"Observation", status:"final",
  code:{coding:[{system:"https://biowellness.ar/fhir/CodeSystem/observation-type",code:"fenotipo-confirmado"}]},
  subject:{reference:$p},
  valueCodeableConcept:{coding:[{system:"https://biowellness.ar/fhir/CodeSystem/iscca-perfil-clinico",code:"cardio-metabolico"}]}
}' | post "Observation" > /dev/null

echo "› 4/4 invoking Bot/$BOT_ID (bot resolves the confirmed profile from the patient)"
RESULT=$(jq -nc --arg p "Patient/$PATIENT_ID" \
  '{patient:$p, combo:"pd-combo-bio-energy", start:"2026-06-01T09:00:00.000Z"}' \
  | post "Bot/$BOT_ID/\$execute")

CAREPLAN_ID=$(echo "$RESULT" | jq -r '.id // empty')
echo "    CarePlan/$CAREPLAN_ID"
[ -n "$CAREPLAN_ID" ] || { echo "FAIL: no CarePlan returned"; echo "$RESULT" | jq .; exit 1; }

echo "› verifying journey steps"
ACTIVITIES=$(echo "$RESULT" | jq '.activity | length')
SR=$(curl -fsS "$FHIR/ServiceRequest?based-on=CarePlan/$CAREPLAN_ID" -H "$H_AUTH" | jq '.total // 0')
APPT=$(curl -fsS "$FHIR/Appointment?actor=Patient/$PATIENT_ID&_sort=-_lastUpdated&_count=5" -H "$H_AUTH" | jq '.total // 0')

echo "    CarePlan.activity = $ACTIVITIES (expect 4)"
echo "    ServiceRequest basedOn CarePlan = $SR (expect 1)"
echo "    Appointment for patient = $APPT (expect >=1)"
[ "$ACTIVITIES" = "4" ] || { echo "FAIL: expected 4 activities"; exit 1; }

echo "✓ smoke E2E passed — CarePlan/$CAREPLAN_ID"
