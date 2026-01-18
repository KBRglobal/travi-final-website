import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Globe,
  RefreshCw,
  Plus,
  Search,
  AlertTriangle,
  TrendingUp,
  Heart,
  DollarSign,
  MoreHorizontal,
  Trash2,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Destination {
  id: string;
  name: string;
  status: "Mature" | "Growing" | "Initializing";
  health: number;
  runningStatus: "Running" | "Expanding" | "Paused";
  coverage: number;
  budgetToday: number;
  budgetLimit: number;
  alerts: number;
}

const mockDestinations: Destination[] = [
  {
    id: "1",
    name: "Tel Aviv",
    status: "Mature",
    health: 92,
    runningStatus: "Running",
    coverage: 85,
    budgetToday: 45.00,
    budgetLimit: 100.00,
    alerts: 2,
  },
  {
    id: "2",
    name: "Jerusalem",
    status: "Growing",
    health: 78,
    runningStatus: "Running",
    coverage: 62,
    budgetToday: 32.00,
    budgetLimit: 80.00,
    alerts: 1,
  },
  {
    id: "3",
    name: "Haifa",
    status: "Initializing",
    health: 65,
    runningStatus: "Running",
    coverage: 30,
    budgetToday: 15.00,
    budgetLimit: 50.00,
    alerts: 0,
  },
];

function getStatusColor(status: string) {
  switch (status) {
    case "Mature":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "Growing":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Initializing":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getHealthColor(health: number) {
  if (health >= 90) return "bg-green-500";
  if (health >= 70) return "bg-yellow-500";
  return "bg-red-500";
}

export default function OctypoDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");

  const destinations = mockDestinations;
  const totalSites = destinations.length;
  const runningSites = destinations.filter(d => d.runningStatus === "Running").length;
  const healthySites = destinations.filter(d => d.health >= 70).length;
  const totalAlerts = destinations.reduce((sum, d) => sum + d.alerts, 0);
  const spendToday = destinations.reduce((sum, d) => sum + d.budgetToday, 0);

  const filteredDestinations = destinations.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status.toLowerCase() === statusFilter;
    const matchesHealth = healthFilter === "all" || 
      (healthFilter === "healthy" && d.health >= 70) ||
      (healthFilter === "warning" && d.health >= 50 && d.health < 70) ||
      (healthFilter === "critical" && d.health < 50);
    return matchesSearch && matchesStatus && matchesHealth;
  });

  return (
    <div className="space-y-6" data-testid="octypo-dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Destinations</h1>
          <p className="text-muted-foreground">Manage your autonomous tourism sites</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button data-testid="button-new-destination">
            <Plus className="h-4 w-4 mr-2" />
            New Destination
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sites</CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-sites">{totalSites}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Running</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-running">{runningSites}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Healthy</CardTitle>
            <Heart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-healthy">
              <span className="text-blue-600">{healthySites}</span>
              <span className="text-muted-foreground">/{totalSites}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600" data-testid="text-alerts">{totalAlerts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Spend Today</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600" data-testid="text-spend">${spendToday.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search destinations..."
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
                  <SelectItem value="mature">Mature</SelectItem>
                  <SelectItem value="growing">Growing</SelectItem>
                  <SelectItem value="initializing">Initializing</SelectItem>
                </SelectContent>
              </Select>
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-health">
                  <SelectValue placeholder="All Health" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Health</SelectItem>
                  <SelectItem value="healthy">Healthy (≥70%)</SelectItem>
                  <SelectItem value="warning">Warning (50-70%)</SelectItem>
                  <SelectItem value="critical">Critical (&lt;50%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destination</TableHead>
                <TableHead>Health ↓</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Budget Today</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDestinations.map((destination) => (
                <TableRow key={destination.id} data-testid={`row-destination-${destination.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 bg-green-500">
                        <AvatarFallback className="bg-green-500 text-white text-xs">
                          {destination.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{destination.name}</div>
                        <div className="text-xs text-muted-foreground">{destination.status}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{destination.health}%</span>
                      <Progress 
                        value={destination.health} 
                        className="w-16 h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {destination.runningStatus}
                      </Badge>
                      {destination.runningStatus === "Running" && destination.status !== "Mature" && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Expanding
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{destination.coverage}%</span>
                      <Progress value={destination.coverage} className="w-16 h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      ${destination.budgetToday.toFixed(2)} / ${destination.budgetLimit.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {destination.alerts > 0 ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {destination.alerts}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${destination.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem data-testid={`action-view-${destination.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          data-testid={`action-delete-${destination.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
