// src/__tests__/integration/set-env.ts
// Set environment variables before any other imports to avoid ESM hoisting issues.

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:obochi1234@localhost:5432/mikaelson_test?schema=public";
process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;

process.env.NEXTAUTH_SECRET        = "integration-test-secret-32-characters-minimum!!";
process.env.NEXTAUTH_URL           = "http://localhost:3000";
process.env.FIREBASE_PROJECT_ID    = "test-project";
process.env.FIREBASE_CLIENT_EMAIL  = "test@test-project.iam.gserviceaccount.com";
process.env.FIREBASE_PRIVATE_KEY   = "-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n";
process.env.UPSTASH_REDIS_REST_URL   = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
process.env.RESEND_API_KEY         = "re_test_key";
process.env.CRON_SECRET            = "integration-test-cron-secret-32-chars-min!!";
process.env.ALLOWED_ORIGINS        = "http://localhost:3000";
(process.env as any).NODE_ENV               = "test";
