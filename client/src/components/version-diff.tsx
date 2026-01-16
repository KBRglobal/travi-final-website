import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Minus,
  RefreshCw,
  FileText,
  Image,
  LayoutGrid,
  Type,
  HelpCircle,
  Lightbulb,
  Star,
  MousePointer,
  Video,
  Quote,
  Heading1,
  Map,
  Code,
  ArrowUpDown,
  Layers,
  Share2,
} from "lucide-react";
import type { ContentBlock, ContentVersion } from "@shared/schema";

interface VersionDiffProps {
  currentVersion: ContentVersion;
  previousVersion: ContentVersion | null;
  showFullDiff?: boolean;
}

interface FieldDiff {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
  type: "added" | "removed" | "changed" | "unchanged";
}

interface BlockDiff {
  id: string;
  type: ContentBlock["type"];
  status: "added" | "removed" | "modified" | "unchanged";
  oldBlock?: ContentBlock;
  newBlock?: ContentBlock;
}

const blockIcons: Record<string, typeof Type> = {
  hero: Image,
  image: Image,
  gallery: LayoutGrid,
  video: Video,
  map: Map,
  heading: Heading1,
  text: Type,
  highlights: Star,
  tips: Lightbulb,
  quote: Quote,
  social: Share2,
  info_grid: LayoutGrid,
  divider: Minus,
  spacer: ArrowUpDown,
  columns: Layers,
  faq: HelpCircle,
  accordion: Layers,
  tabs: Layers,
  cta: MousePointer,
  html: Code,
};

function getFieldDiff(
  field: string,
  label: string,
  oldVal: string | null | undefined,
  newVal: string | null | undefined
): FieldDiff {
  const old = oldVal || null;
  const current = newVal || null;

  if (old === null && current !== null) {
    return { field, label, oldValue: old, newValue: current, type: "added" };
  }
  if (old !== null && current === null) {
    return { field, label, oldValue: old, newValue: current, type: "removed" };
  }
  if (old !== current) {
    return { field, label, oldValue: old, newValue: current, type: "changed" };
  }
  return { field, label, oldValue: old, newValue: current, type: "unchanged" };
}

function getBlocksDiff(
  oldBlocks: ContentBlock[],
  newBlocks: ContentBlock[]
): BlockDiff[] {
  const diffs: BlockDiff[] = [];
  const oldMap: Record<string, ContentBlock> = {};
  const newMap: Record<string, ContentBlock> = {};

  // Build maps with proper id handling
  for (const b of oldBlocks) {
    if (b.id) oldMap[b.id] = b;
  }
  for (const b of newBlocks) {
    if (b.id) newMap[b.id] = b;
  }

  // Check for added and modified blocks
  for (const block of newBlocks) {
    const blockId = block.id || `block-${block.order || 0}`;
    const oldBlock = block.id ? oldMap[block.id] : undefined;
    if (!oldBlock) {
      diffs.push({
        id: blockId,
        type: block.type as ContentBlock["type"],
        status: "added",
        newBlock: block,
      });
    } else {
      const isModified =
        JSON.stringify(oldBlock.data) !== JSON.stringify(block.data) ||
        oldBlock.order !== block.order;
      diffs.push({
        id: blockId,
        type: block.type as ContentBlock["type"],
        status: isModified ? "modified" : "unchanged",
        oldBlock,
        newBlock: block,
      });
    }
  }

  // Check for removed blocks
  for (const block of oldBlocks) {
    const blockId = block.id || `block-${block.order || 0}`;
    if (block.id && !newMap[block.id]) {
      diffs.push({
        id: blockId,
        type: block.type as ContentBlock["type"],
        status: "removed",
        oldBlock: block,
      });
    }
  }

  return diffs.sort((a, b) => {
    const order = { added: 0, removed: 1, modified: 2, unchanged: 3 };
    return order[a.status] - order[b.status];
  });
}

