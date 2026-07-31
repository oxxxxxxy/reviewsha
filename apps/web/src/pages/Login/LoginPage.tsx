import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
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

  function onSubmit(values: LoginFormValues) {
    console.log('Login form submitted', values);
  }

  return (
    <div>
      <h1>Login</h1>
      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <label className="form-field">
          <span>Email</span>
          <input type="email" autoComplete="email" {...register('email')} />
          {errors.email ? <small className="form-error">{errors.email.message}</small> : null}
        </label>

        <label className="form-field">
          <span>Password</span>
          <input type="password" autoComplete="current-password" {...register('password')} />
          {errors.password ? <small className="form-error">{errors.password.message}</small> : null}
        </label>

        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}
