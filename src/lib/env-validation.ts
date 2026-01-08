// Environment variable validation for critical systems
// Now using Valyu OAuth for auth and billing (no more Polar)

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePaymentEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isSelfHostedMode = process.env.NEXT_PUBLIC_APP_MODE === 'self-hosted';
  const isValyuMode = !isSelfHostedMode;

  // Self-hosted mode - minimal requirements
  if (isSelfHostedMode) {
    // Just need basic API keys for development
    if (!process.env.VALYU_API_KEY && !process.env.NEXT_PUBLIC_VALYU_CLIENT_ID) {
      warnings.push('Neither VALYU_API_KEY nor Valyu OAuth credentials are set - searches will fail');
    }
    if (!process.env.DAYTONA_API_KEY) {
      warnings.push('DAYTONA_API_KEY missing - code execution will fail');
    }
    if (!process.env.OPENAI_API_KEY && !process.env.OLLAMA_BASE_URL && !process.env.LMSTUDIO_BASE_URL) {
      warnings.push('No LLM provider configured - set OPENAI_API_KEY, OLLAMA_BASE_URL, or LMSTUDIO_BASE_URL');
    }

    return {
      valid: true, // Self-hosted mode is always valid
      errors,
      warnings
    };
  }

  // Valyu mode - require full Valyu OAuth + App Supabase

  // Valyu OAuth requirements (4 required variables)
  if (!process.env.NEXT_PUBLIC_VALYU_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_VALYU_SUPABASE_URL is required for Valyu OAuth');
  }
  if (!process.env.NEXT_PUBLIC_VALYU_CLIENT_ID) {
    errors.push('NEXT_PUBLIC_VALYU_CLIENT_ID is required for Valyu OAuth');
  }
  if (!process.env.VALYU_CLIENT_SECRET) {
    errors.push('VALYU_CLIENT_SECRET is required for Valyu OAuth');
  }
  if (!process.env.VALYU_APP_URL && !process.env.NEXT_PUBLIC_VALYU_APP_URL) {
    errors.push('VALYU_APP_URL is required for Valyu OAuth proxy');
  }

  // App's own Supabase (for user data storage)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required for app data storage');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
  }

  // Other API requirements
  if (!process.env.DAYTONA_API_KEY) {
    warnings.push('DAYTONA_API_KEY missing - code execution will fail');
  }
  if (!process.env.OPENAI_API_KEY) {
    warnings.push('OPENAI_API_KEY missing - will use Vercel AI Gateway');
  }

  // Optional fallback API key
  if (!process.env.VALYU_API_KEY) {
    warnings.push('VALYU_API_KEY missing - no fallback for anonymous users');
  }

  // Validate URL formats
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
  }
  if (process.env.NEXT_PUBLIC_VALYU_SUPABASE_URL && !process.env.NEXT_PUBLIC_VALYU_SUPABASE_URL.startsWith('https://')) {
    errors.push('NEXT_PUBLIC_VALYU_SUPABASE_URL must be a valid HTTPS URL');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function logEnvironmentStatus(): void {
  const validation = validatePaymentEnvironment();

  if (!validation.valid) {
    console.error('[ENV] Configuration errors:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (validation.warnings.length > 0) {
    console.warn('[ENV] Configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
}

// Auto-validate on import in valyu mode
if (process.env.NEXT_PUBLIC_APP_MODE !== 'self-hosted') {
  const validation = validatePaymentEnvironment();
  if (!validation.valid) {
    console.error('[ENV] Environment validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    // Don't throw in production to avoid complete app failure, but log critically
  }
}
