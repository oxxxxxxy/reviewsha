import { Button, Card, EmptyState, Input, Loader } from '@reviewsha/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { reviewshaSdk } from '../../api/client';

export function ChatPage() {
  const { id: projectId } = useParams();
  const [active, setActive] = useState<string>();
  const [message, setMessage] = useState('');
  const client = useQueryClient();
  const sessions = useQuery({
    enabled: Boolean(projectId),
    queryKey: ['chat-sessions', projectId],
    queryFn: () => reviewshaSdk.chat.list(projectId!),
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
    queryFn: () => reviewshaSdk.chat.getMessages(sessionId!),
  });
  const send = useMutation({
    mutationFn: () => reviewshaSdk.chat.sendMessage(sessionId!, { message }),
    onSuccess: () => {
      setMessage('');
      void client.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      void client.invalidateQueries({ queryKey: ['chat-sessions', projectId] });
    },
  });
  if (!projectId)
    return (
      <section className="page">
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
          {sessionId ? (
            <form
              className="form"
              onSubmit={(event) => {
                event.preventDefault();
                if (message.trim()) send.mutate();
              }}
            >
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask about this project"
                aria-label="Chat message"
              />
              <Button type="submit" isLoading={send.isPending}>
                Send
              </Button>
              {send.isError ? <p role="alert">AI is unavailable. Try again.</p> : null}
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
