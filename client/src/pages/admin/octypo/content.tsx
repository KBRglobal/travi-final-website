import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  type: "Article" | "Guide" | "Review" | "List";
  status: "Published" | "Draft" | "Needs Review";
  writer: string;
  score: number;
  date: string;
}

const mockContent: ContentItem[] = [
  {
    id: "1",
    title: "Best Hotels in Tel Aviv 2024",
    type: "Article",
    status: "Published",
    writer: "Article Writer",
    score: 92,
    date: "Jan 18, 2026",
  },
  {
    id: "2",
    title: "Jerusalem Old City Walking Tour",
    type: "Guide",
    status: "Published",
    writer: "Guide Writer",
    score: 89,
    date: "Jan 18, 2026",
  },
  {
    id: "3",
    title: "Top 10 Restaurants in Haifa",
    type: "Article",
    status: "Draft",
    writer: "Review Writer",
    score: 78,
    date: "Jan 18, 2026",
  },
  {
    id: "4",
    title: "Dead Sea Spa Experience",
    type: "Article",
    status: "Needs Review",
    writer: "Article Writer",
    score: 85,
    date: "Jan 18, 2026",
  },
  {
    id: "5",
    title: "Eilat Beach Resort Guide",
    type: "Guide",
    status: "Published",
    writer: "Guide Writer",
    score: 91,
    date: "Jan 18, 2026",
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "Published":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{status}</Badge>;
    case "Draft":
      return <Badge variant="secondary">{status}</Badge>;
    case "Needs Review":
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{status}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function OctypoContentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredContent = mockContent.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status.toLowerCase().replace(" ", "-") === statusFilter;
    const matchesType = typeFilter === "all" || item.type.toLowerCase() === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalResults = filteredContent.length;

  return (
    <div className="space-y-6" data-testid="octypo-content-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Content</h1>
          <p className="text-muted-foreground">Manage and monitor your AI-generated content</p>
        </div>
        <Button data-testid="button-create-content">
          <Plus className="h-4 w-4 mr-2" />
          Create Content
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="needs-review">Needs Review</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Writer</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContent.map((item) => (
                <TableRow key={item.id} data-testid={`row-content-${item.id}`}>
                  <TableCell>
                    <span className="font-medium">{item.title}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.type}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{item.writer}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={item.score} className="w-16 h-2" />
                      <span className="text-sm font-medium">{item.score}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">{item.date}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        data-testid={`button-view-${item.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        data-testid={`button-delete-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Showing 1 to {totalResults} of {totalResults} results
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="default" 
                size="sm"
                data-testid="button-page-1"
              >
                1
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled
                onClick={() => setCurrentPage(p => p + 1)}
                data-testid="button-next-page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
