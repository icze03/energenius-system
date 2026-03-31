
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    return signInWithEmailAndPassword(auth, email, password);
  }

  const handleCreateAccountAndLogin = async () => {
    try {
        await createUserWithEmailAndPassword(auth, 'admin@energenius.app', 'admin123');
        toast({
            title: 'Admin Account Created',
            description: 'Logging you in...',
        });
        // Now sign in with the credentials the user entered
        return signInWithEmailAndPassword(auth, email, password);
    } catch (creationError: any) {
        // If creation fails (e.g. account already exists with different credential), we re-throw
        throw new Error(`Failed to create admin account: ${creationError.message}`);
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await handleLogin();
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      router.push('/dashboard');
    } catch (error: any) {
        if ((error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') && email === 'admin@energenius.app' && password === 'admin123') {
            // User does not exist, let's create it, ONLY if they entered the intended admin credentials
            try {
                await handleCreateAccountAndLogin();
                 toast({
                    title: 'Login Successful',
                    description: 'Welcome to Energenius!',
                });
                router.push('/dashboard');
            } catch (finalError: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Login Failed',
                    description: finalError.message || 'Could not log in after creating account.',
                });
            }
        } else {
            // For any other error, or if credentials don't match the admin ones
            console.error('Login error:', error);
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: 'Please check your credentials and try again.',
            });
        }
    } finally {
        setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="email">Email address</Label>
        <div className="mt-2">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@energenius.app"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <div className="text-sm">
            <a href="#" className="font-semibold text-primary hover:text-primary/90">
              Forgot password?
            </a>
          </div>
        </div>
        <div className="mt-2">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
      </div>

      <div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </div>
    </form>
  );
}
