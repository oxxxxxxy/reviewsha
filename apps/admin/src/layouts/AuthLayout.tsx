import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">R</span>
          <span>
            <strong>Reviewsha Admin</strong>
            <span>Secure operations workspace</span>
          </span>
        </div>
        <Outlet />
      </section>
    </main>
  );
}
