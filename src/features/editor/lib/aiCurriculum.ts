export interface CurriculumLevel {
  id: number;
  part: number;
  name: string;
  difficulty: 1 | 2 | 3 | 4;
  targetMovesMin: number;
  targetMovesMax: number;
  mechanics: string[];
  description: string;
  designInstructions: string;
}

export const AI_CURRICULUM: CurriculumLevel[] = [
  // PART 3: Dinamik Zeminler ve Işınlanma (Level 51 - 65)
  {
    id: 51,
    part: 3,
    name: "Giriş: Konveyörler",
    difficulty: 1,
    targetMovesMin: 3,
    targetMovesMax: 5,
    mechanics: ["conveyor_up", "conveyor_down", "conveyor_left", "conveyor_right"],
    description: "Oyuncuya konveyör bant mekaniğini öğretir. Nesneler konveyöre bastıklarında otomatik olarak belirlenen yöne doğru kayarlar.",
    designInstructions: "Küçük bir harita tasarla (örn. 5x5). Bir adet normal oyuncu (id: 1) ve onun hedefi (target_1) yerleştir. Oyuncunun doğrudan hedefe gitmesini engelleyen bir engel (obstacle) koy ve onu hedefe ulaştıracak tek bir konveyör bandı rotası oluştur."
  },
  {
    id: 52,
    part: 3,
    name: "Akıntıya Karşı",
    difficulty: 2,
    targetMovesMin: 6,
    targetMovesMax: 8,
    mechanics: ["conveyor", "obstacle", "direction_toggle"],
    description: "İki oyuncunun olduğu, birinin konveyör akıntısında sürüklenirken diğerinin ters yöne gidip yön değiştiren butona basarak engeli açmasını gerektiren seviye.",
    designInstructions: "Ortalama bir harita tasarla (örn. 6x6). İki oyuncu (id: 1, id: 2) yerleştir. Oyuncu 1'in önünde onu hedeften uzaklaştıran bir konveyör bandı olsun. Oyuncu 2, 'direction_toggle' hücresine basarak hareket yönlerini tersine (reversed) çevirsin, böylece Oyuncu 1 akıntıya karşı koyup hedefine ulaşabilsin."
  },
  {
    id: 53,
    part: 3,
    name: "Solucan Deliği",
    difficulty: 1,
    targetMovesMin: 4,
    targetMovesMax: 6,
    mechanics: ["teleporter_in_A", "teleporter_out_A"],
    description: "Teleport mekaniğine giriş seviyesi. Nesneler teleporta girdiklerinde eşleşen çıkışa ışınlanırlar ve momentumlarını korurlar.",
    designInstructions: "5x5 veya 6x6 harita tasarla. Bir oyuncu yerleştir. Oyuncu ile hedef arasına geçilmez duvarlar koy. Ancak oyuncunun yanına 'teleporter_in_A', hedefin yanına ise 'teleporter_out_A' yerleştirerek ışınlanmayı zorunlu kıl."
  },
  {
    id: 54,
    part: 3,
    name: "Çapraz Geçiş",
    difficulty: 2,
    targetMovesMin: 7,
    targetMovesMax: 9,
    mechanics: ["teleporter_in_A", "teleporter_out_A", "teleporter_in_B", "teleporter_out_B"],
    description: "İki farklı teleport çiftini kullanarak iki oyuncunun yerini çaprazlama değiştirmesini gerektiren seviye.",
    designInstructions: "Haritayı iki ayrı odaya böl (duvarlarla). Oyuncu 1, Oda 1'de, Oyuncu 2 ise Oda 2'de başlasın. Oyuncu 1'in hedefi Oda 2'de, Oyuncu 2'nin hedefi ise Oda 1'de olsun. Oyuncuları birbirine bağlayan A ve B teleport çiftlerini öyle yerleştir ki, doğru hamle kombinasyonlarıyla hedeflerine eş zamanlı ulaşabilsinler."
  },
  {
    id: 55,
    part: 3,
    name: "Konveyör Labirenti",
    difficulty: 3,
    targetMovesMin: 10,
    targetMovesMax: 12,
    mechanics: ["conveyor", "teleporter_in_A", "teleporter_out_A"],
    description: "Konveyörlerin oyuncuyu sürekli teleportlara sürüklediği, oyuncunun doğru zamanda aradan sıyrılması gereken döngüsel seviye.",
    designInstructions: "Ortalama bir harita tasarla (örn. 7x7). Oyuncu konveyöre bastığı an otomatik olarak teleporta sürüklensin ve haritanın başka bir yerine ışınlansın. Bu ışınlanma onu tekrar başka bir konveyöre götürsün (sonsuz döngü tehlikesi). Oyuncu sadece doğru yön tuşuna basarak bu döngüden kaçıp hedefe ulaşabilmeli."
  },
  {
    id: 56,
    part: 3,
    name: "Trambolin Uçuşu",
    difficulty: 1,
    targetMovesMin: 4,
    targetMovesMax: 5,
    mechanics: ["trampoline_up", "trampoline_down", "trampoline_left", "trampoline_right"],
    description: "Trambolin hücresinin nesneyi havadan fırlattığını (aradaki 3 hücrelik engelleri ve yasaklı alanları es geçtiğini) öğretir.",
    designInstructions: "6x6 harita tasarla. Oyuncu ile hedef arasında 2 hücre genişliğinde kalın bir engel duvarı (obstacle) olsun. Oyuncunun önüne, zıplayarak bu duvarın üzerinden geçebileceği bir trambolin yerleştir."
  },
  {
    id: 57,
    part: 3,
    name: "Kanyon Atlayışı",
    difficulty: 2,
    targetMovesMin: 6,
    targetMovesMax: 8,
    mechanics: ["trampoline", "forbidden"],
    description: "Oyuncunun önündeki geniş yasaklı (forbidden) uçurumun üzerinden trambolinle atlayarak güvenli bölgeye geçmesini gerektiren seviye.",
    designInstructions: "Ortasında tamamen yasaklı (forbidden) hücrelerden oluşan bir nehir/kanyon olan harita tasarla. İki oyuncuyu da karşı kıyıya geçirmek için trambolinleri kullan. İniş yerinde başka engeller olmalı ki nereye ineceklerini planlasınlar."
  },
  {
    id: 58,
    part: 3,
    name: "Sapma Noktası",
    difficulty: 2,
    targetMovesMin: 7,
    targetMovesMax: 9,
    mechanics: ["direction_deflector"],
    description: "Deflector zeminler, üzerlerinden geçen nesneleri belirlenmiş yön eşleştirmelerine göre 90 derece saptırırlar.",
    designInstructions: "Deflector hücresi tanıtımı. Oyuncu sağa giderken deflector'a çarptığında yukarı yönlenmeli. Bu yönlendirmeyi kullanarak oyuncuyu dar koridorlardan geçiren bir bulmaca tasarla."
  },
  {
    id: 59,
    part: 3,
    name: "Yansıma Sanatı",
    difficulty: 3,
    targetMovesMin: 10,
    targetMovesMax: 13,
    mechanics: ["direction_deflector", "ice"],
    description: "Deflector'ları sürtünmesiz buz zeminlerle birleştirerek nesnelere zikzaklar çizdiren bulmaca.",
    designInstructions: "Haritada büyük miktarda buz (ice) zemin olsun. Oyuncu buza basınca duramaz, kayar. Kayarken araya yerleştirilen deflector'lara çarpıp yön değiştirerek engellerin etrafından dolanmalı ve hedefe ulaşmalıdır."
  },
  {
    id: 60,
    part: 3,
    name: "Çok Odalı Kaos",
    difficulty: 3,
    targetMovesMin: 11,
    targetMovesMax: 15,
    mechanics: ["rooms", "controlMode: selected_room"],
    description: "Ekranı iki farklı odaya bölerek oyuncuya kontrolü odalar arasında geçirmeyi (switch_room) öğretir.",
    designInstructions: "Haritayı iki bağımsız odaya (room) böl. Oyuncu 1, Oda 1'de, Oyuncu 2, Oda 2'de başlasın. `controlMode: 'selected_room'` olsun. Oyuncu sadece aktif kontrol edilen odadaki karakteri hareket ettirebilir, 'switch_room' hamlesi ile diğer odaya geçiş yapmalıdır. Hamle optimizasyonu kritik."
  },
  // PART 4: Sokoban ve Enerji Ağları (Level 66 - 80)
  {
    id: 66,
    part: 4,
    name: "Kutuyu İt!",
    difficulty: 1,
    targetMovesMin: 4,
    targetMovesMax: 6,
    mechanics: ["initialBoxes"],
    description: "Klasik Sokoban kuralları. Oyuncu kutuyu önünde itebilir. Çekemez. Kutular engellere takılabilir.",
    designInstructions: "5x5 veya 6x6 harita tasarla. Bitiş hedefinin önünü kapatan bir kutu yerleştir. Oyuncu kutuyu yan taraftaki boşluğa iterek yolu açmalı ve hedefe ulaşmalıdır."
  },
  {
    id: 67,
    part: 4,
    name: "Ağır Yük",
    difficulty: 2,
    targetMovesMin: 6,
    targetMovesMax: 8,
    mechanics: ["initialBoxes", "power_node"],
    description: "Bazı kutular ağırdır ve sadece bitişiklerindeki hücrede elektrik akımı varsa (`requiresPower: true`) itilebilirler. Güç yoksa duvar gibi davranırlar.",
    designInstructions: "Oyuncunun önünde ağır bir kutu (requiresPower: true) olsun. Oyuncu önce yakındaki 'power_node' hücresine basarak elektriklenmeli, ardından kutuya temas edip onu itilebilir kılmalı ve yolu açmalıdır."
  },
  {
    id: 68,
    part: 4,
    name: "Canlı Kablolar",
    difficulty: 2,
    targetMovesMin: 8,
    targetMovesMax: 10,
    mechanics: ["power_node", "conveyorPowerRequired"],
    description: "Oyuncunun elektrik yüklenerek bıraktığı iz (trail), devre kablosu görevi görerek pasif konveyörleri çalıştırır.",
    designInstructions: "Güç gerektiren konveyörler (conveyorPowerRequired) yerleştir. Bu konveyörler çalışmadan hedefe ulaşmak imkansız olsun. Oyuncu 'power_node' hücresine gidip elektriklenmeli, ardından konveyörlerin yanındaki karelerden geçerek kendi izi üzerinden konveyörlere elektrik akımı vermeli ve onları aktif hale getirmelidir."
  },
  {
    id: 69,
    part: 4,
    name: "Kırılgan Geçit",
    difficulty: 2,
    targetMovesMin: 7,
    targetMovesMax: 9,
    mechanics: ["boxes"],
    description: "Belirli bir dayanıklılığa (durability) sahip kutular. İtildikçe dayanıklılıkları azalır ve sıfırlandığında kırılıp yok olurlar.",
    designInstructions: "Önünde 1 veya 2 dayanıklılığı olan kutular yerleştir. Oyuncu bu kutuları gereksiz yere iterse kırılırlar. Ancak bulmacanın çözümü için bazı kutuların kırılması gerekirken bazılarının hedefin üzerine itilmesi (veya engel olarak kullanılması) gerekmelidir."
  },
  {
    id: 70,
    part: 4,
    name: "Çiftli Sokoban",
    difficulty: 3,
    targetMovesMin: 10,
    targetMovesMax: 13,
    mechanics: ["initialBoxes"],
    description: "İki oyuncunun eş zamanlı olarak kutuları ittiği, kutuların birbirini sıkıştırmaması gereken seviye.",
    designInstructions: "İki oyuncu ve iki kutu yerleştir. Oyuncular hareket ederken kutuları da beraberlerinde iterler. Biri kutusunu köşeye sıkıştırırsa oyun kilitlenecektir. İki oyuncunun da kutuları doğru rotalarda kaydırarak hedeflerine götürmesini sağla."
  },
  {
    id: 71,
    part: 4,
    name: "Elektrikli Sürüklenme",
    difficulty: 3,
    targetMovesMin: 11,
    targetMovesMax: 14,
    mechanics: ["power_node", "ice", "requiresPower"],
    description: "Buz zemin üzerinde kayan bir kutuyu, elektrikli izimizle durdurmayı veya aktif kılmayı gerektiren seviye.",
    designInstructions: "Ortada büyük bir buz zemin olsun. Buradaki kutunun requiresPower özelliği aktif olsun. Oyuncu elektrik yüklenip buz zemin etrafında bir hat çizerek kutunun kaydığı yerlerde elektriğe kavuşmasını ve itilebilir olmasını sağlamalıdır."
  },
  {
    id: 72,
    part: 4,
    name: "Enerji Geçişi (Teleport)",
    difficulty: 3,
    targetMovesMin: 12,
    targetMovesMax: 15,
    mechanics: ["power_node", "teleporter_in_A", "teleporter_out_A"],
    description: "Elektrik akımının teleport girişine dokunmasıyla, çıkış teleportunun da çevresini elektriklendirdiğini gösteren bulmaca.",
    designInstructions: "Oyuncu bir odada elektrik yüklensin ve izini teleport girişine bağlasın. Diğer odada bulunan pasif konveyör bandı veya ağır kutu, çıkış teleportuna bağlanan bu elektrik akımı sayesinde aktifleşsin."
  },
  {
    id: 73,
    part: 4,
    name: "Renk Filtreleri",
    difficulty: 2,
    targetMovesMin: 8,
    targetMovesMax: 10,
    mechanics: ["boxes"],
    description: "Kutuların üzerinde renk filtresi (colorFilterIndex) bulunur. Sadece o renkteki oyuncular bu kutuyu itebilir, diğer oyuncular için kutu duvar gibi davranır.",
    designInstructions: "Oyuncu 1 (Emerald - yeşil) ve Oyuncu 2 (Sky - mavi) olsun. Yeşil oyuncunun geçmesi gereken yerde mavi filtreli bir kutu olsun (yeşil oyuncu bunu itemez). Mavi oyuncu gelip kutuyu kenara çekmeli/itmelidir ki yeşil oyuncunun yolu açılsın."
  },
  {
    id: 74,
    part: 4,
    name: "Tren İtmece (Chain)",
    difficulty: 3,
    targetMovesMin: 10,
    targetMovesMax: 13,
    mechanics: ["boxes"],
    description: "Peş peşe duran birden fazla kutunun aynı anda itilebilmesi (Sokoban chain push) kuralını kullanan bulmaca.",
    designInstructions: "Dar bir koridorda peş peşe 2 veya 3 kutu yerleştir. Oyuncu en arkadaki kutuyu ittiğinde hepsi beraber kayar. Ancak en uçtaki kutunun önünde duvar varsa hiçbiri hareket edemez. Oyuncu zinciri bozmak için yan geçitleri kullanmalıdır."
  },
  // PART 5: Grandmaster & Eş Zamanlılık (Level 81 - 100)
  {
    id: 81,
    part: 5,
    name: "Kesişen Yollar",
    difficulty: 2,
    targetMovesMin: 8,
    targetMovesMax: 10,
    mechanics: ["trailCollision"],
    description: "İz çarpışması (trailCollision) aktiftir. Oyuncular birbirinin bıraktığı renkli izin üzerine basarsa yanarlar.",
    designInstructions: "trailCollision özelliğini true yap. İki oyuncuyu dar bir alanda başlat. Hedeflerine ulaşmak için yollarının kesişmemesi, birinin önce geçip yolu boşaltması, diğerinin ise onun izine çarpmadan arkadan dolanması gerekir."
  },
  {
    id: 82,
    part: 5,
    name: "Kendi Kuyruğun",
    difficulty: 3,
    targetMovesMin: 10,
    targetMovesMax: 12,
    mechanics: ["trailCollision", "ice"],
    description: "Buz üzerinde kontrolsüz kayarken kendi izimize çarpıp yanmamak için hassas rota planlaması gerektiren seviye.",
    designInstructions: "Haritada bolca buz zemin yerleştir ve trailCollision aktif et. Oyuncu buza basıp kaydığında arkasında uzun bir iz bırakır. Eğer geri dönerken kendi eski izine basarsa kaybeder. Oyuncu dairesel ve spiral rotalar planlamalıdır."
  },
  {
    id: 83,
    part: 5,
    name: "Ayna Labirenti",
    difficulty: 3,
    targetMovesMin: 11,
    targetMovesMax: 14,
    mechanics: ["reversed"],
    description: "Biri normal diğeri ters hareket (reversed) modunda olan iki oyuncunun, karmaşık duvarlar arasında eş zamanlı hedeflere oturması.",
    designInstructions: "Oyuncu 1 normal modda, Oyuncu 2 ise reversed modda başlasın. Haritada asimetrik engeller olsun. Bir tuşa basıldığında biri yukarı giderken diğeri aşağı gidecektir. Her ikisini de hedeflerine yerleştirmek için duvarları fren olarak kullanmaları gerekir."
  },
  {
    id: 84,
    part: 5,
    name: "Asenkron Odalar",
    difficulty: 3,
    targetMovesMin: 12,
    targetMovesMax: 15,
    mechanics: ["rooms"],
    description: "İki odadaki karakterlerin asenkron hareketlerini switch_room hamlesini de optimize ederek yönetme.",
    designInstructions: "Oda 1 ve Oda 2 tasarla. controlMode: 'selected_room' olsun. Oyuncu 1'in odasında buz zeminler ve kayma varken, Oyuncu 2'nin odasında normal zemin ve kutular olsun. Oyuncu iki odayı sırayla yöneterek, bir odadaki durumu diğer oda lehine değiştirmelidir."
  },
  {
    id: 85,
    part: 5,
    name: "Güç ve İz Çarpışması",
    difficulty: 4,
    targetMovesMin: 15,
    targetMovesMax: 18,
    mechanics: ["power_node", "trailCollision"],
    description: "Hem elektrik hattı döşemek için iz bırakmak zorunda olmak, hem de bu izlerin üstüne basıp yanmamaya çalışmak.",
    designInstructions: "Çok zorlu bir kombinasyon. Haritada aktif edilmek zorunda olan ağır kutular/konveyörler var (elektrik gerekiyor). Ancak trailCollision da açık. Oyuncu elektrik hattını öyle bir döşemeli ki, sonraki hamlelerde kendi kablosunun üstüne basıp kendini yakmamalıdır."
  }
];

