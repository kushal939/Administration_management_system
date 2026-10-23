import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setUser } from '../utils/session';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'Student'
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setUser({
          id: data.id,
          email: data.email,
          role: data.role,
          name: data.name || data.email,
          studentId: data.studentId || null
        });
        sessionStorage.setItem('isAuthenticated', 'true');
        const role = String(data.role || '').toLowerCase();
        const redirectMap = {
          student: '/dashboard/student-dashboard',
          teacher: '/dashboard/attendance',
          admin: '/dashboard/analytics',
          principal: '/dashboard/analytics'
        };
        navigate(redirectMap[role] || '/dashboard');
      } else {
        setErrorMessage(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{background:'linear-gradient(135deg, #010717 0%, #0a1628 100%)'}}>
      {/* Centered Login Card */}
      <div className="w-full flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Logo & Branding */}
          <div className="hidden lg:flex flex-col items-center justify-center space-y-8 relative">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col items-center space-y-8">
              <img src="/logo.png?v=2" alt="EK-Mikha" className="w-80 h-auto object-contain" />
              
              <div className="space-y-6 text-center max-w-md">
                <h2 className="text-3xl font-bold text-white">
                  Welcome to Your Digital Campus
                </h2>
                <p className="text-gray-400 text-lg">
                  Manage students, courses, attendance, and more - all in one unified platform.
                </p>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-cyan-500/20">
                    <div className="text-cyan-400 text-2xl mb-2">📊</div>
                    <p className="text-white text-sm font-semibold">Analytics</p>
                    <p className="text-gray-400 text-xs">Real-time insights</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-green-500/20">
                    <div className="text-green-400 text-2xl mb-2">🔒</div>
                    <p className="text-white text-sm font-semibold">Secure</p>
                    <p className="text-gray-400 text-xs">Enterprise-grade</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-blue-500/20">
                    <div className="text-blue-400 text-2xl mb-2">⚡</div>
                    <p className="text-white text-sm font-semibold">Fast</p>
                    <p className="text-gray-400 text-xs">Instant updates</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
                    <div className="text-purple-400 text-2xl mb-2">🎯</div>
                    <p className="text-white text-sm font-semibold">Efficient</p>
                    <p className="text-gray-400 text-xs">Streamlined workflow</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                {/* Mobile Logo */}
                <div className="lg:hidden flex justify-center mb-6">
                  <img src="/logo.png?v=2" alt="EK-Mikha" className="w-48 h-auto object-contain" />
                </div>
                
                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
                  <p className="text-gray-300">Enter your credentials to access your account</p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl backdrop-blur-sm">
                    <p className="text-sm font-medium">{errorMessage}</p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-200 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl bg-white/10 border backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        errors.email
                          ? 'border-red-400/50 focus:ring-red-400/50'
                          : 'border-white/20 focus:ring-cyan-400/50'
                      }`}
                      placeholder="you@example.com"
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-300">{errors.email}</p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-200 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl bg-white/10 border backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                          errors.password
                            ? 'border-red-400/50 focus:ring-red-400/50'
                            : 'border-white/20 focus:ring-cyan-400/50'
                        }`}
                        placeholder="Enter your password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-300">{errors.password}</p>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label htmlFor="role" className="block text-sm font-semibold text-gray-200 mb-2">
                      Select Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl bg-white/10 border backdrop-blur-sm text-white focus:outline-none focus:ring-2 transition-all ${
                        errors.role
                          ? 'border-red-400/50 focus:ring-red-400/50'
                          : 'border-white/20 focus:ring-cyan-400/50'
                      }`}
                      disabled={isLoading}
                    >
                      <option value="Student" className="bg-gray-800">Student</option>
                      <option value="Teacher" className="bg-gray-800">Teacher</option>
                      <option value="Admin" className="bg-gray-800">Admin</option>
                      <option value="Principal" className="bg-gray-800">Principal</option>
                    </select>
                    {errors.role && (
                      <p className="mt-1 text-sm text-red-300">{errors.role}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl font-semibold text-white transition-all shadow-lg mt-6"
                    style={{
                      background: isLoading ? '#4b5563' : 'linear-gradient(90deg, #00b4d8 0%, #7bc67e 100%)',
                      cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-300">
                    Need help? Contact your administrator
                  </p>
                </div>
              </div>
              
              {/* Copyright */}
              <div className="mt-6 text-center">
                <p className="text-gray-400 text-sm">© 2025 EK-Mikha. All rights reserved.</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Welcome to Your<br />Digital Campus
            </h2>
            <p className="text-gray-400 text-lg">
              Manage students, courses, attendance, and more - all in one place.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">✓</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Easy Management</h3>
                <p className="text-gray-400 text-sm">Streamlined workflows for all administrative tasks</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">✓</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Real-time Updates</h3>
                <p className="text-gray-400 text-sm">Stay informed with instant notifications</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl">✓</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Secure & Reliable</h3>
                <p className="text-gray-400 text-sm">Your data is protected with enterprise-grade security</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-gray-500 text-sm">
            © 2025 EK-Mikha. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
              <p className="text-gray-600">Enter your credentials to access your account</p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm font-medium">{errorMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    errors.email
                      ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                      : 'border-gray-300 focus:ring-gray-400 focus:border-gray-400'
                  }`}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                      errors.password
                        ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                        : 'border-gray-300 focus:ring-gray-400 focus:border-gray-400'
                    }`}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors bg-white ${
                    errors.role
                      ? 'border-red-300 focus:ring-red-400 focus:border-red-400'
                      : 'border-gray-300 focus:ring-gray-400 focus:border-gray-400'
                  }`}
                  disabled={isLoading}
                >
                  <option value="Student">Student</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Admin">Admin</option>
                  <option value="Principal">Principal</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 hover:bg-gray-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need help? Contact your administrator
              </p>
            </div>
          </div>

          {/* Mobile Logo */}
          <div className="lg:hidden mt-8 text-center">
            <div className="flex items-center justify-center mb-3">
              <img src="/logo.png?v=2" alt="EK-Mikha" className="w-48 h-auto object-contain" />
            </div>
            <p className="text-gray-600 text-sm">© 2025 EK-Mikha</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
