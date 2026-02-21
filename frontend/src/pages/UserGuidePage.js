import React, { useState } from 'react';

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
      </svg>
    ),
    content: [
      {
        subtitle: 'Login',
        text: 'PowerSense\'e giriş yapmak için email ve şifrenizi kullanın. Demo hesapları mevcuttur:',
        list: [
          'Admin: admin@qlicksense.com / Admin123!',
          'Analyst: analyst@qlicksense.com / Analyst123!',
          'Viewer: viewer@qlicksense.com / Viewer123!',
        ],
      },
      {
        subtitle: 'Roller ve Yetkiler',
        text: 'PowerSense\'te üç farklı rol bulunur:',
        list: [
          'Admin — Tüm işlemleri yapabilir: dashboard oluşturma, rapor oluşturma, veritabanı şemasını görüntüleme, kullanıcı yönetimi',
          'Analyst — Dashboard ve rapor oluşturabilir, düzenleyebilir',
          'Viewer — Sadece mevcut dashboard ve raporları görüntüleyebilir',
        ],
      },
      {
        subtitle: 'Dil Ayarı',
        text: 'PowerSense Türkçe ve İngilizce dillerini destekler:',
        list: [
          'Profil sayfasına gidin (sol menüdeki profil ikonu)',
          '"Dil" bölümünden Türkçe veya English seçin',
          'Seçim anında uygulanır, tüm arayüz seçilen dile geçer',
          'Varsayılan dil Türkçe\'dir',
        ],
      },
      {
        subtitle: 'Ana Menü',
        text: 'Sol taraftaki sidebar ile sayfalar arasında geçiş yapabilirsiniz. İkonların üzerine geldiğinizde sayfa isimlerini görebilirsiniz.',
        list: [
          'Panolar — Dashboard listesi ve oluşturma',
          'Raporlar — Rapor listesi ve oluşturma',
          'Veri Gezgini — Ad-hoc veri keşfi',
          'SQL Editör — SQL sorgu yazma',
          'Bağlantılar — Veritabanı bağlantı yönetimi',
          'Veritabanı Şeması — ERD diyagramı (sadece Admin)',
          'Kullanıcılar — Kullanıcı yönetimi (sadece Admin)',
          'Kullanım Kılavuzu — Bu sayfa',
          'Profil — Hesap ayarları ve dil seçimi',
        ],
      },
    ],
  },
  {
    id: 'dashboards',
    title: 'Dashboard\'lar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    content: [
      {
        subtitle: 'Dashboard Listesi',
        text: 'Dashboards sayfasında tüm mevcut dashboard\'ları görebilirsiniz. Her dashboard kartında isim, açıklama, widget sayısı ve oluşturulma tarihi yer alır.',
      },
      {
        subtitle: 'Yeni Dashboard Oluşturma',
        text: '"+ New Dashboard" butonuna tıklayın. İsim ve açıklama girin, "Create" ile oluşturun. Yeni dashboard boş olarak açılacaktır.',
      },
      {
        subtitle: 'Dashboard\'ı Düzenleme',
        text: 'Bir dashboard\'a tıklayarak açın. Sağ üstteki "Edit" butonuna tıklayarak düzenleme moduna geçin.',
        list: [
          'Düzenleme modunda widget\'ları sürükleyip bırakarak konumlandırabilirsiniz',
          'Widget köşelerinden tutarak boyutunu değiştirebilirsiniz',
          'Bir widget\'a tıklayarak sağ panelde ayarlarını düzenleyebilirsiniz',
        ],
      },
      {
        subtitle: 'Widget Ekleme',
        text: 'Düzenleme modundayken "Add Widget" butonuna tıklayın. Açılan pencereden widget tipini seçin:',
        list: [
          'KPI Card — Tek bir sayısal değeri büyük ve belirgin şekilde gösterir',
          'Bar Chart — Dikey çubuk grafik',
          'Horizontal Bar — Yatay çubuk grafik',
          'Line Chart — Çizgi grafik (trend analizi)',
          'Area Chart — Alan grafik',
          'Pie Chart — Pasta grafik',
          'Donut Chart — Halka grafik',
          'Scatter Plot — Dağılım grafiği',
          'Data Table — Veri tablosu',
        ],
      },
      {
        subtitle: 'Widget Yapılandırma',
        text: 'Bir widget\'ı seçtiğinizde sağ tarafta yapılandırma paneli açılır:',
        list: [
          '1. Widget\'a başlık verin',
          '2. Tip seçin (bar, line, pie, vb.)',
          '3. Görünüm ayarları: alt başlık, açıklama (info tooltip), başlık hizalama (sol/orta/sağ)',
          '4. Veri kaynağı seçin: "Görsel Oluşturucu" veya "Kayıtlı Sorgu"',
          '5. Boyutlar (Dimensions) seçin — verinin gruplanacağı alanlar',
          '6. Ölçüler (Measures) ekleyin — hesaplanacak değerler (toplam, ortalama, sayım, vb.)',
          '7. "Apply Changes" ile kaydedin',
        ],
      },
      {
        subtitle: 'Widget Alt Başlık ve Açıklama',
        text: 'Her widget\'a ek bilgi ekleyebilirsiniz:',
        list: [
          'Alt Başlık (Subtitle) — Widget başlığının altında küçük bir açıklama satırı gösterilir',
          'Açıklama (Description) — Başlığın yanında (ℹ) ikonu belirir, üzerine gelince açıklama tooltip\'i görünür',
          'Başlık Hizalama — Başlığı sol, orta veya sağa hizalayabilirsiniz',
          'Bu ayarlar yapılandırma panelindeki "Görünüm" bölümünden yapılır',
        ],
      },
      {
        subtitle: 'Kayıtlı Sorgu ile Widget Oluşturma',
        text: 'SQL Editor\'de kaydettiğiniz sorguları doğrudan widget\'larda kullanabilirsiniz:',
        list: [
          'Widget yapılandırma panelinde "Veri Kaynağı" olarak "Kayıtlı Sorgu" seçin',
          'Dropdown\'dan kayıtlı sorgunuzu seçin — SQL önizlemesi gösterilir',
          'Kolonlar otomatik keşfedilir ve Boyut/Ölçü olarak listelenir',
          'Metin kolonları boyut olarak, sayısal kolonlar ölçü olarak önerilir',
          'Boyut seçin (gruplama), ölçü ekleyin (toplama yöntemiyle)',
          'Tablo tipi widget\'lar ham veriyi gösterir — gruplama uygulanmaz',
          'Diğer grafik tipleri seçilen boyut ve ölçülere göre client-side gruplama yapar',
        ],
      },
      {
        subtitle: 'Tablo Sıralama',
        text: 'Tablo ve Pivot Tablo widget\'larında verileri sıralayabilirsiniz:',
        list: [
          'Kolon başlığına tıklayarak o kolona göre sıralama yapın',
          'İlk tıklama: A→Z / küçükten büyüğe (▲ ASC)',
          'İkinci tıklama: Z→A / büyükten küçüğe (▼ DESC)',
          'Sıralama ikonu aktif kolonun başlığında gösterilir',
          'Pivot tablolarda da aynı sıralama özelliği mevcuttur',
        ],
      },
      {
        subtitle: 'Veri Etiketleri (Data Labels)',
        text: 'Grafiklerde değer etiketleri otomatik olarak gösterilir:',
        list: [
          'Bar Chart — Çubukların üstünde değer etiketi',
          'Horizontal Bar — Çubukların sağında değer etiketi',
          'Line Chart — Noktaların üstünde değer etiketi',
          'Area Chart — Noktaların üstünde değer etiketi',
          'Pie/Donut — Dilim üzerinde isim ve yüzde',
          '20\'den fazla veri noktası olduğunda etiketler otomatik gizlenir (karışıklığı önlemek için)',
        ],
      },
      {
        subtitle: 'KPI Trend Göstergeleri',
        text: 'KPI kartları artık trend bilgisi gösterir:',
        list: [
          'Yeşil yukarı ok (▲) — Değer artmış, yüzde değişim gösterilir',
          'Kırmızı aşağı ok (▼) — Değer azalmış, yüzde değişim gösterilir',
          'Sparkline mini grafik — Son 12 veri noktasının trend çizgisi',
          'Önceki değer — KPI\'ın altında küçük yazıyla gösterilir',
          'Bu özellik, sorgunuz birden fazla satır döndürdüğünde otomatik çalışır (son satır = güncel, sondan bir önceki = önceki)',
        ],
      },
      {
        subtitle: 'Gelişmiş Tooltip\'ler',
        text: 'Grafiklerin üzerine geldiğinizde zengin bilgi kutuları görürsünüz:',
        list: [
          'Her ölçü için renkli nokta ve isim gösterilir',
          'Değerler tam sayı formatında gösterilir (1.234.567 gibi)',
          'Çoklu ölçü (multi-measure) grafiklerde tüm ölçüler tooltip\'te listelenir',
          'Bar, Line, Area ve Horizontal Bar grafiklerinde aktiftir',
        ],
      },
      {
        subtitle: 'Cross-Filtering (Çapraz Filtreleme)',
        text: 'Bir grafikteki bir değere tıklayarak tüm dashboard\'daki diğer widget\'ları filtreleyebilirsiniz. Örneğin: Bar Chart\'ta "Istanbul" bölgesine tıklarsanız, tüm dashboard sadece Istanbul verilerini gösterir. Filtreleri üstteki filtre çubuğundan kaldırabilirsiniz.',
      },
      {
        subtitle: 'Kaydetme',
        text: 'Değişikliklerinizi "Save" butonuyla kaydedin. Kaydetmeden çıkarsanız değişiklikler kaybolur.',
      },
      {
        subtitle: 'Otomatik Yenileme (Auto-Refresh)',
        text: 'Dashboard verilerini belirli aralıklarla otomatik yenileyebilirsiniz:',
        list: [
          'Toolbar\'daki yenileme (↻) butonuna tıklayarak anında yenileyebilirsiniz',
          'Yanındaki dropdown\'dan otomatik yenileme aralığı seçin: 30s, 1m, 5m, 15m, 30m',
          '"Otomatik Kapalı" seçeneği ile otomatik yenilemeyi devre dışı bırakın',
          'Son yenileme zamanı dropdown\'un yanında gösterilir (ör: "2m önce")',
          'Otomatik yenileme açıkken tüm widget verileri seçilen aralıkta güncellenir',
        ],
      },
      {
        subtitle: 'Dashboard Tema Seçimi',
        text: 'Dashboard\'unuzun renk paletini ve arka planını değiştirebilirsiniz:',
        list: [
          'Toolbar\'daki tema (🎨) butonuna tıklayın',
          '6 hazır tema arasından seçim yapın: Varsayılan, Okyanus, Gün Batımı, Orman, Kurumsal, Canlı',
          'Her tema farklı renk paleti ve arka plan rengi sunar',
          'Tema değiştiğinde tüm grafikler (bar, line, pie, donut vb.) anında yeni renklere geçer',
          'Widget bazında özel renk atanmışsa tema renkleri yerine o renkler kullanılır',
        ],
      },
      {
        subtitle: 'Global Filtre Paneli',
        text: 'Slicer widget\'ı dışında, sağ taraftan açılan gelişmiş bir filtre paneli mevcuttur:',
        list: [
          'Toolbar\'daki "Filtreler" butonuna tıklayın — aktif filtre sayısı badge olarak gösterilir',
          'Sağdan açılan panelde kaynak (tablo) ve alan seçin',
          'Operatör seçin: Eşittir, Eşit Değil, İçerir, Büyüktür, Küçüktür',
          'Değer girin ve "Filtre Ekle" ile ekleyin',
          'Aktif filtreler chip olarak gösterilir, × ile tek tek kaldırabilirsiniz',
          '"Tümünü Temizle" ile tüm filtreleri kaldırın',
          'Global filtreler tüm widget\'ların sorgularına uygulanır',
        ],
      },
      {
        subtitle: 'Dashboard Paylaşım ve Embed',
        text: 'Dashboard\'unuzu dış kullanıcılarla paylaşabilir veya web sitenize gömebilirsiniz:',
        list: [
          'Toolbar\'daki "Paylaş" butonuna tıklayın',
          'Herkese açık link otomatik oluşturulur — linki kopyalayıp paylaşın',
          'Embed kodu (iframe) ile dashboard\'u herhangi bir web sayfasına gömebilirsiniz',
          'QR kod ile mobil cihazlardan hızlı erişim sağlayabilirsiniz',
          '"Paylaşımı Kapat" ile paylaşım linkini devre dışı bırakabilirsiniz',
          'Paylaşılan dashboard\'lar giriş yapmadan görüntülenebilir',
        ],
      },
      {
        subtitle: 'Slicer (Filtre Widget\'ı)',
        text: 'Widget eklerken "Slicer (Filter)" tipini seçerek dashboard üzerinde bir filtre widget\'ı oluşturabilirsiniz.',
        list: [
          'Slicer, bir veri kaynağındaki boyut değerlerini liste olarak gösterir',
          'Listedeki bir veya birden fazla değere tıklayarak dashboard\'daki tüm widget\'ları filtreleyebilirsiniz',
          'Arama kutusu ile değerler arasında arama yapabilirsiniz',
          '"Clear" butonu ile seçimleri temizleyebilirsiniz',
        ],
      },
      {
        subtitle: 'Tarih Aralığı Filtresi',
        text: 'Dashboard araç çubuğunun altındaki filtre çubuğunda tarih aralığı seçicisi bulunur. Başlangıç ve bitiş tarihi seçerek tüm widget\'ları tarih aralığına göre filtreleyebilirsiniz. X butonu ile tarih filtresini kaldırabilirsiniz.',
      },
      {
        subtitle: 'Drill-Down (Detaya İnme)',
        text: 'Grafikler üzerinde detaya inme özelliği mevcuttur. Widget başlığında "DRILL" etiketi görüyorsanız, grafikteki bir değere tıklayarak daha detaylı verilere ulaşabilirsiniz.',
        list: [
          'Örneğin: Bölge → Şehir → Müşteri (coğrafi hiyerarşi)',
          'Yıl → Çeyrek → Ay (zaman hiyerarşisi)',
          'Kategori → Ürün (ürün hiyerarşisi)',
          'Yukarı ok (↑) ile bir üst seviyeye dönebilirsiniz',
          'Sıfırla butonu ile başlangıç seviyesine dönebilirsiniz',
        ],
      },
      {
        subtitle: 'Bookmarks (Yer İmleri)',
        text: 'Mevcut filtre durumunuzu (cross-filter + tarih aralığı) kaydedebilirsiniz:',
        list: [
          'Araç çubuğundaki "Bookmarks" butonuna tıklayın',
          'İsim girin ve "Save" ile kaydedin',
          'Kaydedilmiş bookmark\'a tıklayarak o filtre durumuna geri dönebilirsiniz',
          'Farklı senaryoları hızlıca karşılaştırmak için idealdir',
        ],
      },
      {
        subtitle: 'PDF ve Excel Export',
        text: 'Dashboard\'u dışa aktarabilirsiniz:',
        list: [
          'PDF — Dashboard\'un görsel bir anlık görüntüsünü PDF olarak indirir',
          'Excel — Her widget\'ın verisini ayrı bir sayfa olarak .xlsx dosyasına aktarır',
        ],
      },
    ],
  },
  {
    id: 'reports',
    title: 'Raporlar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    content: [
      {
        subtitle: 'Rapor Nedir?',
        text: 'Raporlar, kaydedilmiş sorgulardır. Bir sorgu oluşturup kaydedersiniz, daha sonra istediğiniz zaman tekrar çalıştırabilir ve sonuçları CSV olarak dışa aktarabilirsiniz.',
      },
      {
        subtitle: 'Yeni Rapor Oluşturma',
        text: 'Reports sayfasında "New Report" butonuna tıklayın. Report Builder açılacaktır:',
        list: [
          '1. Sol panelden veri kaynağı seçin (Orders, Customers, Products)',
          '2. Boyutlar (Dimensions) seçin — sonuçları gruplamak istediğiniz alanlar',
          '3. Ölçüler (Measures) ekleyin — "Add" ile yeni ölçü ekleyip, alan ve toplama yöntemini (Sum, Count, Avg, Min, Max) seçin',
          '4. Satır limiti ayarlayın',
          '5. "Run Query" ile sorguyu çalıştırın ve sağ tarafta önizleme yapın',
          '6. Sonuçtan memnunsanız rapora isim verin ve "Save Report" ile kaydedin',
        ],
      },
      {
        subtitle: 'Rapor Çalıştırma ve Export',
        text: 'Kayıtlı raporları Reports sayfasından görebilirsiniz. Her rapor için:',
        list: [
          '"Open" — Raporu açıp tekrar düzenleyebilir veya çalıştırabilirsiniz',
          '"CSV" — Sorgu sonuçlarını CSV dosyası olarak indirirsiniz',
          'Duplicate — Raporu kopyalayıp yeni bir versiyon oluşturursunuz',
          'Delete — Raporu silersiniz',
        ],
      },
    ],
  },
  {
    id: 'data-explorer',
    title: 'Data Explorer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    content: [
      {
        subtitle: 'Data Explorer Nedir?',
        text: 'Data Explorer, hızlı ad-hoc sorgular yapmak için kullanılır. Kaydetmenize gerek kalmadan, anlık veri keşfi yapabilirsiniz.',
      },
      {
        subtitle: 'Nasıl Kullanılır?',
        text: '',
        list: [
          '1. Veri kaynağı seçin',
          '2. Görmek istediğiniz boyutları işaretleyin',
          '3. Hesaplanmasını istediğiniz ölçüleri işaretleyin',
          '4. "Run Query" butonuna tıklayın',
          '5. Sonuçlar tabloda gösterilecektir',
        ],
      },
      {
        subtitle: 'Data Explorer vs Reports Farkı',
        text: 'Data Explorer ile anlık sorgular yaparsınız, sonuçlar kaydedilmez. Bir sorguyu tekrar tekrar kullanmak istiyorsanız, Reports sayfasından rapor olarak kaydedin.',
      },
    ],
  },
  {
    id: 'schema',
    title: 'Veritabanı Şeması',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
      </svg>
    ),
    content: [
      {
        subtitle: 'Şema Görüntüleyici (Sadece Admin)',
        text: 'Veritabanı şeması sayfası sadece Admin rolüne açıktır. Bu sayfada:',
        list: [
          'Tüm veritabanı tabloları ve VIEW\'lar görsel olarak gösterilir (ERD diyagramı)',
          'VIEW\'lar "VIEW" etiketi ile işaretlenir',
          'Tablolar arasındaki Foreign Key (FK) ilişkileri oklarla gösterilir',
          'Her tablonun kolonları, veri tipleri, PK/FK durumları görüntülenir',
          'Tabloları sürükleyerek yerleşimi değiştirebilirsiniz',
          'Mouse tekerleği ile zoom yapabilirsiniz',
          'Bir tabloya tıklayarak detaylarını sağ panelde görebilirsiniz',
          'Arama çubuğu ile tablo, view veya kolon isimlerine göre filtreleyebilirsiniz',
          'İstatistik özeti: tablo sayısı, view sayısı ve ilişki sayısı gösterilir',
        ],
      },
      {
        subtitle: 'Renk Kodları',
        text: '',
        list: [
          'Turuncu (PK) — Primary Key kolonlar',
          'Mor (FK) — Foreign Key kolonlar',
          'Mavi oklar — Tablolar arası ilişkiler',
          '* işareti — NOT NULL (zorunlu) kolonlar',
        ],
      },
    ],
  },
  {
    id: 'user-management',
    title: 'Kullanıcı Yönetimi',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    content: [
      {
        subtitle: 'Kullanıcı Yönetimi (Sadece Admin)',
        text: 'Admin kullanıcılar sol menüdeki "Kullanıcılar" sekmesinden tüm kullanıcıları yönetebilir.',
      },
      {
        subtitle: 'Kullanıcı Listesi',
        text: 'Kullanıcı yönetimi sayfasında tüm kullanıcıları görebilirsiniz:',
        list: [
          'Ad, e-posta, rol, durum (aktif/pasif), son giriş tarihi listelenir',
          'Roller renkli etiketlerle gösterilir: Yönetici (kırmızı), Analist (mavi), İzleyici (yeşil)',
          'Arama kutusu ile kullanıcı adı veya e-posta ile filtreleyebilirsiniz',
          'Rol dropdown\'ı ile belirli bir role göre filtreleyebilirsiniz',
        ],
      },
      {
        subtitle: 'Yeni Kullanıcı Ekleme',
        text: '"Yeni Kullanıcı" butonuna tıklayarak yeni kullanıcı oluşturun:',
        list: [
          'Ad, e-posta ve şifre girin (şifre: en az 8 karakter, büyük/küçük harf ve rakam)',
          'Rol seçin: Yönetici, Analist veya İzleyici',
          '"Aktif kullanıcı" seçeneği ile hesabı aktif/pasif oluşturun',
          '"Oluştur" ile kaydedin',
        ],
      },
      {
        subtitle: 'Kullanıcı Düzenleme',
        text: 'Mevcut kullanıcıları düzenleyebilirsiniz:',
        list: [
          'Kullanıcı satırındaki kalem ikonuna tıklayın',
          'Ad, e-posta ve rol bilgilerini güncelleyin',
          'Aktif/Pasif toggle ile hesabı anında aktif veya pasif yapabilirsiniz',
          'Kendi hesabınızı silemezsiniz (güvenlik önlemi)',
        ],
      },
    ],
  },
  {
    id: 'connections',
    title: 'Veritabanı Bağlantıları',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
      </svg>
    ),
    content: [
      {
        subtitle: 'Bağlantı Yönetimi',
        text: 'Admin kullanıcılar sol menüdeki "Connections" sekmesinden veritabanı bağlantılarını yönetebilir. BI araçları (SQL Editor, Dashboard sorguları, Schema Viewer) bu bağlantıları kullanır.',
        list: [
          '"New Connection" butonuna tıklayarak yeni bağlantı ekleyin',
          'Veritabanı tipini seçin: PostgreSQL, SQL Server (MSSQL), veya MySQL/MariaDB',
          'Bağlantı adı, host/server, port, veritabanı adı, kullanıcı adı ve şifre girin',
          'MSSQL için: SERVER\\INSTANCE formatını kullanabilirsiniz (named instances)',
          'MySQL için: varsayılan port 3306, PostgreSQL 5432, MSSQL 1433',
          'Gerekirse SSL seçeneğini aktifleştirin',
          '"Test Connection" ile bağlantının çalıştığını doğrulayın',
          '"Create" ile bağlantıyı kaydedin',
        ],
      },
      {
        subtitle: 'Desteklenen Veritabanları',
        text: 'PowerSense şu veritabanı türlerini destekler:',
        list: [
          'PostgreSQL — Tam destek (schema browser, FK ilişkileri, tüm SQL özellikleri)',
          'SQL Server (MSSQL) — SELECT sorguları, schema browser, FK ilişkileri, T-SQL desteği',
          'MySQL / MariaDB — SELECT sorguları, schema browser, FK ilişkileri',
          'Her veritabanı tipi kendi SQL diyalektini kullanır (ör. MSSQL: TOP, PG: LIMIT)',
        ],
      },
      {
        subtitle: 'Varsayılan Bağlantı',
        text: 'Varsayılan (default) bağlantı, tüm BI sorguları için otomatik kullanılır:',
        list: [
          'Bağlantı kartındaki "Set Default" butonuyla varsayılan yapabilirsiniz',
          'Bağlantı oluşturulurken "Set as default connection" seçeneğini işaretleyin',
          'Varsayılan bağlantı mavi kenarlıkla ve DEFAULT etiketi ile gösterilir',
          'Hiçbir bağlantı yoksa uygulama kendi dahili veritabanını kullanır',
        ],
      },
      {
        subtitle: 'Bağlantı Testi',
        text: 'Bağlantıyı kaydetmeden önce veya sonra test edebilirsiniz:',
        list: [
          'Yeni bağlantı formunda "Test Connection" — kaydetmeden test eder',
          'Mevcut bağlantı kartında "Test" — kaydedilmiş bağlantıyı test eder',
          'Test başarılıysa: veritabanı versiyonu, kullanıcı bilgisi ve tablo sayısı gösterilir',
          'Test başarısızsa: hata mesajı gösterilir (yanlış şifre, erişilemeyen host vb.)',
          'Bağlantı durumu: connected (yeşil), failed (kırmızı), untested (gri)',
        ],
      },
      {
        subtitle: 'SQL Editor\'da Bağlantı Seçimi',
        text: 'SQL Editor\'da admin kullanıcılar farklı bağlantılar arasında geçiş yapabilir:',
        list: [
          'SQL Editor toolbar\'ında bağlantı dropdown menüsünden seçim yapın',
          'Bağlantı değiştiğinde Schema Browser otomatik güncellenir',
          'Farklı veritabanlarına aynı anda sorgu yazabilirsiniz',
        ],
      },
    ],
  },
  {
    id: 'sql-editor',
    title: 'SQL Editor',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    content: [
      {
        subtitle: 'SQL Editor Nedir?',
        text: 'SQL Editor, veritabanınıza doğrudan SQL sorguları yazmanızı sağlayan güçlü bir araçtır. JOIN, subquery, CTE (WITH), CROSS JOIN gibi karmaşık sorgular yazabilirsiniz. Güvenlik nedeniyle sadece SELECT sorguları çalıştırılabilir.',
        list: [
          'Sol menüden "SQL Editor" sekmesine tıklayın',
          'Soldaki Schema Browser\'da tüm tabloları ve sütunları görebilirsiniz',
          'Tablo/sütun isimlerine tıklayarak editöre otomatik ekleyebilirsiniz',
          'Sorgunuzu yazıp Ctrl+Enter veya "Run" butonuna basarak çalıştırın',
        ],
      },
      {
        subtitle: 'Schema Browser',
        text: 'Sol panelde veritabanındaki tüm tablolar, view\'lar ve sütunları listelenir:',
        list: [
          'Tablo adına tıklayarak sütunlarını genişletin',
          'Her sütunun tipi (text, integer, timestamp vb.) yanında gösterilir',
          'FK (Foreign Key) bağlantıları sarı anahtar ikonuyla gösterilir',
          'VIEW\'lar göz ikonu (👁) ve "VIEW" etiketi ile gösterilir',
          'Arama kutusuna yazarak tablo/view/sütun filtreleyebilirsiniz',
          'Tablo veya sütun adına tıklayarak editöre otomatik ekleyebilirsiniz',
        ],
      },
      {
        subtitle: 'SQL Otomatik Tamamlama (Autocomplete)',
        text: 'SQL yazarken akıllı öneri sistemi sizi hızlandırır:',
        list: [
          'Yazmaya başladığınızda tablo, view ve SQL anahtar kelimeleri önerilir',
          'Tablo adından sonra nokta (.) yazarsanız o tablonun kolonları listelenir (ör: products.name)',
          'Ctrl+Space ile öneri listesini manuel açabilirsiniz',
          '↑↓ ok tuşları ile öneriler arasında gezinin',
          'Enter veya Tab ile seçili öneriyi uygulayın',
          'Escape ile öneri listesini kapatın',
          'Tablo ikonları (📋), view ikonları (👁), kolon ikonları (•) ve SQL anahtar kelimeleri (SQL) farklı simgelerle gösterilir',
        ],
      },
      {
        subtitle: 'Sorgu Kaydetme ve Güncelleme',
        text: 'SQL sorgularınızı kaydedip tekrar kullanabilirsiniz:',
        list: [
          '"Sorgu Kaydet" butonuna tıklayarak yeni sorgu kaydedin',
          'Kayıtlı bir sorguyu yükledikten sonra düzenleyip tekrar kaydedebilirsiniz',
          'Kaydet dediğinizde iki seçenek sunulur: "Üzerine Yaz" veya "Yeni Olarak Kaydet"',
          'Toolbar\'da "Düzenleniyor: [sorgu adı]" göstergesi aktif sorguyu belirtir',
          'Kayıtlı sorgular Dashboard widget\'larında ve Raporlarda kullanılabilir',
        ],
      },
      {
        subtitle: 'Örnek Sorgular',
        text: 'Toolbar\'daki "Examples" butonuna tıklayarak hazır sorgu şablonları yükleyebilirsiniz:',
        list: [
          'Hangi kullanıcı hangi ürünü aldı — JOIN sorgusu',
          'Kategoriye ve bölgeye göre gelir — GROUP BY + JOIN',
          'En çok harcama yapan müşteriler — HAVING + ORDER BY',
          'Ürün performansı — LEFT JOIN + aggregation',
          'Aylık satış trendi — TO_CHAR + GROUP BY',
        ],
      },
      {
        subtitle: 'Sonuçlar ve Dışa Aktarma',
        text: 'Sorgu sonuçları alt panelde tablo olarak gösterilir:',
        list: [
          'Maksimum 5000 satır döner (performans için sınırlandırılmıştır)',
          'Satır sayısı, çalışma süresi (ms) başlıkta gösterilir',
          '"Export CSV" butonu ile sonuçları CSV dosyası olarak indirebilirsiniz',
          'NULL değerler italik ve gri olarak gösterilir',
          'Sayısal değerler sağa hizalanır, metin değerler sola',
        ],
      },
      {
        subtitle: 'Sorgu Geçmişi',
        text: '"History" butonuna tıklayarak daha önce çalıştırdığınız sorguları görebilirsiniz:',
        list: [
          'Son 50 sorgu otomatik kaydedilir',
          'Her sorgunun çalışma zamanı, satır sayısı ve süresi gösterilir',
          'Bir sorgua tıklayarak editöre yeniden yükleyebilirsiniz',
        ],
      },
      {
        subtitle: 'Güvenlik Kuralları',
        text: 'SQL Editor güvenlik amacıyla bazı kısıtlamalar içerir:',
        list: [
          'Sadece SELECT ve WITH (CTE) sorguları çalıştırılabilir',
          'INSERT, UPDATE, DELETE, DROP, ALTER gibi yazma işlemleri engellenir',
          'Sorgu zaman aşımı 30 saniyedir',
          'Admin ve Analyst rolleri SQL Editor kullanabilir',
        ],
      },
    ],
  },
  {
    id: 'concepts',
    title: 'Temel Kavramlar',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
    content: [
      {
        subtitle: 'Veri Kaynağı (Data Source)',
        text: 'Sorgunun çalışacağı ana tablo. PowerSense\'te şu anda üç veri kaynağı mevcuttur: Orders (siparişler), Customers (müşteriler), Products (ürünler).',
      },
      {
        subtitle: 'Boyut (Dimension)',
        text: 'Verilerin gruplanacağı alan. Örneğin: "Bölge", "Sipariş Durumu", "Kategori", "Ay". Boyutlar genellikle X ekseninde veya tablo satırlarında gösterilir.',
      },
      {
        subtitle: 'Ölçü (Measure)',
        text: 'Hesaplanan sayısal değer. Bir toplama yöntemiyle birlikte kullanılır:',
        list: [
          'Sum — Toplam (ör: Toplam Gelir)',
          'Count — Sayım (ör: Sipariş Sayısı)',
          'Count Distinct — Benzersiz sayım (ör: Tekil Müşteri Sayısı)',
          'Average (Avg) — Ortalama (ör: Ortalama Sipariş Tutarı)',
          'Min — En küçük değer',
          'Max — En büyük değer',
        ],
      },
      {
        subtitle: 'Filtre',
        text: 'Veriyi daraltmak için kullanılır. Cross-filter ile bir grafikteki değere tıklayarak tüm dashboard\'u filtreleyebilirsiniz.',
      },
      {
        subtitle: 'Widget',
        text: 'Dashboard üzerindeki her bir görselleştirme bileşeni. KPI kartı, çubuk grafik, çizgi grafik, pasta grafik, slicer gibi farklı tipleri vardır.',
      },
      {
        subtitle: 'Hesaplanmış Alan (Calculated Field)',
        text: 'Widget konfigürasyonunda "fx" butonuna tıklayarak kendi hesaplanmış ölçünüzü tanımlayabilirsiniz. Diğer ölçülerin alias\'larını süslü parantez içinde referans verin:',
        list: [
          'Örnek: {total_amount} / {order_count} — Sipariş başına ortalama gelir',
          'Örnek: {total_amount} - {discount_amount} — Net gelir',
          'Desteklenen operatörler: +, -, *, /, ()',
        ],
      },
      {
        subtitle: 'Koşullu Biçimlendirme (Conditional Formatting)',
        text: 'KPI ve Tablo widget\'larında değerlerin rengini kurallara göre otomatik değiştirebilirsiniz:',
        list: [
          'Widget konfigürasyonunda "Conditional Formatting" bölümünden "+ Rule" ile kural ekleyin',
          'Operatör seçin (>, <, >=, <=, =) ve eşik değeri girin',
          'Renk seçin (Yeşil, Kırmızı, Sarı, Mavi, Pembe)',
          'Örnek: Değer > 100000 ise Yeşil, Değer < 10000 ise Kırmızı',
        ],
      },
      {
        subtitle: 'Gauge (Gösterge) Widget',
        text: 'Bir KPI değerini hedefe göre ilerleme olarak gösteren hız göstergesi tarzı widget:',
        list: [
          'Widget eklerken "Gauge" tipini seçin',
          'Ayarlar panelinde "Gauge Settings > Target Value" ile hedef değeri belirleyin',
          'İbre otomatik olarak mevcut değer ile hedef arasındaki oranı gösterir',
          'Renk kodlaması: ≥80% yeşil, ≥50% sarı, <50% kırmızı',
        ],
      },
      {
        subtitle: 'Funnel Chart (Huni Grafiği)',
        text: 'Satış hunisi veya dönüşüm adımlarını görselleştirmek için ideal:',
        list: [
          'Widget eklerken "Funnel Chart" tipini seçin',
          'Boyut olarak adım/aşama alanını, ölçüt olarak da miktar/sayı alanını seçin',
          'Veriler otomatik olarak büyükten küçüğe sıralanır',
          'Her adımın yanında değer ve isim etiketleri gösterilir',
        ],
      },
      {
        subtitle: 'Treemap',
        text: 'Hiyerarşik verileri iç içe dikdörtgenler olarak gösteren güçlü görselleştirme:',
        list: [
          'Widget eklerken "Treemap" tipini seçin',
          'Dikdörtgen boyutu ölçüt değerine orantılıdır — büyük alan = büyük değer',
          'Kategori ve değer bilgisi kutucuk içinde gösterilir',
          'Bölgelere, ürünlere veya kategorilere göre dağılım analizi için ideal',
        ],
      },
      {
        subtitle: 'Waterfall Chart (Şelale Grafiği)',
        text: 'Artımlı pozitif/negatif değerleri gösteren grafik tipi:',
        list: [
          'Widget eklerken "Waterfall Chart" tipini seçin',
          'Pozitif değerler yeşil, negatif değerler kırmızı renkte gösterilir',
          'Her çubuk bir öncekinin bittiği yerden başlar — kümülatif etki görülür',
          'Gelir-gider analizi, kâr marjı bileşenleri için idealdir',
        ],
      },
      {
        subtitle: 'Region Map (Bölge Haritası)',
        text: 'Coğrafi verileri ısı haritası formatında görselleştirir:',
        list: [
          'Widget eklerken "Region Map" tipini seçin',
          'Boyut olarak bölge/şehir/ülke alanını seçin',
          'Her bölge değerine göre renklendirilir (koyu yeşil = yüksek, açık = düşük)',
          'Bölge kutucuklarına tıklayarak cross-filter uygulayabilirsiniz',
        ],
      },
      {
        subtitle: 'Pivot Table (Pivot Tablo)',
        text: 'Satır ve sütunlara göre çapraz tablolandırma yapan gelişmiş tablo:',
        list: [
          'Widget eklerken "Pivot Table" tipini seçin',
          'İlk boyut: satırlar, İkinci boyut: sütun başlıkları olarak kullanılır',
          'Her hücrede ölçüt değeri gösterilir, sağ sütunda satır toplamı yer alır',
          'Tek boyutla kullanıldığında gelişmiş tablo gibi çalışır',
          'Koşullu biçimlendirme kuralları pivot tablolarda da geçerlidir',
        ],
      },
      {
        subtitle: 'Yorumlar (Comments)',
        text: 'Dashboard\'lara yorum ekleyerek ekip içi işbirliği yapabilirsiniz:',
        list: [
          'Dashboard toolbar\'daki konuşma balonu simgesine tıklayın',
          'Sağdan açılan panelde yorum yazıp "Send" ile gönderin',
          'Tüm ekip üyeleri yorumları görebilir',
          'Kendi yorumlarınızı veya admin tüm yorumları silebilir',
          'Yorumlar tarih ve kullanıcı bilgisiyle kaydedilir',
        ],
      },
      {
        subtitle: 'Uyarılar ve Eşikler (Alerts & Thresholds)',
        text: 'Widget\'lardaki değerler belirli eşikleri aştığında uyarı tanımlayabilirsiniz:',
        list: [
          'Dashboard toolbar\'daki zil simgesine tıklayın',
          'Uyarı adı, ölçüt adı, operatör (>, <, >=, <=, =) ve eşik değeri girin',
          '"Create Alert" ile uyarı oluşturun',
          'Aktif ve tetiklenmiş uyarılar farklı renklerle gösterilir',
          'Admin ve Analyst rolleri uyarı oluşturabilir/silebilir',
        ],
      },
      {
        subtitle: 'Zamanlanmış Raporlar (Scheduled Reports)',
        text: 'Raporları otomatik çalışacak şekilde zamanlayabilirsiniz:',
        list: [
          'Rapor oluştururken veya düzenlerken "Schedule (Auto-run)" alanını seçin',
          'Seçenekler: Daily (Günlük), Weekly (Haftalık), Monthly (Aylık)',
          'Zamanlanmış raporlar belirlenen periyotta otomatik çalışır',
          'Sonuçlar önbelleğe alınarak hızlı erişim sağlanır',
        ],
      },
    ],
  },
  {
    id: 'tips',
    title: 'İpuçları',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 20, height: 20 }}>
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    content: [
      {
        subtitle: 'En İyi Uygulamalar',
        text: '',
        list: [
          'Dashboard\'lara anlamlı isimler verin (ör: "Aylık Satış Raporu" vs "Dashboard 1")',
          'KPI kartlarını dashboard\'un üst kısmına yerleştirin — ilk bakışta önemli metrikleri görün',
          'Widget\'lara alt başlık ve açıklama ekleyin — ekip arkadaşlarınız ne gösterdiğini anlasın',
          'Çok fazla widget eklemeyin — 6-8 widget ideal',
          'Dashboard temasını kurumsal renklere uygun seçin',
          'Auto-refresh açın — canlı verilerle çalışıyorsanız 5m veya 15m aralık ideal',
          'Cross-filter özelliğini aktif kullanın — tek tıkla tüm veriyi filtreleyin',
          'Global filtre panelini kullanarak dashboard genelinde veri daraltın',
          'KPI trend göstergelerini kullanın — artış/azalış anında görünsün',
          'Gauge widget ile KPI hedeflerine ne kadar yaklaştığınızı izleyin',
          'Funnel chart ile satış dönüşüm oranlarınızı takip edin',
          'Pivot Table ile çok boyutlu veri analizleri yapın',
          'Yorumlar ile dashboard\'larınıza ekip notları ekleyin',
          'Alert kuralları ile kritik metriklerde uyarı alın',
          'Zamanlanmış raporlarla otomatik periyodik analiz yapın',
          'Sık kullandığınız sorguları SQL Editor\'de kaydedin — dashboard ve raporlarda kullanın',
          'Dashboard\'ları paylaşım linki ile dış kullanıcılarla paylaşın',
          'Raporları "Public" olarak işaretleyerek ekip arkadaşlarınızla paylaşın',
        ],
      },
      {
        subtitle: 'Klavye ve Mouse Kısayolları',
        text: '',
        list: [
          'Ctrl+Enter — SQL Editor\'de sorguyu çalıştır',
          'Ctrl+Space — SQL Editor\'de otomatik tamamlama önerilerini aç',
          '↑↓ — Autocomplete önerileri arasında gezin',
          'Enter/Tab — Autocomplete önerisini uygula',
          'Escape — Autocomplete listesini kapat',
          'Schema sayfasında mouse tekerleği ile zoom yapabilirsiniz',
          'Schema sayfasında tabloları sürükleyerek hareket ettirebilirsiniz',
          'Dashboard düzenleme modunda widget\'ları sürükleyip boyutlandırabilirsiniz',
          'Tablo kolon başlığına tıklayarak sıralama yapabilirsiniz',
        ],
      },
    ],
  },
];

