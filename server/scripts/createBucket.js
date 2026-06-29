const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  try {
    const { data, error } = await supabaseAdmin.storage.createBucket('kit-photos', { public: false });
    console.log({ data, error });
  } catch (err) {
    console.error('Bucket creation error:', err);
  }
})();
