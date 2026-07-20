const fs = require('fs');

let content = fs.readFileSync('src/lib/db.ts', 'utf8');

if (!content.includes('import { useStore }')) {
  content = "import { useStore } from '../store/useStore';\n" + content;
}

const hookCode = `
    const tables = ['hayvanlar', 'gruplar', 'yemler', 'yemHareketleri', 'sutKayitlari', 'agirlikKayitlari', 'saglikOlaylari', 'asiProtokolleri', 'planlananAsilar', 'uremeKayitlari', 'buzagiKayitlari', 'sohbetler', 'ekFinansalIslemler', 'gunlukYemMaliyetleri'];
    tables.forEach(tableName => {
      this.table(tableName).hook('creating', function (primKey, obj, trans) {
        const activeId = useStore.getState().activeCiftlikId;
        if (activeId && !obj.ciftlikId) {
          obj.ciftlikId = activeId;
        }
      });
    });
`;

if (!content.includes('hook(\'creating\'')) {
  content = content.replace(/constructor\(\) \{/, 'constructor() {\n' + hookCode);
  fs.writeFileSync('src/lib/db.ts', content);
}
