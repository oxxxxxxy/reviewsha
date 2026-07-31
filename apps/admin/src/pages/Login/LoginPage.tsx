import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { adminLoginSchema, type AdminLoginFormValues } from './login.schema';

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

  function onSubmit(values: AdminLoginFormValues) {
    console.log('Admin login form submitted', values);
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

        <button type="submit" disabled={isSubmitting}>
          Sign in as admin
        </button>
      </form>
    </div>
  );
}
