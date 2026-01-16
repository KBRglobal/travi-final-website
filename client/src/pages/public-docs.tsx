import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { marked } from "marked";
import { sanitizeHTML } from "@/lib/sanitize";
import {
  Book,
  ChevronRight,
  ChevronDown,
  FileText,
  Code,
  Shield,
  Rocket,
  Database,
  Settings,
  Palette,
  Users,
  Puzzle,
  Terminal,
  Menu,
  X,
  Search,
  ExternalLink,
  Copy,
  Check,
  Home,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Documentation structure
const docsStructure = {
  "Getting Started": {
    icon: Rocket,
    items: [
      { title: "Overview", path: "README" },
      { title: "Quick Start", path: "getting-started/quick-start" },
      { title: "Installation", path: "getting-started/installation" },
      { title: "Configuration", path: "getting-started/configuration" },
      { title: "Troubleshooting", path: "getting-started/troubleshooting" },
    ],
  },
  "Architecture": {
    icon: Code,
    items: [
      { title: "Overview", path: "architecture/overview" },
      { title: "System Design", path: "architecture/system-design" },
      { title: "Data Flow", path: "architecture/data-flow" },
    ],
  },
  "API Reference": {
    icon: Terminal,
    items: [
      { title: "Overview", path: "API" },
      { title: "Authentication", path: "api/authentication" },
      { title: "Endpoints", path: "api/overview" },
      { title: "Errors", path: "api/errors" },
    ],
  },
  "Database": {
    icon: Database,
    items: [
      { title: "Schema", path: "database/schema" },
      { title: "Migrations", path: "database/migrations" },
      { title: "Backup & Restore", path: "database/backup-restore" },
    ],
  },
  "Security": {
    icon: Shield,
    items: [
      { title: "Overview", path: "SECURITY" },
    ],
  },
  "Features": {
    icon: Puzzle,
    items: [
      { title: "Content Management", path: "features/contents-management" },
      { title: "AI Generation", path: "features/ai-generation" },
      { title: "Translation", path: "features/translation" },
      { title: "Newsletter", path: "features/newsletter" },
      { title: "User Roles", path: "features/user-roles" },
    ],
  },
  "Integrations": {
    icon: Settings,
    items: [
      { title: "Integration Guide", path: "INTEGRATION" },
      { title: "OpenAI", path: "integrations/openai" },
      { title: "DeepL", path: "integrations/deepl" },
      { title: "Resend", path: "integrations/resend" },
      { title: "RSS Feeds", path: "integrations/rss-feeds" },
    ],
  },
  "Development": {
    icon: Code,
    items: [
      { title: "Setup", path: "development/setup" },
      { title: "Coding Standards", path: "development/coding-standards" },
      { title: "Git Workflow", path: "development/git-workflow" },
      { title: "Testing", path: "development/testing" },
    ],
  },
  "Brand & Design": {
    icon: Palette,
    items: [
      { title: "Brand Guidelines", path: "BRAND" },
    ],
  },
  "Contributing": {
    icon: Users,
    items: [
      { title: "How to Contribute", path: "CONTRIBUTING" },
      { title: "Changelog", path: "CHANGELOG" },
    ],
  },
};

// GitBook-style styles
const gitbookStyles = `
  .docs-contents {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    line-height: 1.7;
    color: #1f2937;
  }

  .docs-contents h1 {
    font-size: 2.25rem;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
    color: #111827;
  }

  .docs-contents h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    color: #1f2937;
  }

  .docs-contents h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    color: #374151;
  }

  .docs-contents h4 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    color: #4b5563;
  }

  .docs-contents p {
    margin-bottom: 1rem;
  }

  .docs-contents ul, .docs-contents ol {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }

  .docs-contents li {
    margin-bottom: 0.5rem;
  }

  .docs-contents code {
    background-color: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: 'Fira Code', 'Monaco', monospace;
    color: #dc2626;
  }

  .docs-contents pre {
    background-color: #1f2937;
    border-radius: 0.5rem;
    padding: 1rem;
    overflow-x: auto;
    margin-bottom: 1rem;
    position: relative;
  }

  .docs-contents pre code {
    background-color: transparent;
    color: #e5e7eb;
    padding: 0;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .docs-contents blockquote {
    border-left: 4px solid #3b82f6;
    padding-left: 1rem;
    margin: 1.5rem 0;
    color: #4b5563;
    background-color: #eff6ff;
    padding: 1rem;
    border-radius: 0 0.5rem 0.5rem 0;
  }

  .docs-contents table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }

  .docs-contents th, .docs-contents td {
    border: 1px solid #e5e7eb;
    padding: 0.75rem;
    text-align: left;
  }

  .docs-contents th {
    background-color: #f9fafb;
    font-weight: 600;
  }

  .docs-contents tr:nth-child(even) {
    background-color: #f9fafb;
  }

  .docs-contents a {
    color: #3b82f6;
    text-decoration: none;
  }

  .docs-contents a:hover {
    text-decoration: underline;
  }

  .docs-contents hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 2rem 0;
  }

  .docs-contents img {
    max-width: 100%;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  /* Custom callout boxes */
  .docs-contents .callout-info {
    background-color: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 1rem;
    border-radius: 0 0.5rem 0.5rem 0;
    margin: 1rem 0;
  }

  .docs-contents .callout-warning {
    background-color: #fffbeb;
    border-left: 4px solid #f59e0b;
    padding: 1rem;
    border-radius: 0 0.5rem 0.5rem 0;
    margin: 1rem 0;
  }

  .docs-contents .callout-danger {
    background-color: #fef2f2;
    border-left: 4px solid #ef4444;
    padding: 1rem;
    border-radius: 0 0.5rem 0.5rem 0;
    margin: 1rem 0;
  }

  .docs-contents .callout-success {
    background-color: #f0fdf4;
    border-left: 4px solid #22c55e;
    padding: 1rem;
    border-radius: 0 0.5rem 0.5rem 0;
    margin: 1rem 0;
  }
`;

interface NavItem {
  title: string;
  path: string;
}

interface NavSection {
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

function Sidebar({
  currentPath,
  searchQuery,
  setSearchQuery,
  expandedSections,
  toggleSection,
  isMobileOpen,
  setMobileOpen
}: {
  currentPath: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const filteredStructure = Object.entries(docsStructure).reduce((acc, [section, data]) => {
    if (!searchQuery) {
      acc[section] = data;
      return acc;
    }

    const filteredItems = data.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.path.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filteredItems.length > 0) {
      acc[section] = { ...data, items: filteredItems };
    }

    return acc;
  }, {} as Record<string, NavSection>);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 z-50 transition-transform duration-200",
        "lg:translate-x-0 lg:z-30",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Book className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg">TRAVI Docs</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search docs..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="h-[calc(100%-8rem)]">
          <nav className="p-4 space-y-1">
            {Object.entries(filteredStructure).map(([section, data]) => {
              const Icon = data.icon;
              const isExpanded = expandedSections.has(section) || searchQuery.length > 0;

              return (
                <div key={section}>
                  <button
                    onClick={() => toggleSection(section)}
                    className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <span>{section}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {data.items.map((item) => {
                        const isActive = currentPath === item.path;
                        return (
                          <Link
                            key={item.path}
                            href={`/docs/${item.path}`}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "block px-3 py-1.5 text-sm rounded-md transition-colors",
                              isActive
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            )}
                          >
                            {item.title}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}

function DocContent({ path }: { path: string }) {
  const [contents, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadDoc() {
      setLoading(true);
      setError(null);

      try {
        // Try to fetch the markdown file
        const docPath = path.endsWith('.md') ? path : `${path}.md`;
        const response = await fetch(`/docs/${docPath}`);

        if (!response.ok) {
          throw new Error("Document not found");
        }

        const markdown = await response.text();
        const html = marked(markdown);
        setContent(html as string);
      } catch (err) {
        setError("Could not load document");
        console.error("Error loading doc:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDoc();
  }, [path]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Document Not Found</h2>
        <p className="text-gray-500 mb-4">The requested documentation page could not be loaded.</p>
        <Link href="/docs">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Docs
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <article
      className="docs-contents max-w-4xl mx-auto"
      dangerouslySetInnerHTML={{ __html: sanitizeHTML(contents) }}
    />
  );
}

export default function PublicDocs() {
  const [, params] = useRoute("/docs/:path*");
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["Getting Started"]));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentPath = params?.["path*"] || "README";

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Find current and adjacent docs for navigation
  const allDocs = Object.values(docsStructure).flatMap(section => section.items);
  const currentIndex = allDocs.findIndex(doc => doc.path === currentPath);
  const prevDoc = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Inject styles */}
      <style dangerouslySetInnerHTML={{ __html: gitbookStyles }} />

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/" className="flex items-center gap-2">
          <Book className="h-5 w-5 text-blue-600" />
          <span className="font-bold">TRAVI Docs</span>
        </Link>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Sidebar */}
      <Sidebar
        currentPath={currentPath}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        isMobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content */}
      <main className="lg:pl-72 pt-16 lg:pt-0">
        {/* Top bar */}
        <div className="sticky top-0 lg:top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between z-20">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/docs" className="hover:text-gray-700">Docs</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900">{currentPath.split('/').pop()?.replace('.md', '')}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/KBRglobal/Traviapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8 lg:px-12">
          <DocContent path={currentPath} />

          {/* Pagination */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex items-center justify-between">
            {prevDoc ? (
              <Link href={`/docs/${prevDoc.path}`}>
                <Button variant="ghost" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {prevDoc.title}
                </Button>
              </Link>
            ) : <div />}

            {nextDoc && (
              <Link href={`/docs/${nextDoc.path}`}>
                <Button variant="ghost" className="gap-2">
                  {nextDoc.title}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 px-6 py-8 lg:px-12 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} TRAVI. All rights reserved.</p>
          <p className="mt-1">Built with love for travelers.</p>
        </footer>
      </main>
    </div>
  );
}
