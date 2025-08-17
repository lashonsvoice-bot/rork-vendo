import { publicProcedure } from '../../../create-context';
import { getCouchbaseClient, createDocument } from '../../../../db/couchbase-client';
import { z } from 'zod';

export const testConnectionProcedure = publicProcedure
  .query(async () => {
    console.log('🧪 Testing Couchbase connection...');
    
    try {
      const client = getCouchbaseClient();
      
      // Test ping
      const pingResult = await client.ping();
      console.log('📡 Ping result:', pingResult);
      
      if (!pingResult) {
        return {
          success: false,
          error: 'Failed to ping Couchbase cluster'
        };
      }
      
      // Test document operations
      const testDoc = createDocument('test', {
        id: 'test-connection',
        message: 'Hello from RevoVend!',
        timestamp: new Date().toISOString()
      } as any);
      
      const key = client.generateKey('test', 'connection');
      console.log('📝 Testing document operations with key:', key);
      
      // Insert test document
      const insertResult = await client.upsert(key, testDoc);
      console.log('✅ Insert result:', insertResult);
      
      if (!insertResult.success) {
        return {
          success: false,
          error: `Failed to insert test document: ${insertResult.error}`
        };
      }
      
      // Retrieve test document
      const getResult = await client.get(key);
      console.log('📖 Get result:', getResult);
      
      if (!getResult.success) {
        return {
          success: false,
          error: `Failed to retrieve test document: ${getResult.error}`
        };
      }
      
      // Clean up - remove test document
      const removeResult = await client.remove(key);
      console.log('🗑️ Remove result:', removeResult);
      
      return {
        success: true,
        message: 'Couchbase connection test successful!',
        details: {
          ping: pingResult,
          insert: insertResult.success,
          retrieve: getResult.success,
          cleanup: removeResult.success,
          collectionPath: client.getCollectionPath()
        }
      };
      
    } catch (error) {
      console.error('❌ Couchbase connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });

export const createSampleDataProcedure = publicProcedure
  .input(z.object({
    count: z.number().min(1).max(100).default(5)
  }))
  .mutation(async ({ input }: { input: { count: number } }) => {
    console.log(`🌱 Creating ${input.count} sample documents...`);
    
    try {
      const client = getCouchbaseClient();
      const results = [];
      
      for (let i = 1; i <= input.count; i++) {
        const sampleDoc = createDocument('sample', {
          id: `sample-${i}`,
          name: `Sample Document ${i}`,
          description: `This is sample document number ${i}`,
          category: i % 2 === 0 ? 'even' : 'odd',
          value: Math.floor(Math.random() * 1000),
          tags: [`tag-${i}`, `category-${i % 3}`],
          active: Math.random() > 0.3
        } as any);
        
        const key = client.generateKey('sample', i);
        const result = await client.upsert(key, sampleDoc);
        
        results.push({
          key,
          success: result.success,
          error: result.error
        });
      }
      
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: successCount === input.count,
        message: `Created ${successCount}/${input.count} sample documents`,
        results
      };
      
    } catch (error) {
      console.error('❌ Failed to create sample data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });

export const querySampleDataProcedure = publicProcedure
  .input(z.object({
    category: z.enum(['even', 'odd']).optional(),
    limit: z.number().min(1).max(100).default(10)
  }))
  .query(async ({ input }: { input: { category?: 'even' | 'odd'; limit: number } }) => {
    console.log('🔍 Querying sample data...', input);
    
    try {
      const client = getCouchbaseClient();
      
      let query = `SELECT META().id, * FROM \`${client.getCollectionPath()}\` WHERE type = 'sample'`;
      const params = [];
      
      if (input.category) {
        query += ` AND category = $1`;
        params.push(input.category);
      }
      
      query += ` ORDER BY createdAt DESC LIMIT ${input.limit}`;
      
      console.log('📝 Executing query:', query, 'with params:', params);
      
      const result = await client.query(query, params.length > 0 ? params : undefined);
      
      return {
        success: true,
        data: result.results,
        count: result.results.length,
        metrics: result.metrics
      };
      
    } catch (error) {
      console.error('❌ Query failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: []
      };
    }
  });