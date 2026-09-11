'use client';

import { motion } from 'framer-motion';
import {
  type TicketCategory,
  CATEGORY_LABELS,
  TICKET_SUBJECT_MAX,
  TICKET_BODY_MAX,
} from '@/services/firebase/supportTypes';

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: '#060d1a',
  border: '1px solid rgba(0, 196, 255, 0.3)',
  color: '#e2e8f0',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#060d1a',
  border: '1px solid rgba(0, 196, 255, 0.3)',
  color: '#e2e8f0',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'all 0.15s',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#00c4ff',
  display: 'block',
  marginBottom: 6,
};

export function TicketForm({
  t,
  isTrCategory,
  category,
  setCategory,
  subject,
  setSubject,
  body,
  setBody,
  submitting,
  errorMsg,
  onSubmit,
}: {
  t: (key: string) => string;
  isTrCategory: boolean;
  category: TicketCategory;
  setCategory: (c: TicketCategory) => void;
  subject: string;
  setSubject: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  submitting: boolean;
  errorMsg: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(10, 15, 26, 0.65)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 196, 255, 0.15)',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 0 40px rgba(0, 196, 255, 0.02), 0 10px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#e5e7eb', margin: 0, borderBottom: '1px solid rgba(0, 196, 255, 0.15)', paddingBottom: '12px' }}>
        {t('support.create_ticket')}
      </h2>

      {errorMsg && (
        <div
          style={{
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.4)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            color: '#ec4899',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>✕</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Category selection */}
      <div>
        <label htmlFor="category-select" style={labelStyle}>{t('support.form_category')}</label>
        <select
          id="category-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as TicketCategory)}
          style={selectStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#00c4ff';
            e.target.style.boxShadow = '0 0 10px rgba(0, 196, 255, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(0, 196, 255, 0.3)';
            e.target.style.boxShadow = 'none';
          }}
        >
          {(['general', 'bug', 'account', 'level', 'purchase', 'suggestion', 'data_deletion'] as TicketCategory[]).map((cat) => (
            <option key={cat} value={cat} style={{ background: '#030712', color: '#e2e8f0' }}>
              {CATEGORY_LABELS[cat][isTrCategory ? 'tr' : 'en']}
            </option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject-input" style={labelStyle}>{t('support.form_subject')}</label>
        <input
          id="subject-input"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('support.form_subject_placeholder')}
          maxLength={TICKET_SUBJECT_MAX}
          required
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.borderColor = '#00c4ff';
            e.target.style.boxShadow = '0 0 10px rgba(0, 196, 255, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(0, 196, 255, 0.3)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <span style={{ fontSize: 10, color: '#4b5563', display: 'block', marginTop: 4, textAlign: 'right' }}>
          {subject.length} / {TICKET_SUBJECT_MAX}
        </span>
      </div>

      {/* Message Body */}
      <div>
        <label htmlFor="body-textarea" style={labelStyle}>{t('support.form_body')}</label>
        <textarea
          id="body-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('support.form_body_placeholder')}
          maxLength={TICKET_BODY_MAX}
          required
          rows={6}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '120px',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#00c4ff';
            e.target.style.boxShadow = '0 0 10px rgba(0, 196, 255, 0.2)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(0, 196, 255, 0.3)';
            e.target.style.boxShadow = 'none';
          }}
        />
        <span style={{ fontSize: 10, color: '#4b5563', display: 'block', marginTop: 4, textAlign: 'right' }}>
          {body.length} / {TICKET_BODY_MAX}
        </span>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%',
          background: submitting ? 'rgba(0, 196, 255, 0.05)' : 'rgba(0, 196, 255, 0.08)',
          border: '1px solid rgba(0, 196, 255, 0.6)',
          color: '#00c4ff',
          padding: '12px 0',
          fontSize: 14,
          fontWeight: 700,
          borderRadius: 8,
          cursor: submitting ? 'not-allowed' : 'pointer',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          transition: 'all 0.2s',
          boxShadow: '0 0 15px rgba(0, 196, 255, 0.1)',
          opacity: submitting ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (submitting) return;
          e.currentTarget.style.background = 'rgba(0, 196, 255, 0.18)';
          e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 196, 255, 0.25)';
        }}
        onMouseLeave={(e) => {
          if (submitting) return;
          e.currentTarget.style.background = 'rgba(0, 196, 255, 0.08)';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 196, 255, 0.1)';
        }}
      >
        {submitting ? t('support.form_submitting') : t('support.form_submit')}
      </button>
    </motion.form>
  );
}
