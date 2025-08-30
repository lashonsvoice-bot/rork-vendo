/**
 * Ambassador Authentication Routes
 */

import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { getAmbassadorRepository } from '../../../../db/ambassador-repo';
import { TRPCError } from '@trpc/server';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ambassador-secret-key-change-in-production';

export const ambassadorSignup = publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2),
    phone: z.string().optional()
  }))
  .mutation(async ({ input }) => {
    const repo = getAmbassadorRepository();
    await repo.initialize();

    // Check if ambassador already exists
    const existing = await repo.findAmbassadorByEmail(input.email);
    if (existing) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'An ambassador with this email already exists'
      });
    }

    // Create new ambassador
    const ambassador = await repo.createAmbassador(input);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: ambassador.id, 
        email: ambassador.email,
        type: 'ambassador'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return {
      success: true,
      ambassador: {
        id: ambassador.id,
        email: ambassador.email,
        name: ambassador.name,
        referralCode: ambassador.referralCode
      },
      token
    };
  });

export const ambassadorLogin = publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string()
  }))
  .mutation(async ({ input }) => {
    console.log('[Ambassador Auth] Login attempt for:', input.email);
    
    const repo = getAmbassadorRepository();
    await repo.initialize();

    const ambassador = await repo.validateAmbassadorPassword(input.email, input.password);
    
    if (!ambassador) {
      console.log('[Ambassador Auth] Login failed - invalid credentials for:', input.email);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password'
      });
    }

    if (ambassador.status !== 'active') {
      console.log('[Ambassador Auth] Login failed - account suspended:', input.email);
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Your ambassador account has been suspended'
      });
    }
    
    console.log('[Ambassador Auth] Login successful for:', input.email)

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: ambassador.id, 
        email: ambassador.email,
        type: 'ambassador'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const result = {
      success: true,
      ambassador: {
        id: ambassador.id,
        email: ambassador.email,
        name: ambassador.name,
        referralCode: ambassador.referralCode,
        totalEarnings: ambassador.totalEarnings || 0,
        pendingEarnings: ambassador.pendingEarnings || 0,
        paidEarnings: ambassador.paidEarnings || 0
      },
      token
    };
    
    console.log('[Ambassador Auth] Returning result for:', ambassador.email);
    return result;
  });