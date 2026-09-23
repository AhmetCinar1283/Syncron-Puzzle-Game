'use client';

import { useState, useEffect, FormEvent } from 'react';
import { updateUserDisplayName, requestNewTag } from '@/services/firebase/users';
import type { T } from '@/contexts/LanguageContext';
import { ProfileDoc } from '../lib/constants';

interface Params {
  t: T;
  isOwner: boolean;
  viewUid: string | null;
  currentUser: { displayName?: string | null } | null;
  currentTag: string | null | undefined;
  profileDoc: ProfileDoc;
  setProfileDoc: (updater: (prev: ProfileDoc) => ProfileDoc) => void;
}

/**
 * Owner-only tag rename + display-name rename forms, plus the tag "copy"
 * button. Depends on profile data/state owned by `useProfileData`.
 */
export function useProfileEditForms({ t, isOwner, viewUid, currentUser, currentTag, profileDoc, setProfileDoc }: Params) {
  // Picker modal state
  const [pickerOpen, setPickerOpen] = useState(false);

  // Tag edit states
  const [tagInput, setTagInput] = useState('');
  const [tagBusy, setTagBusy] = useState(false);
  const [tagError, setTagError] = useState('');
  const [tagSuccess, setTagSuccess] = useState(false);

  // Display Name edit states
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [displayNameBusy, setDisplayNameBusy] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [displayNameSuccess, setDisplayNameSuccess] = useState(false);

  // Sync display name input with user profile info
  useEffect(() => {
    if (profileDoc?.displayName) {
      setDisplayNameInput(profileDoc.displayName);
    } else if (currentUser?.displayName) {
      setDisplayNameInput(currentUser.displayName);
    }
  }, [profileDoc, currentUser]);

  const [copied, setCopied] = useState(false);
  const handleCopyTag = () => {
    if (!currentTag) return;
    const tagText = `#${currentTag}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tagText)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => console.error('Copy failed', err));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = tagText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textarea);
    }
  };

  // Tag request limits calculation
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  const tagChangedAtDate = profileDoc?.tagChangedAt?.toDate() ?? null;
  const now = Date.now();
  const lastChangeMs = tagChangedAtDate?.getTime() ?? 0;
  const msRemaining = lastChangeMs + TWO_WEEKS_MS - now;
  const daysRemaining = tagChangedAtDate ? Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000))) : 0;
  const changesLeft = Math.max(0, 5 - (profileDoc?.tagChangeCount ?? 0));
  const canChangeTag = changesLeft > 0 && daysRemaining === 0;

  const handleTagSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim() || !isOwner) return;

    setTagBusy(true);
    setTagError('');
    setTagSuccess(false);

    try {
      const newTag = await requestNewTag(tagInput.trim());

      setProfileDoc((prev: ProfileDoc) =>
        prev
          ? {
              ...prev,
              tag: newTag,
              tagChangeCount: (prev.tagChangeCount ?? 0) + 1,
              tagChangedAt: { toDate: () => new Date() },
            }
          : prev
      );
      setTagInput('');
      setTagSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'TAG_INVALID_CHARS') setTagError(t('auth.err_tag_chars'));
      else if (msg.startsWith('TAG_LENGTH')) setTagError(t('auth.err_tag_length'));
      else if (msg === 'TAG_TAKEN') setTagError(t('auth.err_tag_taken'));
      else if (msg.startsWith('TAG_COOLDOWN')) {
        const days = msg.split(':')[1] ?? '14';
        setTagError(t('auth.err_tag_cooldown', { n: days }));
      } else if (msg === 'TAG_MAX_CHANGES') setTagError(t('auth.err_tag_max'));
      else setTagError(t('auth.err_generic'));
    } finally {
      setTagBusy(false);
    }
  };

  const handleDisplayNameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newName = displayNameInput.trim();
    if (!newName || !isOwner) return;

    if (newName.length < 3 || newName.length > 25) {
      setDisplayNameError(t('profile.err_displayName_length'));
      return;
    }

    // Alphanumeric + spaces + underscore + dash + Turkish characters
    const validRegex = /^[a-zA-Z0-9ğüşöçİĞÜŞÖÇ\s_-]+$/;
    if (!validRegex.test(newName)) {
      setDisplayNameError(t('profile.err_displayName_chars'));
      return;
    }

    setDisplayNameBusy(true);
    setDisplayNameError('');
    setDisplayNameSuccess(false);

    try {
      if (!viewUid) throw new Error('No user ID found');
      // 1. Update Firestore user doc + Firebase Auth profile
      await updateUserDisplayName(viewUid, newName);

      // 2. Update local state
      setProfileDoc((prev: ProfileDoc) =>
        prev
          ? {
              ...prev,
              displayName: newName,
            }
          : prev
      );
      setDisplayNameSuccess(true);
    } catch (err: unknown) {
      console.error('[Profile] Failed to update display name:', err);
      setDisplayNameError(t('auth.err_generic'));
    } finally {
      setDisplayNameBusy(false);
    }
  };

  return {
    pickerOpen,
    setPickerOpen,
    tagInput,
    setTagInput,
    tagBusy,
    tagError,
    tagSuccess,
    displayNameInput,
    setDisplayNameInput,
    displayNameBusy,
    displayNameError,
    displayNameSuccess,
    copied,
    handleCopyTag,
    changesLeft,
    daysRemaining,
    canChangeTag,
    handleTagSubmit,
    handleDisplayNameSubmit,
  };
}
