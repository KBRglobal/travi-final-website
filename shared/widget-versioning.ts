/**
 * TRAVI CMS Widget Versioning System
 * 
 * Provides semantic versioning for Page Builder widgets with
 * backward compatibility checking and migration support.
 */

// Semantic version format
export interface WidgetVersion {
  major: number;
  minor: number;
  patch: number;
}

// Widget metadata with version info
export interface WidgetMetadata {
  id: string;
  type: string;
  version: WidgetVersion;
  minimumEditorVersion?: string;
  deprecatedAt?: string;
  migrateToType?: string;
}

// Version string parser
export function parseVersion(versionString: string): WidgetVersion {
  const parts = versionString.split('.').map(Number);
  return {
    major: parts[0] || 1,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

// Version string formatter
export function formatVersion(version: WidgetVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

// Compare versions: -1 if a < b, 0 if equal, 1 if a > b
export function compareVersions(a: WidgetVersion, b: WidgetVersion): number {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return 0;
}

// Check if version a is compatible with version b (same major, a >= b)
export function isCompatible(current: WidgetVersion, required: WidgetVersion): boolean {
  if (current.major !== required.major) return false;
  return compareVersions(current, required) >= 0;
}

// Migration function type
export type WidgetMigration = (widgetData: Record<string, unknown>) => Record<string, unknown>;

// Migration registry
const migrationRegistry: Map<string, WidgetMigration[]> = new Map();

// Register a migration for a widget type
export function registerMigration(
  widgetType: string,
  fromVersion: string,
  toVersion: string,
  migration: WidgetMigration
): void {
  const key = `${widgetType}:${fromVersion}->${toVersion}`;
  const existing = migrationRegistry.get(key) || [];
  existing.push(migration);
  migrationRegistry.set(key, existing);
}

// Apply migrations to upgrade a widget
export function migrateWidget(
  widgetType: string,
  currentVersion: WidgetVersion,
  targetVersion: WidgetVersion,
  data: Record<string, unknown>
): Record<string, unknown> {
  let result = { ...data };
  let version = { ...currentVersion };
  
  while (compareVersions(version, targetVersion) < 0) {
    const nextVersion = { ...version, minor: version.minor + 1 };
    const key = `${widgetType}:${formatVersion(version)}->${formatVersion(nextVersion)}`;
    
    const migrations = migrationRegistry.get(key);
    if (migrations) {
      for (const migration of migrations) {
        result = migration(result);
      }
    }
    
    version = nextVersion;
  }
  
  return result;
}

// Default widget versions
export const WIDGET_VERSIONS: Record<string, WidgetVersion> = {
  hero: { major: 1, minor: 0, patch: 0 },
  text: { major: 1, minor: 0, patch: 0 },
  image: { major: 1, minor: 0, patch: 0 },
  gallery: { major: 1, minor: 0, patch: 0 },
  faq: { major: 1, minor: 0, patch: 0 },
  cta: { major: 1, minor: 0, patch: 0 },
  info_grid: { major: 1, minor: 0, patch: 0 },
  highlights: { major: 1, minor: 0, patch: 0 },
  tips: { major: 1, minor: 0, patch: 0 },
  video: { major: 1, minor: 0, patch: 0 },
  quote: { major: 1, minor: 0, patch: 0 },
  divider: { major: 1, minor: 0, patch: 0 },
  heading: { major: 1, minor: 0, patch: 0 },
};

// Get current version for a widget type
export function getWidgetVersion(widgetType: string): WidgetVersion {
  return WIDGET_VERSIONS[widgetType] || { major: 1, minor: 0, patch: 0 };
}
