import { Button, Card, EmptyState, Input, Loader } from '@reviewsha/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reviewshaSdk } from '../../api/client';

export function ChatPage() {
  const { id: projectId } = useParams();
  const [active, setActive] = useState<string>();
  const [message, setMessage] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamError, setStreamError] = useState<string>();
  const streamAbort = useRef<AbortController | undefined>(undefined);
  const client = useQueryClient();
  const sessions = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['chat-sessions', projectId],
    queryFn: ({ signal }) => reviewshaSdk.chat.list(projectId!, signal),
  });
  const create = useMutation({
    mutationFn: () => reviewshaSdk.chat.create(projectId!),
    onSuccess: (session) => {
      setActive(session.id);
      void client.invalidateQueries({ queryKey: ['chat-sessions', projectId] });
    },
  });
  const sessionId = active ?? sessions.data?.data[0]?.id;
  const messages = useQuery({
    enabled: Boolean(sessionId),
    queryKey: ['chat-messages', sessionId],
    queryFn: ({ signal }) => reviewshaSdk.chat.getMessages(sessionId!, signal),
  });
  const stream = async () => {
    if (!sessionId || !message.trim() || streaming) return;
    const prompt = message.trim();
    setMessage('');
    setStreamText('');
    setStreamError(undefined);
    setStreaming(true);
    streamAbort.current = new AbortController();
    try {
      await reviewshaSdk.chat.stream(
        sessionId,
        { message: prompt, idempotencyKey: globalThis.crypto.randomUUID() },
        ({ event, data }) => {
          if (event === 'token') {
            const token =
              typeof data === 'object' && data !== null && 'token' in data
                ? String(data.token)
                : String(data);
            setStreamText((current) => current + token);
          }
          if (event === 'error') {
            setStreamError(
              typeof data === 'object' && data !== null && 'message' in data
                ? String(data.message)
                : 'AI is unavailable. Try again.',
            );
          }
        },
        streamAbort.current.signal,
      );
      void client.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      void client.invalidateQueries({ queryKey: ['chat-sessions', projectId] });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setStreamError('AI is unavailable. Try again.');
      }
    } finally {
      setStreaming(false);
      streamAbort.current = undefined;
    }
  };
  if (!projectId)
    return (
      <section className="page">
        <h1>Chat</h1>
        <EmptyState title="Choose a project" description="Open chat from a project page." />
      </section>
    );
  if (sessions.isLoading) return <Loader label="Loading chats" />;
  return (
    <section className="page">
      <h1>Project Chat</h1>
      <div className="chat-layout">
        <aside>
          <Button onClick={() => create.mutate()} isLoading={create.isPending}>
            New Chat
          </Button>
          {sessions.data?.data.map((session) => (
            <button key={session.id} className="chat-session" onClick={() => setActive(session.id)}>
              {session.title}
            </button>
          ))}
        </aside>
        <div className="chat-main">
          {messages.isLoading ? (
            <Loader label="Loading messages" />
          ) : (
            messages.data?.data.map((item) => (
              <Card key={item.id}>
                <strong>{item.role}</strong>
                <p>{item.content}</p>
              </Card>
            ))
          )}
          {streaming || streamText ? (
            <Card>
              <strong>ASSISTANT</strong>
              <p>{streamText || 'AI is typing…'}</p>
            </Card>
          ) : null}
          {sessionId ? (
            <form
              className="form"
              onSubmit={(event) => {
                event.preventDefault();
                if (message.trim()) void stream();
              }}
            >
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask about this project"
                aria-label="Chat message"
              />
              <Button type="submit" isLoading={streaming}>
                {streaming ? 'AI is typing…' : 'Send'}
              </Button>
              {streaming ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => streamAbort.current?.abort()}
                >
                  Cancel
                </Button>
              ) : null}
              {streamError ? <p role="alert">{streamError}</p> : null}
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
