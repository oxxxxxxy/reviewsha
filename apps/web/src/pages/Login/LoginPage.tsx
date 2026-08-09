import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input } from '@reviewsha/ui';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';

const loginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.isLoading);
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setApiError('');
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch {
      setApiError('Invalid credentials');
    }
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div>
      <h1>Login</h1>
      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <label className="form-field">
          <span>Email</span>
          <Input type="email" autoComplete="email" {...register('email')} />
          {errors.email ? <small className="form-error">{errors.email.message}</small> : null}
        </label>

        <label className="form-field">
          <span>Password</span>
          <Input type="password" autoComplete="current-password" {...register('password')} />
          {errors.password ? <small className="form-error">{errors.password.message}</small> : null}
        </label>

        {apiError ? (
          <div role="alert" className="form-error">
            {apiError}
          </div>
        ) : null}
        <Button type="submit" isLoading={loading}>
          Sign in
        </Button>
        <Link to="/register">Create account</Link>
      </form>
    </div>
  );
}
