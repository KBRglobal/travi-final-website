/**
 * Writers Management Page
 * 
 * Admin interface for managing AI writers
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WriterCard } from "@/components/writers/WriterCard";
import { 
  Users, 
  Search, 
  Grid, 
  List, 
  TrendingUp,
  FileText,
  Eye,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AIWriter {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  nationality: string;
  age: number;
  expertise: string[];
  personality: string;
  writingStyle: string;
  shortBio: string;
  contentTypes: string[];
  languages: string[];
  isActive: boolean;
  articleCount: number;
}

interface WriterStats {
  writerId: string;
  name: string;
  totalAssignments: number;
  completed: number;
  isActive: boolean;
}

export default function WritersManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Fetch all writers
  const { data: writersData, isLoading } = useQuery({
    queryKey: ['writers'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/writers');
      return response.json() as Promise<{ writers: AIWriter[]; total: number }>;
    },
  });

  // Fetch writer statistics
  const { data: statsData } = useQuery({
    queryKey: ['writer-stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/writers/stats');
      return response.json() as Promise<{ stats: WriterStats[] }>;
    },
  });

  const writers = writersData?.writers || [];
  const stats = statsData?.stats || [];

  // Filter writers
  const filteredWriters = writers.filter(writer => {
    const matchesSearch = 
      writer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      writer.expertise.some(exp => exp.toLowerCase().includes(searchQuery.toLowerCase())) ||
      writer.nationality.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = 
      filterActive === 'all' ||
      (filterActive === 'active' && writer.isActive) ||
      (filterActive === 'inactive' && !writer.isActive);

    return matchesSearch && matchesFilter;
  });

  // Calculate totals
  const totalArticles = writers.reduce((sum, w) => sum + w.articleCount, 0);
  const activeWriters = writers.filter(w => w.isActive).length;
  const totalAssignments = stats.reduce((sum, s) => sum + s.totalAssignments, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI Writers Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your virtual newsroom of 10 AI writers
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/writers/newsroom">
              <BarChart3 className="mr-2 h-4 w-4" />
              Newsroom Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/writers/newsroom">
              <FileText className="mr-2 h-4 w-4" />
              Assignments
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Writers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{writers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeWriters} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArticles}</div>
            <p className="text-xs text-muted-foreground">
              Across all writers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. per Writer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {writers.length > 0 ? Math.round(totalArticles / writers.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Articles written
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search writers by name, expertise, or nationality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={filterActive} onValueChange={(v) => setFilterActive(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading writers...
            </div>
          ) : filteredWriters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No writers found
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-4"
            }>
              {filteredWriters.map((writer) => (
                <WriterCard
                  key={writer.id}
                  writer={writer}
                  showActions={false}
                  variant={viewMode === 'grid' ? 'default' : 'detailed'}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Performers
          </CardTitle>
          <CardDescription>
            Writers with the most completed assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats
              .sort((a, b) => b.completed - a.completed)
              .slice(0, 5)
              .map((stat, index) => {
                const writer = writers.find(w => w.id === stat.writerId);
                if (!writer) return null;

                return (
                  <div key={stat.writerId} className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-muted-foreground w-8">
                      #{index + 1}
                    </div>
                    <WriterCard
                      writer={writer}
                      variant="compact"
                      showActions={false}
                    />
                    <div className="ml-auto text-right">
                      <div className="text-lg font-bold">{stat.completed}</div>
                      <div className="text-xs text-muted-foreground">
                        completed
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
