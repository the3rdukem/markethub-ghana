"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SiteLayout } from "@/components/layout/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  History,
  Search,
  Filter,
  Download,
  Eye,
  MoreHorizontal,
  Clock,
  User,
  Package,
  Shield,
  Settings,
  MessageSquare,
  CreditCard,
  Lock,
  Server,
  Image,
  Loader2,
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistance } from "date-fns";
import { useAuthStore } from "@/lib/auth-store";
import { useAuditStore, AuditLogEntry, AuditCategory, AuditAction } from "@/lib/audit-store";

const categoryIcons: Record<AuditCategory, React.ReactNode> = {
  PRODUCT: <Package className="w-4 h-4" />,
  VERIFICATION: <Shield className="w-4 h-4" />,
  BRANDING: <Image className="w-4 h-4" />,
  BANNER: <Image className="w-4 h-4" />,
  MESSAGING: <MessageSquare className="w-4 h-4" />,
  SITE_SETTINGS: <Settings className="w-4 h-4" />,
  USER_MANAGEMENT: <User className="w-4 h-4" />,
  ORDER: <Package className="w-4 h-4" />,
  PAYMENT: <CreditCard className="w-4 h-4" />,
  SECURITY: <Lock className="w-4 h-4" />,
  SYSTEM: <Server className="w-4 h-4" />,
};

const categoryColors: Record<AuditCategory, string> = {
  PRODUCT: "bg-blue-100 text-blue-700",
  VERIFICATION: "bg-purple-100 text-purple-700",
  BRANDING: "bg-pink-100 text-pink-700",
  BANNER: "bg-orange-100 text-orange-700",
  MESSAGING: "bg-cyan-100 text-cyan-700",
  SITE_SETTINGS: "bg-gray-100 text-gray-700",
  USER_MANAGEMENT: "bg-green-100 text-green-700",
  ORDER: "bg-indigo-100 text-indigo-700",
  PAYMENT: "bg-emerald-100 text-emerald-700",
  SECURITY: "bg-red-100 text-red-700",
  SYSTEM: "bg-slate-100 text-slate-700",
};

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { getLogs, getRecentLogs, searchLogs, getActionCounts, clearOldLogs } = useAuditStore();

  const [isHydrated, setIsHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push("/admin/login");
      return;
    }

    // Only MASTER_ADMIN can view audit logs
    const isMasterAdmin = user?.role === 'master_admin' || user?.adminRole === 'MASTER_ADMIN';
    if (!isMasterAdmin) {
      toast.error("Access denied. Master Admin privileges required.");
      router.push("/admin");
    }
  }, [isHydrated, isAuthenticated, user, router]);

  const isMasterAdmin = user?.role === 'master_admin' || user?.adminRole === 'MASTER_ADMIN';

  // Get filtered logs
  const filteredLogs = getLogs({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    searchQuery: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const actionCounts = getActionCounts();
  const recentLogs = getRecentLogs(100);

  // Get category stats
  const categoryStats = Object.entries(
    filteredLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  const handleClearOldLogs = () => {
    if (confirm("Are you sure you want to delete logs older than 30 days?")) {
      clearOldLogs(30);
      toast.success("Old logs cleared");
    }
  };

  const handleExportLogs = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported");
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !isMasterAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground mb-4">Master Admin privileges required</p>
          <Button onClick={() => router.push("/admin/login")}>Go to Admin Login</Button>
        </div>
      </div>
    );
  }

  return (
    <SiteLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <History className="w-8 h-8" />
                Audit Logs
              </h1>
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Crown className="w-3 h-3 mr-1" />
                Master Admin Only
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Track all sensitive actions across the platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleClearOldLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear Old Logs
            </Button>
            <Button variant="outline" onClick={handleExportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {Object.entries(categoryIcons).slice(0, 6).map(([category, icon]) => (
            <Card
              key={category}
              className={`cursor-pointer transition-all ${
                categoryFilter === category ? "ring-2 ring-green-500" : "hover:shadow-md"
              }`}
              onClick={() => setCategoryFilter(categoryFilter === category ? "all" : category as AuditCategory)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">{category}</p>
                    <p className="text-2xl font-bold">
                      {categoryStats.find(([c]) => c === category)?.[1] || 0}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${categoryColors[category as AuditCategory]}`}>
                    {icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by actor, target, action..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-[160px]">
                <Label className="text-xs">Category</Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => setCategoryFilter(v as AuditCategory | "all")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.keys(categoryIcons).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[140px]">
                <Label className="text-xs">From Date</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="w-[140px]">
                <Label className="text-xs">To Date</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log ({filteredLogs.length} entries)</CardTitle>
            <CardDescription>Detailed record of all system actions</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-muted-foreground">No logs found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.slice(0, 200).map((log) => (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedLog(log)}>
                        <TableCell className="text-sm">
                          <div>
                            <p>{format(new Date(log.timestamp), "MMM d, HH:mm")}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistance(new Date(log.timestamp), new Date(), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={categoryColors[log.category]}>
                            {categoryIcons[log.category]}
                            <span className="ml-1">{log.category}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">
                            {log.action.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium truncate max-w-[120px]">
                                {log.actorEmail}
                              </p>
                              <p className="text-xs text-muted-foreground">{log.actorRole}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[150px]">
                              {log.targetName || log.targetId}
                            </p>
                            <p className="text-xs text-muted-foreground">{log.targetType}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Success
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Log Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            {selectedLog && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {categoryIcons[selectedLog.category]}
                    {selectedLog.action.replace(/_/g, " ")}
                  </DialogTitle>
                  <DialogDescription>
                    {format(new Date(selectedLog.timestamp), "MMMM d, yyyy 'at' h:mm:ss a")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Category</Label>
                      <Badge className={categoryColors[selectedLog.category]}>
                        {selectedLog.category}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      {selectedLog.success ? (
                        <Badge className="bg-green-100 text-green-700">Success</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">Failed</Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Actor</Label>
                    <p className="font-medium">{selectedLog.actorEmail}</p>
                    <p className="text-sm text-muted-foreground">Role: {selectedLog.actorRole}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Target</Label>
                    <p className="font-medium">{selectedLog.targetName || selectedLog.targetId}</p>
                    <p className="text-sm text-muted-foreground">Type: {selectedLog.targetType}</p>
                  </div>

                  {selectedLog.previousState && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Previous State</Label>
                      <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-auto max-h-32">
                        {JSON.stringify(selectedLog.previousState, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.newState && (
                    <div>
                      <Label className="text-xs text-muted-foreground">New State</Label>
                      <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-auto max-h-32">
                        {JSON.stringify(selectedLog.newState, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Metadata</Label>
                      <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-auto max-h-32">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedLog.errorMessage && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Error</Label>
                      <p className="text-sm text-red-600">{selectedLog.errorMessage}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="text-xs text-muted-foreground">
                    <p>Log ID: {selectedLog.id}</p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SiteLayout>
  );
}
