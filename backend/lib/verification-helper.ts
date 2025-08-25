import { profileRepo, type AnyProfile } from '../db/profile-repo';

export interface VerificationRequirement {
  isRequired: boolean;
  reason?: string;
  userType: 'contractor' | 'business_owner' | 'event_host';
}

export async function checkVerificationRequirement(
  userId: string,
  action: 'apply_to_job' | 'hire_contractor' | 'accept_payment' | 'send_proposal'
): Promise<VerificationRequirement> {
  const profile = await profileRepo.findByUserId(userId);
  
  if (!profile) {
    throw new Error('Profile not found');
  }

  const isVerified = profile.isVerified === true;
  
  switch (action) {
    case 'apply_to_job':
      // Contractors must be verified to apply to jobs
      if (profile.role === 'contractor') {
        return {
          isRequired: !isVerified,
          reason: isVerified ? undefined : 'ID verification is required to apply for contractor positions',
          userType: 'contractor'
        };
      }
      break;
      
    case 'hire_contractor':
      // Business owners must be verified to hire contractors
      if (profile.role === 'business_owner') {
        return {
          isRequired: !isVerified,
          reason: isVerified ? undefined : 'ID verification is required to hire contractors',
          userType: 'business_owner'
        };
      }
      break;
      
    case 'accept_payment':
      // Event hosts must be verified to accept payments from business owners
      if (profile.role === 'event_host') {
        return {
          isRequired: !isVerified,
          reason: isVerified ? undefined : 'ID verification is required to accept payments from business owners',
          userType: 'event_host'
        };
      }
      break;
      
    case 'send_proposal':
      // Event hosts must be verified to send proposals
      if (profile.role === 'event_host') {
        return {
          isRequired: !isVerified,
          reason: isVerified ? undefined : 'ID verification is required to send proposals',
          userType: 'event_host'
        };
      }
      break;
  }
  
  return {
    isRequired: false,
    userType: profile.role as any
  };
}

export function createVerificationError(requirement: VerificationRequirement): Error {
  return new Error(`VERIFICATION_REQUIRED: ${requirement.reason}`);
}

export function isVerificationError(error: Error): boolean {
  return error.message.startsWith('VERIFICATION_REQUIRED:');
}

export function getVerificationErrorMessage(error: Error): string {
  if (isVerificationError(error)) {
    return error.message.replace('VERIFICATION_REQUIRED: ', '');
  }
  return error.message;
}