import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { BugIcon, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', data);
      setUser(response.data);
      
      const role = response.data.role;
      if (role === 'Admin') navigate('/admin');
      else if (role === 'Tester') navigate('/tester');
      else navigate('/developer');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-primary/5 via-gray-50 to-primary/10">
      <div className="w-full flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-8 lg:p-16 text-white flex-col justify-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
              <BugIcon className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold">BugTracker</h1>
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Welcome back!
          </h2>
          <p className="text-white/90 text-xl leading-relaxed">
            Streamline your bug tracking process and keep your projects on track with our powerful bug management system.
          </p>
          
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-5xl font-bold">1000+</p>
                <p className="text-base text-white/80 mt-2">Bugs Fixed</p>
              </div>
              <div>
                <p className="text-5xl font-bold">100+</p>
                <p className="text-base text-white/80 mt-2">Projects</p>
              </div>
              <div>
                <p className="text-5xl font-bold">50+</p>
                <p className="text-base text-white/80 mt-2">Team Members</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-16 flex items-center justify-center">
          <div className="w-full max-w-lg">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-6 lg:hidden">
                <div className="bg-primary/20 p-3 rounded-xl">
                  <BugIcon className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">BugTracker</h1>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                Sign in to your account
              </h3>
              <p className="text-gray-500 text-lg">
                Enter your credentials to access your dashboard
              </p>
            </div>

            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl flex items-center gap-3">
                  <svg className="h-6 w-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-3">
                <label htmlFor="email" className="text-base font-semibold text-gray-800">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-6 w-6 text-gray-400" />
                  </div>
                  <input
                    {...register('email')}
                    id="email"
                    type="email"
                    autoComplete="email"
                    className={`w-full pl-12 pr-5 py-4 border-2 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all ${
                      errors.email 
                        ? 'border-red-300 focus:ring-red-200 focus:border-red-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-base font-semibold text-gray-800">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-6 w-6 text-gray-400" />
                  </div>
                  <input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`w-full pl-12 pr-14 py-4 border-2 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all ${
                      errors.password 
                        ? 'border-red-300 focus:ring-red-200 focus:border-red-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 border-2 border-transparent rounded-2xl text-base font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-offset-4 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl shadow-primary/30 hover:shadow-3xl hover:shadow-primary/40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-6 w-6" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-sm text-gray-400">
                © 2024 BugTracker. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
