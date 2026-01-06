"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteLayout } from "@/components/layout/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Tag, Percent, Plus, Edit, Trash2, Copy, CheckCircle, Clock,
  AlertTriangle, Loader2, Zap, ShoppingBag, TrendingUp
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useProductsStore } from "@/lib/products-store";
import { usePromotionsStore, Coupon, Sale, PromotionStatus } from "@/lib/promotions-store";
import { toast } from "sonner";
import { format } from "date-fns";

export default function VendorPromotionsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { getProductsByVendor } = useProductsStore();
  const {
    getCouponsByVendor, getSalesByVendor, getActiveCoupons, getActiveSales,
    addCoupon, updateCoupon, deleteCoupon, addSale, updateSale, deleteSale, updatePromotionStatuses,
  } = usePromotionsStore();

  const [isHydrated, setIsHydrated] = useState(false);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [couponForm, setCouponForm] = useState({
    code: "", name: "", discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10, minOrderAmount: 0, usageLimit: 0,
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  });

  const [saleForm, setSaleForm] = useState({
    name: "", discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10, productIds: [] as string[],
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  });

  useEffect(() => { setIsHydrated(true); }, []);
  useEffect(() => { if (isHydrated) updatePromotionStatuses(); }, [isHydrated, updatePromotionStatuses]);
  useEffect(() => {
    if (isHydrated && !isAuthenticated) router.push("/auth/login");
    if (isHydrated && user && user.role !== "vendor") router.push("/");
  }, [isHydrated, isAuthenticated, user, router]);

  if (!isHydrated) {
    return <SiteLayout><div className="container py-8 flex justify-center min-h-[400px]"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div></SiteLayout>;
  }
  if (!isAuthenticated || !user || user.role !== "vendor") return null;

  const vendorProducts = getProductsByVendor(user.id);
  const coupons = getCouponsByVendor(user.id);
  const sales = getSalesByVendor(user.id);
  const activeCoupons = getActiveCoupons(user.id);
  const activeSales = getActiveSales(user.id);

  const getStatusBadge = (status: PromotionStatus) => {
    const configs: Record<PromotionStatus, { className: string; icon: React.ReactNode; label: string }> = {
      active: { className: "bg-green-100 text-green-800", icon: <CheckCircle className="w-3 h-3 mr-1" />, label: "Active" },
      scheduled: { className: "bg-blue-100 text-blue-800", icon: <Clock className="w-3 h-3 mr-1" />, label: "Scheduled" },
      expired: { className: "bg-gray-100 text-gray-800", icon: <AlertTriangle className="w-3 h-3 mr-1" />, label: "Expired" },
      disabled: { className: "bg-red-100 text-red-800", icon: null, label: "Disabled" },
    };
    const config = configs[status];
    return <Badge className={config.className}>{config.icon}{config.label}</Badge>;
  };

  const handleSaveCoupon = () => {
    if (!couponForm.code.trim() || !couponForm.name.trim()) { toast.error("Please fill required fields"); return; }
    const data = {
      code: couponForm.code.toUpperCase(), name: couponForm.name,
      discountType: couponForm.discountType, discountValue: couponForm.discountValue,
      scope: "store_wide" as const, minOrderAmount: couponForm.minOrderAmount || undefined,
      usageLimit: couponForm.usageLimit || undefined,
      startDate: new Date(couponForm.startDate).toISOString(),
      endDate: new Date(couponForm.endDate).toISOString(),
    };
    if (editingCoupon) { updateCoupon(editingCoupon.id, data); toast.success("Coupon updated!"); }
    else { addCoupon({ vendorId: user.id, ...data, status: "active" }); toast.success("Coupon created!"); }
    setShowCouponDialog(false);
    setCouponForm({ code: "", name: "", discountType: "percentage", discountValue: 10, minOrderAmount: 0, usageLimit: 0, startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") });
    setEditingCoupon(null);
  };

  const handleSaveSale = () => {
    if (!saleForm.name.trim() || saleForm.productIds.length === 0) { toast.error("Please fill fields and select products"); return; }
    const data = {
      name: saleForm.name, discountType: saleForm.discountType, discountValue: saleForm.discountValue,
      productIds: saleForm.productIds,
      startDate: new Date(saleForm.startDate).toISOString(),
      endDate: new Date(saleForm.endDate).toISOString(),
    };
    if (editingSale) { updateSale(editingSale.id, data); toast.success("Sale updated!"); }
    else { addSale({ vendorId: user.id, ...data, status: "active" }); toast.success("Sale created!"); }
    setShowSaleDialog(false);
    setSaleForm({ name: "", discountType: "percentage", discountValue: 10, productIds: [], startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") });
    setEditingSale(null);
  };

  const handleEditCoupon = (c: Coupon) => {
    setEditingCoupon(c);
    setCouponForm({ code: c.code, name: c.name, discountType: c.discountType, discountValue: c.discountValue, minOrderAmount: c.minOrderAmount || 0, usageLimit: c.usageLimit || 0, startDate: format(new Date(c.startDate), "yyyy-MM-dd"), endDate: format(new Date(c.endDate), "yyyy-MM-dd") });
    setShowCouponDialog(true);
  };

  const handleEditSale = (s: Sale) => {
    setEditingSale(s);
    setSaleForm({ name: s.name, discountType: s.discountType, discountValue: s.discountValue, productIds: s.productIds, startDate: format(new Date(s.startDate), "yyyy-MM-dd"), endDate: format(new Date(s.endDate), "yyyy-MM-dd") });
    setShowSaleDialog(true);
  };

  return (
    <SiteLayout>
      <div className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/vendor"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
          <div><h1 className="text-3xl font-bold">Promotions & Discounts</h1><p className="text-muted-foreground">Manage coupons and sales</p></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Coupons", value: activeCoupons.length, icon: Tag, color: "emerald" },
            { label: "Active Sales", value: activeSales.length, icon: Zap, color: "red" },
            { label: "Products", value: vendorProducts.length, icon: ShoppingBag, color: "blue" },
            { label: "Coupon Uses", value: coupons.reduce((s, c) => s + c.usageCount, 0), icon: TrendingUp, color: "purple" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-${color}-100 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                </div>
                <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-gray-500">{label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="coupons" className="space-y-6">
          <TabsList><TabsTrigger value="coupons"><Tag className="w-4 h-4 mr-2" />Coupons ({coupons.length})</TabsTrigger><TabsTrigger value="sales"><Percent className="w-4 h-4 mr-2" />Sales ({sales.length})</TabsTrigger></TabsList>

          <TabsContent value="coupons">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Coupon Codes</CardTitle><CardDescription>Create discount codes</CardDescription></div>
                <Dialog open={showCouponDialog} onOpenChange={(o) => { setShowCouponDialog(o); if (!o) { setEditingCoupon(null); setCouponForm({ code: "", name: "", discountType: "percentage", discountValue: 10, minOrderAmount: 0, usageLimit: 0, startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") }); } }}>
                  <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Create Coupon</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingCoupon ? "Edit" : "Create"} Coupon</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Code *</Label><Input value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="SAVE20" /></div>
                        <div><Label>Name *</Label><Input value={couponForm.name} onChange={e => setCouponForm({ ...couponForm, name: e.target.value })} placeholder="Summer Sale" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Type</Label><Select value={couponForm.discountType} onValueChange={v => setCouponForm({ ...couponForm, discountType: v as "percentage" | "fixed" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed (GHS)</SelectItem></SelectContent></Select></div>
                        <div><Label>Value</Label><Input type="number" value={couponForm.discountValue} onChange={e => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Min Order (GHS)</Label><Input type="number" value={couponForm.minOrderAmount} onChange={e => setCouponForm({ ...couponForm, minOrderAmount: Number(e.target.value) })} /></div>
                        <div><Label>Usage Limit</Label><Input type="number" value={couponForm.usageLimit} onChange={e => setCouponForm({ ...couponForm, usageLimit: Number(e.target.value) })} placeholder="0 = unlimited" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Start Date</Label><Input type="date" value={couponForm.startDate} onChange={e => setCouponForm({ ...couponForm, startDate: e.target.value })} /></div>
                        <div><Label>End Date</Label><Input type="date" value={couponForm.endDate} onChange={e => setCouponForm({ ...couponForm, endDate: e.target.value })} /></div>
                      </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowCouponDialog(false)}>Cancel</Button><Button onClick={handleSaveCoupon} className="bg-emerald-600">{editingCoupon ? "Update" : "Create"}</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {coupons.length === 0 ? (
                  <div className="text-center py-12"><Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="font-semibold">No Coupons Yet</h3><p className="text-muted-foreground">Create your first coupon to attract customers</p></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Usage</TableHead><TableHead>Valid</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {coupons.map(c => (
                        <TableRow key={c.id}>
                          <TableCell><div className="flex items-center gap-2"><code className="bg-gray-100 px-2 py-1 rounded font-mono">{c.code}</code><Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied!"); }}><Copy className="w-3 h-3" /></Button></div><p className="text-xs text-muted-foreground mt-1">{c.name}</p></TableCell>
                          <TableCell>{c.discountType === "percentage" ? `${c.discountValue}%` : `GHS ${c.discountValue}`}</TableCell>
                          <TableCell>{c.usageCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</TableCell>
                          <TableCell className="text-xs">{format(new Date(c.startDate), "MMM d")} - {format(new Date(c.endDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>{getStatusBadge(c.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditCoupon(c)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { deleteCoupon(c.id); toast.success("Deleted"); }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Product Sales</CardTitle><CardDescription>Create flash sales on products</CardDescription></div>
                <Dialog open={showSaleDialog} onOpenChange={(o) => { setShowSaleDialog(o); if (!o) { setEditingSale(null); setSaleForm({ name: "", discountType: "percentage", discountValue: 10, productIds: [], startDate: format(new Date(), "yyyy-MM-dd"), endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") }); } }}>
                  <DialogTrigger asChild><Button className="bg-red-600 hover:bg-red-700"><Plus className="w-4 h-4 mr-2" />Create Sale</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>{editingSale ? "Edit" : "Create"} Sale</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div><Label>Sale Name *</Label><Input value={saleForm.name} onChange={e => setSaleForm({ ...saleForm, name: e.target.value })} placeholder="Flash Sale" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Discount Type</Label><Select value={saleForm.discountType} onValueChange={v => setSaleForm({ ...saleForm, discountType: v as "percentage" | "fixed" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed (GHS)</SelectItem></SelectContent></Select></div>
                        <div><Label>Discount Value</Label><Input type="number" value={saleForm.discountValue} onChange={e => setSaleForm({ ...saleForm, discountValue: Number(e.target.value) })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Start Date</Label><Input type="date" value={saleForm.startDate} onChange={e => setSaleForm({ ...saleForm, startDate: e.target.value })} /></div>
                        <div><Label>End Date</Label><Input type="date" value={saleForm.endDate} onChange={e => setSaleForm({ ...saleForm, endDate: e.target.value })} /></div>
                      </div>
                      <div>
                        <Label>Select Products *</Label>
                        <div className="border rounded-lg p-4 mt-2 max-h-48 overflow-y-auto space-y-2">
                          {vendorProducts.length === 0 ? <p className="text-muted-foreground text-sm">No products available</p> : vendorProducts.map(p => (
                            <div key={p.id} className="flex items-center gap-3">
                              <Checkbox checked={saleForm.productIds.includes(p.id)} onCheckedChange={() => setSaleForm(f => ({ ...f, productIds: f.productIds.includes(p.id) ? f.productIds.filter(id => id !== p.id) : [...f.productIds, p.id] }))} />
                              <span className="text-sm">{p.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto">GHS {p.price}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{saleForm.productIds.length} product(s) selected</p>
                      </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowSaleDialog(false)}>Cancel</Button><Button onClick={handleSaveSale} className="bg-red-600">{editingSale ? "Update" : "Create"}</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {sales.length === 0 ? (
                  <div className="text-center py-12"><Percent className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="font-semibold">No Sales Yet</h3><p className="text-muted-foreground">Create flash sales to boost conversions</p></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Discount</TableHead><TableHead>Products</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {sales.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.discountType === "percentage" ? `${s.discountValue}%` : `GHS ${s.discountValue}`}</TableCell>
                          <TableCell><Badge variant="outline">{s.productIds.length} products</Badge></TableCell>
                          <TableCell className="text-xs">{format(new Date(s.startDate), "MMM d")} - {format(new Date(s.endDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>{getStatusBadge(s.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditSale(s)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { deleteSale(s.id); toast.success("Deleted"); }}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SiteLayout>
  );
}
