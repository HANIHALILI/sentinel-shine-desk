// Supabase client has been removed as we've migrated to a local PostgreSQL backend with Express API
// All database operations now go through the HTTP API in src/lib/db.ts

export const supabase = {
  from: () => ({
    select: () => Promise.resolve({ data: null, error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
    upsert: () => Promise.resolve({ data: null, error: null }),
    order: () => ({
      select: () => Promise.resolve({ data: null, error: null }),
    }),
  }),
  auth: {
    signUp: () => Promise.resolve({ data: null, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
};
