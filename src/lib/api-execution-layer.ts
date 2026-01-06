/**
 * Central API Execution Layer
 *
 * This module provides a unified interface for all external API calls.
 * All API integrations MUST go through this layer.
 *
 * Features:
 * - Centralized request handling
 * - Centralized error handling
 * - Centralized logging
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - API status tracking
 * - Audit logging for all API calls
 */

import { useIntegrationsStore, type IntegrationStatus } from './integrations-store';

// API execution configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

// API call log entry
export interface APICallLog {
  id: string;
  integrationId: string;
  endpoint: string;
  method: string;
  status: 'pending' | 'success' | 'error' | 'timeout' | 'retry';
  statusCode?: number;
  duration: number;
  errorMessage?: string;
  retryCount: number;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// In-memory API call logs (would be persisted in production)
const apiCallLogs: APICallLog[] = [];

// API execution error class
export class APIExecutionError extends Error {
  public integrationId: string;
  public statusCode?: number;
  public isRetryable: boolean;
  public originalError?: Error;

  constructor(
    message: string,
    integrationId: string,
    options?: {
      statusCode?: number;
      isRetryable?: boolean;
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = 'APIExecutionError';
    this.integrationId = integrationId;
    this.statusCode = options?.statusCode;
    this.isRetryable = options?.isRetryable ?? false;
    this.originalError = options?.originalError;
  }
}

// API execution result
export interface APIExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: APIExecutionError;
  integrationId: string;
  duration: number;
  retryCount: number;
}

// API execution options
export interface APIExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  userId?: string;
  metadata?: Record<string, unknown>;
  skipStatusCheck?: boolean;
}

/**
 * Check if an integration is ready for use
 */
export const isIntegrationReady = (integrationId: string): boolean => {
  const store = useIntegrationsStore.getState();
  const integration = store.getIntegration(integrationId);

  return !!(
    integration &&
    integration.isEnabled &&
    integration.isConfigured &&
    integration.status === 'connected'
  );
};

/**
 * Get integration status with detailed information
 */
export const getIntegrationStatus = (integrationId: string): {
  available: boolean;
  status: IntegrationStatus;
  message: string;
} => {
  const store = useIntegrationsStore.getState();
  const integration = store.getIntegration(integrationId);

  if (!integration) {
    return {
      available: false,
      status: 'not_configured',
      message: 'Integration not found',
    };
  }

  if (!integration.isConfigured) {
    return {
      available: false,
      status: 'not_configured',
      message: 'Integration not configured. Please contact administrator.',
    };
  }

  if (!integration.isEnabled) {
    return {
      available: false,
      status: 'disconnected',
      message: 'Integration is disabled. Please contact administrator.',
    };
  }

  if (integration.status === 'error') {
    return {
      available: false,
      status: 'error',
      message: integration.lastError || 'Integration has encountered an error.',
    };
  }

  return {
    available: true,
    status: 'connected',
    message: 'Integration is ready',
  };
};

/**
 * Generate unique log ID
 */
