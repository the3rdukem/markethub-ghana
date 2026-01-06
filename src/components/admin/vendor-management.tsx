"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Store, Eye, CheckCircle, XCircle, Search, Loader2, MapPin,
  Ban, Play, RefreshCw
} from "lucide-react";
import { formatDistance } from "date-fns";
import { toast } from "sonner";

interface ApiVendor {
  id: string;
  userId: string;
  businessName: string;
  businessType: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  verificationStatus: string;
  verificationNotes: string | null;
  storeStatus: string;
  userName: string;
  userEmail: string;
  userStatus?: string;
  createdAt: string;
  updatedAt: string;
}

interface VendorStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  suspended: number;
  activeStores: number;
}

interface VendorManagementProps {
  currentAdmin: {
    id: string;
    name: string;
    email?: string;
  };
  isMasterAdmin: boolean;
}

type StatusFilter = "all" | "pending" | "verified" | "rejected" | "suspended";

export function VendorManagement({ currentAdmin, isMasterAdmin }: VendorManagementProps) {
  const [vendors, setVendors] = useState<ApiVendor[]>([]);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedVendor, setSelectedVendor] = useState<ApiVendor | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch vendors
  async function fetchVendors() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.set("verificationStatus", statusFilter);
      }

      const [vendorsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/vendors?${params.toString()}`),
        fetch("/api/admin/vendors?stats=true"),
      ]);

      const vendorsData = await vendorsRes.json();
      const statsData = await statsRes.json();

      if (vendorsData.vendors) {
        setVendors(vendorsData.vendors);
      }
      if (statsData.stats) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Filter vendors by search
  const filteredVendors = vendors.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.businessName.toLowerCase().includes(query) ||
      v.userName.toLowerCase().includes(query) ||
      v.userEmail.toLowerCase().includes(query) ||
      v.city?.toLowerCase().includes(query) ||
      v.region?.toLowerCase().includes(query)
    );
  });

  // Handle approve
  async function handleApprove() {
    if (!selectedVendor) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vendorId: selectedVendor.id,
          action: "approve",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`${selectedVendor.businessName} has been approved`);
      setShowApproveDialog(false);
      setSelectedVendor(null);
      fetchVendors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve vendor");
    } finally {
      setActionLoading(false);
    }
  }

  // Handle reject
  async function handleReject() {
    if (!selectedVendor || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vendorId: selectedVendor.id,
          action: "reject",
          reason: rejectionReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`${selectedVendor.businessName} has been rejected`);
      setShowRejectDialog(false);
      setSelectedVendor(null);
      setRejectionReason("");
      fetchVendors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject vendor");
    } finally {
      setActionLoading(false);
    }
  }

  // Handle suspend
  async function handleSuspend() {
    if (!selectedVendor || !suspendReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vendorId: selectedVendor.id,
          action: "suspend",
          reason: suspendReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`${selectedVendor.businessName} has been suspended`);
      setShowSuspendDialog(false);
      setSelectedVendor(null);
      setSuspendReason("");
      fetchVendors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to suspend vendor");
    } finally {
      setActionLoading(false);
    }
  }

  // Handle unsuspend
  async function handleUnsuspend(vendor: ApiVendor) {
    try {
      const res = await fetch("/api/admin/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vendorId: vendor.id,
          action: "unsuspend",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`${vendor.businessName} has been unsuspended`);
      fetchVendors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unsuspend vendor");
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      under_review: "bg-blue-100 text-blue-800",
      verified: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-red-200 text-red-900",
    };
    return <Badge variant="outline" className={colors[status] || "bg-gray-100"}>{status.replace("_", " ")}</Badge>;
  };

  const getStoreStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-600",
      suspended: "bg-red-100 text-red-800",
    };
    return <Badge variant="outline" className={colors[status] || "bg-gray-100"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:border-gray-400" onClick={() => setStatusFilter("all")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Vendors</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-yellow-400" onClick={() => setStatusFilter("pending")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-green-400" onClick={() => setStatusFilter("verified")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-red-400" onClick={() => setStatusFilter("rejected")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-orange-400" onClick={() => setStatusFilter("suspended")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Suspended</p>
              <p className="text-2xl font-bold text-orange-600">{stats.suspended}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Vendor Management
              </CardTitle>
              <CardDescription>
                Manage vendor applications and store access
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={fetchVendors}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Select value={statusFilter} onValueChange={(v: StatusFilter) => setStatusFilter(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search vendors..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Vendors Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "No vendors match the current filter"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <p className="font-medium">{vendor.businessName}</p>
                        <p className="text-xs text-muted-foreground">{vendor.businessType || "General"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{vendor.userName}</p>
                        <p className="text-xs text-muted-foreground">{vendor.userEmail}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3" />
                          {vendor.city || vendor.region || "-"}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(vendor.verificationStatus)}</TableCell>
                      <TableCell>{getStoreStatusBadge(vendor.storeStatus)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistance(new Date(vendor.createdAt), new Date(), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {(vendor.verificationStatus === "pending" || vendor.verificationStatus === "under_review") && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => {
                                  setSelectedVendor(vendor);
                                  setShowApproveDialog(true);
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedVendor(vendor);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {vendor.verificationStatus === "verified" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-orange-600"
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setShowSuspendDialog(true);
                              }}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}

                          {vendor.verificationStatus === "suspended" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleUnsuspend(vendor)}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedVendor?.businessName}</DialogTitle>
            <DialogDescription>Vendor Details</DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Owner Name</Label>
                  <p className="text-sm font-medium">{selectedVendor.userName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Email</Label>
                  <p className="text-sm font-medium">{selectedVendor.userEmail}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Phone</Label>
                  <p className="text-sm font-medium">{selectedVendor.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Business Type</Label>
                  <p className="text-sm font-medium">{selectedVendor.businessType || "General"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Location</Label>
                  <p className="text-sm font-medium">
                    {[selectedVendor.address, selectedVendor.city, selectedVendor.region].filter(Boolean).join(", ") || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Verification Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedVendor.verificationStatus)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Store Status</Label>
                  <div className="mt-1">{getStoreStatusBadge(selectedVendor.storeStatus)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Registered</Label>
                  <p className="text-sm font-medium">
                    {formatDistance(new Date(selectedVendor.createdAt), new Date(), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {selectedVendor.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Description</Label>
                  <p className="text-sm mt-1">{selectedVendor.description}</p>
                </div>
              )}

              {selectedVendor.verificationNotes && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Label className="text-yellow-800 text-xs">Verification Notes</Label>
                  <p className="text-sm text-yellow-700 mt-1">{selectedVendor.verificationNotes}</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>Close</Button>
                {(selectedVendor.verificationStatus === "pending" || selectedVendor.verificationStatus === "under_review") && (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setShowDetailsDialog(false);
                        setShowApproveDialog(true);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setShowDetailsDialog(false);
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve {selectedVendor?.businessName} and activate their store. They will be able to list and sell products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Vendor"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Vendor Application</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject {selectedVendor?.businessName}'s application. Please provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Rejection Reason</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this application is being rejected..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading} onClick={() => setRejectionReason("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Application"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Vendor</AlertDialogTitle>
            <AlertDialogDescription>
              This will suspend {selectedVendor?.businessName}. They will not be able to sell products until unsuspended.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Suspension Reason</Label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Explain why this vendor is being suspended..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading} onClick={() => setSuspendReason("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleSuspend}
              disabled={actionLoading || !suspendReason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suspending...
                </>
              ) : (
                "Suspend Vendor"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
