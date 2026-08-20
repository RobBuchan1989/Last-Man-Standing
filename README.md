# Last Man Standing

Premier League Last Man Standing using the supplied v0 design as the base.

## Production configuration
Set these environment variables in Vercel:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- FOOTBALL_DATA_API_KEY

The database project is already configured. Supabase pg_cron/pg_net handles automatic football-data.org synchronisation, so the app does not require a Vercel cron job.

Football-data.org requires visible attribution: "Data provided by football-data.org".
