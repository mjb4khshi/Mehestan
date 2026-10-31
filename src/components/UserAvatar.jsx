import React, { useState } from 'react';
import { getMoodleFileUrl } from '../services/moodle/api';
import { cleanPersianText } from '../utils/persianUtils';

export default function UserAvatar({
  url,
  name = '',
  token = '',
  size = 'w-10 h-10',
  roleType = 'student',
  className = '',
}) {
  const [imgError, setImgError] = useState(false);

  const cleanName = cleanPersianText(name) || 'ک';
  const initial = cleanName.charAt(0);

  const hasImage = Boolean(url && !imgError);
  const imageUrl = hasImage ? getMoodleFileUrl(url, token) : '';

  const isTeacher = roleType === 'teacher';
  const isTa = roleType === 'ta';

  const roleFallbackClass = isTeacher
    ? 'bg-primary-soft text-primary'
    : isTa
    ? 'bg-secondary-soft text-secondary'
    : 'bg-base-500/20 text-neutral';

  return (
    <div
      className={`relative shrink-0 rounded-2xl overflow-hidden grid place-items-center select-none ${size} ${className}`}
    >
      {hasImage ? (
        <img
          src={imageUrl}
          alt={cleanName}
          loading="lazy"
          className="w-full h-full object-cover rounded-2xl shadow-xs"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`w-full h-full rounded-2xl grid place-items-center font-black text-xs ${roleFallbackClass}`}
        >
          <span>{initial}</span>
        </div>
      )}
    </div>
  );
}
