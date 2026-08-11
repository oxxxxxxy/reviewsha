import { Button, Card, EmptyState, Loader, Textarea } from '@reviewsha/ui';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { reviewshaSdk } from '../../api/client';
import { Markdown } from '../../components/Markdown';
import { createUuid } from '../../utils/uuid';

export function ChatPage() {
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();
  const [active, setActive] = useState<string | undefined>(
    searchParams.get('session') ?? undefined,
  );
  const [message, setMessage] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamError, setStreamError] = useState<string>();
  const [retryPrompt, setRetryPrompt] = useState<string>();
  const messagesEnd = useRef<HTMLDivElement>(null);
  const streamAbort = useRef<AbortController | undefined>(undefined);
  const client = useQueryClient();
  const sessions = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['chat-sessions', projectId],
    queryFn: ({ signal }) => reviewshaSdk.chat.list(projectId!, signal),
  });
  const analyses = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['analyses', projectId],
    queryFn: ({ signal }) => reviewshaSdk.analyses.list(projectId!, 1, 20, signal),
  });
  const hasCompletedAnalysis = Boolean(
    analyses.data?.data.some(
      (item) => item.status === 'COMPLETED' || item.pipelineStatus === 'COMPLETED',
    ),
  );
  const create = useMutation({
    mutationFn: () => reviewshaSdk.chat.create(projectId!),
    onSuccess: (session) => {
      setActive(session.id);
      void client.invalidateQueries({ queryKey: ['chat-sessions', projectId] });
    },
  });
  const remove = useMutation({
    mutationFn: (session: string) => reviewshaSdk.chat.remove(session),
    onSuccess: (_, session) => {
      if (active === session) setActive(undefined);
      void client.invalidateQueries({ queryKey: ['chat-sessions', projectId] });
    },
  });
  const sessionId = active ?? sessions.data?.data[0]?.id;
  const messages = useQuery({
    enabled: Boolean(sessionId),
    queryKey: ['chat-messages', sessionId],
    queryFn: ({ signal }) => reviewshaSdk.chat.getMessages(sessionId!, signal),
  });
  const stream = async (requestedMessage = message) => {
    const prompt = requestedMessage.trim();
    if (!hasCompletedAnalysis || !sessionId || !prompt || streaming) return;
    setMessage('');
    setRetryPrompt(prompt);
    setStreamText('');
    setStreamError(undefined);
    setStreaming(true);
    streamAbort.current = new AbortController();
    try {
      await reviewshaSdk.chat.stream(
        sessionId,
        {
          message: prompt,
          idempotencyKey: createUuid(),
          language: localStorage.getItem('reviewsha.language') === 'ru' ? 'ru' : 'en',
        },
        ({ event, data }) => {
          if (event === 'token') {
            setStreamText((current) => current + data.token);
          }
          if (event === 'error') {
            setStreamError(data.message || 'AI is unavailable. Try again.');
          }
        },
        streamAbort.current.signal,
      );
      void client.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      void client.invalidateQueries({ queryKey: ['chat-sessions', projectId] });
      setRetryPrompt(undefined);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setStreamError('AI is unavailable. Try again.');
      }
    } finally {
      setStreaming(false);
      streamAbort.current = undefined;
    }
  };
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.data, streamText]);
  if (!projectId) return <AllChats />;
  if (sessions.isLoading) return <Loader label="Loading chats" />;
  return (
    <section className="page chat-page">
      <div className="chat-page-header">
        <div>
          <Link className="chat-back-link" to={`/projects/${projectId}`}>
            ← Back to project
          </Link>
          <span className="eyebrow">AI workspace</span>
          <h1>Project chat</h1>
          <p className="muted">Ask about your code, architecture, files and review findings.</p>
        </div>
        <span className="chat-context-pill">
          Project context <b>·</b> Latest analysis
        </span>
      </div>
      <div className="chat-layout">
        <aside>
          <div className="chat-sidebar-heading">
            <div>
              <strong>Conversations</strong>
              <small>{sessions.data?.data.length ?? 0} chats</small>
            </div>
            <Button
              className="chat-new-button"
              onClick={() => create.mutate()}
              isLoading={create.isPending}
              disabled={!hasCompletedAnalysis}
              aria-label="Create new chat"
            >
              +
            </Button>
          </div>
          {sessions.data?.data.map((session) => (
            <div key={session.id} className="chat-session-row">
              <button
                className={`chat-session ${sessionId === session.id ? 'is-active' : ''}`}
                onClick={() => setActive(session.id)}
              >
                <span className="chat-session-copy">
                  <strong>{session.title}</strong>
                  <small>{session.messagesCount} messages</small>
                </span>
              </button>
              <Button
                variant="ghost"
                className="chat-delete-button"
                onClick={() => remove.mutate(session.id)}
                aria-label={`Delete ${session.title}`}
              >
                ×
              </Button>
            </div>
          ))}
        </aside>
        <div className="chat-main">
          <div className="chat-main-header">
            <div>
              <span className="eyebrow">AI assistant</span>
              <h2>
                {sessions.data?.data.find((item) => item.id === sessionId)?.title ??
                  'New conversation'}
              </h2>
            </div>
            <span className="chat-online-status">
              <i /> Ready
            </span>
          </div>
          <div className="chat-messages">
            {!analyses.isLoading && !hasCompletedAnalysis ? (
              <Card className="chat-gate" role="status">
                <strong>Chat is unavailable</strong>
                <p className="muted">
                  Complete at least one project analysis before sending messages to the AI.
                </p>
                <Link className="button button-secondary" to={`/projects/${projectId}`}>
                  Open project analysis
                </Link>
              </Card>
            ) : null}
            {messages.isLoading ? (
              <Loader label="Loading messages" />
            ) : messages.data?.data.length ? (
              messages.data.data.map((item) => (
                <Card key={item.id} className={`chat-message chat-${item.role.toLowerCase()}`}>
                  <strong>{item.role}</strong>
                  <Markdown>{item.content}</Markdown>
                </Card>
              ))
            ) : (
              <div className="chat-empty-state">
                <span className="chat-empty-icon">✦</span>
                <h3>Ask anything about your project</h3>
                <p>Get help understanding the latest analysis, files and recommendations.</p>
                <div className="chat-starter-prompts">
                  {[
                    'Summarize the latest review',
                    'What should I fix first?',
                    'Explain the most critical finding',
                  ].map((prompt) => (
                    <button type="button" key={prompt} onClick={() => setMessage(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {streaming || streamText ? (
              <Card className="chat-message chat-assistant">
                <strong>ASSISTANT</strong>
                <Markdown>{streamText || 'AI is typing…'}</Markdown>
              </Card>
            ) : null}
            <div ref={messagesEnd} />
          </div>
          {sessionId && hasCompletedAnalysis ? (
            <form
              className="chat-composer form"
              onSubmit={(event) => {
                event.preventDefault();
                if (message.trim()) void stream(message);
              }}
            >
              <div className="chat-composer-box">
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Message your project…"
                  aria-label="Chat message"
                  rows={2}
                />
                <div className="chat-composer-actions">
                  <small>Enter to send · Shift+Enter for a new line</small>
                  <div>
                    {streaming ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => streamAbort.current?.abort()}
                      >
                        Stop
                      </Button>
                    ) : null}
                    <Button type="submit" isLoading={streaming} disabled={!message.trim()}>
                      {streaming ? 'Thinking…' : 'Send ↑'}
                    </Button>
                  </div>
                </div>
              </div>
              {streamError ? (
                <>
                  <p role="alert">{streamError}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void stream(retryPrompt ?? '')}
                  >
                    Retry
                  </Button>
                </>
              ) : null}
            </form>
          ) : (
            <EmptyState
              title="No conversations"
              description="Create a chat to ask about the latest analysis."
            />
          )}
        </div>
      </div>
    </section>
  );
}

function AllChats() {
  const client = useQueryClient();
  const remove = useMutation({
    mutationFn: (sessionId: string) => reviewshaSdk.chat.remove(sessionId),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['all-chat-projects'] }),
  });
  const projects = useQuery({
    queryKey: ['all-chat-projects'],
    queryFn: ({ signal }) =>
      reviewshaSdk.projects.list({ limit: 100, sort: 'updatedAt', order: 'desc' }, signal),
  });
  const sessions = useQueries({
    queries: (projects.data?.data ?? []).map((project) => ({
      queryKey: ['chat-sessions', project.id],
      queryFn: ({ signal }: { signal: AbortSignal }) => reviewshaSdk.chat.list(project.id, signal),
      enabled: Boolean(project.id),
    })),
  });
  if (projects.isLoading) return <Loader label="Loading chats" />;
  if (projects.isError)
    return (
      <section className="page">
        <h1>All chats</h1>
        <p role="alert">Unable to load chats.</p>
        <Button onClick={() => void projects.refetch()}>Retry</Button>
      </section>
    );
  const rows =
    projects.data?.data.flatMap((project, index) =>
      (sessions[index]?.data?.data ?? []).map((session) => ({ project, session })),
    ) ?? [];
  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Conversations</span>
          <h1>All chats</h1>
          <p className="muted">Continue any project conversation from one place.</p>
        </div>
      </div>
      {rows.length ? (
        <div className="project-list">
          {rows.map(({ project, session }) => (
            <Card key={session.id}>
              <span className="eyebrow">{project.name}</span>
              <h2>{session.title}</h2>
              <p className="muted">
                {session.messagesCount} messages · {new Date(session.updatedAt).toLocaleString()}
              </p>
              <div className="card-actions">
                <Link
                  className="action-button"
                  to={`/projects/${project.id}/chat?session=${session.id}`}
                >
                  Open conversation
                </Link>
                <Button variant="ghost" onClick={() => remove.mutate(session.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No conversations yet"
          description="Open a project and start your first AI conversation."
        />
      )}
    </section>
  );
}