export default function UserGuidePage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  const currentSection = sections.find((s) => s.id === activeSection) || sections[0];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left: Table of Contents */}
      <div style={{
        width: 260,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        overflow: 'auto',
        padding: '20px 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ width: 22, height: 22 }}>
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Kullanım Kılavuzu</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>PowerSense BI Platform</div>
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '10px 16px',
              border: 'none',
              background: activeSection === section.id ? 'var(--accent-soft)' : 'transparent',
              color: activeSection === section.id ? 'var(--accent)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeSection === section.id ? 600 : 400,
              textAlign: 'left',
              borderLeft: activeSection === section.id ? '3px solid var(--accent)' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ opacity: activeSection === section.id ? 1 : 0.6, flexShrink: 0 }}>{section.icon}</span>
            {section.title}
          </button>
        ))}
      </div>

      {/* Right: Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 40px' }}>
        <div style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ color: 'var(--accent)' }}>{currentSection.icon}</span>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>{currentSection.title}</h1>
          </div>

          {currentSection.content.map((block, i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              {block.subtitle && (
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: 'var(--text-primary)',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 6,
                }}>
                  {block.subtitle}
                </h3>
              )}
              {block.text && (
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: block.list ? 12 : 0 }}>
                  {block.text}
                </p>
              )}
              {block.list && (
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {block.list.map((item, j) => (
                    <li key={j} style={{
                      fontSize: 13,
                      lineHeight: 1.8,
                      color: 'var(--text-secondary)',
                      marginBottom: 2,
                    }}>
                      <span style={{ color: 'var(--text-primary)' }}>{item.split(' — ')[0]}</span>
                      {item.includes(' — ') && (
                        <span style={{ color: 'var(--text-secondary)' }}> — {item.split(' — ').slice(1).join(' — ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
