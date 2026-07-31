import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="auth-brand">Ревьюша</div>
        <Outlet />
      </section>
    </main>
  );
}
