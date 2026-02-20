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
        subtitle: 'Ana Menü',
        text: 'Sol taraftaki sidebar ile sayfalar arasında geçiş yapabilirsiniz. İkonların üzerine geldiğinizde sayfa isimlerini görebilirsiniz.',
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
          '3. Veri kaynağı seçin (Orders, Customers, Products)',
          '4. Boyutlar (Dimensions) seçin — verinin gruplanacağı alanlar',
          '5. Ölçüler (Measures) ekleyin — hesaplanacak değerler (toplam, ortalama, sayım, vb.)',
          '6. "Apply Changes" ile kaydedin',
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
          'Tüm veritabanı tabloları görsel olarak gösterilir (ERD diyagramı)',
          'Tablolar arasındaki Foreign Key (FK) ilişkileri oklarla gösterilir',
          'Her tablonun kolonları, veri tipleri, PK/FK durumları görüntülenir',
          'Tabloları sürükleyerek yerleşimi değiştirebilirsiniz',
          'Mouse tekerleği ile zoom yapabilirsiniz',
          'Bir tabloya tıklayarak detaylarını sağ panelde görebilirsiniz',
          'Arama çubuğu ile tablo veya kolon isimlerine göre filtreleyebilirsiniz',
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
        text: 'Dashboard üzerindeki her bir görselleştirme bileşeni. KPI kartı, çubuk grafik, çizgi grafik, pasta grafik gibi farklı tipleri vardır.',
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
          'Çok fazla widget eklemeyin — 6-8 widget ideal',
          'Cross-filter özelliğini aktif kullanın — tek tıkla tüm veriyi filtreleyin',
          'Sık kullandığınız sorguları rapor olarak kaydedin',
          'Raporları "Public" olarak işaretleyerek ekip arkadaşlarınızla paylaşın',
        ],
      },
      {
        subtitle: 'Klavye ve Mouse Kısayolları',
        text: '',
        list: [
          'Schema sayfasında mouse tekerleği ile zoom yapabilirsiniz',
          'Schema sayfasında tabloları sürükleyerek hareket ettirebilirsiniz',
          'Dashboard düzenleme modunda widget\'ları sürükleyip boyutlandırabilirsiniz',
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
