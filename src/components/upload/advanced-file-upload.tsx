"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Image as ImageIcon,
  File,
  X,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  Crop,
  Palette,
  Download,
  Eye,
  Trash2,
  Edit3,
  FolderOpen,
  Plus,
  Grid3X3,
  List,
  Filter,
  Search,
  MoreHorizontal,
  CloudUpload,
  HardDrive,
  Zap,
  Shield,
  Camera,
  Video,
  Music,
  FileText,
  Archive,
  Database
} from "lucide-react";
import { toast } from "sonner";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnail?: string;
  status: "uploading" | "processing" | "completed" | "error";
  progress: number;
  uploadedAt: string;
  dimensions?: {
    width: number;
    height: number;
  };
  optimizedSizes?: {
    thumbnail: string;
    medium: string;
    large: string;
  };
  metadata?: {
    description: string;
    tags: string[];
    category: string;
  };
}

export interface UploadConfig {
  maxFileSize: number; // in MB
  acceptedTypes: string[];
  maxFiles: number;
  autoOptimize: boolean;
  generateThumbnails: boolean;
  enableImageEditing: boolean;
  folder?: string;
  cdnUpload: boolean;
}

interface AdvancedFileUploadProps {
  config?: Partial<UploadConfig>;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onFileRemove?: (fileId: string) => void;
  existingFiles?: UploadedFile[];
  className?: string;
  showFileManager?: boolean;
  allowBulkOperations?: boolean;
}

const defaultConfig: UploadConfig = {
  maxFileSize: 10, // 10MB
  acceptedTypes: ['image/*', 'video/*', 'application/pdf', '.doc', '.docx'],
  maxFiles: 20,
  autoOptimize: true,
  generateThumbnails: true,
  enableImageEditing: true,
  cdnUpload: true
};

// Mock CDN and storage service
class FileStorageService {
  static async uploadFile(file: File, config: UploadConfig): Promise<string> {
    // Simulate upload to CDN
    return new Promise((resolve) => {
      setTimeout(() => {
        const url = URL.createObjectURL(file);
        resolve(url);
      }, Math.random() * 2000 + 1000);
    });
  }

  static async optimizeImage(file: File): Promise<{ thumbnail: string; medium: string; large: string }> {
    // Simulate image optimization
    return new Promise((resolve) => {
      setTimeout(() => {
        const originalUrl = URL.createObjectURL(file);
        resolve({
          thumbnail: originalUrl,
          medium: originalUrl,
          large: originalUrl
        });
      }, 1500);
    });
  }

  static async scanFile(file: File): Promise<{ safe: boolean; threats: string[] }> {
    // Simulate virus scanning
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          safe: Math.random() > 0.05, // 95% safe
          threats: []
        });
      }, 500);
    });
  }

  static async extractMetadata(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height
          });
        };
        img.src = URL.createObjectURL(file);
      });
    }
    return {};
  }
}

