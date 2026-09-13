import type { AuditLogEntry } from './types';

/** Local datetime-local `min` value (now, in the browser's local timezone). */
export function getMinDateTime(): string {
  const now = new Date();
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** Human-readable remaining/expired text for a ban's `expires_at` ISO string. */
export function getRemainingTimeText(expiresAtStr: string | null, isTr: boolean): string {
  if (!expiresAtStr) return isTr ? 'Kalıcı' : 'Permanent';
  const diff = new Date(expiresAtStr).getTime() - Date.now();
  if (diff <= 0) return isTr ? 'Süresi Doldu' : 'Expired';

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return isTr ? `${days} gün kaldı` : `${days} days remaining`;
  if (hours > 0) return isTr ? `${hours} saat kaldı` : `${hours} hours remaining`;
  return isTr ? `${minutes} dakika kaldı` : `${minutes} minutes remaining`;
}

/** Human-readable parser for JSON metadata payloads of an audit log entry. */
export function formatLogMetadata(log: AuditLogEntry, isTr: boolean): string {
  const meta = log.metadata || {};
  const act = log.action;

  switch (act) {
    case 'account.create':
      return isTr
        ? `Yeni profil oluşturuldu. Kayıt sağlayıcı: **${meta.provider || log.metadata.authProvider || 'anonymous'}**`
        : `New profile created. Auth provider: **${meta.provider || log.metadata.authProvider || 'anonymous'}**`;

    case 'account.tag_change':
      return isTr
        ? `GamerTag değiştirildi. Yeni etiket: **#${meta.tag || meta.newTag}**`
        : `GamerTag changed. New label: **#${meta.tag || meta.newTag}**`;

    case 'level.complete':
      return isTr
        ? `**${meta.levelId}** seviyesini **${meta.stars} Yıldız** ile **${meta.timeSpent} saniyede** tamamladı (${meta.moveCount} hamle).`
        : `Completed **${meta.levelId}** with **${meta.stars} Stars** in **${meta.timeSpent} seconds** (${meta.moveCount} moves).`;

    case 'level.start':
      return isTr
        ? `**${meta.levelId}** seviyesini oynamaya başladı.`
        : `Started playing level **${meta.levelId}**.`;

    case 'ticket.create':
      return isTr
        ? `**#${meta.ticketId || meta.id}** nolu destek talebini oluşturdu. Başlık: **"${meta.subject}"**`
        : `Opened support ticket **#${meta.ticketId || meta.id}**. Subject: **"${meta.subject}"**`;

    case 'ticket.reply':
      return isTr
        ? `**#${meta.ticketId}** nolu destek talebine yanıt gönderdi.`
        : `Sent a reply to support ticket **#${meta.ticketId}**.`;

    case 'payment.success':
      return isTr
        ? `Abonelik ödemesi başarıyla tahsil edildi. Tutar: **$${meta.amount || '9.99'}**. Ref: **${meta.ref || meta.transactionId}**`
        : `Subscription payment successful. Amount: **$${meta.amount || '9.99'}**. Ref: **${meta.ref || meta.transactionId}**`;

    case 'payment.failed':
      return isTr
        ? `Ödeme Hatası! Başarısız ödeme denemesi. Neden: **${meta.reason || 'insufficient_funds'}**. Ref: **${meta.ref || meta.transactionId || 'N/A'}**`
        : `Payment Failed! Unsuccessful billing attempt. Reason: **${meta.reason || 'insufficient_funds'}**. Ref: **${meta.ref || meta.transactionId || 'N/A'}**`;

    case 'admin.ban':
      return isTr
        ? `Sistem erişimi askıya alındı (Banned). Gerekçe: **${meta.reason || 'Bilinmiyor'}**`
        : `Access suspended (Banned). Reason: **${meta.reason || 'Unknown'}**`;

    case 'admin.unban':
      return isTr ? `Kullanıcı engeli kaldırıldı.` : `Access suspension lifted (Unbanned).`;

    default:
      // Generic metadata formatter to avoid displaying raw JSON
      if (Object.keys(meta).length > 0) {
        const formattedPairs = Object.entries(meta)
          .map(([k, v]) => `**${k}**: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
          .join(', ');
        return `${act} — [ ${formattedPairs} ]`;
      }
      return `${act}`;
  }
}