export function generateSystemInstructions(): string {
  return `Sen Syncron adında neon temalı, 2D grid tabanlı bir bulmaca oyununun seviye tasarımcısısın.
Görevin, sana verilen kurallara ve hedeflere tam olarak uyan, çözülebilir ve yüksek kaliteli seviyeler tasarlamaktır.

### OYUN KURALLARI VE MEKANİKLERİ
1. GRID ve KOORDİNATLAR:
   - Harita 'width' ve 'height' boyutlarında bir 2D grid dizisidir.
   - Koordinatlar 0-tabanlıdır: row (satır) 0'dan height-1'e, col (sütun) 0'dan width-1'e gider. (0,0) sol üst köşedir.

2. OYUNCULAR VE HAREKET:
   - Oyuncular 'initialObjects' dizisinde tanımlanır. Her nesnenin bir 'id' değeri (1, 2, vb.), başlangıç pozisyonu, hareket modu ('normal' veya 'reversed') ve hedefe kilitlenme özelliği ('lockOnTarget': true/false) vardır.
   - Oyuncu 1 (Emerald - yeşil) -> 'target_1' hedefine ulaşmalıdır.
   - Oyuncu 2 (Sky - mavi) -> 'target_2' hedefine ulaşmalıdır.
   - Oyuncu tuşuna bastığında (Yukarı, Aşağı, Sol, Sağ), aktif olan tüm oyuncular EŞ ZAMANLI hareket eder.
   - 'normal' oyuncular tuş yönünde gider. 'reversed' oyuncular tuşun TERSİ yönünde gider.
   - Oyuncuların hedeflerine AYNI ANDA (aynı hamlede) oturması gerekir. Eğer biri hedefe oturup 'lockOnTarget' true ise orada kilitlenir ve artık hareket etmez, diğeri ise hala hareket edebilir.

3. HÜCRE TİPLERİ ('grid' matrisindeki değerler):
   - 'empty': Boş zemin. Normal sürtünmeli hareket.
   - 'obstacle': Duvar. Geçilemez. Nesneler buraya çarpınca durur.
   - 'forbidden': Yasaklı hücre. Buraya gelen nesne kırılır/yok olur (oyun kaybedilir).
   - 'target_1', 'target_2'...'target_8': Oyuncuların ulaşması gereken hedefler.
   - 'direction_toggle': Üzerine basan nesnenin hareket modunu tersine çevirir ('normal' <-> 'reversed').
   - 'ice': Sürtünmesiz buz. Nesne buzda duramaz, geldiği yönde bir engele çarpana kadar kaymaya devam eder.
   - 'power_node': Güç noktası. Oyuncu buna bastığında elektriklenir. Elektrikli oyuncunun geçtiği yollar (trail) elektrik kablosuna dönüşür.
   - 'conveyor_up', 'conveyor_down', 'conveyor_left', 'conveyor_right': Konveyör bandı. Üzerine gelen nesneyi yönünde kaydırır.
   - 'teleporter_in_A/out_A', 'teleporter_in_B/out_B': Işınlayıcı çiftleri. Giren nesneyi eşleşen çıkışa ışınlanırlar. Çıkış hücresi doluysa çalışmaz. Momentum korunur.
   - 'trampoline_up/down/left/right': Trambolin. Nesneyi zıplatarak 3 kare uzağa fırlatır (aradaki engellerin üzerinden geçer).

4. KUTULAR (SOKOBAN):
   - 'initialBoxes' dizisinde tanımlanır. Oyuncular kutuları itebilir. Çekemezler.
   - Kutular da buza basınca kayar, konveyöre binince sürüklenir.
   - 'requiresPower': true ise kutu ancak yanındaki hücrede elektrik akımı (power) varsa itilebilir, yoksa duvar gibi davranır.
   - 'durability': kutunun kaç kez itilebileceğini belirler. Sıfırlanınca kırılır.
   - 'colorFilterIndex': sadece o renkteki (id'deki) oyuncu tarafından itilebilir.

5. İZ ÇARPIŞMASI ('trailCollision': true/false):
   - Aktifse, oyuncular birbirlerinin arkasında bıraktığı izin üzerine basarsa oyun kaybedilir.

6. BÖLGELER / ODALAR ('rooms'):
   - Harita bağımsız odalara bölünebilir. 'controlMode' 'selected_room' ise oyuncu sadece aktif odadaki karakterleri yönetir, 'switch_room' komutu ile odayı değiştirebilir.

### HEDEF JSON FORMATI
Üreteceğin çıktı sadece ve sadece geçerli bir JSON objesi olmalıdır. Markdown kod blokları veya açıklama metni içermemelidir. JSON şeması şöyledir:

{
  "name": "Seviyenin Adı",
  "width": 6,
  "height": 6,
  "edges": {
    "top": "wall",
    "bottom": "wall",
    "left": "wall",
    "right": "wall"
  },
  "grid": [
    ["empty", "obstacle", "empty", "empty", "empty", "empty"],
    ... (height kadar satır, her satırda width kadar hücre tipi)
  ],
  "initialObjects": [
    {
      "id": 1,
      "position": { "row": 0, "col": 0 },
      "mode": "normal",
      "lockOnTarget": true
    }
  ],
  "targets": [
    { "objectId": 1, "position": { "row": 4, "col": 4 } }
  ],
  "initialBoxes": [], // İsteğe bağlı
  "conveyorConfig": [], // İsteğe bağlı
  "trampolineConfig": [], // İsteğe bağlı
  "deflectorConfig": [], // İsteğe bağlı
  "trailCollision": false,
  "controlMode": "all_rooms", // 'all_rooms' veya 'selected_room'
  "rooms": [] // Çok odalı tasarımlar için odalar dizisi
}
`;
}

export function compileTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

export function buildCreateLevelPrompt(
  level: CurriculumLevel,
  templateText: string,
  systemInstructions: string
): string {
  return compileTemplate(templateText, {
    SYSTEM_INSTRUCTIONS: systemInstructions,
    LEVEL_ID: String(level.id),
    LEVEL_PART: String(level.part),
    LEVEL_NAME: level.name,
    LEVEL_DIFFICULTY: String(level.difficulty),
    LEVEL_MOVES_MIN: String(level.targetMovesMin),
    LEVEL_MOVES_MAX: String(level.targetMovesMax),
    LEVEL_MECHANICS: level.mechanics.join(', '),
    LEVEL_DESCRIPTION: level.description,
    LEVEL_DESIGN_INSTRUCTIONS: level.designInstructions,
  });
}

export function buildImproveLevelPrompt(
  currentLevelJson: string,
  improvementNotes: string,
  templateText: string,
  systemInstructions: string
): string {
  return compileTemplate(templateText, {
    SYSTEM_INSTRUCTIONS: systemInstructions,
    CURRENT_LEVEL_JSON: currentLevelJson,
    IMPROVEMENT_NOTES: improvementNotes,
  });
}
