/**
 * Couchbase Database Client
 * HTTP-based client for Couchbase operations since native SDK isn't available in Expo Go
 */

import { config } from '../config/env';

export interface CouchbaseDocument {
  [key: string]: any;
}

export interface CouchbaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  cas?: string;
}

export interface QueryResult<T = any> {
  results: T[];
  metrics?: {
    resultCount: number;
    executionTime: string;
  };
}

class CouchbaseClient {
  private baseUrl: string;
  private credentials: string;
  private bucketName: string;
  private scopeName: string = '_default';
  private collectionName: string = '_default';

  constructor() {
    if (!config.database) {
      throw new Error('Couchbase configuration not found in environment variables');
    }

    // Extract cluster ID from connection string
    const clusterMatch = config.database.connectionString.match(/cb\.([^.]+)\./);
    const clusterId = clusterMatch ? clusterMatch[1] : 'unknown';
    
    this.baseUrl = `https://${clusterId}.cloud.couchbase.com:18091`;
    this.credentials = Buffer.from(
      `${config.database.username}:${config.database.password}`
    ).toString('base64');
    this.bucketName = config.database.bucketName;

    console.log('🗄️ Couchbase client initialized:', {
      cluster: clusterId,
      bucket: this.bucketName,
      scope: this.scopeName,
      collection: this.collectionName
    });
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${this.credentials}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Couchbase request failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  // Key-Value Operations
  async get<T = any>(key: string): Promise<CouchbaseResult<T>> {
    try {
      const endpoint = `/pools/default/buckets/${this.bucketName}/scopes/${this.scopeName}/collections/${this.collectionName}/docs/${key}`;
      const data = await this.makeRequest(endpoint);
      
      return {
        success: true,
        data: data.content || data,
        cas: data.cas
      };
    } catch (error) {
      console.error('Couchbase get error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async insert<T = any>(key: string, document: T): Promise<CouchbaseResult<T>> {
    try {
      const endpoint = `/pools/default/buckets/${this.bucketName}/scopes/${this.scopeName}/collections/${this.collectionName}/docs/${key}`;
      const result = await this.makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(document)
      });
      
      return {
        success: true,
        data: document,
        cas: result.cas
      };
    } catch (error) {
      console.error('Couchbase insert error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async upsert<T = any>(key: string, document: T): Promise<CouchbaseResult<T>> {
    try {
      const endpoint = `/pools/default/buckets/${this.bucketName}/scopes/${this.scopeName}/collections/${this.collectionName}/docs/${key}`;
      const result = await this.makeRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(document)
      });
      
      return {
        success: true,
        data: document,
        cas: result.cas
      };
    } catch (error) {
      console.error('Couchbase upsert error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async replace<T = any>(key: string, document: T, cas?: string): Promise<CouchbaseResult<T>> {
    try {
      const endpoint = `/pools/default/buckets/${this.bucketName}/scopes/${this.scopeName}/collections/${this.collectionName}/docs/${key}`;
      const headers: Record<string, string> = {};
      
      if (cas) {
        headers['If-Match'] = cas;
      }
      
      const result = await this.makeRequest(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(document)
      });
      
      return {
        success: true,
        data: document,
        cas: result.cas
      };
    } catch (error) {
      console.error('Couchbase replace error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async remove(key: string, cas?: string): Promise<CouchbaseResult<void>> {
    try {
      const endpoint = `/pools/default/buckets/${this.bucketName}/scopes/${this.scopeName}/collections/${this.collectionName}/docs/${key}`;
      const headers: Record<string, string> = {};
      
      if (cas) {
        headers['If-Match'] = cas;
      }
      
      await this.makeRequest(endpoint, {
        method: 'DELETE',
        headers
      });
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Couchbase remove error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Query Operations (N1QL)
  async query<T = any>(statement: string, parameters?: any[]): Promise<QueryResult<T>> {
    try {
      const endpoint = '/query/service';
      const body = {
        statement,
        ...(parameters && { args: parameters })
      };
      
      const result = await this.makeRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      
      return {
        results: result.results || [],
        metrics: result.metrics
      };
    } catch (error) {
      console.error('Couchbase query error:', error);
      throw error;
    }
  }

  // Utility methods
  generateKey(type: string, id: string | number): string {
    return `${type}_${id}`;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.get(key);
    return result.success;
  }

  // Batch operations
  async getBatch<T = any>(keys: string[]): Promise<Record<string, CouchbaseResult<T>>> {
    const results: Record<string, CouchbaseResult<T>> = {};
    
    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.get<T>(key);
      })
    );
    
    return results;
  }

  async upsertBatch<T = any>(documents: Record<string, T>): Promise<Record<string, CouchbaseResult<T>>> {
    const results: Record<string, CouchbaseResult<T>> = {};
    
    await Promise.all(
      Object.entries(documents).map(async ([key, document]) => {
        results[key] = await this.upsert(key, document);
      })
    );
    
    return results;
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      await this.makeRequest('/pools/default');
      return true;
    } catch (error) {
      console.error('Couchbase ping failed:', error);
      return false;
    }
  }

  // Collection management
  setScope(scopeName: string): void {
    this.scopeName = scopeName;
  }

  setCollection(collectionName: string): void {
    this.collectionName = collectionName;
  }

  getCollectionPath(): string {
    return `${this.bucketName}.${this.scopeName}.${this.collectionName}`;
  }
}

// Singleton instance
let couchbaseClient: CouchbaseClient | null = null;

export function getCouchbaseClient(): CouchbaseClient {
  if (!couchbaseClient) {
    couchbaseClient = new CouchbaseClient();
  }
  return couchbaseClient;
}

export { CouchbaseClient };

// Helper functions for common patterns
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i < maxRetries - 1) {
        console.warn(`Operation failed, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

// Type-safe document operations
export interface BaseDocument {
  id: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export function createDocument<T extends Partial<BaseDocument>>(type: string, data: Omit<T, 'type' | 'createdAt' | 'updatedAt'>): T & BaseDocument {
  const now = new Date().toISOString();
  
  return {
    ...data,
    id: data.id || crypto.randomUUID(),
    type,
    createdAt: now,
    updatedAt: now
  } as T & BaseDocument;
}

export function updateDocument<T extends BaseDocument>(document: T, updates: Partial<Omit<T, 'id' | 'type' | 'createdAt'>>): T {
  return {
    ...document,
    ...updates,
    updatedAt: new Date().toISOString()
  };
}