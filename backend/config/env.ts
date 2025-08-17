/**
 * Environment Configuration
 * Centralized configuration management for environment variables
 */

export interface AppConfig {
  // Environment
  nodeEnv: string;
  isDevelopment: boolean;
  isProduction: boolean;
  
  // API
  apiBaseUrl: string;
  debug: boolean;
  
  // Email
  sendgrid: {
    apiKey: string;
    fromEmail: string;
  };
  
  // Authentication
  jwt: {
    secret: string;
  };
  session: {
    secret: string;
  };
  
  // Company/Branding
  company: {
    name: string;
    address: string;
    logoUrl: string;
    supportEmail: string;
    complianceFooter: string;
  };
  
  // Optional services
  twilio?: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  
  stripe?: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  
  expo?: {
    accessToken: string;
  };
  
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3BucketName?: string;
  };
  
  google?: {
    mapsApiKey: string;
    clientId?: string;
    clientSecret?: string;
  };
}

function getEnvVar(name: string, defaultValue?: string): string {
  const env = process.env as Record<string, string | undefined>;
  const value = env[name] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value;
}

function getOptionalEnvVar(name: string, defaultValue?: string): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  return env[name] || defaultValue;
}

function getBooleanEnvVar(name: string, defaultValue: boolean = false): boolean {
  const env = process.env as Record<string, string | undefined>;
  const value = env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export const config: AppConfig = {
  // Environment
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  isDevelopment: getEnvVar('NODE_ENV', 'development') === 'development',
  isProduction: getEnvVar('NODE_ENV', 'development') === 'production',
  
  // API
  apiBaseUrl: getEnvVar('API_BASE_URL', 'http://localhost:3000'),
  debug: getBooleanEnvVar('DEBUG', false),
  
  // Email (Required)
  sendgrid: {
    apiKey: getEnvVar('SENDGRID_API_KEY'),
    fromEmail: getEnvVar('SENDGRID_FROM'),
  },
  
  // Authentication (Required for production)
  jwt: {
    secret: getEnvVar('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
  },
  session: {
    secret: getEnvVar('SESSION_SECRET', 'dev-session-secret-change-in-production'),
  },
  
  // Company/Branding
  company: {
    name: getEnvVar('COMPANY_NAME', 'RevoVend'),
    address: getEnvVar('COMPANY_ADDRESS', '123 Business St, City, State 12345'),
    logoUrl: getEnvVar('COMPANY_LOGO_URL', 'https://revovend.com/logo.png'),
    supportEmail: getEnvVar('SUPPORT_EMAIL', 'support@revovend.com'),
    complianceFooter: getEnvVar('COMPLIANCE_FOOTER', 'This email was sent by RevoVend. If you no longer wish to receive these emails, please contact support@revovend.com'),
  },
  
  // Optional services
  ...(getOptionalEnvVar('TWILIO_ACCOUNT_SID') && {
    twilio: {
      accountSid: getEnvVar('TWILIO_ACCOUNT_SID'),
      authToken: getEnvVar('TWILIO_AUTH_TOKEN'),
      phoneNumber: getEnvVar('TWILIO_PHONE_NUMBER'),
    },
  }),
  
  ...(getOptionalEnvVar('STRIPE_SECRET_KEY') && {
    stripe: {
      secretKey: getEnvVar('STRIPE_SECRET_KEY'),
      publishableKey: getEnvVar('STRIPE_PUBLISHABLE_KEY'),
      webhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET'),
    },
  }),
  
  ...(getOptionalEnvVar('EXPO_ACCESS_TOKEN') && {
    expo: {
      accessToken: getEnvVar('EXPO_ACCESS_TOKEN'),
    },
  }),
  
  ...(getOptionalEnvVar('AWS_ACCESS_KEY_ID') && {
    aws: {
      accessKeyId: getEnvVar('AWS_ACCESS_KEY_ID'),
      secretAccessKey: getEnvVar('AWS_SECRET_ACCESS_KEY'),
      region: getEnvVar('AWS_REGION', 'us-east-1'),
      s3BucketName: getOptionalEnvVar('AWS_S3_BUCKET_NAME'),
    },
  }),
  
  ...(getOptionalEnvVar('GOOGLE_MAPS_API_KEY') && {
    google: {
      mapsApiKey: getEnvVar('GOOGLE_MAPS_API_KEY'),
      clientId: getOptionalEnvVar('GOOGLE_CLIENT_ID'),
      clientSecret: getOptionalEnvVar('GOOGLE_CLIENT_SECRET'),
    },
  }),
};

// Validation function to check configuration on startup
export function validateConfig(): void {
  const errors: string[] = [];
  
  // Check required fields
  if (!config.sendgrid.apiKey) {
    errors.push('SENDGRID_API_KEY is required');
  }
  
  if (!config.sendgrid.fromEmail) {
    errors.push('SENDGRID_FROM is required');
  }
  
  // Validate SendGrid API key format
  if (config.sendgrid.apiKey && !config.sendgrid.apiKey.startsWith('SG.')) {
    errors.push('SENDGRID_API_KEY must start with \"SG.\"');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (config.sendgrid.fromEmail && !emailRegex.test(config.sendgrid.fromEmail)) {
    errors.push('SENDGRID_FROM must be a valid email address');
  }
  
  // Production-specific validations
  if (config.isProduction) {
    if (config.jwt.secret === 'dev-jwt-secret-change-in-production') {
      errors.push('JWT_SECRET must be changed from default value in production');
    }
    
    if (config.session.secret === 'dev-session-secret-change-in-production') {
      errors.push('SESSION_SECRET must be changed from default value in production');
    }
    
    if (config.jwt.secret.length < 32) {
      errors.push('JWT_SECRET should be at least 32 characters long in production');
    }
    
    if (config.session.secret.length < 32) {
      errors.push('SESSION_SECRET should be at least 32 characters long in production');
    }
  }
  
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    if (config.isProduction) {
      throw new Error('Configuration validation failed in production environment');
    } else {
      console.warn('⚠️  Configuration issues detected. Please fix them before deploying to production.');
    }
  } else {
    console.log('✅ Configuration validation passed');
  }
}

// Log configuration status (without sensitive data)
export function logConfigStatus(): void {
  console.log('📋 Configuration Status:');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  API Base URL: ${config.apiBaseUrl}`);
  console.log(`  Debug Mode: ${config.debug}`);
  console.log(`  SendGrid: ${config.sendgrid.apiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Twilio: ${config.twilio ? '✅ Configured' : '⚪ Optional'}`);
  console.log(`  Stripe: ${config.stripe ? '✅ Configured' : '⚪ Optional'}`);
  console.log(`  Expo Push: ${config.expo ? '✅ Configured' : '⚪ Optional'}`);
  console.log(`  AWS: ${config.aws ? '✅ Configured' : '⚪ Optional'}`);
  console.log(`  Google: ${config.google ? '✅ Configured' : '⚪ Optional'}`);
}