import {requestSchema,validatePlan} from './schema.mjs';
import {graphRequestSchema,validateGraphPlan} from './scene-graph.mjs';
export const parseProductionRequest=raw=>raw?.requestVersion===2?graphRequestSchema.parse(raw):requestSchema.parse(raw);
export const validateProductionPlan=(raw,assets,request,context)=>raw?.schemaVersion===2?validateGraphPlan(raw,assets,request,context):validatePlan(raw,assets,request);
