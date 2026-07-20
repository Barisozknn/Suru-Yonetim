const fs = require('fs');

let content = fs.readFileSync('src/store/useStore.ts', 'utf8');

if (!content.includes("import { supabase }")) {
  content = content.replace("import type { User, Session } from '@supabase/supabase-js';", "import type { User, Session } from '@supabase/supabase-js';\nimport { supabase } from '../lib/supabase';");
}

const subCode = `

let debounceTimer: ReturnType<typeof setTimeout>;
useStore.subscribe((state, prevState) => {
  if (!state.user) return;
  
  const ayarlar = { 
    sutLitreFiyati: state.sutLitreFiyati, 
    rationSelectedGrupId: state.rationSelectedGrupId, 
    rationVerimYonu: state.rationVerimYonu, 
    rationAvgWeight: state.rationAvgWeight, 
    rationMilkYield: state.rationMilkYield, 
    rationAdg: state.rationAdg, 
    rationListesi: state.rationListesi, 
    uremeAyarlari: state.uremeAyarlari 
  };
  
  const prevAyarlar = { 
    sutLitreFiyati: prevState.sutLitreFiyati, 
    rationSelectedGrupId: prevState.rationSelectedGrupId, 
    rationVerimYonu: prevState.rationVerimYonu, 
    rationAvgWeight: prevState.rationAvgWeight, 
    rationMilkYield: prevState.rationMilkYield, 
    rationAdg: prevState.rationAdg, 
    rationListesi: prevState.rationListesi, 
    uremeAyarlari: prevState.uremeAyarlari 
  };
  
  if (JSON.stringify(ayarlar) !== JSON.stringify(prevAyarlar)) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      supabase.from('kullanici_ayarlari').upsert({ 
        user_id: state.user!.id, 
        ayarlar, 
        updated_at: new Date().toISOString() 
      }).then(({ error }) => {
        if (error) console.error('Ayarlar kaydedilemedi:', error);
      });
    }, 2000);
  }
});
`;

if(!content.includes('debounceTimer')) {
  content += subCode;
  fs.writeFileSync('src/store/useStore.ts', content);
}
