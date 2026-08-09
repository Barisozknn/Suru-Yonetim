export const COMMON_DISEASES = [
  'Asidoz',
  'Ketozis',
  'Hipokalsemi (Süt Humması)',
  'Mastitis (Klinik)',
  'Mastitis (Subklinik)',
  'Metritis',
  'Endometritis',
  'Retensiyo Sekundinarium (Eşin Düşmemesi)',
  'Ayak Çürüğü (Foot Rot)',
  'Laminitis',
  'Abomasum Deplasmanı (Sola)',
  'Abomasum Deplasmanı (Sağa)',
  'Pnömoni (Zatürre)',
  'Timpani (Şişkinlik)',
  'İshal (Buzagi İshali)',
  'Kanlı İshal',
  'Leptospirozis',
  'Bruselloz',
  'Şap Hastalığı',
  'LSD (Lumpy Skin Disease)',
  'BVD (Bovine Viral Diarrhea)',
  'IBR (Infectious Bovine Rhinotracheitis)',
  'PI3',
  'BRSV',
  'Pasteurelloz',
  'Şarbon',
  'Yanıkara (Blackleg)',
  'Tetanoz',
  'Botulizm',
  'Listeriyoz',
  'Tüberküloz (Verem)',
  'Paratüberküloz (Johne)',
  'Aktinomikoz',
  'Aktinobasilloz',
  'Mastitis (E. coli)',
  'Mastitis (Staph. aureus)',
  'Vaginitis',
  'Yumurtalık Kisti',
  'Göbek Kordonu İltihabı',
  'Fasiyolozis (Kelebek Hastalığı)',
  'Diktiyokauloz (Akciğer Kılkurdu)',
  'Mide-Bağırsak Kılkurdu',
  'Koksidiyoz',
  'Babesioz (Kan İşeme)',
  'Theilerioz',
  'Anaplazmoz',
  'Göz Tansiyonu / Pembe Göz (Pink Eye)',
  'Kuduz',
  'Viral İshal (Rotavirus/Coronavirus)',
  'Meme Başı Çatlakları/Yaraları',
  'Mantar',
  'Uyuz',
  'Bitlenme',
  'Kene Enfestasyonu',
  'Subakut Rumen Asidozu (SARA)',
  'Hipomagnezemi (Çayır Tetanisi)',
  'Hipofosfatemi',
  'Karaciğer Yağlanması (Fatty Liver)',
  'Abomasum Ülseri',
  'Travmatik Retiküloperitonitis (TRP)',
  'Rumen İmpaksiyonu',
  'Vagal İndigesyon',
  'Mastitis (Strep. agalactiae)',
  'Mastitis (Mycoplasma)',
  'Çevresel Mastitis',
  'Pyometra',
  'Uterus Prolapsusu (Rahim Çıkması)',
  'Vajina Prolapsusu',
  'Anöstrus (Kızgınlık Göstermeme)',
  'Meme Ödemi',
  'Taban Ülseri',
  'Beyaz Çizgi Hastalığı (White Line Disease)',
  'Ökçe Erozyonu',
  'Dijital Dermatitis (Mortellaro)',
  'İnterdigital Dermatitis',
  'Taban Apsesi',
  'Enzootik Buzağı Pnömonisi',
  'Akut Solunum Yolu Distres Sendromu (ARDS)',
  'Malignant Ödem',
  'Kampilobakteriyoz (Vibrio)',
  'Trichomoniasis',
  'Koronavirüs İshali',
  'Rotavirüs İshali',
  'Salmonella İshali',
  'Q Humması (Coxiella burnetii)',
  'Mavidil (Bluetongue)',
  'Epizootik Hemorajik Hastalık (EHD)',
  'Bovine Lösemi Virüsü (BLV)',
  'Neosporozis',
  'Kriptosporidiyoz',
  'Toksoplazmoz',
  'Askariyaz (Toxocara vitulorum)',
  'Kist Hidatik (Echinococcus)',
  'Miyazis (Kurtlanma)',
  'Göbek Fıtığı (Hernia Umbilicalis)',
  'Eklem İltihabı (Septik Artritis)',
  'Kanser Gözü (BOSCC)',
  'Sıcaklık Stresi (Heat Stress)',
  'Zehirlenme (Bitkisel / Kimyasal)',
  'İnek Pox (Cowpox)'
].sort();

export const normalizeDiseaseName = (input: string): string => {
  if (!input) return '';
  let normalized = input.trim().replace(/\s+/g, ' ');

  // Title Case
  normalized = normalized.toLowerCase().split(' ').map(word => {
    // Özel durumlar (örneğin IBR, BVD gibi kısaltmaların büyük kalmasını istiyorsak, burada ek kontroller yapabiliriz)
    if (word.length === 0) return word;
    if (['lsd', 'bvd', 'ibr', 'pi3', 'brsv'].includes(word)) return word.toUpperCase();

    // Türkçe karakter dikkate alarak ilk harfi büyüt
    const firstChar = word.charAt(0);
    const upperFirst = firstChar === 'i' ? 'İ' : firstChar === 'ı' ? 'I' : firstChar.toUpperCase();
    return upperFirst + word.slice(1);
  }).join(' ');

  // Yaygın harf hatalarını mevcut listeyle fuzzy/basit eşleştirmeyi deneyebiliriz.
  // Tam eşleşme arayalım (küçük harfe çevirip boşlukları silerek)
  const inputClean = input.toLowerCase().replace(/[\s\-\.]/g, '');
  for (const disease of COMMON_DISEASES) {
    const diseaseClean = disease.toLowerCase().replace(/[\s\-\.]/g, '');
    if (inputClean === diseaseClean ||
      inputClean.replace(/ı/g, 'i') === diseaseClean.replace(/ı/g, 'i')) {
      return disease;
    }
  }

  return normalized;
};
