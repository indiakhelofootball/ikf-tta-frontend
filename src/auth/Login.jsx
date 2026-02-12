// src/auth/Login.jsx - WITH FULL VALIDATION ✅
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { validateLoginForm } from '../utils/validation'; // ← Import validation

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ SEPARATE ERROR STATES for better UX
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: ''
  });

  const { login } = useAuth();
  const navigate = useNavigate();

  // ✅ CLEAR FIELD ERROR when user starts typing
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '', general: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '', general: '' }));
    }
  };

  // ✅ MAIN SUBMIT HANDLER with validation
  const handleSubmit = async (e) => {
    // ✅ 1. PREVENT DEFAULT - Stop page refresh
    e.preventDefault();

    // Clear all previous errors
    setErrors({
      email: '',
      password: '',
      general: ''
    });

    // ✅ 2. CLIENT-SIDE VALIDATION - Check before API call
    const validation = validateLoginForm(email, password);
    
    if (!validation.isValid) {
      // Show validation errors
      setErrors(prev => ({
        ...prev,
        ...validation.errors
      }));
      return; // Stop here if validation fails
    }

    // ✅ 3. PROPER ERROR HANDLING - Try/Catch for API
    setIsLoading(true);

    try {
      // Simulate network delay (remove in production if API is fast)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await login(email.trim(), password, rememberMe);
      
      if (result.success) {
        // Success - navigate to dashboard
        navigate('/');
      } else {
        // Login failed - show error message
        setErrors({
          email: '',
          password: '',
          general: result.message || 'Invalid email or password. Please try again.'
        });
        setIsLoading(false);
      }
    } catch (error) {
      // Unexpected error - show friendly message
      console.error('Login error:', error);
      setErrors({
        email: '',
        password: '',
        general: error.message || 'An unexpected error occurred. Please try again.'
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* Left Section - Branding & Animated Illustration */}
      <div className="lg:w-1/2 relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, #ffffff 2px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-16 h-16 bg-yellow-300 rounded-full animate-float opacity-30"></div>
        <div className="absolute bottom-40 left-10 w-24 h-24 bg-amber-400 rounded-full animate-float-delayed opacity-30"></div>
        <div className="absolute top-1/3 left-1/4 w-12 h-12 bg-yellow-200 rounded-full animate-float-slow opacity-30"></div>

        <div className="relative z-10 h-full flex flex-col justify-center px-8 lg:px-16 py-12">

          {/* Logo/Brand */}
          <div className="space-y-3 mb-8">
            <h1 className="text-5xl lg:text-6xl font-black leading-tight tracking-tight text-amber-900">
              India Khelo Football
            </h1>
            
            <p className="text-xl font-semibold text-amber-800">
              Trial Tracking Application
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-900 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-lg font-semibold text-amber-900">Manage REPs across India</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-900 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-lg font-semibold text-amber-900">Track Work Orders & Vendors</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-900 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-lg font-semibold text-amber-900">Trial City Management</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-amber-900 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-lg font-semibold text-amber-900">Payment & Invoice Tracking</p>
            </div>
          </div>

          {/* Animated Illustration */}
          <div className="w-full max-w-lg mx-auto lg:mx-0 mt-4">
            <svg viewBox="0 0 600 400" className="w-full h-auto">
              <defs>
                <linearGradient id="grassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#86efac', stopOpacity: 0.8}} />
                  <stop offset="100%" style={{stopColor: '#22c55e', stopOpacity: 0.9}} />
                </linearGradient>
                
                <filter id="shadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3"/>
                </filter>
              </defs>

              {/* Ground */}
              <ellipse cx="300" cy="370" rx="280" ry="30" fill="url(#grassGradient)" opacity="0.6"/>
              
              {/* Animated Sun */}
              <circle cx="520" cy="60" r="40" fill="#fbbf24" opacity="0.9">
                <animate attributeName="r" values="40;45;40" dur="3s" repeatCount="indefinite"/>
              </circle>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const x1 = 520 + Math.cos(rad) * 50;
                const y1 = 60 + Math.sin(rad) * 50;
                const x2 = 520 + Math.cos(rad) * 65;
                const y2 = 60 + Math.sin(rad) * 65;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#fbbf24"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.8"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.4;0.9;0.4"
                      dur="2s"
                      begin={`${i * 0.2}s`}
                      repeatCount="indefinite"
                    />
                  </line>
                );
              })}

              {/* Kid 1 - Left player */}
              <g filter="url(#shadow)">
                <ellipse cx="120" cy="365" rx="25" ry="6" fill="#000" opacity="0.2"/>
                <ellipse cx="120" cy="260" rx="25" ry="35" fill="#fbbf24"/>
                <circle cx="120" cy="220" r="24" fill="#fef3c7"/>
                <path d="M 105 217 Q 100 205 110 200 Q 120 197 130 200 Q 138 205 133 217" fill="#422006"/>
                <circle cx="114" cy="220" r="2.5" fill="#000"/>
                <circle cx="126" cy="220" r="2.5" fill="#000"/>
                <path d="M 114 228 Q 120 231 126 228" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <line x1="100" y1="250" x2="80" y2="240" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="0 100 250; -25 100 250; 0 100 250"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </line>
                <line x1="140" y1="250" x2="160" y2="265" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="0 140 250; 25 140 250; 0 140 250"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </line>
                <line x1="112" y1="295" x2="105" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round"/>
                <line x1="128" y1="295" x2="135" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="0 128 295; 35 128 295; 0 128 295"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </line>
              </g>

              {/* Kid 2 - Center player */}
              <g filter="url(#shadow)">
                <ellipse cx="300" cy="365" rx="25" ry="6" fill="#000" opacity="0.2">
                  <animate attributeName="opacity" values="0.2;0.05;0.2" dur="1.2s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="300" cy="250" rx="27" ry="38" fill="#f97316"/>
                <circle cx="300" cy="205" r="26" fill="#fef3c7"/>
                <ellipse cx="300" cy="192" rx="28" ry="18" fill="#1c1917"/>
                <circle cx="293" cy="205" r="2.5" fill="#000"/>
                <circle cx="307" cy="205" r="2.5" fill="#000"/>
                <path d="M 293 213 Q 300 217 307 213" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <line x1="275" y1="240" x2="250" y2="220" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="0 275 240; -12 275 240; 0 275 240"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </line>
                <line x1="325" y1="240" x2="350" y2="220" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="0 325 240; 12 325 240; 0 325 240"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </line>
                <line x1="290" y1="288" x2="282" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round"/>
                <line x1="310" y1="288" x2="318" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round"/>
                
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0; 0,-35; 0,0"
                  dur="1.2s"
                  repeatCount="indefinite"
                />
              </g>

              {/* Kid 3 - Right player */}
              <g filter="url(#shadow)">
                <ellipse cx="480" cy="365" rx="25" ry="6" fill="#000" opacity="0.2"/>
                <ellipse cx="480" cy="260" rx="25" ry="35" fill="#fbbf24"/>
                <circle cx="480" cy="220" r="24" fill="#fef3c7"/>
                <path d="M 465 217 Q 460 205 470 200 Q 480 197 490 200 Q 498 205 493 217" fill="#7c2d12"/>
                <circle cx="474" cy="220" r="2.5" fill="#000"/>
                <circle cx="486" cy="220" r="2.5" fill="#000"/>
                <path d="M 473 228 Q 480 231 487 228" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                <line x1="460" y1="250" x2="445" y2="245" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round"/>
                <line x1="500" y1="250" x2="520" y2="210" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="0 500 250; 8 500 250; -8 500 250; 0 500 250"
                    dur="0.6s"
                    repeatCount="indefinite"
                  />
                </line>
                <line x1="472" y1="295" x2="468" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round"/>
                <line x1="488" y1="295" x2="492" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round"/>
              </g>

              {/* Football - Passing between all three players */}
              <g filter="url(#shadow)">
                <circle cx="200" cy="300" r="22" fill="#ffffff" stroke="#000" strokeWidth="2.5"/>
                <path d="M 200 282 L 193 292 L 207 292 Z" fill="#000"/>
                <path d="M 186 300 L 200 307 L 200 292 Z" fill="#000"/>
                <path d="M 214 300 L 200 307 L 200 292 Z" fill="#000"/>
                <path d="M 193 313 L 200 322 L 207 313 Z" fill="#000"/>
                
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0; 80,-20; 180,0; 280,-20; 0,0"
                  dur="6s"
                  repeatCount="indefinite"
                />
              </g>

              {/* Grass Tufts */}
              {[...Array(18)].map((_, i) => (
                <line
                  key={`grass-${i}`}
                  x1={60 + i * 30}
                  y1="378"
                  x2={60 + i * 30}
                  y2="390"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="lg:w-1/2 bg-gray-50 flex items-center justify-center py-12 px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-gray-800">
              Welcome Back
            </h2>
            <p className="text-gray-600 text-lg">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ✅ GENERAL ERROR MESSAGE (Login failed) */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-shake flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <p className="text-sm font-medium">{errors.general}</p>
              </div>
            )}

            {/* ✅ EMAIL FIELD with validation */}
            <div className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Email Address"
                className={`w-full px-5 py-4 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 text-gray-800 placeholder-gray-400 ${
                  errors.email
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50'
                    : 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-200'
                }`}
                disabled={isLoading}
                autoComplete="email"
              />
              {/* ✅ EMAIL ERROR MESSAGE */}
              {errors.email && (
                <p className="text-sm text-red-600 font-medium flex items-center gap-1 animate-shake">
                  <span>⚠️</span>
                  {errors.email}
                </p>
              )}
            </div>

            {/* ✅ PASSWORD FIELD with validation */}
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Password"
                  className={`w-full px-5 py-4 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all duration-300 text-gray-800 placeholder-gray-400 ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50'
                      : 'border-gray-300 focus:border-yellow-500 focus:ring-yellow-200'
                  }`}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* ✅ PASSWORD ERROR MESSAGE */}
              {errors.password && (
                <p className="text-sm text-red-600 font-medium flex items-center gap-1 animate-shake">
                  <span>⚠️</span>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-gray-700 font-medium">
                Remember me for 7 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold text-lg py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(0.9); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-15px) translateX(10px); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 7s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}