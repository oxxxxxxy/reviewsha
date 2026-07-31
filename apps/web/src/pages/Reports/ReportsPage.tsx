import { useParams } from 'react-router-dom';

export function ReportsPage() {
  const { id } = useParams();

  return (
    <section className="page">
      <h1>Reports</h1>
      <p>Report placeholder{id ? `: ${id}` : ''}.</p>
    </section>
  );
}
