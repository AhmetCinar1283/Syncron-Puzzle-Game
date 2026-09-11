/**
 * DOSYA AMACI: Bu dosya, destek biletleri (support ticket) sistemi için
 * istemci tarafında kullanılan veri modellerini, sabitleri ve etiket dil eşlemelerini barındırır.
 */

// ─── Enums / Unions (Bilet Parametre Seçenekleri) ────────────────────────────────

/**
 * Destek biletleri için geçerli olan 7 kategori türü.
 */
export type TicketCategory =
  | 'general'
  | 'bug'
  | 'account'
  | 'level'
  | 'purchase'
  | 'suggestion'
  | 'data_deletion';

/**
 * Biletlerin durumları.
 */
export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_user'
  | 'resolved'
  | 'closed';

/**
 * Biletlerin öncelik seviyeleri.
 */
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

// ─── Document shapes (Firestore Doküman Modelleri) ──────────────────────────────

/**
 * Firestore'daki `supportTickets/{ticketId}` doküman şeması.
 */
export interface SupportTicket {
  id: string;
  uid: string; // Bileti oluşturan kullanıcının UID'si
  email: string;
  displayName: string;
  tag: string | null;
  category: TicketCategory;
  subject: string; // Kısa konu başlığı (5-100 karakter)
  status: TicketStatus;
  priority: TicketPriority;
  hasUnreadAdmin: boolean; // Yöneticinin okumadığı yeni kullanıcı mesajı var mı?
  hasUnreadUser: boolean; // Kullanıcının okumadığı yeni yönetici cevabı var mı?
  createdAt: number; // Unix ms
  updatedAt: number; // Unix ms
  closedAt: number | null; // Kapatılma ms zaman damgası veya null
  adminNote: string | null; // Yalnızca yöneticilere özel dahili not (kullanıcıya gösterilmez)
}

/**
 * Bir bilet altındaki `messages/{messageId}` alt koleksiyon doküman şeması.
 */
export interface TicketMessage {
  id: string;
  senderType: 'user' | 'admin';
  senderUid: string;
  senderName: string;
  body: string; // Mesaj gövdesi (20-2000 karakter)
  createdAt: number; // Unix ms
}

// ─── Request / filter shapes (İstek / Filtre Modelleri) ──────────────────────────

/**
 * POST /create-ticket API ucuna gönderilen bilet oluşturma gövdesi.
 */
export interface CreateTicketPayload {
  category: TicketCategory;
  subject: string;
  body: string;
}

/**
 * Yönetici bilet listeleme sayfasında kullanılan filtre yapısı.
 */
export interface TicketFilter {
  status: TicketStatus | 'all';
  category: TicketCategory | 'all';
}

// ─── Validation constraints (Doğrulama Sınırları) ───────────────────────────────

export const TICKET_SUBJECT_MIN = 5;
export const TICKET_SUBJECT_MAX = 100;
export const TICKET_BODY_MIN = 20;
export const TICKET_BODY_MAX = 2000;
export const TICKET_REPLY_MIN = 5;
export const TICKET_REPLY_MAX = 2000;

// ─── Display helpers (Görsel ve Dil Etiketleri) ───────────────────────────────

export const CATEGORY_LABELS: Record<TicketCategory, { en: string; tr: string }> = {
  general:       { en: 'General Question',        tr: 'Genel Soru' },
  bug:           { en: 'Bug / Error Report',      tr: 'Bug / Hata Raporu' },
  account:       { en: 'Account Issue',           tr: 'Hesap Sorunu' },
  level:         { en: 'Level Issue',             tr: 'Level Sorunu' },
  purchase:      { en: 'Purchase / Subscription', tr: 'Satın Alma / Abonelik' },
  suggestion:    { en: 'Suggestion / Feedback',   tr: 'Öneri / Geri Bildirim' },
  data_deletion: { en: 'Data Deletion (KVKK)',    tr: 'Veri Silme Talebi (KVKK)' },
};

export const STATUS_LABELS: Record<TicketStatus, { en: string; tr: string }> = {
  open:          { en: 'Open',              tr: 'Açık' },
  in_progress:   { en: 'In Progress',      tr: 'İşlemde' },
  waiting_user:  { en: 'Waiting for You',  tr: 'Yanıtınız Bekleniyor' },
  resolved:      { en: 'Resolved',         tr: 'Çözüldü' },
  closed:        { en: 'Closed',           tr: 'Kapatıldı' },
};

/** Durumlar için neon vurgu renkleri (tema uyumlu) */
export const STATUS_COLORS: Record<TicketStatus, string> = {
  open:         '#00ff88', // yeşil
  in_progress:  '#00c4ff', // camgöbeği
  waiting_user: '#ffd700', // altın sarısı
  resolved:     '#6b7280', // gri
  closed:       '#ec4899', // pembe
};

export const PRIORITY_LABELS: Record<TicketPriority, { en: string; tr: string }> = {
  low:    { en: 'Low',    tr: 'Düşük' },
  normal: { en: 'Normal', tr: 'Normal' },
  high:   { en: 'High',   tr: 'Yüksek' },
  urgent: { en: 'Urgent', tr: 'Acil' },
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low:    '#6b7280',
  normal: '#00c4ff',
  high:   '#ffd700',
  urgent: '#ec4899',
};

