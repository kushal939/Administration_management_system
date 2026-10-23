import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Student',
    studentId: '',
    course: '',
    year: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [availableCourses, setAvailableCourses] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (message) setMessage('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 chars';
    else if (!/[0-9]/.test(formData.password) || !/[A-Za-z]/.test(formData.password)) newErrors.password = 'Password must include letters and numbers';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.role) newErrors.role = 'Select a role';
    if (formData.role === 'Student' && !formData.studentId.trim()) newErrors.studentId = 'Student ID is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const passwordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 0-4
  };

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(d => { if (d && d.success) setAvailableCourses(d.data || []); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setMessage('');

    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      studentId: formData.studentId,
      course: formData.course,
      year: formData.year
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Registration successful. Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setMessage(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Register error', err);
      setMessage('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-teal-600 to-cyan-800 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-green-600 to-teal-600">
            <h1 className="text-3xl font-bold text-white text-center">Create an account</h1>
            <p className="text-green-100 text-center mt-2">Register as Student, Teacher or Admin</p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
            {message && (
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-3 rounded">
                <p className="font-medium">{message}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input name="name" value={formData.name} onChange={handleChange} className={`w-full px-4 py-3 rounded-lg border-2 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className={`w-full px-4 py-3 rounded-lg border-2 ${errors.email ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <input name="password" type="password" value={formData.password} onChange={handleChange} className={`w-full px-4 py-3 rounded-lg border-2 ${errors.password ? 'border-red-500' : 'border-gray-300'}`} />
                <div className="mt-2 h-2 w-full bg-gray-200 rounded overflow-hidden">
                  <div
                    style={{ width: `${(passwordStrength(formData.password) / 4) * 100}%` }}
                    className={`h-2 rounded ${passwordStrength(formData.password) < 2 ? 'bg-red-400' : passwordStrength(formData.password) < 3 ? 'bg-yellow-400' : 'bg-green-500'}`}
                  />
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className={`w-full px-4 py-3 rounded-lg border-2 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`} />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border-2 bg-white">
                <option>Student</option>
                <option>Teacher</option>
                <option>Admin</option>
              </select>
            </div>

            {formData.role === 'Student' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student ID</label>
                  <input name="studentId" value={formData.studentId} onChange={handleChange} className={`w-full px-4 py-3 rounded-lg border-2 ${errors.studentId ? 'border-red-500' : 'border-gray-300'}`} />
                  {errors.studentId && <p className="mt-1 text-sm text-red-600">{errors.studentId}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Course</label>
                      <select name="course" value={formData.course} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 bg-white">
                        <option value="">Select a course</option>
                        {availableCourses.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                    <input name="year" value={formData.year} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border-2 border-gray-300" />
                  </div>
                </div>
              </>
            )}

            <button type="submit" disabled={isLoading} className={`w-full py-3 px-4 rounded-lg font-semibold text-white ${isLoading ? 'bg-gray-400' : 'bg-gradient-to-r from-green-600 to-teal-600 hover:shadow-lg'}`}>
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">Already have an account? <button onClick={() => navigate('/login')} className="text-blue-600 underline">Sign in</button></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
