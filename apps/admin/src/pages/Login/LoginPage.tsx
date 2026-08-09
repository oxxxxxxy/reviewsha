import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

import { adminLoginSchema, type AdminLoginFormValues } from './login.schema';
import { useAdminAuthStore } from '../../stores/auth.store';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const login = useAdminAuthStore((state) => state.login);
  const isLoading = useAdminAuthStore((state) => state.isLoading);
  const navigate = useNavigate();
  const [error, setError] = useState<string>();

  async function onSubmit(values: AdminLoginFormValues) {
    setError(undefined);
    try {
      await login(values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === 'ADMIN_REQUIRED'
          ? "You don't have permission to access the admin panel."
          : 'Invalid credentials',
      );
    }
  }

  return (
    <div>
      <h1>Admin Login</h1>
      <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="form-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email ? <small className="form-error">{errors.email.message}</small> : null}
        </label>

        <label className="form-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {errors.password ? <small className="form-error">{errors.password.message}</small> : null}
        </label>

        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" disabled={isSubmitting || isLoading}>
          Sign in as admin
        </button>
      </form>
    </div>
  );
}
