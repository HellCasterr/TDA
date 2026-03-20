import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "./lib/supabase";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const sendMagicLink = async () => {
    if (!supabase) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthMessage("Enter your email address first.");
      return;
    }

    try {
      setSendingLink(true);
      setAuthMessage("");

      const redirectTo = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) throw error;

      setAuthMessage("Magic link sent. Open your email and come back to this app.");
    } catch (error) {
      setAuthMessage(error.message || "Could not send sign-in link.");
    } finally {
      setSendingLink(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const hasEnv = Boolean(supabase);

  return (
    <div className="app-shell">
      <div className="app-container">
        <header className="hero">
          <div>
            <h1>Todo App</h1>
            <p>Supabase-backed task manager with auth, persistence, filtering, and sync.</p>
          </div>

          {session?.user?.email ? (
            <div className="user-pill">
              <Mail size={16} />
              <span>{session.user.email}</span>
            </div>
          ) : null}
        </header>

        {!hasEnv ? (
          <SetupCard />
        ) : authLoading ? (
          <LoadingCard label="Checking your session..." />
        ) : session ? (
          <TodoCard session={session} onSignOut={signOut} />
        ) : (
          <AuthCard
            email={email}
            setEmail={setEmail}
            sendMagicLink={sendMagicLink}
            sendingLink={sendingLink}
            authMessage={authMessage}
          />
        )}
      </div>
    </div>
  );
}

function Card({ title, children, extraClass = "" }) {
  return (
    <section className={`card ${extraClass}`.trim()}>
      {title ? <h2 className="card-title">{title}</h2> : null}
      {children}
    </section>
  );
}

function SetupCard() {
  return (
    <Card title="Supabase setup required">
      <div className="stack">
        <p>Add these environment variables before running or deploying:</p>
        <pre>{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key`}</pre>
        <p>Then create the database table and policies using `supabase/schema.sql`.</p>
      </div>
    </Card>
  );
}

function AuthCard({ email, setEmail, sendMagicLink, sendingLink, authMessage }) {
  return (
    <Card title="Sign in">
      <div className="stack">
        <p>Use an email magic link so each user only sees their own todos.</p>

        <div className="row responsive-row">
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMagicLink();
            }}
          />
 <button className="primary-button" onClick={sendMagicLink} disabled={sendingLink}>
            {sendingLink ? <Loader2 className="spin" size={16} /> : <Mail size={16} />}
            <span>Send Magic Link</span>
          </button>
        </div>

        {authMessage ? <div className="message-box">{authMessage}</div> : null}
      </div>
    </Card>
  );
}

function TodoCard({ session, onSignOut }) {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredTodos = useMemo(() => {
    if (filter === "active") return todos.filter((todo) => !todo.completed);
    if (filter === "completed") return todos.filter((todo) => todo.completed);
    return todos;
  }, [todos, filter]);

  const remaining = todos.filter((todo) => !todo.completed).length;

  const loadTodos = async () => {
    if (!supabase || !session?.user?.id) return;

    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("todos")
        .select("id, text, completed, inserted_at")
        .order("inserted_at", { ascending: false });

      if (error) throw error;
      setTodos(data ?? []);
    } catch (error) {
      setErrorMessage(error.message || "Could not load todos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, [session?.user?.id]);

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!supabase || !text || !session?.user?.id) return;

    try {
      setSaving(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("todos")
        .insert({
          text,
          completed: false,
          user_id: session.user.id,
        })
        .select("id, text, completed, inserted_at")
        .single();

      if (error) throw error;

      setTodos((current) => [data, ...current]);
      setNewTodo("");
    } catch (error) {
      setErrorMessage(error.message || "Could not add todo.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTodo = async (id, completed) => {
    if (!supabase) return;

    const previous = todos;
    const nextCompleted = !completed;

    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: nextCompleted } : todo
      )
    );

    const { error } = await supabase
      .from("todos")
      .update({ completed: nextCompleted })
      .eq("id", id);

    if (error) {
      setTodos(previous);
      setErrorMessage(error.message || "Could not update todo.");
    }
  };

  const deleteTodo = async (id) => {
    if (!supabase) return;

    const previous = todos;
    setTodos((current) => current.filter((todo) => todo.id !== id));

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      setTodos(previous);
      setErrorMessage(error.message || "Could not delete todo.");
    }
  };

  const clearCompleted = async () => {
    if (!supabase) return;

    const completedIds = todos.filter((todo) => todo.completed).map((todo) => todo.id);
    if (completedIds.length === 0) return;

    const previous = todos;
    setTodos((current) => current.filter((todo) => !todo.completed));

    const { error } = await supabase.from("todos").delete().in("id", completedIds);

    if (error) {
      setTodos(previous);
      setErrorMessage(error.message || "Could not clear completed todos.");
    }
  };

  return (
    <Card title="Tasks">
      <div className="stack">
        <div className="toolbar">
          <div className="filter-group">
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "completed", label: "Completed" },
            ].map((option) => (
              <button
                key={option.key}
                className={filter === option.key ? "filter-button active" : "filter-button"}
                onClick={() => setFilter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row responsive-row">
          <input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTodo();
            }}
            placeholder="Add a new task..."
            disabled={saving}
          />

          <button className="primary-button" onClick={addTodo} disabled={saving}>
            {saving ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
            <span>Add Task</span>
          </button>
        </div>

        <div className="meta-row">
          <span>{remaining} remaining</span>
          <div className="action-group">
            <button className="ghost-button" onClick={loadTodos}>
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <button className="ghost-button" onClick={clearCompleted}>
              <span>Clear completed</span>
            </button>
            <button className="ghost-button" onClick={onSignOut}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
        {errorMessage ? <div className="error-box">{errorMessage}</div> : null}

        {loading ? (
          <LoadingCard label="Loading todos..." compact />
        ) : filteredTodos.length === 0 ? (
          <div className="empty-state">No tasks in this view.</div>
        ) : (
           <div className="todo-list">
            <AnimatePresence>
              {filteredTodos.map((todo) => (
                <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="todo-item"
              >  
                <button
                  onClick={() => toggleTodo(todo.id, todo.completed)}
                  className={todo.completed ? "check-button checked" : "check-button"}
                  aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                  {todo.completed ? <Check size={14} /> : null}
                </button>

                <div className="todo-text-wrap">
                  <p className={todo.completed ? "todo-text completed" : "todo-text"}>{todo.text}</p>
                </div>

                <button
                  className="icon-button"
                  onClick={() => deleteTodo(todo.id)}
                  aria-label="Delete task"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function LoadingCard({ label, compact = false }) {
  return (
    <div className={compact ? "loading-card compact" : "loading-card"}>
      <div className="loading-content">
        <Loader2 className="spin" size={18} />
        <span>{label}</span>
      </div>
    </div>
  );
}
