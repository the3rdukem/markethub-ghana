"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode } from "lucide-react";
import {
  Shield,
  Link2,
  MapPin,
  Factory,
  Truck,
  Package,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Download,
  Share2,
  Verified,
  Globe,
  Users,
  Calendar,
  Fingerprint,
  Lock,
  Database,
  FileText,
  Camera,
  Scan,
  Search,
  Star,
  Flag
} from "lucide-react";

interface SupplyChainEvent {
  id: string;
  timestamp: Date;
  location: {
    name: string;
    coordinates: [number, number];
    country: string;
    verified: boolean;
  };
  actor: {
    name: string;
    role: "manufacturer" | "supplier" | "distributor" | "retailer" | "carrier";
    walletAddress: string;
    verified: boolean;
    reputation: number;
  };
  eventType: "manufacture" | "quality_check" | "transfer" | "storage" | "shipping" | "delivery" | "verification";
  description: string;
  documents: string[];
  blockHash: string;
  transactionHash: string;
  gasUsed: number;
  verified: boolean;
  authenticity: {
    score: number;
    factors: string[];
  };
}

interface ProductAuthenticity {
  id: string;
  name: string;
  sku: string;
  manufacturer: string;
  batchNumber: string;
  productionDate: Date;
  expiryDate?: Date;
  authenticity: {
    score: number;
    verified: boolean;
    verificationMethod: "blockchain" | "nfc" | "qr" | "serial";
    lastVerified: Date;
  };
  blockchain: {
    network: "Ethereum" | "Polygon" | "BSC";
    contractAddress: string;
    tokenId: string;
    totalSupply: number;
    currentOwner: string;
  };
  certificates: {
    id: string;
    name: string;
    issuer: string;
    validUntil: Date;
    verified: boolean;
    ipfsHash: string;
  }[];
  supplyChain: SupplyChainEvent[];
  antiCounterfeit: {
    features: string[];
    riskLevel: "low" | "medium" | "high";
    similarProducts: number;
    reportedFakes: number;
  };
}

interface SupplyChainTrackerProps {
  productId?: string;
  qrCode?: string;
  showScanner?: boolean;
}

// Mock blockchain data
const mockProduct: ProductAuthenticity = {
    id: "BLK-PRD-001",
    name: "iPhone 15 Pro Max 256GB",
    sku: "IP15PM256-BLK",
    manufacturer: "Apple Inc.",
    batchNumber: "APL-2024-001",
    productionDate: new Date("2024-01-15"),
    authenticity: {
      score: 0.98,
      verified: true,
      verificationMethod: "blockchain",
      lastVerified: new Date()
    },
    blockchain: {
      network: "Ethereum",
      contractAddress: "0x742d35cc6cf3ad25b2d8e01e48e58e8e5d9dbfa0",
      tokenId: "15012024001",
      totalSupply: 1000,
      currentOwner: "0xE8D2F1e8C8A7c6B5A4D3F2E1C9B8A7F6E5D4C3B2"
    },
    certificates: [
      {
        id: "CERT-001",
        name: "CE Certification",
        issuer: "European Conformity",
        validUntil: new Date("2026-01-15"),
        verified: true,
        ipfsHash: "QmX1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R"
      },
      {
        id: "CERT-002",
        name: "FCC Approval",
        issuer: "Federal Communications Commission",
        validUntil: new Date("2026-01-15"),
        verified: true,
        ipfsHash: "QmA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U"
      }
    ],
    supplyChain: [
      {
        id: "SC-001",
        timestamp: new Date("2024-01-15T08:00:00Z"),
        location: {
          name: "Apple Park Manufacturing, Cupertino",
          coordinates: [37.3349, -122.0090],
          country: "USA",
          verified: true
        },
        actor: {
          name: "Apple Inc.",
          role: "manufacturer",
          walletAddress: "0xA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
          verified: true,
          reputation: 100
        },
        eventType: "manufacture",
        description: "Product manufactured and quality tested at Apple Park",
        documents: ["quality_report.pdf", "production_certificate.pdf"],
        blockHash: "0x8f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b",
        transactionHash: "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v",
        gasUsed: 125000,
        verified: true,
        authenticity: {
          score: 1.0,
          factors: ["Official manufacturer", "Quality certificates", "Batch tracking"]
        }
      },
      {
        id: "SC-002",
        timestamp: new Date("2024-01-18T14:30:00Z"),
        location: {
          name: "Distribution Center, Los Angeles",
          coordinates: [34.0522, -118.2437],
          country: "USA",
          verified: true
        },
        actor: {
          name: "Apple Logistics",
          role: "distributor",
          walletAddress: "0xB2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1",
          verified: true,
          reputation: 98
        },
        eventType: "transfer",
        description: "Transferred to US distribution center for international shipping",
        documents: ["transfer_receipt.pdf", "inventory_log.pdf"],
        blockHash: "0x7e1f0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c",
        transactionHash: "0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w",
        gasUsed: 98000,
        verified: true,
        authenticity: {
          score: 0.99,
          factors: ["Verified distributor", "Chain of custody maintained", "Temperature controlled"]
        }
      },
      {
        id: "SC-003",
        timestamp: new Date("2024-01-22T10:15:00Z"),
        location: {
          name: "Kotoka International Airport, Accra",
          coordinates: [5.6037, -0.1870],
          country: "Ghana",
          verified: true
        },
        actor: {
          name: "Ghana Customs Authority",
          role: "carrier",
          walletAddress: "0xC3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2",
          verified: true,
          reputation: 95
        },
        eventType: "verification",
        description: "Customs clearance and authenticity verification at port of entry",
        documents: ["customs_declaration.pdf", "import_permit.pdf"],
        blockHash: "0x6d0e9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b",
        transactionHash: "0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x",
        gasUsed: 87000,
        verified: true,
        authenticity: {
          score: 0.98,
          factors: ["Customs verified", "Import documentation", "Serial number match"]
        }
      },
      {
        id: "SC-004",
        timestamp: new Date("2024-01-25T16:45:00Z"),
        location: {
          name: "TechStore Pro Warehouse, Accra",
          coordinates: [5.6037, -0.1870],
          country: "Ghana",
          verified: true
        },
        actor: {
          name: "TechStore Pro",
          role: "retailer",
          walletAddress: "0xD4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3",
          verified: true,
          reputation: 92
        },
        eventType: "storage",
        description: "Received at authorized retailer warehouse for final distribution",
        documents: ["receipt_confirmation.pdf"],
        blockHash: "0x5c0d8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a",
        transactionHash: "0x4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y",
        gasUsed: 76000,
        verified: true,
        authenticity: {
          score: 0.98,
          factors: ["Authorized retailer", "Cold storage maintained", "Inventory tracking"]
        }
      }
    ],
    antiCounterfeit: {
      features: ["Holographic seal", "NFC chip", "Unique serial number", "QR code verification"],
      riskLevel: "low",
      similarProducts: 0,
      reportedFakes: 0
    }
  };

