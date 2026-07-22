import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kjxculekhlntebvvgvzc.supabase.co',
  'sb_publishable_cK_fkkTLVfNnVSVOkrWSAg_dkKBbKBh'
);

async function check() {
  const { data, error } = await supabase.from('yemler').select('*');
  console.log('Error:', error);
  console.log('Data:', data);
}

check();
