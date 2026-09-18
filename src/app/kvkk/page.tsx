'use client';

import { useAppRouter } from '@/lib/navigation';
import { useT, useLanguage } from '@/contexts/LanguageContext';
import AdPrivacyOptionsButton from '@/components/common/AdPrivacyOptionsButton';

export default function KvkkPage() {
  const t = useT();
  const { lang } = useLanguage();
  const router = useAppRouter();

  const isTr = lang === 'tr';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#030712',
        color: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        position: 'relative',
        overflowX: 'hidden',
        fontFamily: 'var(--font-geist-sans), sans-serif',
      }}
    >
      {/* Neo-Grid Subtle Background Light (Pink/Purple Accent) */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.05) 0%, transparent 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Back button */}
        <div>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#9ca3af',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ec4899';
              e.currentTarget.style.border = '1px solid rgba(236, 72, 153, 0.4)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(236, 72, 153, 0.15)';
              e.currentTarget.style.background = 'rgba(236, 72, 153, 0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            }}
            id="kvkk-back-btn"
          >
            {t('common.back_menu')}
          </button>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 900,
            color: '#ec4899',
            margin: 0,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            textShadow: '0 0 24px rgba(236, 72, 153, 0.3)',
          }}
        >
          {isTr ? 'KVKK Açık Rıza Beyanı' : 'KVKK Explicit Consent'}
        </h1>

        {/* Glassmorphic Content Panel */}
        <div
          style={{
            background: 'rgba(10, 15, 26, 0.65)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(236, 72, 153, 0.12)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 0 40px rgba(236, 72, 153, 0.03), 0 10px 40px rgba(0,0,0,0.5)',
            lineHeight: 1.7,
            fontSize: '14px',
            color: '#9ca3af',
          }}
        >
          {isTr ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p><strong>Son Güncelleme: 17 Eylül 2026</strong></p>
              <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, Syncron platformu üzerinde gerçekleştireceğiniz kayıt ve üyelik işlemleri kapsamında kişisel verilerinizin işlenmesi ve yurt dışına aktarılması konularında açık rızanız talep edilmektedir.</p>
              
              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>1. Açık Rıza Kapsamında İşlenen Veriler</h2>
              <p>Hesap açarken veya Google hesabınızı bağladığınızda sisteme kaydettiğiniz e-posta adresiniz, belirlediğiniz kullanıcı adı (tag), oyun skorlarınız ve destek sistemi üzerinden oluşturduğunuz biletler, ilettiğiniz mesajlar ve admin yanıtları KVKK uyarınca kişisel veri niteliğindedir.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>2. Yurt Dışına Veri Aktarımı (Önemli)</h2>
              <p>Syncron, bulut veri tabanı ve destek bilet sistemi altyapısı olarak Google Firebase Firestore servislerini kullanmaktadır. Google sunucuları ve yedekleme sistemleri yurt dışında (başta AB ülkeleri ve ABD olmak üzere) konumlandırılmıştır. Bu doğrultuda, platforma kayıt olarak, bir destek talebi açarak ve verilerinizin bulut ortamında saklanmasına izin vererek, kişisel verilerinizin <strong>yurt dışına aktarılmasına açık rıza gösterdiğinizi</strong> kabul edersiniz.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>3. İşleme Amaçları ve Hukuki Sebepler</h2>
              <p>Kişisel verileriniz, platform üzerinde kimlik doğrulamanızın yapılması, oyun ilerlemenizin yedeklenmesi, liderlik tablolarında (skor tablosu) isminizin ve derecenizin yayınlanması, destek taleplerinizin yanıtlanması ve teknik yardım süreçlerinin yürütülmesi amaçlarıyla işlenmektedir. Bu rıza beyanı, kanunun aradığı &quot;açık rıza&quot; hukuki sebebine dayanmaktadır.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>4. Açık Rızanın Geri Alınması</h2>
              <p>Dilediğiniz zaman açık rızanızı geri çekme ve kişisel verilerinizin ile destek geçmişinizin sistemlerimizden tamamen silinmesini talep etme hakkınız bulunmaktadır. Rızanızı geri çekmeniz durumunda, çevrimiçi ilerleme eşitleme ve destek özellikleri devre dışı kalacak, hesabınız kalıcı olarak silinecektir.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>5. Açık Rızaya DAYANMAYAN İşleme: Güvenlik Kayıtları</h2>
              <p>Aşağıdaki veriler <strong>açık rızanıza değil</strong>, KVKK m.5/2-(f) uyarınca <strong>meşru menfaat</strong> hukuki sebebine dayanarak işlenir; bu nedenle rızanızı geri çekseniz dahi güvenlik süresince saklanmaya devam eder:</p>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Karmalanmış IP adresi:</strong> IP adresiniz gizli bir anahtarla tuzlanıp SHA-256 ile özetlenir. <strong>Ham IP adresiniz saklanmaz</strong> ve özet geri döndürülemez.</li>
                <li><strong>Tarayıcı/cihaz kimliği (User-Agent):</strong> İlk 256 karakteriyle saklanır.</li>
              </ul>
              <p><strong>İşleme amacı:</strong> hesap güvenliği, hile ve dolandırıcılığın önlenmesi, saldırı tespiti ve yasal taleplere cevap verilebilmesi.</p>
              <p><strong>Ne zaman kaydedilir:</strong> yalnızca güvenlik olaylarında — başarısız kimlik doğrulama, yetkisiz yönetim erişimi denemesi, doğrulanamayan çözüm gönderimi, yasaklı hesabın istek denemesi, hız limiti aşımı, geçersiz imzalı ödeme bildirimi. Normal oyun ilerlemenizde <strong>kaydedilmez</strong>.</p>
              <p><strong>Saklama süresi: 30 gün.</strong> Süre dolduğunda kayıtlar otomatik olarak <strong>kalıcı biçimde silinir</strong>, arşivlenmez.</p>
              <p><strong>Haklarınız:</strong> KVKK m.11 kapsamında bilgi talep etme, işlemeye itiraz etme ve silinmesini isteme haklarınız saklıdır. Başvurularınızı oyun içi <strong>Destek</strong> ekranından iletebilirsiniz. Ayrıntı için <strong>Gizlilik Politikası §7</strong>.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>6. Reklam Kimliği ve Reklam Tercihleri</h2>
              <p>Oyunun Android sürümünde Google AdMob üzerinden reklam gösterilir. Bu kapsamda cihazınızın reklam kimliği (Advertising ID) gibi tanımlayıcılar Google tarafından işlenebilir ve yurt dışındaki Google sunucularına aktarılabilir. Reklam gösterimi için <strong>açık rıza zorunlu değildir</strong>: rıza vermezseniz reklamlar kişiselleştirilmeden sunulur, oyunun hiçbir özelliği kısıtlanmaz. Tercihinizi aşağıdaki butondan dilediğiniz zaman değiştirebilirsiniz.</p>
              <AdPrivacyOptionsButton />

              <p style={{ marginTop: '20px', color: '#e5e7eb', fontWeight: 600 }}>
                &quot;Hesap Oluştur&quot; veya &quot;Google ile Devam Et&quot; butonuna basarak kayıt olurken aktif kutucuğu işaretlemeniz halinde, yukarıdaki metni okuduğunuzu, verilerinizin yurt dışındaki Google sunucularına aktarılmasına, destek sisteminde işlenmesine ve skor tablolarında yayınlanmasına özgür iradenizle açık rıza verdiğinizi beyan etmiş olursunuz.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p><strong>Last Updated: September 17, 2026</strong></p>
              <p>In accordance with the Turkish Personal Data Protection Law No. 6698 (&quot;KVKK&quot;), we request your explicit consent regarding the processing and transfer of your personal data abroad when registering an account on Syncron.</p>
              
              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>1. Scope of Processed Data</h2>
              <p>Your email address, custom profile tag (username), calculated game scores, and support tickets with submitted messages and administrator replies recorded under your profile constitute personal data under KVKK protection guidelines.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>2. Abroad Data Transfer (Critical Consent)</h2>
              <p>Syncron operates using Google Cloud Firebase database and support ticket systems. Google servers and physical backup nodes are hosted in locations abroad (primarily European Union countries and the United States). By registering an account, submitting a support ticket, and enabling cloud progress saving, you declare your **explicit consent to the transfer of your personal data abroad**.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>3. Processing Purposes</h2>
              <p>Your records are processed strictly to authenticate your account session, secure your game status, back up solutions across browsers, render your ranking details on public high-score leaderboards, and respond to your technical assistance support tickets.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>4. Revoking Your Consent</h2>
              <p>You reserve the right to withdraw your explicit consent at any time and request permanent deletion of your credentials and ticket history. Revoking this consent will automatically terminate your account session, wipe database backups and support history, and disable online cloud synchronization.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>5. Processing NOT Based on Consent: Security Records</h2>
              <p>The following data is processed <strong>not on the basis of your consent</strong> but on <strong>legitimate interest</strong> (KVKK Art. 5/2-(f), GDPR Art. 6(1)(f)). It is therefore retained for the security period even if you withdraw your consent:</p>
              <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li><strong>Hashed IP address:</strong> your IP address is salted with a secret key and digested with SHA-256. <strong>Your raw IP address is never stored</strong> and the digest cannot be reversed.</li>
                <li><strong>Browser/device identifier (User-Agent):</strong> stored truncated to its first 256 characters.</li>
              </ul>
              <p><strong>Purpose:</strong> account security, cheating and fraud prevention, attack detection, and the ability to answer lawful requests.</p>
              <p><strong>When recorded:</strong> only on security events — failed authentication, unauthorised administration access attempt, unverifiable solution submission, request from a suspended account, rate limit breach, payment notification with an invalid signature. It is <strong>not</strong> recorded during normal gameplay.</p>
              <p><strong>Retention: 30 days.</strong> After that the records are <strong>permanently deleted</strong> automatically and are never archived.</p>
              <p><strong>Your rights:</strong> you may request information, object to the processing and request erasure (KVKK Art. 11, GDPR Art. 15-22) via the in-game <strong>Support</strong> screen. See <strong>Privacy Policy §7</strong> for details.</p>

              <h2 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, marginTop: '12px' }}>6. Advertising ID and Ad Preferences</h2>
              <p>The Android build of the game serves ads through Google AdMob. Identifiers such as your device Advertising ID may therefore be processed by Google and transferred to Google servers abroad. Explicit consent is <strong>not mandatory</strong> for ads to be served: if you decline, ads are shown without personalisation and no game feature is restricted. You can change your choice at any time with the button below.</p>
              <AdPrivacyOptionsButton />

              <p style={{ marginTop: '20px', color: '#e5e7eb', fontWeight: 600 }}>
                By checking the active consent checkbox during account creation or Google linking, you state that you have read and understood this document and willingly provide your explicit consent to the abroad transfer, support ticket processing, and leaderboard rendering of your data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
