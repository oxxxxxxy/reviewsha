import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="not-found-page">
      <h1>404</h1>
      <p>Страница не найдена.</p>
      <Link to="/dashboard">Вернуться на Dashboard</Link>
    </section>
  );
}
