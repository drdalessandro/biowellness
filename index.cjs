"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(src_exports);

// node_modules/@medplum/core/dist/esm/index.mjs
var ot = class {
  constructor(e, t) {
    this.operator = e, this.child = t;
  }
  toString() {
    return `${this.operator}(${this.child.toString()})`;
  }
};
var ne = class {
  constructor(e, t, n) {
    this.operator = e, this.left = t, this.right = n;
  }
  toString() {
    return `(${this.left.toString()} ${this.operator} ${this.right.toString()})`;
  }
};
var st = class {
  constructor() {
    this.prefixParselets = {};
    this.infixParselets = {};
  }
  registerInfix(e, t) {
    return this.infixParselets[e] = t, this;
  }
  registerPrefix(e, t) {
    return this.prefixParselets[e] = t, this;
  }
  prefix(e, t, n) {
    return this.registerPrefix(e, { parse(i, o) {
      let s = i.consumeAndParse(t);
      return n(o, s);
    } });
  }
  infixLeft(e, t, n) {
    return this.registerInfix(e, { parse(i, o, s) {
      let a = i.consumeAndParse(t);
      return n(o, s, a);
    }, precedence: t });
  }
  construct(e) {
    return new ar(e, this.prefixParselets, this.infixParselets);
  }
};
var ar = class {
  constructor(e, t, n) {
    this.tokens = e, this.prefixParselets = t, this.infixParselets = n;
  }
  hasMore() {
    return this.tokens.length > 0;
  }
  match(e) {
    return this.peek()?.id !== e ? false : (this.consume(), true);
  }
  consumeAndParse(e = 1 / 0) {
    let t = this.consume(), n = this.prefixParselets[t.id];
    if (!n)
      throw Error(`Parse error at "${t.value}" (line ${t.line}, column ${t.column}). No matching prefix parselet.`);
    let i = n.parse(this, t);
    for (; e > this.getPrecedence(); ) {
      let o = this.consume();
      i = this.getInfixParselet(o).parse(this, i, o);
    }
    return i;
  }
  getPrecedence() {
    let e = this.peek();
    if (!e)
      return 1 / 0;
    let t = this.getInfixParselet(e);
    return t ? t.precedence : 1 / 0;
  }
  consume(e, t) {
    if (!this.tokens.length)
      throw Error("Cant consume unknown more tokens.");
    if (e && this.peek()?.id !== e) {
      let n = this.peek();
      throw Error(`Expected ${e} but got "${n.id}" (${n.value}) at line ${n.line} column ${n.column}.`);
    }
    if (t && this.peek()?.value !== t) {
      let n = this.peek();
      throw Error(`Expected "${t}" but got "${n.value}" at line ${n.line} column ${n.column}.`);
    }
    return this.tokens.shift();
  }
  peek() {
    return this.tokens.length > 0 ? this.tokens[0] : void 0;
  }
  removeComments() {
    this.tokens = this.tokens.filter((e) => e.id !== "Comment");
  }
  getInfixParselet(e) {
    return this.infixParselets[e.id === "Symbol" ? e.value : e.id];
  }
};
var Ie = class {
  constructor(e = 10) {
    this.max = e, this.cache = /* @__PURE__ */ new Map();
  }
  clear() {
    this.cache.clear();
  }
  get(e) {
    let t = this.cache.get(e);
    return t && (this.cache.delete(e), this.cache.set(e, t)), t;
  }
  set(e, t) {
    this.cache.has(e) ? this.cache.delete(e) : this.cache.size >= this.max && this.cache.delete(this.first()), this.cache.set(e, t);
  }
  delete(e) {
    this.cache.delete(e);
  }
  keys() {
    return this.cache.keys();
  }
  first() {
    return this.cache.keys().next().value;
  }
};
var fr = "unauthorized";
var ke = { resourceType: "OperationOutcome", id: fr, issue: [{ severity: "error", code: "login", details: { text: "Unauthorized" } }] };
var Rn = { ...ke, issue: [...ke.issue, { severity: "error", code: "expired", details: { text: "Token expired" } }] };
var hr = { ...ke, issue: [...ke.issue, { severity: "error", code: "invalid", details: { text: "Token not issued for this audience" } }] };
function xo(r, e) {
  let t = e.max && e.max === Number.MAX_SAFE_INTEGER ? Number.POSITIVE_INFINITY : e.max;
  return { path: r, description: "", type: e.type ?? [], min: e.min ?? 0, max: t ?? 1, isArray: !!t && t > 1, constraints: [] };
}
function On(r) {
  let e = /* @__PURE__ */ Object.create(null);
  for (let [t, n] of Object.entries(r))
    e[t] = { name: t, type: t, path: t, elements: Object.fromEntries(Object.entries(n.elements).map(([i, o]) => [i, xo(i, o)])), constraints: [], innerTypes: [] };
  return e;
}
var In = { Element: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] } } }, BackboneElement: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, modifierExtension: { max: 9007199254740991, type: [{ code: "Extension" }] } } }, Address: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, use: { type: [{ code: "code" }] }, type: { type: [{ code: "code" }] }, text: { type: [{ code: "string" }] }, line: { max: 9007199254740991, type: [{ code: "string" }] }, city: { type: [{ code: "string" }] }, district: { type: [{ code: "string" }] }, state: { type: [{ code: "string" }] }, postalCode: { type: [{ code: "string" }] }, country: { type: [{ code: "string" }] }, period: { type: [{ code: "Period" }] } } }, Age: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, value: { type: [{ code: "decimal" }] }, comparator: { type: [{ code: "code" }] }, unit: { type: [{ code: "string" }] }, system: { type: [{ code: "uri" }] }, code: { type: [{ code: "code" }] } } }, Annotation: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, "author[x]": { type: [{ code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Practitioner", "http://hl7.org/fhir/StructureDefinition/Patient", "http://hl7.org/fhir/StructureDefinition/RelatedPerson", "http://hl7.org/fhir/StructureDefinition/Organization"] }, { code: "string" }] }, time: { type: [{ code: "dateTime" }] }, text: { min: 1, type: [{ code: "markdown" }] } } }, Attachment: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, contentType: { type: [{ code: "code" }] }, language: { type: [{ code: "code" }] }, data: { type: [{ code: "base64Binary" }] }, url: { type: [{ code: "url" }] }, size: { type: [{ code: "unsignedInt" }] }, hash: { type: [{ code: "base64Binary" }] }, title: { type: [{ code: "string" }] }, creation: { type: [{ code: "dateTime" }] } } }, CodeableConcept: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, coding: { max: 9007199254740991, type: [{ code: "Coding" }] }, text: { type: [{ code: "string" }] } } }, Coding: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, system: { type: [{ code: "uri" }] }, version: { type: [{ code: "string" }] }, code: { type: [{ code: "code" }] }, display: { type: [{ code: "string" }] }, userSelected: { type: [{ code: "boolean" }] } } }, ContactDetail: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, name: { type: [{ code: "string" }] }, telecom: { max: 9007199254740991, type: [{ code: "ContactPoint" }] } } }, ContactPoint: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, system: { type: [{ code: "code" }] }, value: { type: [{ code: "string" }] }, use: { type: [{ code: "code" }] }, rank: { type: [{ code: "positiveInt" }] }, period: { type: [{ code: "Period" }] } } }, Contributor: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, type: { min: 1, type: [{ code: "code" }] }, name: { min: 1, type: [{ code: "string" }] }, contact: { max: 9007199254740991, type: [{ code: "ContactDetail" }] } } }, Count: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, value: { type: [{ code: "decimal" }] }, comparator: { type: [{ code: "code" }] }, unit: { type: [{ code: "string" }] }, system: { type: [{ code: "uri" }] }, code: { type: [{ code: "code" }] } } }, DataRequirement: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, type: { min: 1, type: [{ code: "code" }] }, profile: { max: 9007199254740991, type: [{ code: "canonical", targetProfile: ["http://hl7.org/fhir/StructureDefinition/StructureDefinition"] }] }, "subject[x]": { type: [{ code: "CodeableConcept" }, { code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Group"] }] }, mustSupport: { max: 9007199254740991, type: [{ code: "string" }] }, codeFilter: { max: 9007199254740991, type: [{ code: "DataRequirementCodeFilter" }] }, dateFilter: { max: 9007199254740991, type: [{ code: "DataRequirementDateFilter" }] }, limit: { type: [{ code: "positiveInt" }] }, sort: { max: 9007199254740991, type: [{ code: "DataRequirementSort" }] } } }, DataRequirementCodeFilter: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, path: { type: [{ code: "string" }] }, searchParam: { type: [{ code: "string" }] }, valueSet: { type: [{ code: "canonical", targetProfile: ["http://hl7.org/fhir/StructureDefinition/ValueSet"] }] }, code: { max: 9007199254740991, type: [{ code: "Coding" }] } } }, DataRequirementDateFilter: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, path: { type: [{ code: "string" }] }, searchParam: { type: [{ code: "string" }] }, "value[x]": { type: [{ code: "dateTime" }, { code: "Period" }, { code: "Duration" }] } } }, DataRequirementSort: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, path: { min: 1, type: [{ code: "string" }] }, direction: { min: 1, type: [{ code: "code" }] } } }, Distance: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, value: { type: [{ code: "decimal" }] }, comparator: { type: [{ code: "code" }] }, unit: { type: [{ code: "string" }] }, system: { type: [{ code: "uri" }] }, code: { type: [{ code: "code" }] } } }, Dosage: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, modifierExtension: { max: 9007199254740991, type: [{ code: "Extension" }] }, sequence: { type: [{ code: "integer" }] }, text: { type: [{ code: "string" }] }, additionalInstruction: { max: 9007199254740991, type: [{ code: "CodeableConcept" }] }, patientInstruction: { type: [{ code: "string" }] }, timing: { type: [{ code: "Timing" }] }, "asNeeded[x]": { type: [{ code: "boolean" }, { code: "CodeableConcept" }] }, site: { type: [{ code: "CodeableConcept" }] }, route: { type: [{ code: "CodeableConcept" }] }, method: { type: [{ code: "CodeableConcept" }] }, doseAndRate: { max: 9007199254740991, type: [{ code: "DosageDoseAndRate" }] }, maxDosePerPeriod: { type: [{ code: "Ratio" }] }, maxDosePerAdministration: { type: [{ code: "Quantity", profile: ["http://hl7.org/fhir/StructureDefinition/SimpleQuantity"] }] }, maxDosePerLifetime: { type: [{ code: "Quantity", profile: ["http://hl7.org/fhir/StructureDefinition/SimpleQuantity"] }] } } }, DosageDoseAndRate: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, type: { type: [{ code: "CodeableConcept" }] }, "dose[x]": { type: [{ code: "Range" }, { code: "Quantity", profile: ["http://hl7.org/fhir/StructureDefinition/SimpleQuantity"] }] }, "rate[x]": { type: [{ code: "Ratio" }, { code: "Range" }, { code: "Quantity", profile: ["http://hl7.org/fhir/StructureDefinition/SimpleQuantity"] }] } } }, Duration: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, value: { type: [{ code: "decimal" }] }, comparator: { type: [{ code: "code" }] }, unit: { type: [{ code: "string" }] }, system: { type: [{ code: "uri" }] }, code: { type: [{ code: "code" }] } } }, ElementDefinition: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, modifierExtension: { max: 9007199254740991, type: [{ code: "Extension" }] }, path: { min: 1, type: [{ code: "string" }] }, representation: { max: 9007199254740991, type: [{ code: "code" }] }, sliceName: { type: [{ code: "string" }] }, sliceIsConstraining: { type: [{ code: "boolean" }] }, label: { type: [{ code: "string" }] }, code: { max: 9007199254740991, type: [{ code: "Coding" }] }, slicing: { type: [{ code: "ElementDefinitionSlicing" }] }, short: { type: [{ code: "string" }] }, definition: { type: [{ code: "markdown" }] }, comment: { type: [{ code: "markdown" }] }, requirements: { type: [{ code: "markdown" }] }, alias: { max: 9007199254740991, type: [{ code: "string" }] }, min: { type: [{ code: "unsignedInt" }] }, max: { type: [{ code: "string" }] }, base: { type: [{ code: "ElementDefinitionBase" }] }, contentReference: { type: [{ code: "uri" }] }, type: { max: 9007199254740991, type: [{ code: "ElementDefinitionType" }] }, "defaultValue[x]": { type: [{ code: "base64Binary" }, { code: "boolean" }, { code: "canonical" }, { code: "code" }, { code: "date" }, { code: "dateTime" }, { code: "decimal" }, { code: "id" }, { code: "instant" }, { code: "integer" }, { code: "markdown" }, { code: "oid" }, { code: "positiveInt" }, { code: "string" }, { code: "time" }, { code: "unsignedInt" }, { code: "uri" }, { code: "url" }, { code: "uuid" }, { code: "Address" }, { code: "Age" }, { code: "Annotation" }, { code: "Attachment" }, { code: "CodeableConcept" }, { code: "Coding" }, { code: "ContactPoint" }, { code: "Count" }, { code: "Distance" }, { code: "Duration" }, { code: "HumanName" }, { code: "Identifier" }, { code: "Money" }, { code: "Period" }, { code: "Quantity" }, { code: "Range" }, { code: "Ratio" }, { code: "Reference" }, { code: "SampledData" }, { code: "Signature" }, { code: "Timing" }, { code: "ContactDetail" }, { code: "Contributor" }, { code: "DataRequirement" }, { code: "Expression" }, { code: "ParameterDefinition" }, { code: "RelatedArtifact" }, { code: "TriggerDefinition" }, { code: "UsageContext" }, { code: "Dosage" }, { code: "Meta" }] }, meaningWhenMissing: { type: [{ code: "markdown" }] }, orderMeaning: { type: [{ code: "string" }] }, "fixed[x]": { type: [{ code: "base64Binary" }, { code: "boolean" }, { code: "canonical" }, { code: "code" }, { code: "date" }, { code: "dateTime" }, { code: "decimal" }, { code: "id" }, { code: "instant" }, { code: "integer" }, { code: "markdown" }, { code: "oid" }, { code: "positiveInt" }, { code: "string" }, { code: "time" }, { code: "unsignedInt" }, { code: "uri" }, { code: "url" }, { code: "uuid" }, { code: "Address" }, { code: "Age" }, { code: "Annotation" }, { code: "Attachment" }, { code: "CodeableConcept" }, { code: "Coding" }, { code: "ContactPoint" }, { code: "Count" }, { code: "Distance" }, { code: "Duration" }, { code: "HumanName" }, { code: "Identifier" }, { code: "Money" }, { code: "Period" }, { code: "Quantity" }, { code: "Range" }, { code: "Ratio" }, { code: "Reference" }, { code: "SampledData" }, { code: "Signature" }, { code: "Timing" }, { code: "ContactDetail" }, { code: "Contributor" }, { code: "DataRequirement" }, { code: "Expression" }, { code: "ParameterDefinition" }, { code: "RelatedArtifact" }, { code: "TriggerDefinition" }, { code: "UsageContext" }, { code: "Dosage" }, { code: "Meta" }] }, "pattern[x]": { type: [{ code: "base64Binary" }, { code: "boolean" }, { code: "canonical" }, { code: "code" }, { code: "date" }, { code: "dateTime" }, { code: "decimal" }, { code: "id" }, { code: "instant" }, { code: "integer" }, { code: "markdown" }, { code: "oid" }, { code: "positiveInt" }, { code: "string" }, { code: "time" }, { code: "unsignedInt" }, { code: "uri" }, { code: "url" }, { code: "uuid" }, { code: "Address" }, { code: "Age" }, { code: "Annotation" }, { code: "Attachment" }, { code: "CodeableConcept" }, { code: "Coding" }, { code: "ContactPoint" }, { code: "Count" }, { code: "Distance" }, { code: "Duration" }, { code: "HumanName" }, { code: "Identifier" }, { code: "Money" }, { code: "Period" }, { code: "Quantity" }, { code: "Range" }, { code: "Ratio" }, { code: "Reference" }, { code: "SampledData" }, { code: "Signature" }, { code: "Timing" }, { code: "ContactDetail" }, { code: "Contributor" }, { code: "DataRequirement" }, { code: "Expression" }, { code: "ParameterDefinition" }, { code: "RelatedArtifact" }, { code: "TriggerDefinition" }, { code: "UsageContext" }, { code: "Dosage" }, { code: "Meta" }] }, example: { max: 9007199254740991, type: [{ code: "ElementDefinitionExample" }] }, "minValue[x]": { type: [{ code: "date" }, { code: "dateTime" }, { code: "instant" }, { code: "time" }, { code: "decimal" }, { code: "integer" }, { code: "positiveInt" }, { code: "unsignedInt" }, { code: "Quantity" }] }, "maxValue[x]": { type: [{ code: "date" }, { code: "dateTime" }, { code: "instant" }, { code: "time" }, { code: "decimal" }, { code: "integer" }, { code: "positiveInt" }, { code: "unsignedInt" }, { code: "Quantity" }] }, maxLength: { type: [{ code: "integer" }] }, condition: { max: 9007199254740991, type: [{ code: "id" }] }, constraint: { max: 9007199254740991, type: [{ code: "ElementDefinitionConstraint" }] }, mustSupport: { type: [{ code: "boolean" }] }, isModifier: { type: [{ code: "boolean" }] }, isModifierReason: { type: [{ code: "string" }] }, isSummary: { type: [{ code: "boolean" }] }, binding: { type: [{ code: "ElementDefinitionBinding" }] }, mapping: { max: 9007199254740991, type: [{ code: "ElementDefinitionMapping" }] } } }, ElementDefinitionSlicingDiscriminator: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, type: { min: 1, type: [{ code: "code" }] }, path: { min: 1, type: [{ code: "string" }] } } }, ElementDefinitionSlicing: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, discriminator: { max: 9007199254740991, type: [{ code: "ElementDefinitionSlicingDiscriminator" }] }, description: { type: [{ code: "string" }] }, ordered: { type: [{ code: "boolean" }] }, rules: { min: 1, type: [{ code: "code" }] } } }, ElementDefinitionBase: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, path: { min: 1, type: [{ code: "string" }] }, min: { min: 1, type: [{ code: "unsignedInt" }] }, max: { min: 1, type: [{ code: "string" }] } } }, ElementDefinitionType: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, code: { min: 1, type: [{ code: "uri" }] }, profile: { max: 9007199254740991, type: [{ code: "canonical", targetProfile: ["http://hl7.org/fhir/StructureDefinition/StructureDefinition", "http://hl7.org/fhir/StructureDefinition/ImplementationGuide"] }] }, targetProfile: { max: 9007199254740991, type: [{ code: "canonical", targetProfile: ["http://hl7.org/fhir/StructureDefinition/StructureDefinition", "http://hl7.org/fhir/StructureDefinition/ImplementationGuide"] }] }, aggregation: { max: 9007199254740991, type: [{ code: "code" }] }, versioning: { type: [{ code: "code" }] } } }, ElementDefinitionExample: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, label: { min: 1, type: [{ code: "string" }] }, "value[x]": { min: 1, type: [{ code: "base64Binary" }, { code: "boolean" }, { code: "canonical" }, { code: "code" }, { code: "date" }, { code: "dateTime" }, { code: "decimal" }, { code: "id" }, { code: "instant" }, { code: "integer" }, { code: "markdown" }, { code: "oid" }, { code: "positiveInt" }, { code: "string" }, { code: "time" }, { code: "unsignedInt" }, { code: "uri" }, { code: "url" }, { code: "uuid" }, { code: "Address" }, { code: "Age" }, { code: "Annotation" }, { code: "Attachment" }, { code: "CodeableConcept" }, { code: "Coding" }, { code: "ContactPoint" }, { code: "Count" }, { code: "Distance" }, { code: "Duration" }, { code: "HumanName" }, { code: "Identifier" }, { code: "Money" }, { code: "Period" }, { code: "Quantity" }, { code: "Range" }, { code: "Ratio" }, { code: "Reference" }, { code: "SampledData" }, { code: "Signature" }, { code: "Timing" }, { code: "ContactDetail" }, { code: "Contributor" }, { code: "DataRequirement" }, { code: "Expression" }, { code: "ParameterDefinition" }, { code: "RelatedArtifact" }, { code: "TriggerDefinition" }, { code: "UsageContext" }, { code: "Dosage" }, { code: "Meta" }] } } }, ElementDefinitionConstraint: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, key: { min: 1, type: [{ code: "id" }] }, requirements: { type: [{ code: "string" }] }, severity: { min: 1, type: [{ code: "code" }] }, human: { min: 1, type: [{ code: "string" }] }, expression: { type: [{ code: "string" }] }, xpath: { type: [{ code: "string" }] }, source: { type: [{ code: "canonical", targetProfile: ["http://hl7.org/fhir/StructureDefinition/StructureDefinition"] }] } } }, ElementDefinitionBinding: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, strength: { min: 1, type: [{ code: "code" }] }, description: { type: [{ code: "string" }] }, valueSet: { type: [{ code: "canonical", targetProfile: ["http://hl7.org/fhir/StructureDefinition/ValueSet"] }] } } }, ElementDefinitionMapping: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, identity: { min: 1, type: [{ code: "id" }] }, language: { type: [{ code: "code" }] }, map: { min: 1, type: [{ code: "string" }] }, comment: { type: [{ code: "string" }] } } }, Expression: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, description: { type: [{ code: "string" }] }, name: { type: [{ code: "id" }] }, language: { min: 1, type: [{ code: "code" }] }, expression: { type: [{ code: "string" }] }, reference: { type: [{ code: "uri" }] } } }, Extension: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, url: { min: 1, type: [{ code: "uri" }] }, "value[x]": { type: [{ code: "base64Binary" }, { code: "boolean" }, { code: "canonical" }, { code: "code" }, { code: "date" }, { code: "dateTime" }, { code: "decimal" }, { code: "id" }, { code: "instant" }, { code: "integer" }, { code: "markdown" }, { code: "oid" }, { code: "positiveInt" }, { code: "string" }, { code: "time" }, { code: "unsignedInt" }, { code: "uri" }, { code: "url" }, { code: "uuid" }, { code: "Address" }, { code: "Age" }, { code: "Annotation" }, { code: "Attachment" }, { code: "CodeableConcept" }, { code: "Coding" }, { code: "ContactPoint" }, { code: "Count" }, { code: "Distance" }, { code: "Duration" }, { code: "HumanName" }, { code: "Identifier" }, { code: "Money" }, { code: "Period" }, { code: "Quantity" }, { code: "Range" }, { code: "Ratio" }, { code: "Reference" }, { code: "SampledData" }, { code: "Signature" }, { code: "Timing" }, { code: "ContactDetail" }, { code: "Contributor" }, { code: "DataRequirement" }, { code: "Expression" }, { code: "ParameterDefinition" }, { code: "RelatedArtifact" }, { code: "TriggerDefinition" }, { code: "UsageContext" }, { code: "Dosage" }, { code: "Meta" }] } } }, HumanName: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, use: { type: [{ code: "code" }] }, text: { type: [{ code: "string" }] }, family: { type: [{ code: "string" }] }, given: { max: 9007199254740991, type: [{ code: "string" }] }, prefix: { max: 9007199254740991, type: [{ code: "string" }] }, suffix: { max: 9007199254740991, type: [{ code: "string" }] }, period: { type: [{ code: "Period" }] } } }, Identifier: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, use: { type: [{ code: "code" }] }, type: { type: [{ code: "CodeableConcept" }] }, system: { type: [{ code: "uri" }] }, value: { type: [{ code: "string" }] }, period: { type: [{ code: "Period" }] }, assigner: { type: [{ code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Organization"] }] } } }, MarketingStatus: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, modifierExtension: { max: 9007199254740991, type: [{ code: "Extension" }] }, country: { min: 1, type: [{ code: "CodeableConcept" }] }, jurisdiction: { type: [{ code: "CodeableConcept" }] }, status: { min: 1, type: [{ code: "CodeableConcept" }] }, dateRange: { min: 1, type: [{ code: "Period" }] }, restoreDate: { type: [{ code: "dateTime" }] } } }, Meta: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, versionId: { type: [{ code: "id" }] }, lastUpdated: { type: [{ code: "instant" }] }, source: { type: [{ code: "uri" }] }, profile: { max: 9007199254740991, type: [{ code: "canonical", targetProfile: ["http://hl7.org/fhir/StructureDefinition/StructureDefinition"] }] }, security: { max: 9007199254740991, type: [{ code: "Coding" }] }, tag: { max: 9007199254740991, type: [{ code: "Coding" }] }, project: { type: [{ code: "uri" }] }, author: { type: [{ code: "Reference" }] }, onBehalfOf: { type: [{ code: "Reference" }] }, account: { type: [{ code: "Reference" }] }, accounts: { max: 9007199254740991, type: [{ code: "Reference" }] }, compartment: { max: 9007199254740991, type: [{ code: "Reference" }] } } }, Money: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, value: { type: [{ code: "decimal" }] }, currency: { type: [{ code: "code" }] } } }, Narrative: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, status: { min: 1, type: [{ code: "code" }] }, div: { min: 1, type: [{ code: "xhtml" }] } } }, ParameterDefinition: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, name: { type: [{ code: "code" }] }, use: { min: 1, type: [{ code: "code" }] }, min: { type: [{ code: "integer" }] }, max: { type: [{ code: "string" }] }, documentation: { type: [{ code: "string" }] }, type: { min: 1, type: [{ code: "code" }] }, profile: { type: [{ code: "canonical", targetProfile: ["http://hl7.org/fhir/StructureDefinition/StructureDefinition"] }] } } }, Period: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, start: { type: [{ code: "dateTime" }] }, end: { type: [{ code: "dateTime" }] } } }, Population: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, modifierExtension: { max: 9007199254740991, type: [{ code: "Extension" }] }, "age[x]": { type: [{ code: "Range" }, { code: "CodeableConcept" }] }, gender: { type: [{ code: "CodeableConcept" }] }, race: { type: [{ code: "CodeableConcept" }] }, physiologicalCondition: { type: [{ code: "CodeableConcept" }] } } }, ProdCharacteristic: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, modifierExtension: { max: 9007199254740991, type: [{ code: "Extension" }] }, height: { type: [{ code: "Quantity" }] }, width: { type: [{ code: "Quantity" }] }, depth: { type: [{ code: "Quantity" }] }, weight: { type: [{ code: "Quantity" }] }, nominalVolume: { type: [{ code: "Quantity" }] }, externalDiameter: { type: [{ code: "Quantity" }] }, shape: { type: [{ code: "string" }] }, color: { max: 9007199254740991, type: [{ code: "string" }] }, imprint: { max: 9007199254740991, type: [{ code: "string" }] }, image: { max: 9007199254740991, type: [{ code: "Attachment" }] }, scoring: { type: [{ code: "CodeableConcept" }] } } }, ProductShelfLife: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, modifierExtension: { max: 9007199254740991, type: [{ code: "Extension" }] }, identifier: { type: [{ code: "Identifier" }] }, type: { min: 1, type: [{ code: "CodeableConcept" }] }, period: { min: 1, type: [{ code: "Quantity" }] }, specialPrecautionsForStorage: { max: 9007199254740991, type: [{ code: "CodeableConcept" }] } } }, Quantity: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, value: { type: [{ code: "decimal" }] }, comparator: { type: [{ code: "code" }] }, unit: { type: [{ code: "string" }] }, system: { type: [{ code: "uri" }] }, code: { type: [{ code: "code" }] } } }, Range: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, low: { type: [{ code: "Quantity", profile: ["http://hl7.org/fhir/StructureDefinition/SimpleQuantity"] }] }, high: { type: [{ code: "Quantity", profile: ["http://hl7.org/fhir/StructureDefinition/SimpleQuantity"] }] } } }, Ratio: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, numerator: { type: [{ code: "Quantity" }] }, denominator: { type: [{ code: "Quantity" }] } } }, Reference: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, reference: { type: [{ code: "string" }] }, type: { type: [{ code: "uri" }] }, identifier: { type: [{ code: "Identifier" }] }, display: { type: [{ code: "string" }] } } }, RelatedArtifact: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, type: { min: 1, type: [{ code: "code" }] }, label: { type: [{ code: "string" }] }, display: { type: [{ code: "string" }] }, citation: { type: [{ code: "markdown" }] }, url: { type: [{ code: "url" }] }, document: { type: [{ code: "Attachment" }] }, resource: { type: [{ code: "canonical", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Resource"] }] } } }, SampledData: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, origin: { min: 1, type: [{ code: "Quantity", profile: ["http://hl7.org/fhir/StructureDefinition/SimpleQuantity"] }] }, period: { min: 1, type: [{ code: "decimal" }] }, factor: { type: [{ code: "decimal" }] }, lowerLimit: { type: [{ code: "decimal" }] }, upperLimit: { type: [{ code: "decimal" }] }, dimensions: { min: 1, type: [{ code: "positiveInt" }] }, data: { type: [{ code: "string" }] } } }, Signature: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, type: { min: 1, max: 9007199254740991, type: [{ code: "Coding" }] }, when: { min: 1, type: [{ code: "instant" }] }, who: { min: 1, type: [{ code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Practitioner", "http://hl7.org/fhir/StructureDefinition/PractitionerRole", "http://hl7.org/fhir/StructureDefinition/RelatedPerson", "http://hl7.org/fhir/StructureDefinition/Patient", "http://hl7.org/fhir/StructureDefinition/Device", "http://hl7.org/fhir/StructureDefinition/Organization"] }] }, onBehalfOf: { type: [{ code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Practitioner", "http://hl7.org/fhir/StructureDefinition/PractitionerRole", "http://hl7.org/fhir/StructureDefinition/RelatedPerson", "http://hl7.org/fhir/StructureDefinition/Patient", "http://hl7.org/fhir/StructureDefinition/Device", "http://hl7.org/fhir/StructureDefinition/Organization"] }] }, targetFormat: { type: [{ code: "code" }] }, sigFormat: { type: [{ code: "code" }] }, data: { type: [{ code: "base64Binary" }] } } }, SubstanceAmount: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, modifierExtension: { max: 9007199254740991, type: [{ code: "Extension" }] }, "amount[x]": { type: [{ code: "Quantity" }, { code: "Range" }, { code: "string" }] }, amountType: { type: [{ code: "CodeableConcept" }] }, amountText: { type: [{ code: "string" }] }, referenceRange: { type: [{ code: "SubstanceAmountReferenceRange" }] } } }, SubstanceAmountReferenceRange: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, lowLimit: { type: [{ code: "Quantity" }] }, highLimit: { type: [{ code: "Quantity" }] } } }, Timing: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, modifierExtension: { max: 9007199254740991, type: [{ code: "Extension" }] }, event: { max: 9007199254740991, type: [{ code: "dateTime" }] }, repeat: { type: [{ code: "TimingRepeat" }] }, code: { type: [{ code: "CodeableConcept" }] } } }, TimingRepeat: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, "bounds[x]": { type: [{ code: "Duration" }, { code: "Range" }, { code: "Period" }] }, count: { type: [{ code: "positiveInt" }] }, countMax: { type: [{ code: "positiveInt" }] }, duration: { type: [{ code: "decimal" }] }, durationMax: { type: [{ code: "decimal" }] }, durationUnit: { type: [{ code: "code" }] }, frequency: { type: [{ code: "positiveInt" }] }, frequencyMax: { type: [{ code: "positiveInt" }] }, period: { type: [{ code: "decimal" }] }, periodMax: { type: [{ code: "decimal" }] }, periodUnit: { type: [{ code: "code" }] }, dayOfWeek: { max: 9007199254740991, type: [{ code: "code" }] }, timeOfDay: { max: 9007199254740991, type: [{ code: "time" }] }, when: { max: 9007199254740991, type: [{ code: "code" }] }, offset: { type: [{ code: "unsignedInt" }] } } }, TriggerDefinition: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, type: { min: 1, type: [{ code: "code" }] }, name: { type: [{ code: "string" }] }, "timing[x]": { type: [{ code: "Timing" }, { code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/Schedule"] }, { code: "date" }, { code: "dateTime" }] }, data: { max: 9007199254740991, type: [{ code: "DataRequirement" }] }, condition: { type: [{ code: "Expression" }] } } }, UsageContext: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, code: { min: 1, type: [{ code: "Coding" }] }, "value[x]": { min: 1, type: [{ code: "CodeableConcept" }, { code: "Quantity" }, { code: "Range" }, { code: "Reference", targetProfile: ["http://hl7.org/fhir/StructureDefinition/PlanDefinition", "http://hl7.org/fhir/StructureDefinition/ResearchStudy", "http://hl7.org/fhir/StructureDefinition/InsurancePlan", "http://hl7.org/fhir/StructureDefinition/HealthcareService", "http://hl7.org/fhir/StructureDefinition/Group", "http://hl7.org/fhir/StructureDefinition/Location", "http://hl7.org/fhir/StructureDefinition/Organization"] }] } } }, MoneyQuantity: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, value: { type: [{ code: "decimal" }] }, comparator: { type: [{ code: "code" }] }, unit: { type: [{ code: "string" }] }, system: { type: [{ code: "uri" }] }, code: { type: [{ code: "code" }] } } }, SimpleQuantity: { elements: { id: { type: [{ code: "string" }] }, extension: { max: 9007199254740991, type: [{ code: "Extension" }] }, value: { type: [{ code: "decimal" }] }, comparator: { max: 0, type: [{ code: "code" }] }, unit: { type: [{ code: "string" }] }, system: { type: [{ code: "uri" }] }, code: { type: [{ code: "code" }] } } }, IdentityProvider: { elements: { authorizeUrl: { min: 1, type: [{ code: "string" }] }, tokenUrl: { min: 1, type: [{ code: "string" }] }, tokenAuthMethod: { type: [{ code: "code" }] }, userInfoUrl: { min: 1, type: [{ code: "string" }] }, clientId: { min: 1, type: [{ code: "string" }] }, clientSecret: { min: 1, type: [{ code: "string" }] }, usePkce: { type: [{ code: "boolean" }] }, useSubject: { type: [{ code: "boolean" }] } } } };
var ye = On(In);
var kn = /* @__PURE__ */ Object.create(null);
function _n(r) {
  let e;
  return e = kn[r], e || (e = kn[r] = /* @__PURE__ */ Object.create(null)), e;
}
function je(r, e) {
  if (e) {
    let t = _n(e)[r];
    if (t)
      return t;
  }
  return ye[r];
}
var wo = new Ie(1e3);
var ft = { base64Binary: /^([A-Za-z\d+/]{4})*([A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/, canonical: /^\S*$/, code: /^[^\s]+( [^\s]+)*$/, date: /^(\d(\d(\d[1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2]\d|3[0-1]))?)?$/, dateTime: /^(\d(\d(\d[1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2]\d|3[0-1])(T([01]\d|2[0-3])(:[0-5]\d:([0-5]\d|60)(\.\d{1,9})?)?)?)?(Z|[+-]((0\d|1[0-3]):[0-5]\d|14:00)?)?)?$/, id: /^[A-Za-z0-9\-.]{1,64}$/, instant: /^(\d(\d(\d[1-9]|[1-9]0)|[1-9]00)|[1-9]000)-(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[0-1])T([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d{1,9})?(Z|[+-]((0\d|1[0-3]):[0-5]\d|14:00))$/, markdown: /^[\r\n\t\u0020-\uFFFF]+$/, oid: /^urn:oid:[0-2](\.(0|[1-9]\d*))+$/, string: /^[\r\n\t\u0020-\uFFFF]+$/, time: /^([01]\d|2[0-3]):[0-5]\d:([0-5]\d|60)(\.\d{1,9})?$/, uri: /^\S*$/, url: /^\S*$/, uuid: /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, xhtml: /.*/ };
function h(r) {
  return [{ type: l.boolean, value: r }];
}
function v(r) {
  return r == null ? { type: "undefined", value: void 0 } : Number.isSafeInteger(r) ? { type: l.integer, value: r } : typeof r == "number" ? { type: l.decimal, value: r } : typeof r == "boolean" ? { type: l.boolean, value: r } : typeof r == "string" ? { type: l.string, value: r } : w(r) ? { type: l.Quantity, value: r } : O(r) ? { type: r.resourceType, value: r } : _r(r) ? { type: l.CodeableConcept, value: r } : Mr(r) ? { type: l.Coding, value: r } : { type: l.BackboneElement, value: r };
}
function L(r) {
  return r.length === 0 ? false : !!r[0].value;
}
function H(r, e) {
  if (r.length !== 0) {
    if (r.length === 1 && (!e || r[0].type === e))
      return r[0];
    throw new Error(`Expected singleton of type ${e}, but found ${JSON.stringify(r)}`);
  }
}
function P(r, e, t) {
  if (!r.value)
    return;
  let n = xt(r.type, e, t?.profileUrl);
  return n ? Mo(r, e, n) : _o(r, e);
}
function Mo(r, e, t) {
  let n = r.value, i = t.type;
  if (!i || i.length === 0)
    return;
  let o, s = "undefined", a, c = t.path.lastIndexOf("."), u = t.path.substring(c + 1);
  for (let p of i) {
    let m = u.replace("[x]", k(p.code));
    if (o = n[m], a = n["_" + m], o !== void 0 || a !== void 0) {
      s = p.code;
      break;
    }
  }
  if (a)
    if (Array.isArray(o)) {
      o = o.slice();
      for (let p = 0; p < Math.max(o.length, a.length); p++)
        o[p] = kr(o[p], a[p]);
    } else if (!o && Array.isArray(a)) {
      o = a.slice();
      for (let p = 0; p < a.length; p++)
        o[p] = kr(void 0, a[p]);
    } else
      o = kr(o, a);
  if (!S(o))
    return (s === "Element" || s === "BackboneElement") && (s = t.type[0].code), Array.isArray(o) ? o.map((p) => qn(p, s)) : qn(o, s);
}
function qn(r, e) {
  return e === "Resource" && O(r) && (e = r.resourceType), { type: e, value: r };
}
function _o(r, e) {
  let t = r.value;
  if (!t || typeof t != "object")
    return;
  let n;
  if (e in t) {
    let i = t[e];
    Array.isArray(i) ? n = i.map(v) : n = v(i);
  } else {
    let i = e.endsWith("[x]") ? e.substring(0, e.length - 3) : e;
    for (let o of Object.values(l)) {
      let s = i + k(o);
      if (s in t) {
        let a = t[s];
        Array.isArray(a) ? n = a.map((c) => ({ type: o, value: c })) : n = { type: o, value: a };
        break;
      }
    }
  }
  if (Array.isArray(n)) {
    if (n.length === 0 || S(n[0]))
      return;
  } else if (S(n))
    return;
  return n;
}
function mt(r) {
  let e = [];
  for (let t of r) {
    let n = false;
    for (let i of e)
      if (L(Ge(t, i))) {
        n = true;
        break;
      }
    n || e.push(t);
  }
  return e;
}
function Gn(r) {
  return h(!L(r));
}
function Hn(r, e) {
  return r.length === 0 || e.length === 0 ? [] : r.length !== e.length ? h(false) : h(r.every((t, n) => L(Ge(t, e[n]))));
}
function Qn(r, e) {
  return r.length === 0 || e.length === 0 ? [] : r.length !== e.length ? h(true) : h(r.some((t, n) => !L(Ge(t, e[n]))));
}
function Ge(r, e) {
  let t = r.value?.valueOf(), n = e.value?.valueOf();
  return typeof t == "number" && typeof n == "number" ? h(Math.abs(t - n) < 1e-8) : w(t) && w(n) ? h(Kn(t, n)) : h(typeof t == "object" && typeof n == "object" ? Dr(r, e) : t === n);
}
function Vr(r, e) {
  return r.length === 0 && e.length === 0 ? h(true) : r.length !== e.length ? h(false) : (r.sort(jn), e.sort(jn), h(r.every((t, n) => L(Lo(t, e[n])))));
}
function Lo(r, e) {
  let { type: t, value: n } = r, { type: i, value: o } = e, s = n?.valueOf(), a = o?.valueOf();
  return typeof s == "number" && typeof a == "number" ? h(Math.abs(s - a) < 0.01) : w(s) && w(a) ? h(Kn(s, a)) : h(t === "Coding" && i === "Coding" ? typeof s != "object" || typeof a != "object" ? false : s.code === a.code && s.system === a.system : typeof s == "object" && typeof a == "object" ? Dr({ ...s, id: void 0 }, { ...a, id: void 0 }) : typeof s == "string" && typeof a == "string" ? s.toLowerCase() === a.toLowerCase() : s === a);
}
function jn(r, e) {
  let t = r.value?.valueOf(), n = e.value?.valueOf();
  return typeof t == "number" && typeof n == "number" ? t - n : typeof t == "string" && typeof n == "string" ? t.localeCompare(n) : 0;
}
function yt(r, e) {
  let { value: t } = r;
  if (t == null)
    return false;
  let n = e;
  switch (n.startsWith("System.") && (n = n.substring(7)), n.startsWith("FHIR.") && (n = n.substring(5)), n) {
    case "Boolean":
      return typeof t == "boolean";
    case "Decimal":
    case "Integer":
      return typeof t == "number";
    case "Date":
      return zn(t);
    case "DateTime":
      return Le(t);
    case "Time":
      return typeof t == "string" && !!/^T\d/.exec(t);
    case "Period":
      return Jn(t);
    case "Quantity":
      return w(t);
    default:
      return r.type === n || typeof t == "object" && t?.resourceType === n;
  }
}
function zn(r) {
  return typeof r == "string" && !!ft.date.exec(r);
}
function Le(r) {
  return typeof r == "string" && !!ft.dateTime.exec(r);
}
function Jn(r) {
  return !!(r && typeof r == "object" && ("start" in r && Le(r.start) || "end" in r && Le(r.end)));
}
function w(r) {
  return !!(r && typeof r == "object" && "value" in r && typeof r.value == "number");
}
function Kn(r, e) {
  return Math.abs(r.value - e.value) < 0.01 && (r.unit === e.unit || r.code === e.code || r.unit === e.code || r.code === e.unit);
}
function Dr(r, e) {
  let t = Object.keys(r), n = Object.keys(e);
  if (t.length !== n.length)
    return false;
  for (let i of t) {
    let o = r[i], s = e[i];
    if ($n(o) && $n(s)) {
      if (!Dr(o, s))
        return false;
    } else if (o !== s)
      return false;
  }
  return true;
}
function $n(r) {
  return r !== null && typeof r == "object";
}
function kr(r, e) {
  if (e) {
    if (typeof e != "object")
      throw new Error("Primitive extension must be an object");
    return Fo(r ?? {}, e);
  }
  return r;
}
function Fo(r, e) {
  return delete e.__proto__, delete e.constructor, Object.assign(r, e);
}
function Qe(r, e) {
  return O(r, e) && "id" in r && typeof r.id == "string";
}
function ge(r) {
  let e = V(r) ?? "undefined/undefined", t = Uo(r);
  return t === e ? { reference: e } : { reference: e, display: t };
}
function V(r) {
  if (q(r))
    return r.reference;
  if (Qe(r))
    return `${r.resourceType}/${r.id}`;
}
function xe(r) {
  if (r)
    return q(r) ? r.reference.split("/")[1] : r.id;
}
function No(r) {
  return r.resourceType === "Patient" || r.resourceType === "Practitioner" || r.resourceType === "RelatedPerson";
}
function Uo(r) {
  if (No(r)) {
    let e = Bo(r);
    if (e)
      return e;
  }
  if (r.resourceType === "Device") {
    let e = Wo(r);
    if (e)
      return e;
  }
  if (r.resourceType === "MedicationRequest" && r.medicationCodeableConcept)
    return He(r.medicationCodeableConcept);
  if (r.resourceType === "Subscription" && r.criteria)
    return r.criteria;
  if (r.resourceType === "User" && r.email)
    return r.email;
  if ("name" in r && r.name && typeof r.name == "string")
    return r.name;
  if ("code" in r && r.code) {
    let e = r.code;
    if (Array.isArray(e) && (e = e[0]), _r(e))
      return He(e);
    if (Jo(e))
      return e.text;
  }
  return V(r) ?? "";
}
function Bo(r) {
  let e = r.name;
  if (e && e.length > 0)
    return ze(e[0]);
}
function Wo(r) {
  let e = r.deviceName;
  if (e && e.length > 0)
    return e[0].name;
}
function vt(r, e) {
  let t = new Date(r);
  t.setUTCHours(0, 0, 0, 0);
  let n = e ? new Date(e) : /* @__PURE__ */ new Date();
  n.setUTCHours(0, 0, 0, 0);
  let i = t.getUTCFullYear(), o = t.getUTCMonth(), s = t.getUTCDate(), a = n.getUTCFullYear(), c = n.getUTCMonth(), u = n.getUTCDate(), p = a - i;
  (c < o || c === o && u < s) && p--;
  let m = a * 12 + c - (i * 12 + o);
  u < s && m--;
  let x = Math.floor((n.getTime() - t.getTime()) / (1e3 * 60 * 60 * 24));
  return { years: p, months: m, days: x };
}
function oe(r, ...e) {
  let t = r;
  for (let n = 0; n < e.length && t; n++)
    t = t?.extension?.find((i) => i.url === e[n]);
  return t;
}
function S(r) {
  if (r == null)
    return true;
  let e = typeof r;
  return e === "string" || e === "object" ? !Y(r) : false;
}
function Y(r) {
  if (r == null)
    return false;
  let e = typeof r;
  return e === "string" && r !== "" || e === "object" && ("length" in r && r.length > 0 || Object.keys(r).length > 0);
}
function R(r) {
  return r !== null && typeof r == "object";
}
function Mr(r) {
  return R(r) && "code" in r && typeof r.code == "string";
}
function _r(r) {
  return R(r) && "coding" in r && Array.isArray(r.coding) && r.coding.every(Mr);
}
function Jo(r) {
  return R(r) && "text" in r && typeof r.text == "string";
}
var ti = [];
for (let r = 0; r < 256; r++)
  ti.push(r.toString(16).padStart(2, "0"));
function k(r) {
  return r ? r.charAt(0).toUpperCase() + r.substring(1) : "";
}
function ze(r, e) {
  if (!r)
    return "";
  let t = [];
  if (r.prefix && e?.prefix !== false && t.push(...r.prefix), r.given && t.push(...r.given), r.family && t.push(r.family), r.suffix && e?.suffix !== false && t.push(...r.suffix), r.use && (e?.all || e?.use) && t.push("[" + r.use + "]"), t.length === 0) {
    let n = Te(r.text);
    if (n)
      return n;
  }
  return t.join(" ").trim();
}
function He(r) {
  if (!r)
    return "";
  let e = Te(r.text);
  return e || (r.coding ? r.coding.map((t) => pi(t)).join(", ") : "");
}
function pi(r, e) {
  let t = Te(r?.display);
  if (t) {
    let n = e ? Te(r?.code) : void 0;
    return `${t}${n ? " (" + n + ")" : ""}`;
  }
  return Te(r?.code) ?? "";
}
function Te(r) {
  return typeof r == "string" ? r : void 0;
}
var l = { Address: "Address", Age: "Age", Annotation: "Annotation", Attachment: "Attachment", BackboneElement: "BackboneElement", CodeableConcept: "CodeableConcept", Coding: "Coding", ContactDetail: "ContactDetail", ContactPoint: "ContactPoint", Contributor: "Contributor", Count: "Count", DataRequirement: "DataRequirement", Distance: "Distance", Dosage: "Dosage", Duration: "Duration", Expression: "Expression", Extension: "Extension", HumanName: "HumanName", Identifier: "Identifier", MarketingStatus: "MarketingStatus", Meta: "Meta", Money: "Money", Narrative: "Narrative", ParameterDefinition: "ParameterDefinition", Period: "Period", Population: "Population", ProdCharacteristic: "ProdCharacteristic", ProductShelfLife: "ProductShelfLife", Quantity: "Quantity", Range: "Range", Ratio: "Ratio", Reference: "Reference", RelatedArtifact: "RelatedArtifact", SampledData: "SampledData", Signature: "Signature", SubstanceAmount: "SubstanceAmount", SystemString: "http://hl7.org/fhirpath/System.String", Timing: "Timing", TriggerDefinition: "TriggerDefinition", UsageContext: "UsageContext", base64Binary: "base64Binary", boolean: "boolean", canonical: "canonical", code: "code", date: "date", dateTime: "dateTime", decimal: "decimal", id: "id", instant: "instant", integer: "integer", markdown: "markdown", oid: "oid", positiveInt: "positiveInt", string: "string", time: "time", unsignedInt: "unsignedInt", uri: "uri", url: "url", uuid: "uuid" };
function xt(r, e, t) {
  let n = je(r, t);
  if (n)
    return xs(n.elements, e);
}
function xs(r, e) {
  let t = r[e] ?? r[e + "[x]"];
  if (t)
    return t;
  for (let n = 0; n < e.length; n++) {
    let i = e[n];
    if (i >= "A" && i <= "Z") {
      let o = e.slice(0, n) + "[x]", s = r[o];
      if (s)
        return s;
    }
  }
}
function O(r, e) {
  return !(!r || typeof r != "object" || !("resourceType" in r) || e && r.resourceType !== e);
}
function q(r, e) {
  return r && typeof r == "object" && "reference" in r && typeof r.reference == "string" ? e ? r.reference.match(new RegExp(`^${e}(/|\\?)`)) !== null : true : false;
}
function Fe(r) {
  if (r.startsWith("T"))
    return r + "T00:00:00.000Z".substring(r.length);
  if (r.length <= 10)
    return r;
  try {
    return new Date(r).toISOString();
  } catch {
    return r;
  }
}
var Z = () => [];
var I = { empty: (r, e) => h(e.length === 0 || e.every((t) => S(t.value))), hasValue: (r, e) => h(e.length !== 0), exists: (r, e, t) => t ? h(e.filter((n) => L(t.eval(r, [n]))).length > 0) : h(e.length > 0 && e.every((n) => !S(n.value))), all: (r, e, t) => h(e.every((n) => L(t.eval(r, [n])))), allTrue: (r, e) => {
  for (let t of e)
    if (!t.value)
      return h(false);
  return h(true);
}, anyTrue: (r, e) => {
  for (let t of e)
    if (t.value)
      return h(true);
  return h(false);
}, allFalse: (r, e) => {
  for (let t of e)
    if (t.value)
      return h(false);
  return h(true);
}, anyFalse: (r, e) => {
  for (let t of e)
    if (!t.value)
      return h(true);
  return h(false);
}, subsetOf: (r, e, t) => {
  if (e.length === 0)
    return h(true);
  let n = t.eval(r, Se(r));
  return n.length === 0 ? h(false) : h(e.every((i) => n.some((o) => o.value === i.value)));
}, supersetOf: (r, e, t) => {
  let n = t.eval(r, Se(r));
  return n.length === 0 ? h(true) : e.length === 0 ? h(false) : h(n.every((i) => e.some((o) => o.value === i.value)));
}, count: (r, e) => [{ type: l.integer, value: e.length }], distinct: (r, e) => {
  let t = [];
  for (let n of e)
    t.some((i) => i.value === n.value) || t.push(n);
  return t;
}, isDistinct: (r, e) => h(e.length === I.distinct(r, e).length), where: (r, e, t) => e.filter((n) => L(t.eval(r, [n]))), select: (r, e, t) => e.map((n) => t.eval({ parent: r, variables: { $this: n } }, [n])).flat(), repeat: Z, ofType: (r, e, t) => e.filter((n) => n.type === t.name), single: (r, e) => {
  if (e.length > 1)
    throw new Error("Expected input length one for single()");
  return e.length === 0 ? [] : e.slice(0, 1);
}, first: (r, e) => e.length === 0 ? [] : e.slice(0, 1), last: (r, e) => e.length === 0 ? [] : e.slice(e.length - 1, e.length), tail: (r, e) => e.length === 0 ? [] : e.slice(1, e.length), skip: (r, e, t) => {
  let n = t.eval(r, e)[0]?.value;
  if (typeof n != "number")
    throw new Error("Expected a number for skip(num)");
  return n >= e.length ? [] : n <= 0 ? e : e.slice(n, e.length);
}, take: (r, e, t) => {
  let n = t.eval(r, e)[0]?.value;
  if (typeof n != "number")
    throw new Error("Expected a number for take(num)");
  return n >= e.length ? e : n <= 0 ? [] : e.slice(0, n);
}, intersect: (r, e, t) => {
  if (!t)
    return e;
  let n = t.eval(r, Se(r)), i = [];
  for (let o of e)
    !i.some((s) => s.value === o.value) && n.some((s) => s.value === o.value) && i.push(o);
  return i;
}, exclude: (r, e, t) => {
  if (!t)
    return e;
  let n = t.eval(r, Se(r)), i = [];
  for (let o of e)
    n.some((s) => s.value === o.value) || i.push(o);
  return i;
}, union: (r, e, t) => {
  if (!t)
    return e;
  let n = t.eval(r, Se(r));
  return mt([...e, ...n]);
}, combine: (r, e, t) => {
  if (!t)
    return e;
  let n = t.eval(r, Se(r));
  return [...e, ...n];
}, htmlChecks: (r, e, t) => [v(true)], iif: (r, e, t, n, i) => {
  let o = t.eval(r, e);
  if (o.length > 1 || o.length === 1 && typeof o[0].value != "boolean")
    throw new Error("Expected criterion to evaluate to a Boolean");
  return L(o) ? n.eval(r, e) : i ? i.eval(r, e) : [];
}, toBoolean: (r, e) => {
  if (e.length === 0)
    return [];
  let [{ value: t }] = J(e, 1);
  if (typeof t == "boolean")
    return [{ type: l.boolean, value: t }];
  if (typeof t == "number" && (t === 0 || t === 1))
    return h(!!t);
  if (typeof t == "string") {
    let n = t.toLowerCase();
    if (["true", "t", "yes", "y", "1", "1.0"].includes(n))
      return h(true);
    if (["false", "f", "no", "n", "0", "0.0"].includes(n))
      return h(false);
  }
  return [];
}, convertsToBoolean: (r, e) => e.length === 0 ? [] : h(I.toBoolean(r, e).length === 1), toInteger: (r, e) => {
  if (e.length === 0)
    return [];
  let [{ value: t }] = J(e, 1);
  return typeof t == "number" ? [{ type: l.integer, value: t }] : typeof t == "string" && /^[+-]?\d+$/.exec(t) ? [{ type: l.integer, value: parseInt(t, 10) }] : typeof t == "boolean" ? [{ type: l.integer, value: t ? 1 : 0 }] : [];
}, convertsToInteger: (r, e) => e.length === 0 ? [] : h(I.toInteger(r, e).length === 1), toDate: (r, e) => {
  if (e.length === 0)
    return [];
  let [{ value: t }] = J(e, 1);
  return typeof t == "string" && /^\d{4}(-\d{2}(-\d{2})?)?/.exec(t) ? [{ type: l.date, value: Fe(t) }] : [];
}, convertsToDate: (r, e) => e.length === 0 ? [] : h(I.toDate(r, e).length === 1), toDateTime: (r, e) => {
  if (e.length === 0)
    return [];
  let [{ value: t }] = J(e, 1);
  return typeof t == "string" && /^\d{4}(-\d{2}(-\d{2})?)?/.exec(t) ? [{ type: l.dateTime, value: Fe(t) }] : [];
}, convertsToDateTime: (r, e) => e.length === 0 ? [] : h(I.toDateTime(r, e).length === 1), toDecimal: (r, e) => {
  if (e.length === 0)
    return [];
  let [{ value: t }] = J(e, 1);
  return typeof t == "number" ? [{ type: l.decimal, value: t }] : typeof t == "string" && /^-?\d{1,9}(\.\d{1,9})?$/.exec(t) ? [{ type: l.decimal, value: parseFloat(t) }] : typeof t == "boolean" ? [{ type: l.decimal, value: t ? 1 : 0 }] : [];
}, convertsToDecimal: (r, e) => e.length === 0 ? [] : h(I.toDecimal(r, e).length === 1), toQuantity: (r, e) => {
  if (e.length === 0)
    return [];
  let [{ value: t }] = J(e, 1);
  return w(t) ? [{ type: l.Quantity, value: t }] : typeof t == "number" ? [{ type: l.Quantity, value: { value: t, unit: "1" } }] : typeof t == "string" && /^-?\d{1,9}(\.\d{1,9})?/.exec(t) ? [{ type: l.Quantity, value: { value: parseFloat(t), unit: "1" } }] : typeof t == "boolean" ? [{ type: l.Quantity, value: { value: t ? 1 : 0, unit: "1" } }] : [];
}, convertsToQuantity: (r, e) => e.length === 0 ? [] : h(I.toQuantity(r, e).length === 1), toString: (r, e) => {
  if (e.length === 0)
    return [];
  let [{ value: t }] = J(e, 1);
  return t == null ? [] : w(t) ? [{ type: l.string, value: `${t.value} '${t.unit}'` }] : [{ type: l.string, value: t.toString() }];
}, convertsToString: (r, e) => e.length === 0 ? [] : h(I.toString(r, e).length === 1), toTime: (r, e) => {
  if (e.length === 0)
    return [];
  let [{ value: t }] = J(e, 1);
  if (typeof t == "string") {
    let n = /^T?(\d{2}(:\d{2}(:\d{2})?)?)/.exec(t);
    if (n)
      return [{ type: l.time, value: Fe("T" + n[1]) }];
  }
  return [];
}, convertsToTime: (r, e) => e.length === 0 ? [] : h(I.toTime(r, e).length === 1), indexOf: (r, e, t) => N((n, i) => n.indexOf(i), r, e, t), substring: (r, e, t, n) => N((i, o, s) => {
  let a = o, c = s ? a + s : i.length;
  return a < 0 || a >= i.length ? void 0 : i.substring(a, c);
}, r, e, t, n), startsWith: (r, e, t) => N((n, i) => n.startsWith(i), r, e, t), endsWith: (r, e, t) => N((n, i) => n.endsWith(i), r, e, t), contains: (r, e, t) => N((n, i) => n.includes(i), r, e, t), upper: (r, e) => N((t) => t.toUpperCase(), r, e), lower: (r, e) => N((t) => t.toLowerCase(), r, e), replace: (r, e, t, n) => N((i, o, s) => i.replaceAll(o, s), r, e, t, n), matches: (r, e, t) => N((n, i) => !!new RegExp(i).exec(n), r, e, t), replaceMatches: (r, e, t, n) => N((i, o, s) => i.replaceAll(new RegExp(o, "g"), s.replaceAll(/\$\{(\w+)\}/g, "$<$1>")), r, e, t, n), length: (r, e) => N((t) => t.length, r, e), toChars: (r, e) => N((t) => t ? t.split("") : void 0, r, e), encode: Z, decode: Z, escape: Z, unescape: Z, trim: Z, split: Z, join: (r, e, t) => {
  let n = t?.eval(r, Se(r))[0]?.value ?? "";
  if (typeof n != "string")
    throw new Error("Separator must be a string.");
  return [{ type: l.string, value: e.map((i) => i.value?.toString() ?? "").join(n) }];
}, abs: (r, e) => z(Math.abs, r, e), ceiling: (r, e) => z(Math.ceil, r, e), exp: (r, e) => z(Math.exp, r, e), floor: (r, e) => z(Math.floor, r, e), ln: (r, e) => z(Math.log, r, e), log: (r, e, t) => z((n, i) => Math.log(n) / Math.log(i), r, e, t), power: (r, e, t) => z(Math.pow, r, e, t), round: (r, e, ...t) => z((n, i = 0) => {
  if (typeof i != "number" || i < 0)
    throw new Error("Invalid precision provided to round()");
  let o = Math.pow(10, i);
  return Math.round(n * o) / o;
}, r, e, ...t), sqrt: (r, e) => z(Math.sqrt, r, e), truncate: (r, e) => z((t) => t | 0, r, e), children: Z, descendants: Z, trace: (r, e, t) => e, now: () => [{ type: l.dateTime, value: (/* @__PURE__ */ new Date()).toISOString() }], timeOfDay: () => [{ type: l.time, value: (/* @__PURE__ */ new Date()).toISOString().substring(11) }], today: () => [{ type: l.date, value: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10) }], between: (r, e, t, n, i) => {
  let o = I.toDateTime(r, t.eval(r, e));
  if (o.length === 0)
    throw new Error("Invalid start date");
  let s = I.toDateTime(r, n.eval(r, e));
  if (s.length === 0)
    throw new Error("Invalid end date");
  let a = i.eval(r, e)[0]?.value;
  if (a !== "years" && a !== "months" && a !== "days")
    throw new Error("Invalid units");
  let c = vt(o[0].value, s[0].value);
  return [{ type: l.Quantity, value: { value: c[a], unit: a } }];
}, is: (r, e, t) => {
  let n = "";
  return t instanceof $ ? n = t.name : t instanceof le && (n = t.left.name + "." + t.right.name), n ? e.map((i) => ({ type: l.boolean, value: yt(i, n) })) : [];
}, not: (r, e) => I.toBoolean(r, e).map((t) => ({ type: l.boolean, value: !t.value })), resolve: (r, e) => e.map((t) => {
  let n = t.value, i;
  if (typeof n == "string")
    i = n;
  else if (typeof n == "object") {
    let o = n;
    if (o.resource)
      return v(o.resource);
    o.reference ? i = o.reference : o.type && o.identifier && (i = `${o.type}?identifier=${o.identifier.system}|${o.identifier.value}`);
  }
  if (i?.includes("?")) {
    let [o] = i.split("?");
    return { type: o, value: { resourceType: o } };
  }
  if (i?.includes("/")) {
    let [o, s] = i.split("/");
    return { type: o, value: { resourceType: o, id: s } };
  }
  return { type: l.BackboneElement, value: void 0 };
}).filter((t) => !!t.value), as: (r, e) => e, type: (r, e) => e.map(({ value: t }) => typeof t == "boolean" ? { type: l.BackboneElement, value: { namespace: "System", name: "Boolean" } } : typeof t == "number" ? { type: l.BackboneElement, value: { namespace: "System", name: "Integer" } } : O(t) ? { type: l.BackboneElement, value: { namespace: "FHIR", name: t.resourceType } } : { type: l.BackboneElement, value: null }), conformsTo: (r, e, t) => {
  let n = t.eval(r, e)[0].value;
  if (!n.startsWith("http://hl7.org/fhir/StructureDefinition/"))
    throw new Error("Expected a StructureDefinition URL");
  let i = n.replace("http://hl7.org/fhir/StructureDefinition/", "");
  return e.map((o) => ({ type: l.boolean, value: o.value?.resourceType === i }));
}, getResourceKey: (r, e) => {
  let t = e[0].value;
  return t?.id ? [{ type: l.id, value: t.id }] : [];
}, getReferenceKey: (r, e, t) => {
  let n = e[0].value;
  if (!n?.reference)
    return [];
  let i = "";
  return t instanceof $ && (i = t.name), i && !n.reference.startsWith(i + "/") ? [] : [{ type: l.id, value: xe(n) }];
}, extension: (r, e, t) => {
  let n = t.eval(r, e)[0].value, i = e?.[0]?.value;
  if (i) {
    let o = oe(i, n);
    if (o)
      return [{ type: l.Extension, value: o }];
  }
  return [];
} };
function N(r, e, t, ...n) {
  if (t.length === 0)
    return [];
  let [{ value: i }] = J(t, 1);
  if (typeof i != "string")
    throw new Error("String function cannot be called with non-string");
  let o = n.map((a) => a?.eval(e, t)[0]?.value), s = r(i, ...o);
  return s === void 0 ? [] : Array.isArray(s) ? s.map(v) : [v(s)];
}
function z(r, e, t, ...n) {
  if (t.length === 0)
    return [];
  let [{ value: i }] = J(t, 1), o = w(i), s = o ? i.value : i;
  if (typeof s != "number")
    throw new Error("Math function cannot be called with non-number");
  let a = r(s, ...n.map((p) => p.eval(e, t)[0]?.value)), c = o ? l.Quantity : t[0].type, u = o ? { ...i, value: a } : a;
  return [{ type: c, value: u }];
}
function J(r, e) {
  if (r.length !== e)
    throw new Error(`Expected ${e} arguments`);
  for (let t of r)
    if (t == null)
      throw new Error("Expected non-null argument");
  return r;
}
function Se(r) {
  let e = r;
  for (; e.parent?.variables.$this; )
    e = e.parent;
  return [e.variables.$this];
}
var U = class {
  constructor(e) {
    this.value = e;
  }
  eval() {
    return [this.value];
  }
  toString() {
    let e = this.value.value;
    return typeof e == "string" ? `'${e}'` : e.toString();
  }
};
var $ = class {
  constructor(e) {
    this.name = e;
  }
  eval(e, t) {
    if (this.name === "$this")
      return t;
    let n = this.getVariable(e);
    if (n)
      return [n];
    if (this.name.startsWith("%"))
      throw new Error(`Undefined variable ${this.name}`);
    return t.flatMap((i) => this.evalValue(i)).filter((i) => i?.value !== void 0);
  }
  getVariable(e) {
    let t = e.variables[this.name];
    if (t !== void 0)
      return t;
    if (e.parent)
      return this.getVariable(e.parent);
  }
  evalValue(e) {
    let t = e.value;
    if (!(!t || typeof t != "object"))
      return O(t, this.name) ? e : P(e, this.name);
  }
  toString() {
    return this.name;
  }
};
var Et = class {
  eval() {
    return [];
  }
  toString() {
    return "{}";
  }
};
var Rt = class extends ot {
  constructor(e, t, n) {
    super(e, t), this.impl = n;
  }
  eval(e, t) {
    return this.impl(this.child.eval(e, t));
  }
  toString() {
    return this.operator + this.child.toString();
  }
};
var pe = class extends ne {
  constructor(e, t) {
    super("as", e, t);
  }
  eval(e, t) {
    return I.ofType(e, this.left.eval(e, t), this.right);
  }
};
var C = class extends ne {
};
var D = class extends C {
  constructor(e, t, n, i) {
    super(e, t, n), this.impl = i;
  }
  eval(e, t) {
    let n = this.left.eval(e, t);
    if (n.length !== 1)
      return [];
    let i = this.right.eval(e, t);
    if (i.length !== 1)
      return [];
    let o = n[0].value, s = i[0].value, a = w(o) ? o.value : o, c = w(s) ? s.value : s, u = this.impl(a, c);
    return typeof u == "boolean" ? h(u) : w(o) ? [{ type: l.Quantity, value: { ...o, value: u } }] : [v(u)];
  }
};
var Ct = class extends ne {
  constructor(e, t) {
    super("&", e, t);
  }
  eval(e, t) {
    let n = this.left.eval(e, t), i = this.right.eval(e, t), o = [...n, ...i];
    return o.length > 0 && o.every((s) => typeof s.value == "string") ? [{ type: l.string, value: o.map((s) => s.value).join("") }] : o;
  }
};
var Pt = class extends C {
  constructor(e, t) {
    super("contains", e, t);
  }
  eval(e, t) {
    let n = this.left.eval(e, t), i = this.right.eval(e, t);
    return h(n.some((o) => o.value === i[0].value));
  }
};
var wt = class extends C {
  constructor(e, t) {
    super("in", e, t);
  }
  eval(e, t) {
    let n = H(this.left.eval(e, t)), i = this.right.eval(e, t);
    return n ? h(i.some((o) => Ge(n, o)[0].value)) : [];
  }
};
var le = class extends ne {
  constructor(e, t) {
    super(".", e, t);
  }
  eval(e, t) {
    return this.right.eval(e, this.left.eval(e, t));
  }
  toString() {
    return `${this.left.toString()}.${this.right.toString()}`;
  }
};
var be = class extends ne {
  constructor(e, t) {
    super("|", e, t);
  }
  eval(e, t) {
    let n = this.left.eval(e, t), i = this.right.eval(e, t);
    return mt([...n, ...i]);
  }
};
var At = class extends C {
  constructor(e, t) {
    super("=", e, t);
  }
  eval(e, t) {
    let n = this.left.eval(e, t), i = this.right.eval(e, t);
    return Hn(n, i);
  }
};
var Ot = class extends C {
  constructor(e, t) {
    super("!=", e, t);
  }
  eval(e, t) {
    let n = this.left.eval(e, t), i = this.right.eval(e, t);
    return Qn(n, i);
  }
};
var It = class extends C {
  constructor(e, t) {
    super("~", e, t);
  }
  eval(e, t) {
    let n = this.left.eval(e, t), i = this.right.eval(e, t);
    return Vr(n, i);
  }
};
var kt = class extends C {
  constructor(e, t) {
    super("!~", e, t);
  }
  eval(e, t) {
    let n = this.left.eval(e, t), i = this.right.eval(e, t);
    return Gn(Vr(n, i));
  }
};
var Ee = class extends C {
  constructor(e, t) {
    super("is", e, t);
  }
  eval(e, t) {
    let n = this.left.eval(e, t);
    if (n.length !== 1)
      return [];
    let i = this.right.name;
    return h(yt(n[0], i));
  }
};
var Vt = class extends C {
  constructor(e, t) {
    super("and", e, t);
  }
  eval(e, t) {
    let n = H(this.left.eval(e, t), "boolean"), i = H(this.right.eval(e, t), "boolean");
    return n?.value === true && i?.value === true ? h(true) : n?.value === false || i?.value === false ? h(false) : [];
  }
};
var Dt = class extends C {
  constructor(e, t) {
    super("or", e, t);
  }
  eval(e, t) {
    let n = H(this.left.eval(e, t), "boolean"), i = H(this.right.eval(e, t), "boolean");
    return n?.value === false && i?.value === false ? h(false) : n?.value || i?.value ? h(true) : [];
  }
};
var Mt = class extends C {
  constructor(e, t) {
    super("xor", e, t);
  }
  eval(e, t) {
    let n = H(this.left.eval(e, t), "boolean"), i = H(this.right.eval(e, t), "boolean");
    return !n || !i ? [] : h(n.value !== i.value);
  }
};
var _t = class extends C {
  constructor(e, t) {
    super("implies", e, t);
  }
  eval(e, t) {
    let n = H(this.left.eval(e, t), "boolean"), i = H(this.right.eval(e, t), "boolean");
    return i?.value === true || n?.value === false ? h(true) : !n || !i ? [] : h(false);
  }
};
var ee = class {
  constructor(e, t) {
    this.name = e, this.args = t;
  }
  eval(e, t) {
    let n = I[this.name];
    if (!n)
      throw new Error("Unrecognized function: " + this.name);
    return n(e, t, ...this.args);
  }
  toString() {
    return `${this.name}(${this.args.map((e) => e.toString()).join(", ")})`;
  }
};
var Re = class {
  constructor(e, t) {
    this.left = e, this.expr = t;
  }
  eval(e, t) {
    let n = this.expr.eval(e, t);
    if (n.length !== 1)
      return [];
    let i = n[0].value;
    if (typeof i != "number")
      throw new Error("Invalid indexer expression: should return integer}");
    let o = this.left.eval(e, t);
    return i in o ? [o[i]] : [];
  }
  toString() {
    return `${this.left.toString()}[${this.expr.toString()}]`;
  }
};
var Ke = ["!=", "!~", "<=", ">=", "{}", "->"];
var g = { FunctionCall: 0, Dot: 1, Indexer: 2, UnaryAdd: 3, UnarySubtract: 3, Multiply: 4, Divide: 4, IntegerDivide: 4, Modulo: 4, Add: 5, Subtract: 5, Ampersand: 5, Is: 6, As: 6, Union: 7, GreaterThan: 8, GreaterThanOrEquals: 8, LessThan: 8, LessThanOrEquals: 8, Equals: 9, Equivalent: 9, NotEquals: 9, NotEquivalent: 9, In: 10, Contains: 10, And: 11, Xor: 12, Or: 12, Implies: 13, Arrow: 100, Semicolon: 200 };
var bs = { parse(r) {
  let e = r.consumeAndParse();
  if (!r.match(")"))
    throw new Error("Parse error: expected `)` got `" + r.peek()?.value + "`");
  return e;
} };
var Es = { parse(r, e) {
  let t = r.consumeAndParse();
  if (!r.match("]"))
    throw new Error("Parse error: expected `]`");
  return new Re(e, t);
}, precedence: g.Indexer };
var Rs = { parse(r, e) {
  if (!(e instanceof $))
    throw new Error("Unexpected parentheses");
  let t = [];
  for (; !r.match(")"); )
    t.push(r.consumeAndParse()), r.match(",");
  return new ee(e.name, t);
}, precedence: g.FunctionCall };
function Cs(r) {
  let e = r.split(" "), t = parseFloat(e[0]), n = e[1];
  return n?.startsWith("'") && n.endsWith("'") ? n = n.substring(1, n.length - 1) : n = "{" + n + "}", { value: t, unit: n };
}
function Xe() {
  return new st().registerPrefix("String", { parse: (r, e) => new U({ type: l.string, value: e.value }) }).registerPrefix("DateTime", { parse: (r, e) => new U({ type: l.dateTime, value: Fe(e.value) }) }).registerPrefix("Quantity", { parse: (r, e) => new U({ type: l.Quantity, value: Cs(e.value) }) }).registerPrefix("Number", { parse: (r, e) => new U({ type: e.value.includes(".") ? l.decimal : l.integer, value: parseFloat(e.value) }) }).registerPrefix("true", { parse: () => new U({ type: l.boolean, value: true }) }).registerPrefix("false", { parse: () => new U({ type: l.boolean, value: false }) }).registerPrefix("Symbol", { parse: (r, e) => new $(e.value) }).registerPrefix("{}", { parse: () => new Et() }).registerPrefix("(", bs).registerInfix("[", Es).registerInfix("(", Rs).prefix("+", g.UnaryAdd, (r, e) => new Rt("+", e, (t) => t)).prefix("-", g.UnarySubtract, (r, e) => new D("-", e, e, (t, n) => -n)).infixLeft(".", g.Dot, (r, e, t) => new le(r, t)).infixLeft("/", g.Divide, (r, e, t) => new D("/", r, t, (n, i) => n / i)).infixLeft("*", g.Multiply, (r, e, t) => new D("*", r, t, (n, i) => n * i)).infixLeft("+", g.Add, (r, e, t) => new D("+", r, t, (n, i) => n + i)).infixLeft("-", g.Subtract, (r, e, t) => new D("-", r, t, (n, i) => n - i)).infixLeft("|", g.Union, (r, e, t) => new be(r, t)).infixLeft("=", g.Equals, (r, e, t) => new At(r, t)).infixLeft("!=", g.NotEquals, (r, e, t) => new Ot(r, t)).infixLeft("~", g.Equivalent, (r, e, t) => new It(r, t)).infixLeft("!~", g.NotEquivalent, (r, e, t) => new kt(r, t)).infixLeft("<", g.LessThan, (r, e, t) => new D("<", r, t, (n, i) => n < i)).infixLeft("<=", g.LessThanOrEquals, (r, e, t) => new D("<=", r, t, (n, i) => n <= i)).infixLeft(">", g.GreaterThan, (r, e, t) => new D(">", r, t, (n, i) => n > i)).infixLeft(">=", g.GreaterThanOrEquals, (r, e, t) => new D(">=", r, t, (n, i) => n >= i)).infixLeft("&", g.Ampersand, (r, e, t) => new Ct(r, t)).infixLeft("and", g.And, (r, e, t) => new Vt(r, t)).infixLeft("as", g.As, (r, e, t) => new pe(r, t)).infixLeft("contains", g.Contains, (r, e, t) => new Pt(r, t)).infixLeft("div", g.Divide, (r, e, t) => new D("div", r, t, (n, i) => n / i | 0)).infixLeft("in", g.In, (r, e, t) => new wt(r, t)).infixLeft("is", g.Is, (r, e, t) => new Ee(r, t)).infixLeft("mod", g.Modulo, (r, e, t) => new D("mod", r, t, (n, i) => n % i)).infixLeft("or", g.Or, (r, e, t) => new Dt(r, t)).infixLeft("xor", g.Xor, (r, e, t) => new Mt(r, t)).infixLeft("implies", g.Implies, (r, e, t) => new _t(r, t));
}
var Ps = Xe();
var f = { EQUALS: "eq", NOT_EQUALS: "ne", GREATER_THAN: "gt", LESS_THAN: "lt", GREATER_THAN_OR_EQUALS: "ge", LESS_THAN_OR_EQUALS: "le", STARTS_AFTER: "sa", ENDS_BEFORE: "eb", APPROXIMATELY: "ap", CONTAINS: "contains", STARTS_WITH: "sw", EXACT: "exact", TEXT: "text", NOT: "not", ABOVE: "above", BELOW: "below", IN: "in", NOT_IN: "not-in", OF_TYPE: "of-type", MISSING: "missing", PRESENT: "present", IDENTIFIER: "identifier", ITERATE: "iterate" };
var Ci = { contains: f.CONTAINS, exact: f.EXACT, above: f.ABOVE, below: f.BELOW, text: f.TEXT, not: f.NOT, in: f.IN, "not-in": f.NOT_IN, "of-type": f.OF_TYPE, missing: f.MISSING, identifier: f.IDENTIFIER, iterate: f.ITERATE };
var Hr = { eq: f.EQUALS, ne: f.NOT_EQUALS, lt: f.LESS_THAN, le: f.LESS_THAN_OR_EQUALS, gt: f.GREATER_THAN, ge: f.GREATER_THAN_OR_EQUALS, sa: f.STARTS_AFTER, eb: f.ENDS_BEFORE, ap: f.APPROXIMATELY, sw: f.STARTS_WITH };
var Ms = [f.MISSING, f.PRESENT];
var Pe = { READ: "read", VREAD: "vread", UPDATE: "update", DELETE: "delete", HISTORY: "history", CREATE: "create", SEARCH: "search" };
var ea = [Pe.READ, Pe.VREAD, Pe.HISTORY, Pe.SEARCH];
var A = { CSS: "text/css", DICOM: "application/dicom", FAVICON: "image/vnd.microsoft.icon", FHIR_JSON: "application/fhir+json", FORM_URL_ENCODED: "application/x-www-form-urlencoded", HL7_V2: "x-application/hl7-v2+er7", HTML: "text/html", JAVASCRIPT: "text/javascript", JSON: "application/json", JSON_PATCH: "application/json-patch+json", JWT: "application/jwt", MULTIPART_FORM_DATA: "multipart/form-data", PNG: "image/png", SCIM_JSON: "application/scim+json", SVG: "image/svg+xml", TEXT: "text/plain", TYPESCRIPT: "text/typescript", PING: "x-application/ping", XML: "text/xml", CDA_XML: "application/cda+xml", OCTET_STREAM: "application/octet-stream" };
var Fi;
Fi = Symbol.toStringTag;
var Be = { Event: typeof globalThis.Event < "u" ? globalThis.Event : void 0, ErrorEvent: void 0, CloseEvent: void 0 };
var Ae = { maxReconnectionDelay: 1e4, minReconnectionDelay: 1e3 + Math.random() * 4e3, minUptime: 5e3, reconnectionDelayGrowFactor: 1.3, connectionTimeout: 4e3, maxRetries: 1 / 0, maxEnqueuedMessages: 1 / 0, startClosed: false, debug: false };
var Sa = A.FHIR_JSON + ", */*; q=0.1";
var Ha = [...Ke, "->", "<<", ">>", "=="];
var Ja = Xe().registerInfix("->", { precedence: g.Arrow }).registerInfix(";", { precedence: g.Semicolon });
var fc = " ".repeat(2);
var mc = [...Ke, "eq", "ne", "co"];
var yc = { eq: f.EXACT, ne: f.NOT_EQUALS, co: f.CONTAINS, sw: f.STARTS_WITH, ew: void 0, gt: f.GREATER_THAN, lt: f.LESS_THAN, ge: f.GREATER_THAN_OR_EQUALS, le: f.LESS_THAN_OR_EQUALS, ap: f.APPROXIMATELY, sa: f.STARTS_AFTER, eb: f.ENDS_BEFORE, pr: f.PRESENT, po: void 0, ss: void 0, sb: void 0, in: f.IN, ni: f.NOT_IN, re: f.EQUALS, identifier: f.IDENTIFIER };
var xc = Xe();

// src/loinc-map.ts
var LOINC_MAP = {
  // ─── Biomarkers con ObservationDefinition deployada ───────────────
  "hba1c": {
    loinc: "4548-4",
    unit: "%",
    unitSystem: "http://unitsofmeasure.org",
    display: "Hemoglobina glicosilada A1c"
  },
  "lipoproteina-a": {
    loinc: "10835-7",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Lipoprote\xEDna(a)"
  },
  "homocisteina": {
    loinc: "13965-9",
    unit: "umol/L",
    unitSystem: "http://unitsofmeasure.org",
    display: "Homociste\xEDna"
  },
  "igf-1": {
    loinc: "2484-4",
    unit: "ng/mL",
    unitSystem: "http://unitsofmeasure.org",
    display: "IGF-1"
  },
  "dhea-s": {
    loinc: "2191-5",
    unit: "ug/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "DHEA-S"
  },
  "acido-urico": {
    loinc: "3084-1",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "\xC1cido \xFArico"
  },
  "cortisol-matutino": {
    loinc: "2143-6",
    unit: "ug/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Cortisol matutino"
  },
  "testosterona-total": {
    loinc: "2986-8",
    unit: "ng/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Testosterona total"
  },
  // ─── Panel metabólico básico (sin OD aún, evaluación por umbrales) ─
  "glucosa": {
    loinc: "2345-7",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Glucosa en ayunas"
  },
  "insulina": {
    loinc: "20448-7",
    unit: "uIU/mL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Insulina basal"
  },
  "homa-ir": {
    loinc: "88110-5",
    unit: "1",
    unitSystem: "http://unitsofmeasure.org",
    display: "HOMA-IR"
  },
  "colesterol-total": {
    loinc: "2093-3",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Colesterol total"
  },
  "ldl": {
    loinc: "18262-6",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Colesterol LDL"
  },
  "hdl": {
    loinc: "2085-9",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Colesterol HDL"
  },
  "trigliceridos": {
    loinc: "2571-8",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Triglic\xE9ridos"
  },
  "hs-crp": {
    loinc: "30522-7",
    unit: "mg/L",
    unitSystem: "http://unitsofmeasure.org",
    display: "Prote\xEDna C reactiva ultrasensible"
  },
  "creatinina": {
    loinc: "2160-0",
    unit: "mg/dL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Creatinina s\xE9rica"
  },
  "tsh": {
    loinc: "3016-3",
    unit: "mIU/L",
    unitSystem: "http://unitsofmeasure.org",
    display: "TSH"
  },
  "vitamina-d": {
    loinc: "1989-3",
    unit: "ng/mL",
    unitSystem: "http://unitsofmeasure.org",
    display: "Vitamina D (25-OH)"
  }
};
function getLoincMapping(linkId) {
  return LOINC_MAP[linkId];
}

// src/critical-values.ts
var CRITICAL_THRESHOLDS = {
  "glucosa": {
    criticalHigh: 250,
    criticalLow: 50,
    message: "Glucosa en rango cr\xEDtico \u2014 evaluar descompensaci\xF3n metab\xF3lica"
  },
  "hba1c": {
    criticalHigh: 9,
    message: "HbA1c muy elevada (>9%) \u2014 posible diabetes no controlada, requiere evaluaci\xF3n"
  },
  "hs-crp": {
    criticalHigh: 10,
    message: "PCR-us elevada (>10 mg/L) \u2014 proceso inflamatorio agudo, contraindicaci\xF3n temporal para terapias de hormesis"
  },
  "creatinina": {
    criticalHigh: 2,
    message: "Creatinina elevada \u2014 posible deterioro renal, revisar antes de terapias IV"
  },
  "trigliceridos": {
    criticalHigh: 500,
    message: "Triglic\xE9ridos muy elevados (>500) \u2014 riesgo de pancreatitis, requiere manejo"
  },
  "testosterona-total": {
    criticalLow: 100,
    message: "Testosterona muy baja \u2014 evaluar hipogonadismo (si paciente masculino)"
  },
  "cortisol-matutino": {
    criticalHigh: 30,
    criticalLow: 3,
    message: "Cortisol matutino fuera de rango cr\xEDtico \u2014 evaluar eje adrenal"
  }
};
function evaluateCritical(linkId, value) {
  const threshold = CRITICAL_THRESHOLDS[linkId];
  if (!threshold)
    return { critical: false };
  if (threshold.criticalHigh !== void 0 && value >= threshold.criticalHigh) {
    return { critical: true, direction: "high", message: threshold.message };
  }
  if (threshold.criticalLow !== void 0 && value <= threshold.criticalLow) {
    return { critical: true, direction: "low", message: threshold.message };
  }
  return { critical: false };
}

// src/index.ts
var QUESTIONNAIRE_URL = "https://biowellness.ar/fhir/Questionnaire/q-lab-panel-basico";
async function handler(medplum, event) {
  const qr = event.input;
  if (qr.resourceType !== "QuestionnaireResponse") {
    throw new Error(`Expected QuestionnaireResponse, got ${qr.resourceType}`);
  }
  const isLabPanel = qr.questionnaire === QUESTIONNAIRE_URL || qr.questionnaire?.includes("q-lab-panel-basico");
  if (!isLabPanel) {
    console.log(`Skipping: not a lab panel (questionnaire=${qr.questionnaire})`);
    return { created: 0, critical: 0 };
  }
  if (qr.status !== "completed" && qr.status !== "amended") {
    console.log(`Skipping: status is ${qr.status}, not completed/amended`);
    return { created: 0, critical: 0 };
  }
  const patientRef = qr.subject;
  if (!patientRef?.reference) {
    throw new Error("QuestionnaireResponse has no subject (patient) reference");
  }
  const effective = qr.authored ?? (/* @__PURE__ */ new Date()).toISOString();
  const parsed = parseValues(qr.item ?? []);
  if (parsed.length === 0) {
    console.log("No mapped lab values found in QuestionnaireResponse");
    return { created: 0, critical: 0 };
  }
  console.log(`Parsed ${parsed.length} lab values for patient ${patientRef.reference}`);
  const observations = [];
  const criticalFindings = [];
  for (const p of parsed) {
    const interpretation = await evaluateInterpretation(medplum, p);
    const crit = evaluateCritical(p.linkId, p.value);
    const obs = {
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "laboratory",
              display: "Laboratory"
            }
          ]
        }
      ],
      code: {
        coding: [{ system: "http://loinc.org", code: p.loinc, display: p.display }],
        text: p.display
      },
      subject: patientRef,
      effectiveDateTime: effective,
      valueQuantity: {
        value: p.value,
        unit: p.unit,
        system: p.unitSystem,
        code: p.unit
      },
      derivedFrom: [ge(qr)]
    };
    if (interpretation) {
      obs.interpretation = [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
              code: interpretation.code,
              display: interpretation.display
            }
          ]
        }
      ];
    }
    if (crit.critical) {
      obs.interpretation = [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
              code: crit.direction === "high" ? "HH" : "LL",
              display: crit.direction === "high" ? "Critical high" : "Critical low"
            }
          ]
        }
      ];
      criticalFindings.push({ display: p.display, value: p.value, message: crit.message });
    }
    observations.push(obs);
  }
  const entries = [];
  const obsUrns = [];
  observations.forEach((obs, i) => {
    const urn = `urn:uuid:obs-${i}`;
    obsUrns.push(urn);
    entries.push({
      fullUrl: urn,
      resource: obs,
      request: { method: "POST", url: "Observation" }
    });
  });
  const reportUrn = "urn:uuid:report";
  const report = {
    resourceType: "DiagnosticReport",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/v2-0074",
            code: "LAB",
            display: "Laboratory"
          }
        ]
      }
    ],
    code: {
      coding: [{ system: "http://loinc.org", code: "11502-2", display: "Laboratory report" }],
      text: "Panel de laboratorio BIOWELLNESS"
    },
    subject: patientRef,
    effectiveDateTime: effective,
    issued: (/* @__PURE__ */ new Date()).toISOString(),
    result: obsUrns.map((urn) => ({ reference: urn }))
  };
  entries.push({
    fullUrl: reportUrn,
    resource: report,
    request: { method: "POST", url: "DiagnosticReport" }
  });
  if (criticalFindings.length > 0) {
    const task = {
      resourceType: "Task",
      status: "requested",
      intent: "order",
      priority: "urgent",
      code: {
        coding: [
          {
            system: "https://biowellness.ar/fhir/CodeSystem/task-type",
            code: "critical-lab-review",
            display: "Revisi\xF3n urgente de laboratorio cr\xEDtico"
          }
        ]
      },
      description: `Valores cr\xEDticos detectados: ` + criticalFindings.map((f2) => `${f2.display}=${f2.value} (${f2.message})`).join("; "),
      for: patientRef,
      focus: { reference: reportUrn },
      authoredOn: (/* @__PURE__ */ new Date()).toISOString()
    };
    entries.push({
      resource: task,
      request: { method: "POST", url: "Task" }
    });
  }
  const provenance = {
    resourceType: "Provenance",
    target: [{ reference: reportUrn }, ...obsUrns.map((urn) => ({ reference: urn }))],
    recorded: (/* @__PURE__ */ new Date()).toISOString(),
    activity: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
          code: "CREATE",
          display: "create"
        }
      ]
    },
    agent: [
      {
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
              code: "assembler"
            }
          ]
        },
        who: { display: "Bot lab-ingestion" }
      }
    ],
    entity: [
      {
        role: "source",
        what: ge(qr)
      }
    ]
  };
  entries.push({
    resource: provenance,
    request: { method: "POST", url: "Provenance" }
  });
  const txBundle = {
    resourceType: "Bundle",
    type: "transaction",
    entry: entries
  };
  const result = await medplum.executeBatch(txBundle);
  const reportEntry = result.entry?.find(
    (e) => e.response?.location?.startsWith("DiagnosticReport")
  );
  const reportId = reportEntry?.response?.location?.split("/")[1];
  console.log(
    `\u2713 Created ${observations.length} Observations, 1 DiagnosticReport` + (criticalFindings.length > 0 ? `, 1 urgent Task (${criticalFindings.length} critical values)` : "")
  );
  return {
    created: observations.length,
    critical: criticalFindings.length,
    reportId
  };
}
function parseValues(items) {
  const results = [];
  const walk = (itemList) => {
    for (const item of itemList) {
      if (item.item)
        walk(item.item);
      const answer = item.answer?.[0];
      if (!answer)
        continue;
      const value = answer.valueDecimal ?? answer.valueInteger ?? answer.valueQuantity?.value;
      if (value === void 0 || value === null)
        continue;
      const mapping = getLoincMapping(item.linkId);
      if (!mapping)
        continue;
      results.push({
        linkId: item.linkId,
        value,
        loinc: mapping.loinc,
        unit: mapping.unit,
        unitSystem: mapping.unitSystem,
        display: mapping.display
      });
    }
  };
  walk(items);
  return results;
}
async function evaluateInterpretation(medplum, p) {
  try {
    const ods = await medplum.searchResources("ObservationDefinition", {
      // Medplum no indexa OD por LOINC por default; buscamos todas y filtramos.
      // Para MVP el volumen de ODs es bajo (~8), aceptable.
      _count: "50"
    });
    const od = ods.find(
      (o) => o.code?.coding?.some(
        (c) => c.system === "http://loinc.org" && c.code === p.loinc
      )
    );
    if (!od?.qualifiedInterval)
      return null;
    const refInterval = od.qualifiedInterval.find(
      (qi) => qi.context?.coding?.some((c) => c.code === "lab-reference")
    );
    if (!refInterval?.range)
      return null;
    const low = refInterval.range.low?.value;
    const high = refInterval.range.high?.value;
    if (high !== void 0 && p.value > high) {
      return { code: "H", display: "High" };
    }
    if (low !== void 0 && p.value < low) {
      return { code: "L", display: "Low" };
    }
    return { code: "N", display: "Normal" };
  } catch (err) {
    console.log(`Could not evaluate interpretation for ${p.loinc}: ${err}`);
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
/*! Bundled license information:

@medplum/core/dist/esm/index.mjs:
  (*!
   * Reconnecting WebSocket
   * by Pedro Ladaria <pedro.ladaria@gmail.com>
   * https://github.com/pladaria/reconnecting-websocket
   * License MIT
   *
   * Copy of "partysocket" from Partykit team, a fork of the original "Reconnecting WebSocket"
   * https://github.com/partykit/partykit/blob/main/packages/partysocket
   *)
*/
