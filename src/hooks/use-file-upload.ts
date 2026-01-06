"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  url?: string;
  error?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
  };
}

export interface UploadOptions {
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  maxFiles?: number;
  autoStart?: boolean;
  onProgress?: (file: UploadFile) => void;
  onComplete?: (file: UploadFile) => void;
  onError?: (file: UploadFile, error: string) => void;
  apiEndpoint?: string;
  chunkSize?: number; // for chunked uploads in bytes
}

// Simulated upload service for demo purposes
class UploadService {
  static async uploadFile(
    file: File,
    options: UploadOptions,
    onProgress?: (progress: number) => void
  ): Promise<{ url: string; metadata?: Record<string, unknown> }> {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress > 100) progress = 100;

        onProgress?.(progress);

        if (progress >= 100) {
          clearInterval(interval);
          resolve({
            url: URL.createObjectURL(file),
            metadata: file.type.startsWith('image/') ? { width: 1920, height: 1080 } : undefined
          });
        }
      }, 200);

      // Simulate random failures
      if (Math.random() < 0.05) {
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Upload failed'));
        }, 1000);
      }
    });
  }

  static async optimizeImage(file: File): Promise<File> {
    // Simulate image optimization
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(file); // In real implementation, return optimized file
      }, 1000);
    });
  }

  static async extractMetadata(file: File): Promise<{
    width?: number;
    height?: number;
    duration?: number;
  }> {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height
          });
        };
        img.onerror = () => resolve({});
        img.src = URL.createObjectURL(file);
      });
    }

    if (file.type.startsWith('video/')) {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            duration: video.duration
          });
        };
        video.onerror = () => resolve({});
        video.src = URL.createObjectURL(file);
      });
    }

    return {};
  }

  static validateFile(file: File, options: UploadOptions): { valid: boolean; error?: string } {
    // Size validation
    const maxSize = (options.maxFileSize || 10) * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${options.maxFileSize || 10}MB limit`
      };
    }

    // Type validation
    const acceptedTypes = options.acceptedTypes || ['*'];
    if (!acceptedTypes.includes('*')) {
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type.match(type.replace('*', '.*'));
      });

      if (!isValidType) {
        return {
          valid: false,
          error: `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`
        };
      }
    }

    return { valid: true };
  }
}

export function useFileUpload(options: UploadOptions = {}) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const activeUploadsRef = useRef<Set<string>>(new Set());

  // Add files to upload queue
  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles = Array.from(fileList).map(file => {
      // Validate file
      const validation = UploadService.validateFile(file, options);
      if (!validation.valid) {
        toast.error(validation.error!);
        return null;
      }

      const uploadFile: UploadFile = {
        id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        progress: 0,
        status: 'pending'
      };

      return uploadFile;
    }).filter(Boolean) as UploadFile[];

    // Check max files limit
    if (options.maxFiles && files.length + newFiles.length > options.maxFiles) {
      toast.error(`Maximum ${options.maxFiles} files allowed`);
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);

    if (options.autoStart !== false) {
      setUploadQueue(prev => [...prev, ...newFiles.map(f => f.id)]);
    }

    return newFiles;
  }, [files.length, options]);

  // Process upload queue
  const processQueue = useCallback(async () => {
    if (uploadQueue.length === 0 || isUploading) return;

    setIsUploading(true);

    for (const fileId of uploadQueue) {
      if (activeUploadsRef.current.has(fileId)) continue;

      const uploadFile = files.find(f => f.id === fileId);
      if (!uploadFile || uploadFile.status !== 'pending') continue;

      activeUploadsRef.current.add(fileId);

      try {
        // Update status to uploading
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, status: 'uploading' } : f
        ));

        // Extract metadata first
        const metadata = await UploadService.extractMetadata(uploadFile.file);
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, metadata } : f
        ));

        // Create abort controller
        const abortController = new AbortController();
        abortControllersRef.current.set(fileId, abortController);

        // Upload file with progress tracking
        const result = await UploadService.uploadFile(
          uploadFile.file,
          options,
          (progress) => {
            setFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, progress } : f
            ));
            options.onProgress?.(uploadFile);
          }
        );

        // Update with completion
        const completedFile = {
          ...uploadFile,
          status: 'completed' as const,
          progress: 100,
          url: result.url,
          metadata: { ...metadata, ...result.metadata }
        };

        setFiles(prev => prev.map(f =>
          f.id === fileId ? completedFile : f
        ));

        options.onComplete?.(completedFile);
        toast.success(`${uploadFile.file.name} uploaded successfully`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        setFiles(prev => prev.map(f =>
          f.id === fileId ? {
            ...f,
            status: 'error',
            error: errorMessage
          } : f
        ));

        options.onError?.(uploadFile, errorMessage);
        toast.error(`Failed to upload ${uploadFile.file.name}: ${errorMessage}`);
      } finally {
        activeUploadsRef.current.delete(fileId);
        abortControllersRef.current.delete(fileId);
      }
    }

    setUploadQueue([]);
    setIsUploading(false);
  }, [uploadQueue, files, isUploading, options]);

  // Start upload queue processing
  const startUploads = useCallback((fileIds?: string[]) => {
    if (fileIds) {
      setUploadQueue(prev => [...prev, ...fileIds]);
    } else {
      const pendingFiles = files.filter(f => f.status === 'pending').map(f => f.id);
      setUploadQueue(prev => [...prev, ...pendingFiles]);
    }
  }, [files]);

  // Retry failed upload
  const retryUpload = useCallback((fileId: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, status: 'pending', progress: 0, error: undefined } : f
    ));
    setUploadQueue(prev => [...prev, fileId]);
  }, []);

  // Cancel upload
  const cancelUpload = useCallback((fileId: string) => {
    const abortController = abortControllersRef.current.get(fileId);
    if (abortController) {
      abortController.abort();
    }

    setFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadQueue(prev => prev.filter(id => id !== fileId));
    activeUploadsRef.current.delete(fileId);
    abortControllersRef.current.delete(fileId);
  }, []);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    cancelUpload(fileId);
  }, [cancelUpload]);

  // Clear all files
  const clearFiles = useCallback(() => {
    // Cancel all active uploads
    abortControllersRef.current.forEach(controller => controller.abort());

    setFiles([]);
    setUploadQueue([]);
    activeUploadsRef.current.clear();
    abortControllersRef.current.clear();
    setIsUploading(false);
  }, []);

  // Get upload statistics
  const getStats = useCallback(() => {
    const completed = files.filter(f => f.status === 'completed').length;
    const uploading = files.filter(f => f.status === 'uploading').length;
    const pending = files.filter(f => f.status === 'pending').length;
    const errors = files.filter(f => f.status === 'error').length;
    const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);

    return {
      total: files.length,
      completed,
      uploading,
      pending,
      errors,
      totalSize,
      completionRate: files.length > 0 ? (completed / files.length) * 100 : 0
    };
  }, [files]);

  // Auto-process queue when files are added
  useEffect(() => {
    if (uploadQueue.length > 0 && !isUploading) {
      processQueue();
    }
  }, [uploadQueue, isUploading, processQueue]);

  return {
    files,
    isUploading,
    uploadQueue,
    addFiles,
    startUploads,
    retryUpload,
    cancelUpload,
    removeFile,
    clearFiles,
    getStats: getStats()
  };
}
