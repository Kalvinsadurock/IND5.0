import React, { useState } from 'react';
import * as Icons from '@/shared/ui/icons';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useAuth } from '../../lib/AuthContext';


interface LoginScreenProps {
  onLogin: () => void;
}



export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { login } = useAuth();
  const [loginMethod, setLoginMethod] = useState<'faceId' | 'credentials'>('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFaceIdScan = () => {
    setIsScanning(true);
    // Simulate face scanning
    setTimeout(() => {
      setIsScanning(false);
      onLogin();
    }, 2000);
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!employeeId || !password) {
      setError('Please enter both Employee ID and Password');
      setIsLoading(false);
      return;
    }

    try {
      await login(employeeId, password);
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <div className="w-12 h-12 bg-slate-900 rounded-lg"></div>
            </div>
            <h1 className="text-slate-100 mb-1">Indutch Composites Pvt Ltd</h1>
            <p className="text-slate-400">Secure Production Monitor</p>
          </div>

          {/* Login Method Toggle */}
          <div className="flex gap-2 mb-6 bg-slate-700 p-1 rounded-lg">
            <button
              onClick={() => setLoginMethod('credentials')}
              className={`flex-1 py-3 rounded-md transition-all ${
                loginMethod === 'credentials'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icons.LogIn className="inline-block mr-2 h-5 w-5" />
              Credentials
            </button>
            <button
              onClick={() => setLoginMethod('faceId')}
              className={`flex-1 py-3 rounded-md transition-all ${
                loginMethod === 'faceId'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icons.ScanEye className="inline-block mr-2 h-5 w-5" />
              Face ID
            </button>
          </div>

          {/* Face ID Login */}
          {loginMethod === 'faceId' && (
            <div className="text-center py-8">
              <div className={`w-32 h-32 mx-auto mb-6 rounded-full border-4 ${
                isScanning 
                  ? 'border-emerald-500 animate-pulse' 
                  : 'border-slate-600'
              } flex items-center justify-center bg-slate-700`}>
              <Icons.ScanEye className={`h-16 w-16 ${
                  isScanning ? 'text-emerald-500' : 'text-slate-400'
                }`} />
              </div>
              <Button
                onClick={handleFaceIdScan}
                disabled={isScanning}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isScanning ? 'Scanning...' : 'Start Face ID Scan'}
              </Button>
              <p className="text-slate-400 mt-4">
                Position your face within the camera frame
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Credentials Login */}
          {loginMethod === 'credentials' && (
            <form onSubmit={handleCredentialLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="employeeId" className="text-slate-300">
                  Employee ID
                </Label>
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="Enter your employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="h-14 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500"
                  autoComplete="username"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 bg-slate-700 border-slate-600 text-slate-100 placeholder:text-slate-500 pr-12"
                    autoComplete="current-password"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 disabled:opacity-50"
                  >
                  {showPassword ? (
                      <Icons.EyeOff className="h-5 w-5" />
                    ) : (
                      <Icons.Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white mt-6 disabled:opacity-50"
              >
                <Icons.LogIn className="mr-2 h-5 w-5" />
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-slate-500">
            <p className="text-sm">Authorized personnel only</p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default LoginScreen;

