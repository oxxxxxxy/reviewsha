import { useParams } from 'react-router-dom';

export function ProjectsPage() {
  const { id } = useParams();

  return (
    <section className="page">
      <h1>Projects</h1>
      <p>{id ? `Project details placeholder: ${id}` : 'Список проектов пользователя.'}</p>
    </section>
  );
}