export function SupplyChainTracker({ productId, qrCode, showScanner = false }: SupplyChainTrackerProps) {
  const [product, setProduct] = useState<ProductAuthenticity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationInProgress, setVerificationInProgress] = useState(false);

  const handleVerification = useCallback(async () => {
    setIsLoading(true);
    setVerificationInProgress(true);

    // Simulate blockchain verification
    setTimeout(() => {
      setProduct(mockProduct);
      setIsLoading(false);
      setVerificationInProgress(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (productId || qrCode) {
      handleVerification();
    }
  }, [productId, qrCode, handleVerification]);

  const handleSearch = () => {
    if (searchQuery) {
      handleVerification();
    }
  };

  const getAuthenticityBadge = (score: number) => {
    if (score >= 0.95) {
      return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Authentic</Badge>;
    } else if (score >= 0.8) {
      return <Badge className="bg-yellow-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Likely Authentic</Badge>;
    } else {
      return <Badge className="bg-red-600 text-white"><AlertTriangle className="w-3 h-3 mr-1" />Suspicious</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "manufacture": return Factory;
      case "quality_check": return CheckCircle;
      case "transfer": return Truck;
      case "storage": return Package;
      case "shipping": return Truck;
      case "delivery": return MapPin;
      case "verification": return Shield;
      default: return Package;
    }
  };

  if (verificationInProgress) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Database className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Verifying Product Authenticity</h3>
              <p className="text-muted-foreground">Checking blockchain records and supply chain data...</p>
            </div>
            <Progress value={75} className="max-w-sm mx-auto" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Querying blockchain network</p>
              <p>✓ Validating supply chain events</p>
              <p>⏳ Verifying digital certificates</p>
              <p>⏳ Checking anti-counterfeit features</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search/Scanner Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Product Authenticity Verification
          </CardTitle>
          <CardDescription>
            Verify product authenticity using blockchain technology and supply chain tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter product ID, serial number, or QR code"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch} disabled={!searchQuery}>
              <Search className="w-4 h-4 mr-2" />
              Verify
            </Button>
            {showScanner && (
              <Button variant="outline">
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {product && (
        <>
          {/* Authenticity Status */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                    <Verified className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-800">{product.name}</h3>
                    <p className="text-green-700">SKU: {product.sku}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getAuthenticityBadge(product.authenticity.score)}
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {Math.round(product.authenticity.score * 100)}% Confidence
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(product.authenticity.score * 100)}%
                  </p>
                  <p className="text-sm text-green-700">Authenticity Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="blockchain" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
              <TabsTrigger value="supply-chain">Supply Chain</TabsTrigger>
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
              <TabsTrigger value="anti-counterfeit">Anti-Counterfeit</TabsTrigger>
              <TabsTrigger value="verification">Verification</TabsTrigger>
            </TabsList>

            <TabsContent value="blockchain" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="w-5 h-5" />
                      Blockchain Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network:</span>
                      <Badge>{product.blockchain.network}</Badge>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-sm">Contract Address:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 p-1 rounded font-mono">
                          {product.blockchain.contractAddress}
                        </code>
                        <Button size="sm" variant="ghost">
                          <Share2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Token ID:</span>
                      <code className="text-sm">{product.blockchain.tokenId}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Supply:</span>
                      <span>{product.blockchain.totalSupply.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Factory className="w-5 h-5" />
                      Product Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manufacturer:</span>
                      <span className="font-medium">{product.manufacturer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Batch Number:</span>
                      <code className="text-sm">{product.batchNumber}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Production Date:</span>
                      <span>{product.productionDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Verified:</span>
                      <span>{product.authenticity.lastVerified.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="supply-chain" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Supply Chain Journey
                  </CardTitle>
                  <CardDescription>
                    Complete traceability from manufacture to delivery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {product.supplyChain.map((event, index) => {
                      const Icon = getEventIcon(event.eventType);
                      return (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              event.verified ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                            }`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            {index < product.supplyChain.length - 1 && (
                              <div className="w-0.5 h-16 bg-gray-200 mt-2" />
                            )}
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold capitalize">{event.eventType.replace("_", " ")}</h4>
                                <p className="text-sm text-muted-foreground">{event.description}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant={event.verified ? "default" : "secondary"}>
                                  {event.verified ? "Verified" : "Pending"}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {event.timestamp.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium">{event.location.name}</p>
                                <p className="text-muted-foreground">{event.location.country}</p>
                              </div>
                              <div>
                                <p className="font-medium">{event.actor.name}</p>
                                <p className="text-muted-foreground capitalize">{event.actor.role}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                  <span className="text-xs">{event.actor.reputation}% reputation</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Block: {event.blockHash.slice(0, 16)}...</span>
                              <span>Gas: {event.gasUsed.toLocaleString()}</span>
                              <span>Score: {Math.round(event.authenticity.score * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="certificates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.certificates.map((cert) => (
                  <Card key={cert.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          {cert.name}
                        </span>
                        {cert.verified && <Verified className="w-5 h-5 text-green-600" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Issuer:</span>
                        <span className="font-medium">{cert.issuer}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valid Until:</span>
                        <span>{cert.validUntil.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={cert.verified ? "default" : "secondary"}>
                          {cert.verified ? "Verified" : "Pending"}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground text-sm">IPFS Hash:</span>
                        <code className="text-xs bg-gray-100 p-1 rounded block">
                          {cert.ipfsHash}
                        </code>
                      </div>
                      <Button size="sm" variant="outline" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Download Certificate
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="anti-counterfeit" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Security Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {product.antiCounterfeit.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk Level:</span>
                      <Badge variant={product.antiCounterfeit.riskLevel === "low" ? "default" : "destructive"}>
                        {product.antiCounterfeit.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Similar Products:</span>
                      <span>{product.antiCounterfeit.similarProducts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reported Fakes:</span>
                      <span className="text-red-600">{product.antiCounterfeit.reportedFakes}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="verification" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Verify This Product
                  </CardTitle>
                  <CardDescription>
                    Additional verification methods to confirm authenticity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="h-20 flex flex-col">
                      <QrCode className="w-8 h-8 mb-2" />
                      <span>Scan QR Code</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col">
                      <Fingerprint className="w-8 h-8 mb-2" />
                      <span>NFC Verification</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col">
                      <Eye className="w-8 h-8 mb-2" />
                      <span>Visual Inspection</span>
                    </Button>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Verification Complete:</strong> This product has been verified as authentic through blockchain records and supply chain tracking. Last verification: {product.authenticity.lastVerified.toLocaleString()}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-3">
                    <Button>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Verification
                    </Button>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Report
                    </Button>
                    <Button variant="outline">
                      <Flag className="w-4 h-4 mr-2" />
                      Report Issue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
