import { publicProcedure } from '../../../create-context';
import { getCouchbaseClient, createDocument } from '../../../../db/couchbase-client';
import { getSQLiteClient, createEntity } from '../../../../db/sqlite-client';
import { z } from 'zod';

export const testConnectionProcedure = publicProcedure
  .input(z.object({
    database: z.enum(['sqlite', 'couchbase']).optional().default('sqlite')
  }))
  .query(async ({ input }) => {
    if (input.database === 'sqlite') {
      console.log('🧪 Testing SQLite connection...');
      
      try {
        const client = getSQLiteClient();
        
        // Test ping
        const pingResult = await client.ping();
        console.log('📡 SQLite ping result:', pingResult);
        
        if (!pingResult) {
          return {
            success: false,
            database: 'sqlite',
            error: 'Failed to ping SQLite database'
          };
        }
        
        // Test table operations
        const tables = await client.getTables();
        console.log('📋 Available tables:', tables);
        
        // Test insert operation
        interface TestUser {
          id: string;
          email: string;
          password_hash: string;
          role: 'guest' | 'contractor' | 'business_owner';
          is_verified: boolean;
          is_suspended: boolean;
        }
        
        const testUser = createEntity<TestUser>({
          id: `test-${Date.now()}`,
          email: `test-${Date.now()}@example.com`,
          password_hash: 'test_hash',
          role: 'guest',
          is_verified: false,
          is_suspended: false,
        });
        
        const insertResult = await client.insert('users', testUser);
        console.log('✅ SQLite insert result:', insertResult);
        
        if (!insertResult.success) {
          return {
            success: false,
            database: 'sqlite',
            error: `Failed to insert test user: ${insertResult.error}`
          };
        }
        
        // Test query operation
        const queryResult = await client.query('SELECT * FROM users WHERE id = ?', [testUser.id]);
        console.log('📖 SQLite query result:', queryResult);
        
        // Clean up - remove test user
        const deleteResult = await client.delete('users', 'id = ?', [testUser.id]);
        console.log('🗑️ SQLite delete result:', deleteResult);
        
        return {
          success: true,
          database: 'sqlite',
          message: 'SQLite connection test successful!',
          details: {
            ping: pingResult,
            tables: tables,
            insert: insertResult.success,
            query: queryResult.rows.length > 0,
            cleanup: deleteResult.success
          }
        };
        
      } catch (error) {
        console.error('❌ SQLite connection test failed:', error);
        return {
          success: false,
          database: 'sqlite',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    } else {
      // Couchbase test (legacy)
      console.log('🧪 Testing Couchbase connection...');
      
      try {
        const client = getCouchbaseClient();
        
        // Test ping
        const pingResult = await client.ping();
        console.log('📡 Couchbase ping result:', pingResult);
        
        if (!pingResult) {
          return {
            success: false,
            database: 'couchbase',
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
        console.log('✅ Couchbase insert result:', insertResult);
        
        if (!insertResult.success) {
          return {
            success: false,
            database: 'couchbase',
            error: `Failed to insert test document: ${insertResult.error}`
          };
        }
        
        // Retrieve test document
        const getResult = await client.get(key);
        console.log('📖 Couchbase get result:', getResult);
        
        if (!getResult.success) {
          return {
            success: false,
            database: 'couchbase',
            error: `Failed to retrieve test document: ${getResult.error}`
          };
        }
        
        // Clean up - remove test document
        const removeResult = await client.remove(key);
        console.log('🗑️ Couchbase remove result:', removeResult);
        
        return {
          success: true,
          database: 'couchbase',
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
          database: 'couchbase',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  });

export const createSampleDataProcedure = publicProcedure
  .input(z.object({
    count: z.number().min(1).max(100).default(5),
    database: z.enum(['sqlite', 'couchbase']).optional().default('sqlite')
  }))
  .mutation(async ({ input }) => {
    if (input.database === 'sqlite') {
      console.log(`🌱 Creating ${input.count} sample users in SQLite...`);
      
      try {
        const client = getSQLiteClient();
        const results = [];
        
        for (let i = 1; i <= input.count; i++) {
          interface SampleUser {
            id: string;
            email: string;
            password_hash: string;
            role: 'guest' | 'contractor' | 'business_owner';
            is_verified: boolean;
            is_suspended: boolean;
          }
          
          const role: 'guest' | 'contractor' | 'business_owner' = 
            i % 3 === 0 ? 'business_owner' : i % 2 === 0 ? 'contractor' : 'guest';
          
          const sampleUser = createEntity<SampleUser>({
            id: `sample-user-${i}`,
            email: `sample${i}@example.com`,
            password_hash: `hash_${i}`,
            role,
            is_verified: Math.random() > 0.3,
            is_suspended: false,
          });
          
          const result = await client.insert('users', sampleUser);
          
          results.push({
            id: sampleUser.id,
            success: result.success,
            error: result.error
          });
        }
        
        const successCount = results.filter(r => r.success).length;
        
        return {
          success: successCount === input.count,
          database: 'sqlite',
          message: `Created ${successCount}/${input.count} sample users`,
          results
        };
        
      } catch (error) {
        console.error('❌ Failed to create sample SQLite data:', error);
        return {
          success: false,
          database: 'sqlite',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    } else {
      // Couchbase sample data (legacy)
      console.log(`🌱 Creating ${input.count} sample documents in Couchbase...`);
      
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
          database: 'couchbase',
          message: `Created ${successCount}/${input.count} sample documents`,
          results
        };
        
      } catch (error) {
        console.error('❌ Failed to create sample Couchbase data:', error);
        return {
          success: false,
          database: 'couchbase',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  });

export const querySampleDataProcedure = publicProcedure
  .input(z.object({
    role: z.enum(['business_owner', 'contractor', 'guest']).optional(),
    limit: z.number().min(1).max(100).default(10),
    database: z.enum(['sqlite', 'couchbase']).optional().default('sqlite')
  }))
  .query(async ({ input }) => {
    if (input.database === 'sqlite') {
      console.log('🔍 Querying SQLite sample data...', input);
      
      try {
        const client = getSQLiteClient();
        
        let query = 'SELECT * FROM users WHERE id LIKE "sample-%"';
        const params: string[] = [];
        
        if (input.role) {
          query += ' AND role = ?';
          params.push(input.role);
        }
        
        query += ` ORDER BY created_at DESC LIMIT ${input.limit}`;
        
        console.log('📝 Executing SQLite query:', query, 'with params:', params);
        
        const result = await client.query(query, params);
        
        return {
          success: true,
          database: 'sqlite',
          data: result.rows,
          count: result.rows.length
        };
        
      } catch (error) {
        console.error('❌ SQLite query failed:', error);
        return {
          success: false,
          database: 'sqlite',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          data: []
        };
      }
    } else {
      // Couchbase query (legacy)
      console.log('🔍 Querying Couchbase sample data...', input);
      
      try {
        const client = getCouchbaseClient();
        
        let query = `SELECT META().id, * FROM \`${client.getCollectionPath()}\` WHERE type = 'sample'`;
        const params: any[] = [];
        
        // Note: Couchbase uses category instead of role
        query += ` ORDER BY createdAt DESC LIMIT ${input.limit}`;
        
        console.log('📝 Executing Couchbase query:', query, 'with params:', params);
        
        const result = await client.query(query, params);
        
        return {
          success: true,
          database: 'couchbase',
          data: result.results,
          count: result.results.length,
          metrics: result.metrics
        };
        
      } catch (error) {
        console.error('❌ Couchbase query failed:', error);
        return {
          success: false,
          database: 'couchbase',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          data: []
        };
      }
    }
  });