const generateLogId = (): string => {
  return `api_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

/**
 * Add log entry
 */
const addLogEntry = (log: APICallLog): void => {
  apiCallLogs.unshift(log);
  // Keep only last 1000 entries
  if (apiCallLogs.length > 1000) {
    apiCallLogs.pop();
  }
};

/**
 * Get API call logs
 */
export const getAPICallLogs = (integrationId?: string): APICallLog[] => {
  if (integrationId) {
    return apiCallLogs.filter((log) => log.integrationId === integrationId);
  }
  return [...apiCallLogs];
};

/**
 * Update integration status based on API call result
 */
const updateIntegrationStatus = (
  integrationId: string,
  success: boolean,
  error?: string
): void => {
  const store = useIntegrationsStore.getState();
  const status: IntegrationStatus = success ? 'connected' : 'error';
  store.updateStatus(integrationId, status, error);
};

/**
 * Sleep helper for retry delays
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Execute an API call with retry logic
 */
async function executeWithRetry<T>(
  integrationId: string,
  endpoint: string,
  method: string,
  executeFn: () => Promise<T>,
  options: APIExecutionOptions = {}
): Promise<APIExecutionResult<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    maxRetries = MAX_RETRIES,
    retryDelay = RETRY_DELAY_BASE,
    userId,
    metadata,
    skipStatusCheck = false,
  } = options;

  const startTime = Date.now();
  let retryCount = 0;
  let lastError: Error | undefined;

  // Check integration status before executing
  if (!skipStatusCheck) {
    const status = getIntegrationStatus(integrationId);
    if (!status.available) {
      const error = new APIExecutionError(
        status.message,
        integrationId,
        { isRetryable: false }
      );

      addLogEntry({
        id: generateLogId(),
        integrationId,
        endpoint,
        method,
        status: 'error',
        duration: 0,
        errorMessage: status.message,
        retryCount: 0,
        timestamp: new Date().toISOString(),
        userId,
        metadata,
      });

      return {
        success: false,
        error,
        integrationId,
        duration: 0,
        retryCount: 0,
      };
    }
  }

  while (retryCount <= maxRetries) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
      });

      // Race between execution and timeout
      const result = await Promise.race([executeFn(), timeoutPromise]);

      const duration = Date.now() - startTime;

      // Log successful call
      addLogEntry({
        id: generateLogId(),
        integrationId,
        endpoint,
        method,
        status: 'success',
        duration,
        retryCount,
        timestamp: new Date().toISOString(),
        userId,
        metadata,
      });

      // Update integration status to connected
      updateIntegrationStatus(integrationId, true);

      return {
        success: true,
        data: result,
        integrationId,
        duration,
        retryCount,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isTimeout = lastError.message.includes('timeout');

      // Log retry attempt
      if (retryCount < maxRetries) {
        addLogEntry({
          id: generateLogId(),
          integrationId,
          endpoint,
          method,
          status: 'retry',
          duration: Date.now() - startTime,
          errorMessage: lastError.message,
          retryCount,
          timestamp: new Date().toISOString(),
          userId,
          metadata,
        });

        // Wait before retrying with exponential backoff
        await sleep(retryDelay * Math.pow(2, retryCount));
        retryCount++;
      } else {
        break;
      }
    }
  }

  const duration = Date.now() - startTime;
  const isTimeout = lastError?.message.includes('timeout');

  // Log final failure
  addLogEntry({
    id: generateLogId(),
    integrationId,
    endpoint,
    method,
    status: isTimeout ? 'timeout' : 'error',
    duration,
    errorMessage: lastError?.message,
    retryCount,
    timestamp: new Date().toISOString(),
    userId,
    metadata,
  });

  // Update integration status to error
  updateIntegrationStatus(integrationId, false, lastError?.message);

  const apiError = new APIExecutionError(
    lastError?.message || 'API call failed',
    integrationId,
    {
      isRetryable: false,
      originalError: lastError,
    }
  );

  return {
    success: false,
    error: apiError,
    integrationId,
    duration,
    retryCount,
  };
}

/**
 * Execute a fetch request through the API execution layer
 */
export async function executeFetch<T>(
  integrationId: string,
  url: string,
  init?: RequestInit,
  options?: APIExecutionOptions
): Promise<APIExecutionResult<T>> {
  const method = init?.method || 'GET';

  return executeWithRetry<T>(
    integrationId,
    url,
    method,
    async () => {
      const response = await fetch(url, init);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    },
    options
  );
}

/**
 * Execute a custom function through the API execution layer
 */
export async function executeAPI<T>(
  integrationId: string,
  description: string,
  executeFn: () => Promise<T>,
  options?: APIExecutionOptions
): Promise<APIExecutionResult<T>> {
  return executeWithRetry<T>(
    integrationId,
    description,
    'CUSTOM',
    executeFn,
    options
  );
}

/**
 * Check if a feature is available based on integration status
 */
export const isFeatureAvailable = (integrationId: string): {
  available: boolean;
  reason?: string;
} => {
  const status = getIntegrationStatus(integrationId);
  return {
    available: status.available,
    reason: status.available ? undefined : status.message,
  };
};

/**
 * Create a gated function that only executes if the integration is ready
 */
export function createGatedFunction<TArgs extends unknown[], TResult>(
  integrationId: string,
  fn: (...args: TArgs) => Promise<TResult>,
  fallbackError: string
): (...args: TArgs) => Promise<{ success: boolean; data?: TResult; error?: string }> {
  return async (...args: TArgs) => {
    const status = getIntegrationStatus(integrationId);

    if (!status.available) {
      return {
        success: false,
        error: fallbackError || status.message,
      };
    }

    try {
      const result = await fn(...args);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      updateIntegrationStatus(
        integrationId,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Operation failed',
      };
    }
  };
}

/**
 * Get statistics for API calls
 */
export const getAPIStats = (): {
  totalCalls: number;
  successRate: number;
  averageDuration: number;
  byIntegration: Record<string, { total: number; success: number; avgDuration: number }>;
} => {
  const byIntegration: Record<string, { total: number; success: number; totalDuration: number }> = {};

  let totalSuccess = 0;
  let totalDuration = 0;

  for (const log of apiCallLogs) {
    if (!byIntegration[log.integrationId]) {
      byIntegration[log.integrationId] = { total: 0, success: 0, totalDuration: 0 };
    }

    byIntegration[log.integrationId].total++;
    byIntegration[log.integrationId].totalDuration += log.duration;

    if (log.status === 'success') {
      byIntegration[log.integrationId].success++;
      totalSuccess++;
    }

    totalDuration += log.duration;
  }

  const total = apiCallLogs.length;

  return {
    totalCalls: total,
    successRate: total > 0 ? (totalSuccess / total) * 100 : 0,
    averageDuration: total > 0 ? totalDuration / total : 0,
    byIntegration: Object.fromEntries(
      Object.entries(byIntegration).map(([id, stats]) => [
        id,
        {
          total: stats.total,
          success: stats.success,
          avgDuration: stats.total > 0 ? stats.totalDuration / stats.total : 0,
        },
      ])
    ),
  };
};

/**
 * Create an API health check function
 */
export const checkAPIHealth = async (integrationId: string): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> => {
  const status = getIntegrationStatus(integrationId);

  if (!status.available) {
    return {
      healthy: false,
      error: status.message,
    };
  }

  const startTime = Date.now();

  // Perform a lightweight health check based on integration type
  // This would be customized per integration in production
  try {
    await sleep(100); // Simulated health check
    return {
      healthy: true,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Health check failed',
    };
  }
};
