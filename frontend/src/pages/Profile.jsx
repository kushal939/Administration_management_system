import { useState, useEffect, useRef } from 'react';
import Toast from '../components/Toast';
import { clearAvatarCache } from '../components/StudentAvatar';

const printIdCard = (profile) => {
  const avatarHtml = profile.photo_url
    ? `<img src="${profile.photo_url}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:20px auto 0;border:3px solid #fff;display:block;" />`
    : `<div class="avatar">${(profile.display_name || profile.full_name || 'S').charAt(0).toUpperCase()}</div>`;

  const html = `<!DOCTYPE html><html><head><title>Student ID Card</title>
  <style>
    body { font-family: Arial, sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; background:#f1f5f9; }
    .card { width:340px; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.15); }
    .header { background:#1e293b; color:#fff; padding:20px; text-align:center; }
    .header h1 { margin:0; font-size:16px; font-weight:800; }
    .header p { margin:4px 0 0; font-size:11px; color:#94a3b8; }
    .avatar { width:72px; height:72px; border-radius:50%; background:#6366f1; color:#fff; font-size:28px; font-weight:800; display:flex; align-items:center; justify-content:center; margin:20px auto 0; border:3px solid #fff; }
    .body { padding:16px 20px 20px; text-align:center; }
    .name { font-size:18px; font-weight:800; color:#1e293b; margin:8px 0 2px; }
    .role { font-size:11px; color:#6366f1; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
    .divider { border:none; border-top:1px solid #e2e8f0; margin:14px 0; }
    .row { display:flex; justify-content:space-between; margin:6px 0; font-size:12px; }
    .label { color:#94a3b8; }
    .value { color:#1e293b; font-weight:600; }
    .id-badge { background:#f1f5f9; border-radius:8px; padding:8px 16px; margin-top:12px; font-size:13px; font-weight:800; color:#1e293b; letter-spacing:2px; }
    @media print { body { background:#fff; } button { display:none; } }
  </style></head><body>
  <div class="card">
    <div class="header">
      <h1>🎓 EK-Mikha</h1>
      <p>Student Identity Card</p>
    </div>
    ${avatarHtml}
    <div class="body">
      <div class="name">${profile.display_name || profile.full_name || '—'}</div>
      <div class="role">Student</div>
      <hr class="divider"/>
      <div class="row"><span class="label">Department</span><span class="value">${profile.department || '—'}</span></div>
      <div class="row"><span class="label">Batch</span><span class="value">${profile.batch_name || '—'}</span></div>
      <div class="row"><span class="label">Semester</span><span class="value">${profile.current_semester ? 'Sem ' + profile.current_semester : '—'}</span></div>
      <div class="row"><span class="label">Roll No.</span><span class="value">${profile.roll_number || '—'}</span></div>
      <div class="row"><span class="label">Email</span><span class="value" style="font-size:11px">${profile.email || '—'}</span></div>
      ${profile.phone ? `<div class="row"><span class="label">Phone</span><span class="value">${profile.phone}</span></div>` : ''}
      <div class="id-badge">${profile.studentId || '—'}</div>
    </div>
  </div>
  <script>window.onload=()=>window.print();</script>
  </body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
};

const Field = ({ label, value, name, onChange, type = 'text', placeholder = '', readOnly = false }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
    {readOnly
      ? <p className="text-sm font-semibold text-gray-800 py-2">{value || '—'}</p>
      : <input type={type} name={name} value={value || ''} onChange={onChange} placeholder={placeholder}
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
    }
  </div>
);

const Profile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({});
  const [form, setForm] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });
  const photoInputRef = useRef(null);

  const showToast = (msg, type = 'success') => setToast({ show: true, msg, type });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(u);
    if (u) fetchProfile(u.id);
  }, []);

  const fetchProfile = async (userId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/profile?userId=${userId}`);
      const d = await res.json();
      if (d.success) { setProfile(d.data); setForm(d.data); }
    } catch (e) { showToast('Failed to load profile', 'error'); }
    finally { setIsLoading(false); }
  };

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Photo must be under 2MB', 'error'); return; }
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, photo_url: base64 }),
        });
        const d = await res.json();
        if (d.success) {
          setProfile(p => ({ ...p, photo_url: base64 }));
          setForm(p => ({ ...p, photo_url: base64 }));
          clearAvatarCache(profile.studentId); // bust cache so other views update
          showToast('Photo updated');
        } else showToast('Failed to save photo', 'error');
      } catch { showToast('Network error', 'error'); }
      finally { setIsUploadingPhoto(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, ...form }),
      });
      const d = await res.json();
      if (d.success) {
        setProfile({ ...profile, ...form });
        setIsEditing(false);
        showToast('Profile updated');
        // Update localStorage name if changed
        if (form.full_name) {
          const u = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...u, name: form.full_name }));
        }
      } else showToast(d.message || 'Failed', 'error');
    } catch (e) { showToast('Network error', 'error'); }
    finally { setIsSaving(false); }
  };

  const role = user?.role?.toLowerCase() || '';
  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';

  const avatarLetter = (profile.display_name || profile.full_name || profile.email || 'U').charAt(0).toUpperCase();

  if (isLoading) return (
    <div className="flex justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-28 bg-indigo-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            {/* Avatar / Photo upload */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {profile.photo_url
                  ? <img src={profile.photo_url} alt="Profile"
                      className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover" />
                  : <div className="w-24 h-24 rounded-2xl bg-indigo-500 border-4 border-white flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                      {avatarLetter}
                    </div>
                }
              </div>
              {isStudent && (
                <>
                  <button onClick={() => photoInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-all disabled:opacity-60">
                    {isUploadingPhoto
                      ? <><span className="animate-spin">⏳</span> Uploading...</>
                      : <><span>📷</span> {profile.photo_url ? 'Change Photo' : 'Upload Photo'}</>
                    }
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </>
              )}
            </div>

            <div className="flex gap-2 mb-1">
              {isStudent && (
                <button onClick={() => printIdCard(profile)}
                  className="px-4 py-2 text-xs font-semibold border border-indigo-200 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all">
                  🪪 Print ID Card
                </button>
              )}
              {!isEditing
                ? <button onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all">
                    ✏️ Edit Profile
                  </button>
                : <>
                    <button onClick={() => { setIsEditing(false); setForm(profile); }}
                      className="px-4 py-2 text-xs font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving}
                      className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                      {isSaving ? 'Saving...' : '💾 Save'}
                    </button>
                  </>
              }
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile.display_name || profile.full_name || profile.email}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full capitalize">{role}</span>
              {isStudent && profile.department && <span className="text-xs text-gray-400">{profile.department}</span>}
              {isStudent && profile.batch_name && <span className="text-xs text-gray-400">· {profile.batch_name}</span>}
              {isTeacher && profile.specialization && <span className="text-xs text-gray-400">{profile.specialization}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal Info */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Personal Information</p>
          <Field label="Full Name" name="full_name" value={isEditing ? form.full_name : profile.display_name || profile.full_name} onChange={handleChange} placeholder="Enter full name" readOnly={!isEditing} />
          <Field label="Email" name="email" value={profile.email} onChange={() => {}} readOnly />
          <Field label="Phone" name="phone" value={isEditing ? form.phone : profile.phone} onChange={handleChange} placeholder="+977 98XXXXXXXX" readOnly={!isEditing} />
          {isEditing
            ? <Field label="Address" name="address" value={form.address} onChange={handleChange} placeholder="City, District" readOnly={false} />
            : <Field label="Address" name="address" value={profile.address} onChange={handleChange} readOnly />
          }
          {isEditing
            ? <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Bio</label>
                <textarea name="bio" value={form.bio || ''} onChange={handleChange} rows={3} placeholder="Short bio..."
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none" />
              </div>
            : profile.bio && <Field label="Bio" value={profile.bio} readOnly />
          }
        </div>

        {/* Role-specific info */}
        <div className="space-y-5">
          {isStudent && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Academic Details</p>
              <Field label="Student ID" value={profile.studentId} readOnly />
              <Field label="Department" value={profile.department} readOnly />
              <Field label="Batch" value={profile.batch_name} readOnly />
              <Field label="Current Semester" value={profile.current_semester ? `Semester ${profile.current_semester}` : null} readOnly />
              <Field label="Roll Number" value={profile.roll_number} readOnly />
            </div>
          )}

          {isStudent && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Guardian Information</p>
              <Field label="Guardian Name" name="guardian_name" value={isEditing ? form.guardian_name : profile.guardian_name} onChange={handleChange} placeholder="Parent / Guardian name" readOnly={!isEditing} />
              <Field label="Guardian Phone" name="guardian_phone" value={isEditing ? form.guardian_phone : profile.guardian_phone} onChange={handleChange} placeholder="+977 98XXXXXXXX" readOnly={!isEditing} />
            </div>
          )}

          {isTeacher && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Professional Details</p>
              <Field label="Specialization" name="specialization" value={isEditing ? form.specialization : profile.specialization} onChange={handleChange} placeholder="e.g. Computer Science, Mathematics" readOnly={!isEditing} />
              <Field label="Joining Date" name="joining_date" type="date" value={isEditing ? form.joining_date : profile.joining_date} onChange={handleChange} readOnly={!isEditing} />
            </div>
          )}

          {/* Account info */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Role</span>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full capitalize">{role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Member since</span>
              <span className="text-xs font-semibold text-gray-700">
                {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Toast message={toast.msg} type={toast.type} isVisible={toast.show} onClose={() => setToast(p => ({ ...p, show: false }))} />
    </div>
  );
};

export default Profile;
