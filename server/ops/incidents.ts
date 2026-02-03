import { log } from "../lib/logger";
export async function createIncident(data: any) { log.info("[Incidents] Creating incident", data); return { id: 'stub' }; }
export async function getIncidents() { return []; }
export async function resolveIncident(id: string) { return true; }
