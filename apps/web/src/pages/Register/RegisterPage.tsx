import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@reviewsha/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from '../../stores/auth.store';

const schema = z
  .object({
    displayName: z.string().min(2).max(120),
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
type Values = z.infer<typeof schema>;

export function RegisterPage() {
  const registerUser = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.isLoading);
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const submit = async (values: Values) => {
    try {
      await registerUser(values.email, values.password, values.displayName);
      navigate('/dashboard');
    } catch {
      setApiError('Unable to create account');
    }
  };
  return (
    <div>
      <h1>Create account</h1>
      <form className="form" onSubmit={handleSubmit(submit)}>
        <label className="form-field">
          <span>Name</span>
          <Input {...register('displayName')} />
          {errors.displayName ? (
            <small className="form-error">{errors.displayName.message}</small>
          ) : null}
        </label>
        <label className="form-field">
          <span>Email</span>
          <Input type="email" {...register('email')} />
          {errors.email ? <small className="form-error">{errors.email.message}</small> : null}
        </label>
        <label className="form-field">
          <span>Password</span>
          <Input type="password" {...register('password')} />
        </label>
        <label className="form-field">
          <span>Confirm password</span>
          <Input type="password" {...register('confirmPassword')} />
          {errors.confirmPassword ? (
            <small className="form-error">{errors.confirmPassword.message}</small>
          ) : null}
        </label>
        {apiError ? (
          <div role="alert" className="form-error">
            {apiError}
          </div>
        ) : null}
        <Button type="submit" isLoading={loading}>
          Create account
        </Button>
        <Link to="/login">Sign in</Link>
      </form>
    </div>
  );
}
