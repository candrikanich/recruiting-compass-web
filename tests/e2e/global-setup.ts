import type { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  console.log('🧪 E2E Global Setup...');

  // Only seed in CI or when E2E_SEED=true
  const shouldSeed = process.env.CI === 'true' || process.env.E2E_SEED === 'true';

  if (shouldSeed) {
    console.log('🌱 Seeding test database...');
    try {
      execSync('npm run db:seed:test', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      // Don't exit - tests can still run with existing data
    }
  } else {
    console.log('⏭️  Skipping database seed (set E2E_SEED=true to seed)');
  }

  console.log('✅ Global setup complete');
}

export default globalSetup;
