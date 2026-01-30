import { createClient } from '@supabase/supabase-js';
import { TEST_ACCOUNTS } from '../../config/test-accounts';

export const getSupabaseAdmin = () => {
  const url = process.env.TEST_SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NUXT_PUBLIC_SUPABASE_URL or TEST_SUPABASE_URL required for test seeding');
  }

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY required for test seeding');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function createTestAccounts() {
  const supabase = getSupabaseAdmin();

  for (const [key, account] of Object.entries(TEST_ACCOUNTS)) {
    try {
      // Try to delete existing user first
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u) => u.email === account.email);

      if (existingUser) {
        console.log(`⏭️  Test account already exists: ${account.email}`);
        continue;
      }

      // Create new user
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          display_name: account.displayName,
          role: account.role,
        },
      });

      if (error) {
        throw error;
      }

      console.log(`✅ Created test account: ${account.email}`);
    } catch (error) {
      console.error(`❌ Failed to create test account ${account.email}:`, error);
      throw error;
    }
  }
}

export async function deleteTestAccounts() {
  const supabase = getSupabaseAdmin();

  for (const account of Object.values(TEST_ACCOUNTS)) {
    try {
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users?.find((u) => u.email === account.email);

      if (user) {
        await supabase.auth.admin.deleteUser(user.id);
        console.log(`✅ Deleted test account: ${account.email}`);
      }
    } catch (error) {
      console.error(`❌ Failed to delete test account ${account.email}:`, error);
    }
  }
}
