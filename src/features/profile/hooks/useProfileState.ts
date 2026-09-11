'use client';

import { useState } from 'react';
import { useProfileData } from './useProfileData';
import { useProfileEditForms } from './useProfileEditForms';

/**
 * Composes `useProfileData` (auth/profile doc/badges/friends/particles/
 * gamepad) with `useProfileEditForms` (tag + display-name owner forms) into
 * the single state object `ProfileClient` renders from.
 */
export function useProfileState() {
  const [pickerOpen, setPickerOpen] = useState(false);

  const data = useProfileData(pickerOpen);
  const forms = useProfileEditForms({
    t: data.t,
    isOwner: data.isOwner,
    viewUid: data.viewUid,
    currentUser: data.currentUser,
    currentTag: data.currentTag,
    profileDoc: data.profileDoc,
    setProfileDoc: data.setProfileDoc,
  });

  return {
    ...data,
    ...forms,
    pickerOpen,
    setPickerOpen,
  };
}