export function AdvancedFileUpload({
  config = {},
  onUploadComplete,
  onFileRemove,
  existingFiles = [],
  className = "",
  showFileManager = true,
  allowBulkOperations = true
}: AdvancedFileUploadProps) {
  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null);
  const [showFileDetails, setShowFileDetails] = useState<UploadedFile | null>(null);
  const [bulkOperationMode, setBulkOperationMode] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [storageUsage, setStorageUsage] = useState({ used: 45.2, total: 100 }); // GB

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Filter files based on search and category
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         file.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" ||
                           file.type.startsWith(selectedCategory) ||
                           file.metadata?.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Handle file processing
  const processFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: "",
      status: "uploading",
      progress: 0,
      uploadedAt: new Date().toISOString()
    };

    setFiles(prev => [...prev, uploadedFile]);

    try {
      // Step 1: Security scan
      uploadedFile.status = "processing";
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 10, status: "processing" } : f));

      const scanResult = await FileStorageService.scanFile(file);
      if (!scanResult.safe) {
        throw new Error("File failed security scan");
      }

      // Step 2: Extract metadata
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 30 } : f));
      const metadata = await FileStorageService.extractMetadata(file);
      uploadedFile.dimensions = metadata.width && metadata.height ? {
        width: metadata.width,
        height: metadata.height
      } : undefined;

      // Step 3: Upload to CDN
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 50 } : f));
      const url = await FileStorageService.uploadFile(file, finalConfig);
      uploadedFile.url = url;

      // Step 4: Generate optimized versions (for images)
      if (file.type.startsWith('image/') && finalConfig.autoOptimize) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 70 } : f));
        const optimizedSizes = await FileStorageService.optimizeImage(file);
        uploadedFile.optimizedSizes = optimizedSizes;
        uploadedFile.thumbnail = optimizedSizes.thumbnail;
      }

      // Step 5: Complete
      uploadedFile.status = "completed";
      uploadedFile.progress = 100;

      setFiles(prev => prev.map(f => f.id === fileId ? uploadedFile : f));

      toast.success(`${file.name} uploaded successfully`);
      return uploadedFile;

    } catch (error) {
      uploadedFile.status = "error";
      setFiles(prev => prev.map(f => f.id === fileId ? uploadedFile : f));
      toast.error(`Failed to upload ${file.name}`);
      throw error;
    }
  }, [finalConfig]);

  // Handle file selection
  const handleFileSelect = useCallback(async (fileList: FileList) => {
    const selectedFiles = Array.from(fileList);

    // Validate files
    const validFiles = selectedFiles.filter(file => {
      if (file.size > finalConfig.maxFileSize * 1024 * 1024) {
        toast.error(`${file.name} is too large (max ${finalConfig.maxFileSize}MB)`);
        return false;
      }

      const isValidType = finalConfig.acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type.match(type.replace('*', '.*'));
      });

      if (!isValidType) {
        toast.error(`${file.name} is not a supported file type`);
        return false;
      }

      return true;
    });

    if (files.length + validFiles.length > finalConfig.maxFiles) {
      toast.error(`Maximum ${finalConfig.maxFiles} files allowed`);
      return;
    }

    // Add to queue and process
    setUploadQueue(prev => [...prev, ...validFiles]);

    for (const file of validFiles) {
      try {
        await processFile(file);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setUploadQueue([]);
  }, [files.length, finalConfig, processFile]);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // File operations
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemove?.(fileId);
    toast.success("File removed");
  }, [onFileRemove]);

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  }, []);

  const bulkRemoveFiles = useCallback(() => {
    setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)));
    selectedFiles.forEach(fileId => onFileRemove?.(fileId));
    setSelectedFiles([]);
    setBulkOperationMode(false);
    toast.success(`${selectedFiles.length} files removed`);
  }, [selectedFiles, onFileRemove]);

  const getFileIcon = (file: UploadedFile) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-8 h-8" />;
    if (file.type.startsWith('video/')) return <Video className="w-8 h-8" />;
    if (file.type.startsWith('audio/')) return <Music className="w-8 h-8" />;
    if (file.type.includes('pdf')) return <FileText className="w-8 h-8" />;
    if (file.type.includes('zip') || file.type.includes('rar')) return <Archive className="w-8 h-8" />;
    return <File className="w-8 h-8" />;
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "uploading": case "processing": return "text-blue-600";
      case "error": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "uploading": case "processing": return <CloudUpload className="w-4 h-4 text-blue-600 animate-pulse" />;
      case "error": return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            setSelectedFiles(files.map(f => f.id));
            break;
          case 'u':
            e.preventDefault();
            fileInputRef.current?.click();
            break;
          case 'Delete':
            if (selectedFiles.length > 0) {
              bulkRemoveFiles();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [files, selectedFiles, bulkRemoveFiles]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CloudUpload className="w-5 h-5" />
                Advanced File Upload
              </CardTitle>
              <CardDescription>
                Drag and drop files or click to browse. Supports bulk upload with automatic optimization.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {storageUsage.used.toFixed(1)} / {storageUsage.total} GB
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Secure Upload
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={dropZoneRef}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragActive
                ? "border-blue-500 bg-blue-50 scale-105"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept={finalConfig.acceptedTypes.join(',')}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />

            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {dragActive ? "Drop files here" : "Upload your files"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop files here, or click to browse your computer
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                  <Button variant="outline" onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current.click();
                    }
                  }}>
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                <span>Max {finalConfig.maxFileSize}MB per file</span>
                <span>•</span>
                <span>Up to {finalConfig.maxFiles} files</span>
                <span>•</span>
                <span>Auto-optimization enabled</span>
              </div>
            </div>

            {/* Progress indicator for active uploads */}
            {uploadQueue.length > 0 && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm font-medium">Processing {uploadQueue.length} files...</p>
                </div>
              </div>
            )}
          </div>

          {/* Upload Configuration */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-optimize"
                checked={finalConfig.autoOptimize}
                disabled
              />
              <Label htmlFor="auto-optimize" className="text-sm">Auto-optimize images</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="generate-thumbnails"
                checked={finalConfig.generateThumbnails}
                disabled
              />
              <Label htmlFor="generate-thumbnails" className="text-sm">Generate thumbnails</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="cdn-upload"
                checked={finalConfig.cdnUpload}
                disabled
              />
              <Label htmlFor="cdn-upload" className="text-sm">CDN delivery</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Manager */}
      {showFileManager && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  File Manager
                  {files.length > 0 && <Badge>{files.length} files</Badge>}
                </CardTitle>
                <CardDescription>
                  Manage uploaded files with advanced filtering and bulk operations
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {allowBulkOperations && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkOperationMode(!bulkOperationMode)}
                  >
                    {bulkOperationMode ? "Cancel" : "Bulk Select"}
                  </Button>
                )}

                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Files</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="application">Documents</SelectItem>
                </SelectContent>
              </Select>

              {bulkOperationMode && selectedFiles.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete ({selectedFiles.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Files</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedFiles.length} selected files? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={bulkRemoveFiles}>
                        Delete Files
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Files Display */}
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <File className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No files found</h3>
                <p className="text-muted-foreground">
                  {files.length === 0
                    ? "Upload some files to get started"
                    : "Try adjusting your search or filter criteria"
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`relative group border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${
                          bulkOperationMode && selectedFiles.includes(file.id)
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : ""
                        }`}
                        onClick={() => bulkOperationMode ? toggleFileSelection(file.id) : setShowFileDetails(file)}
                      >
                        {bulkOperationMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <input
                              type="checkbox"
                              checked={selectedFiles.includes(file.id)}
                              onChange={() => toggleFileSelection(file.id)}
                              className="w-4 h-4"
                            />
                          </div>
                        )}

                        <div className="aspect-square bg-gray-100 rounded-md flex items-center justify-center mb-2 relative overflow-hidden">
                          {file.type.startsWith('image/') && file.thumbnail ? (
                            <img
                              src={file.thumbnail}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-gray-400">
                              {getFileIcon(file)}
                            </div>
                          )}

                          {/* Upload progress overlay */}
                          {file.status !== "completed" && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="text-center text-white">
                                <div className={getStatusColor(file.status)}>
                                  {getStatusIcon(file.status)}
                                </div>
                                <div className="text-xs mt-1">{file.progress}%</div>
                              </div>
                            </div>
                          )}

                          {/* Actions overlay */}
                          {!bulkOperationMode && file.status === "completed" && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button size="sm" variant="secondary" onClick={(e) => {
                                e.stopPropagation();
                                setShowFileDetails(file);
                              }}>
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="secondary" onClick={(e) => {
                                e.stopPropagation();
                                removeFile(file.id);
                              }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                          {file.status !== "completed" && (
                            <Progress value={file.progress} className="h-1" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center gap-4 p-3 border rounded-lg hover:shadow-sm transition-all cursor-pointer ${
                          bulkOperationMode && selectedFiles.includes(file.id)
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : ""
                        }`}
                        onClick={() => bulkOperationMode ? toggleFileSelection(file.id) : setShowFileDetails(file)}
                      >
                        {bulkOperationMode && (
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.id)}
                            onChange={() => toggleFileSelection(file.id)}
                            className="w-4 h-4"
                          />
                        )}

                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          {file.type.startsWith('image/') && file.thumbnail ? (
                            <img
                              src={file.thumbnail}
                              alt={file.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="text-gray-400">
                              {getFileIcon(file)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{file.name}</p>
                            {getStatusIcon(file.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                            {file.dimensions && (
                              <span>{file.dimensions.width}×{file.dimensions.height}</span>
                            )}
                          </div>
                          {file.status !== "completed" && (
                            <Progress value={file.progress} className="h-1 mt-2" />
                          )}
                        </div>

                        {!bulkOperationMode && file.status === "completed" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setShowFileDetails(file)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(file.url, '_blank')}>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              {file.type.startsWith('image/') && (
                                <DropdownMenuItem onClick={() => setEditingFile(file)}>
                                  <Edit3 className="w-4 h-4 mr-2" />
                                  Edit Image
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => removeFile(file.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* File Details Dialog */}
      {showFileDetails && (
        <Dialog open={!!showFileDetails} onOpenChange={() => setShowFileDetails(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>File Details</DialogTitle>
              <DialogDescription>
                Comprehensive information about the selected file
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Preview */}
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                {showFileDetails.type.startsWith('image/') ? (
                  <img
                    src={showFileDetails.url}
                    alt={showFileDetails.name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    {getFileIcon(showFileDetails)}
                    <p className="mt-2 text-sm">Preview not available</p>
                  </div>
                )}
              </div>

              {/* File Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">File Name</Label>
                  <p className="text-sm text-muted-foreground">{showFileDetails.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">File Size</Label>
                  <p className="text-sm text-muted-foreground">
                    {(showFileDetails.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">File Type</Label>
                  <p className="text-sm text-muted-foreground">{showFileDetails.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Upload Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(showFileDetails.uploadedAt).toLocaleString()}
                  </p>
                </div>
                {showFileDetails.dimensions && (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Dimensions</Label>
                      <p className="text-sm text-muted-foreground">
                        {showFileDetails.dimensions.width} × {showFileDetails.dimensions.height}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Aspect Ratio</Label>
                      <p className="text-sm text-muted-foreground">
                        {(showFileDetails.dimensions.width / showFileDetails.dimensions.height).toFixed(2)}:1
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={() => window.open(showFileDetails.url, '_blank')}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                {showFileDetails.type.startsWith('image/') && (
                  <Button variant="outline" onClick={() => {
                    setEditingFile(showFileDetails);
                    setShowFileDetails(null);
                  }}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Image
                  </Button>
                )}
                <Button variant="outline" onClick={() => {
                  navigator.clipboard.writeText(showFileDetails.url);
                  toast.success("URL copied to clipboard");
                }}>
                  Copy URL
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Editor Dialog */}
      {editingFile && editingFile.type.startsWith('image/') && (
        <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Image Editor</DialogTitle>
              <DialogDescription>
                Edit and enhance your image with professional tools
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="filters">Filters</TabsTrigger>
                <TabsTrigger value="crop">Crop</TabsTrigger>
                <TabsTrigger value="effects">Effects</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <img
                    src={editingFile.url}
                    alt={editingFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Brightness</Label>
                    <Slider defaultValue={[50]} max={100} step={1} className="mt-2" />
                  </div>
                  <div>
                    <Label>Contrast</Label>
                    <Slider defaultValue={[50]} max={100} step={1} className="mt-2" />
                  </div>
                  <div>
                    <Label>Saturation</Label>
                    <Slider defaultValue={[50]} max={100} step={1} className="mt-2" />
                  </div>
                  <div>
                    <Label>Sharpness</Label>
                    <Slider defaultValue={[50]} max={100} step={1} className="mt-2" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="filters" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {['Original', 'Sepia', 'Black & White', 'Vintage', 'Vibrant', 'Cool'].map((filter) => (
                    <Button key={filter} variant="outline" className="h-auto p-3">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded mb-2 mx-auto"></div>
                        <span className="text-xs">{filter}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="crop" className="space-y-4">
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center relative">
                  <img
                    src={editingFile.url}
                    alt={editingFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                  <div className="absolute inset-4 border-2 border-dashed border-blue-500"></div>
                </div>

                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm">1:1</Button>
                  <Button variant="outline" size="sm">16:9</Button>
                  <Button variant="outline" size="sm">4:3</Button>
                  <Button variant="outline" size="sm">3:2</Button>
                  <Button variant="outline" size="sm">Custom</Button>
                </div>
              </TabsContent>

              <TabsContent value="effects" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="h-auto p-4">
                    <div className="text-center">
                      <RotateCcw className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm">Rotate Left</span>
                    </div>
                  </Button>
                  <Button variant="outline" className="h-auto p-4">
                    <div className="text-center">
                      <RotateCw className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-sm">Rotate Right</span>
                    </div>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setEditingFile(null)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  Reset
                </Button>
                <Button onClick={() => {
                  toast.success("Image saved successfully");
                  setEditingFile(null);
                }}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