function DiffBadge({ type }: { type: FieldDiff["type"] | BlockDiff["status"] }) {
  const config = {
    added: { label: "Added", variant: "default" as const, className: "bg-green-500/10 text-green-600 border-green-200" },
    removed: { label: "Removed", variant: "destructive" as const, className: "bg-red-500/10 text-red-600 border-red-200" },
    changed: { label: "Changed", variant: "secondary" as const, className: "bg-amber-500/10 text-amber-600 border-amber-200" },
    modified: { label: "Modified", variant: "secondary" as const, className: "bg-amber-500/10 text-amber-600 border-amber-200" },
    unchanged: { label: "Unchanged", variant: "outline" as const, className: "bg-muted/50 text-muted-foreground" },
  };

  const { label, className } = config[type];
  return (
    <Badge variant="outline" className={className}>
      {type === "added" && <Plus className="h-3 w-3 mr-1" />}
      {type === "removed" && <Minus className="h-3 w-3 mr-1" />}
      {(type === "changed" || type === "modified") && <RefreshCw className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

function FieldDiffRow({ diff }: { diff: FieldDiff }) {
  if (diff.type === "unchanged") return null;

  return (
    <div className="py-3 border-b last:border-b-0" data-testid={`diff-field-${diff.field}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{diff.label}</span>
        <DiffBadge type={diff.type} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {diff.oldValue !== null && (
          <div className="bg-red-500/5 border border-red-200 rounded-md p-2">
            <span className="text-xs text-muted-foreground block mb-1">Before</span>
            <p className="text-sm line-through text-red-600/70">
              {diff.oldValue.length > 200 ? diff.oldValue.substring(0, 200) + "..." : diff.oldValue}
            </p>
          </div>
        )}
        {diff.newValue !== null && (
          <div className="bg-green-500/5 border border-green-200 rounded-md p-2">
            <span className="text-xs text-muted-foreground block mb-1">After</span>
            <p className="text-sm text-green-600">
              {diff.newValue.length > 200 ? diff.newValue.substring(0, 200) + "..." : diff.newValue}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockDiffRow({ diff }: { diff: BlockDiff }) {
  if (diff.status === "unchanged") return null;

  const Icon = blockIcons[diff.type] || FileText;
  const blockLabel = diff.type.charAt(0).toUpperCase() + diff.type.slice(1).replace(/_/g, " ");

  return (
    <div 
      className="py-2 px-3 border rounded-md mb-2 last:mb-0 flex items-center justify-between gap-2"
      data-testid={`diff-block-${diff.id}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{blockLabel}</span>
        <span className="text-xs text-muted-foreground">#{diff.id.substring(0, 8)}</span>
      </div>
      <DiffBadge type={diff.status} />
    </div>
  );
}

export function VersionDiff({ currentVersion, previousVersion, showFullDiff = true }: VersionDiffProps) {
  const fieldDiffs = useMemo(() => {
    if (!previousVersion) {
      return [
        getFieldDiff("title", "Title", null, currentVersion.title),
        getFieldDiff("metaTitle", "Meta Title", null, currentVersion.metaTitle),
        getFieldDiff("metaDescription", "Meta Description", null, currentVersion.metaDescription),
        getFieldDiff("primaryKeyword", "Primary Keyword", null, currentVersion.primaryKeyword),
        getFieldDiff("heroImage", "Hero Image", null, currentVersion.heroImage),
        getFieldDiff("slug", "Slug", null, currentVersion.slug),
      ];
    }

    return [
      getFieldDiff("title", "Title", previousVersion.title, currentVersion.title),
      getFieldDiff("metaTitle", "Meta Title", previousVersion.metaTitle, currentVersion.metaTitle),
      getFieldDiff("metaDescription", "Meta Description", previousVersion.metaDescription, currentVersion.metaDescription),
      getFieldDiff("primaryKeyword", "Primary Keyword", previousVersion.primaryKeyword, currentVersion.primaryKeyword),
      getFieldDiff("heroImage", "Hero Image", previousVersion.heroImage, currentVersion.heroImage),
      getFieldDiff("slug", "Slug", previousVersion.slug, currentVersion.slug),
    ];
  }, [currentVersion, previousVersion]);

  const blockDiffs = useMemo(() => {
    const oldBlocks = (previousVersion?.blocks as ContentBlock[]) || [];
    const newBlocks = (currentVersion.blocks as ContentBlock[]) || [];
    return getBlocksDiff(oldBlocks, newBlocks);
  }, [currentVersion, previousVersion]);

  const changedFields = fieldDiffs.filter((d) => d.type !== "unchanged");
  const changedBlocks = blockDiffs.filter((d) => d.status !== "unchanged");
  const hasChanges = changedFields.length > 0 || changedBlocks.length > 0;

  const stats = {
    fieldsChanged: changedFields.length,
    blocksAdded: blockDiffs.filter((d) => d.status === "added").length,
    blocksRemoved: blockDiffs.filter((d) => d.status === "removed").length,
    blocksModified: blockDiffs.filter((d) => d.status === "modified").length,
  };

  return (
    <div className="space-y-4" data-testid="version-diff">
      {/* Summary Stats */}
      <div className="flex flex-wrap gap-2">
        {stats.fieldsChanged > 0 && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
            {stats.fieldsChanged} field{stats.fieldsChanged !== 1 ? "s" : ""} changed
          </Badge>
        )}
        {stats.blocksAdded > 0 && (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
            {stats.blocksAdded} block{stats.blocksAdded !== 1 ? "s" : ""} added
          </Badge>
        )}
        {stats.blocksRemoved > 0 && (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
            {stats.blocksRemoved} block{stats.blocksRemoved !== 1 ? "s" : ""} removed
          </Badge>
        )}
        {stats.blocksModified > 0 && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
            {stats.blocksModified} block{stats.blocksModified !== 1 ? "s" : ""} modified
          </Badge>
        )}
        {!hasChanges && previousVersion && (
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
            No changes detected
          </Badge>
        )}
        {!previousVersion && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
            Initial version
          </Badge>
        )}
      </div>

      {showFullDiff && hasChanges && (
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {/* SEO/Metadata Changes */}
            {changedFields.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    SEO & Metadata Changes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {changedFields.map((diff) => (
                    <FieldDiffRow key={diff.field} diff={diff} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Block Changes */}
            {changedBlocks.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Content Block Changes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {changedBlocks.map((diff) => (
                    <BlockDiffRow key={diff.id} diff={diff} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export default VersionDiff;
