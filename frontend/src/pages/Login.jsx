import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setUser } from '../utils/session';

// ── Particle canvas background ────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const particles = Array.from({ length: 55 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height,
      r:    Math.random() * 2 + 1,
      dx:   (Math.random() - 0.5) * 0.5,
      dy:   (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,255,255,${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// ── CSS animations ────────────────────────────────────────────────────────────
const STYLES = `
  @keyframes orb1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%       { transform: translate(-20px, 15px) scale(1.08); }
    66%       { transform: translate(15px, -20px) scale(0.95); }
  }
  @keyframes orb2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50%       { transform: translate(20px, -15px) scale(1.1); }
  }
  @keyframes orb3 {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50%       { transform: translate(-50%, -50%) scale(1.15); }
  }
  @keyframes gradientMove {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pillPop {
    0%   { opacity: 0; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
  }
  .bg-grad-anim {
    background: linear-gradient(135deg, #0f3460, #1a56db, #0891b2, #0e9f6e);
    background-size: 300% 300%;
    animation: gradientMove 10s ease infinite;
  }
  .shimmer-text {
    background: linear-gradient(90deg, #fff 0%, #7dd3fc 40%, #fff 60%, #6ee7b7 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }
  .fade-up-1 { animation: fadeUp 0.7s 0.1s ease both; }
  .fade-up-2 { animation: fadeUp 0.7s 0.25s ease both; }
  .fade-up-3 { animation: fadeUp 0.7s 0.4s ease both; }
  .fade-up-4 { animation: fadeUp 0.7s 0.55s ease both; }
  .fade-in   { animation: fadeIn 1s 0.2s ease both; }
  .pill-1 { animation: pillPop 0.4s 0.6s ease both; opacity: 0; }
  .pill-2 { animation: pillPop 0.4s 0.72s ease both; opacity: 0; }
  .pill-3 { animation: pillPop 0.4s 0.84s ease both; opacity: 0; }
  .pill-4 { animation: pillPop 0.4s 0.96s ease both; opacity: 0; }
  .feat-1 { animation: slideRight 0.5s 0.7s ease both; opacity: 0; }
  .feat-2 { animation: slideRight 0.5s 0.85s ease both; opacity: 0; }
  .feat-3 { animation: slideRight 0.5s 1.0s ease both; opacity: 0; }
  .form-card { animation: fadeUp 0.8s 0.2s ease both; opacity: 0; }
`;

// ── Main component ────────────────────────────────────────────────────────────
const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', role: 'Student' });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (errorMessage) setErrorMessage('');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Please enter a valid email address';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.role) newErrors.role = 'Please select a role';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        setUser({ id: data.id, email: data.email, role: data.role, name: data.name || data.email, studentId: data.studentId || null });
        sessionStorage.setItem('isAuthenticated', 'true');
        const role = String(data.role || '').toLowerCase();
        const redirectMap = { student: '/dashboard/student-dashboard', teacher: '/dashboard/attendance', admin: '/dashboard/analytics', principal: '/dashboard/analytics' };
        navigate(redirectMap[role] || '/dashboard');
      } else {
        setErrorMessage(data.message || 'Login failed. Please try again.');
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pills = ['Student Management', 'Attendance Tracking', 'Performance Analytics', 'AI Predictions'];
  const features = [
    { title: 'Role-Based Access', desc: 'Separate dashboards for Admin, Teacher, Student & Principal' },
    { title: 'AI Performance Prediction', desc: 'Sikhya Suchak predicts student risk levels automatically' },
    { title: 'Complete Academic Lifecycle', desc: 'From enrollment and batches to results and progression' },
  ];

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#EEF2FF' }}>
      <style>{STYLES}</style>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between py-8 px-10 relative overflow-hidden bg-grad-anim">
        <ParticleCanvas />

        {/* Logo — static, clean */}
        <div className="relative z-10 flex flex-col items-center fade-in">
          <div className="w-72 h-48 flex items-end justify-center overflow-hidden">
            <img src="/logo.png?v=3" alt="EK-Mikha"
              className="w-full h-full object-contain object-bottom"
              style={{ filter: 'drop-shadow(0 4px 24px rgba(125,211,252,0.5))' }} />
          </div>
          <p className="shimmer-text text-sm font-bold tracking-widest uppercase mt-3">
            Academic Management System
          </p>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-4">
          <div className="fade-up-2">
            <h2 className="text-3xl font-bold text-white leading-tight mb-2">
              Empowering Education<br />with Smart Technology
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              A unified platform for students, teachers, and administrators to collaborate and grow.
            </p>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap gap-2">
            {pills.map((f, i) => (
              <span key={f} className={`pill-${i + 1} px-3 py-1 bg-white/15 border border-white/25 rounded-full text-white text-xs font-semibold hover:bg-white/25 transition-all duration-200 cursor-default backdrop-blur-sm`}>
                {f}
              </span>
            ))}
          </div>

          {/* Features */}
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={f.title} className={`feat-${i + 1} flex items-start gap-3`}>
                <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div>
                  <p className="text-white text-sm font-semibold">{f.title}</p>
                  <p className="text-blue-100 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 fade-up-4">
          <p className="text-blue-200 text-xs">© 2025 EK-Mikha. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 overflow-y-auto relative"
        style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E0F2FE 50%, #ECFDF5 100%)' }}>

        {/* Soft animated blobs */}
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)', animation: 'orb1 12s ease-in-out infinite' }} />
        <div className="absolute bottom-16 left-8 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07), transparent)', animation: 'orb2 14s ease-in-out infinite' }} />
        <div className="absolute top-1/2 left-1/2 w-40 h-40 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent)', animation: 'orb3 10s ease-in-out infinite' }} />

        <div className="w-full max-w-md relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-6">
            <img src="/logo.png?v=3" alt="EK-Mikha" className="w-28 h-auto object-contain mb-2" />
          </div>

          {/* Form card — glassmorphism */}
          <div className="form-card rounded-2xl p-7 border border-white/80"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-0.5">Sign in to your account to continue</p>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p className="text-sm font-medium">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  placeholder="you@example.com" disabled={isLoading}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`} />
                {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                    placeholder="Enter your password" disabled={isLoading}
                    className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword
                      ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    }
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Role</label>
                <select name="role" value={formData.role} onChange={handleChange} disabled={isLoading}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none bg-gray-50 transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.role ? 'border-red-300' : 'border-gray-200 hover:border-gray-300'}`}>
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Admin">Admin</option>
                  <option value="Principal">Principal</option>
                </select>
                {errors.role && <p className="mt-1.5 text-xs text-red-600">{errors.role}</p>}
              </div>

              <button type="submit" disabled={isLoading}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-white text-sm transition-all mt-1 ${isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0'}`}
                style={{ background: isLoading ? '#93c5fd' : 'linear-gradient(135deg, #1a56db 0%, #0e9f6e 100%)' }}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">Need help? Contact your administrator</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-5">
            {['Secure Login', 'Role-Based Access', 'Data Protected'].map(b => (
              <div key={b} className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {b}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
