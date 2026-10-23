import { useState, useEffect } from 'react';

// Only cache positive results (actual photos). Never cache null/miss,
// so that after a student uploads a photo it shows up on next render.
const photoCache = {};

export const clearAvatarCache = (studentId) => {
  if (studentId) delete photoCache[studentId];
  else Object.keys(photoCache).forEach(k => delete photoCache[k]);
};

const StudentAvatar = ({ studentId, name, size = 8, className = '' }) => {
  const [photo, setPhoto] = useState(photoCache[studentId] || null);

  useEffect(() => {
    if (!studentId) return;
    // If we already have a cached photo URL, use it
    if (photoCache[studentId]) {
      setPhoto(photoCache[studentId]);
      return;
    }
    // Otherwise always fetch (don't cache misses)
    fetch(`/api/profile/by-student-id/${studentId}`)
      .then(r => r.json())
      .then(d => {
        const url = d.success ? (d.data?.photo_url || null) : null;
        if (url) photoCache[studentId] = url; // only cache hits
        setPhoto(url);
      })
      .catch(() => setPhoto(null));
  }, [studentId]);

  const letter = (name || '?').charAt(0).toUpperCase();
  const sizeClass = `w-${size} h-${size}`;

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0 ${className}`}>
      {letter}
    </div>
  );
};

export default StudentAvatar;
