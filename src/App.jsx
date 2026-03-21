import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Loader2,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import { supabase } from "./lib/supabase";

const motionDefaults = {
  transition: {
    type: "spring",
    stiffness: 520,
    damping: 38,
    mass: 0.9,
  },
};

function parseLocalDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(dateString) {
  if (!dateString) return "No date";
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

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
      setAuthMessage(error?.message || "Could not send sign-in link.");
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
    <MotionConfig transition={motionDefaults.transition}>
      <div className="bg-orb orb-left" />
      <div className="bg-orb orb-right" />
      <div className="bg-grid" />

      <div className="app-shell">
        <div className="app-container">
          <motion.header
            className="hero"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="hero-copy">
              <div className="eyebrow">Realtime planner</div>
              <h1>Plan tasks by priority and date.</h1>
              <p>
                A polished Supabase-backed task app with auth, realtime sync, due dates,
                calendar strip, and focused daily planning.
              </p>
            </div>

            {session?.user?.email ? (
              <div className="user-pill" title={session.user.email}>
                <Mail size={16} />
                <span>{session.user.email}</span>
              </div>
            ) : null}
          </motion.header>

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
    </MotionConfig>
  );
}

function Card({ title, subtitle, children, extraClass = "" }) {
  return (
    <section className={`card ${extraClass}`.trim()}>
      {(title || subtitle) && (
        <div className="card-head">
          {title ? <h2 className="card-title">{title}</h2> : null}
          {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
        </div>
      )}
      {children}
    </section>
  );
}

function SetupCard() {
  return (
    <Card
      title="Supabase setup required"
      subtitle="Add your env variables before running or deploying."
    >
      <div className="stack">
        <pre>{`VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key`}</pre>
        <p className="helper-text">
          Then run the database migration shown below in <code>supabase/schema.sql</code>.
        </p>
      </div>
    </Card>
  );
}

function AuthCard({ email, setEmail, sendMagicLink, sendingLink, authMessage }) {
  const reduceMotion = useReducedMotion();

  return (
    <Card
      title="Sign in"
      subtitle="Use a magic link so each user only sees their own tasks."
      extraClass="auth-card"
    >
      <div className="stack">
        <div className="row responsive-row">
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMagicLink();
            }}
            aria-label="Email address"
          />

          <motion.button
            className="primary-button"
            onClick={sendMagicLink}
            disabled={sendingLink}
            whileHover={reduceMotion ? undefined : { scale: 1.01 }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
          >
            {sendingLink ? <Loader2 className="spin" size={16} /> : <Mail size={16} />}
            <span>Send Magic Link</span>
          </motion.button>
        </div>

        {authMessage ? <div className="message-box">{authMessage}</div> : null}
      </div>
    </Card>
  );
}

function TodoCard({ session, onSignOut }) {
  const reduceMotion = useReducedMotion();

  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [viewFilter, setViewFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const today = startOfDay(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const stats = useMemo(() => {
    const completed = todos.filter((todo) => todo.completed).length;
    const remaining = todos.length - completed;
    const scheduled = todos.filter((todo) => Boolean(todo.due_on)).length;

    return { total: todos.length, completed, remaining, scheduled };
  }, [todos]);

  const filteredTodos = useMemo(() => {
    let next = [...todos];

    if (viewFilter === "active") next = next.filter((todo) => !todo.completed);
    if (viewFilter === "completed") next = next.filter((todo) => todo.completed);

    if (dateFilter !== "all") {
      next = next.filter((todo) => {
        const dueDate = parseLocalDate(todo.due_on);
        if (!dueDate) return false;

        if (dateFilter === "today") return isSameDay(dueDate, today);
        if (dateFilter === "upcoming") return dueDate > today;
        if (dateFilter === "overdue") return dueDate < today && !todo.completed;
        return true;
      });
    }

    if (selectedDate) {
      const pickedDate = parseLocalDate(selectedDate);
      next = next.filter((todo) => {
        const dueDate = parseLocalDate(todo.due_on);
        return dueDate ? isSameDay(dueDate, pickedDate) : false;
      });
    }

    return next.sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      if (a.due_on && b.due_on) return a.due_on.localeCompare(b.due_on);
      if (a.due_on) return -1;
      if (b.due_on) return 1;
      return new Date(b.inserted_at).getTime() - new Date(a.inserted_at).getTime();
    });
  }, [todos, viewFilter, dateFilter, selectedDate, today]);

  const loadTodos = async () => {
    if (!supabase || !session?.user?.id) return;

    try {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("todos")
        .select("id, text, completed, due_on, inserted_at, updated_at")
        .eq("user_id", session.user.id)
        .order("inserted_at", { ascending: false });

      if (error) throw error;
      setTodos(data ?? []);
    } catch (error) {
      setErrorMessage(error?.message || "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user?.id) return;

    const channel = supabase
      .channel(`todos:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "todos",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          setTodos((current) => {
            if (payload.eventType === "INSERT") {
              const exists = current.some((todo) => todo.id === payload.new.id);
              return exists ? current : [payload.new, ...current];
            }

            if (payload.eventType === "UPDATE") {
              return current.map((todo) =>
                todo.id === payload.new.id ? payload.new : todo
              );
            }

            if (payload.eventType === "DELETE") {
              return current.filter((todo) => todo.id !== payload.old.id);
            }

            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          due_on: dueOn || null,
          user_id: session.user.id,
        })
        .select("id, text, completed, due_on, inserted_at, updated_at")
        .single();

      if (error) throw error;

      setTodos((current) => {
        const exists = current.some((todo) => todo.id === data.id);
        return exists ? current : [data, ...current];
      });
      setNewTodo("");
      setDueOn("");
    } catch (error) {
      setErrorMessage(error?.message || "Could not add task.");
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
      setErrorMessage(error?.message || "Could not update task.");
    }
  };

  const deleteTodo = async (id) => {
    if (!supabase) return;

    const previous = todos;
    setTodos((current) => current.filter((todo) => todo.id !== id));

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      setTodos(previous);
      setErrorMessage(error?.message || "Could not delete task.");
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
      setErrorMessage(error?.message || "Could not clear completed tasks.");
    }
  };

  return (
    <div className="stack page-stack">
      <div className="stats-grid">
        <StatCard label="Total tasks" value={stats.total} />
        <StatCard label="Remaining" value={stats.remaining} />
        <StatCard label="Scheduled" value={stats.scheduled} />
        <StatCard label="Completed" value={stats.completed} />
      </div>

      <Card
        title="Planner"
        subtitle="Filter by status, browse the next 7 days, and schedule tasks."
      >
        <div className="stack">
          <div className="toolbar">
            <div className="filter-group">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "completed", label: "Completed" },
              ].map((option) => (
                <motion.button
                  key={option.key}
                  className={
                    viewFilter === option.key ? "filter-button active" : "filter-button"
                  }
                  onClick={() => setViewFilter(option.key)}
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>

            <div className="filter-group">
              {[
                { key: "all", label: "All dates" },
                { key: "today", label: "Today" },
                { key: "upcoming", label: "Upcoming" },
                { key: "overdue", label: "Overdue" },
              ].map((option) => (
                <motion.button
                  key={option.key}
                  className={
                    dateFilter === option.key ? "filter-button active" : "filter-button"
                  }
                  onClick={() => {
                    setDateFilter(option.key);
                    setSelectedDate("");
                  }}
                  whileHover={reduceMotion ? undefined : { y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="calendar-strip">
            <button
              className={!selectedDate ? "date-chip active" : "date-chip"}
              onClick={() => setSelectedDate("")}
            >
              <CalendarDays size={15} />
              <span>Any day</span>
            </button>

            {weekDays.map((date) => {
              const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
                2,
                "0"
              )}-${String(date.getDate()).padStart(2, "0")}`;

              return (
                <button
                  key={value}
                  className={selectedDate === value ? "date-chip active" : "date-chip"}
                  onClick={() => {
                    setSelectedDate(value);
                    setDateFilter("all");
                  }}
                >
                  <span className="date-chip-day">
                    {date.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span className="date-chip-date">
                    {date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="composer-grid">
            <input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTodo();
              }}
              placeholder="What needs to get done?"
              disabled={saving}
              aria-label="New task"
            />

            <input
              type="date"
              value={dueOn}
              onChange={(e) => setDueOn(e.target.value)}
              disabled={saving}
              aria-label="Due date"
            />

            <motion.button
              className="primary-button"
              onClick={addTodo}
              disabled={saving}
              whileHover={reduceMotion ? undefined : { scale: 1.01 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            >
              {saving ? <Loader2 className="spin" size={16} /> : <Plus size={16} />}
              <span>Add Task</span>
            </motion.button>
          </div>

          <div className="meta-row">
            <span>
              Showing <strong>{filteredTodos.length}</strong> task
              {filteredTodos.length === 1 ? "" : "s"}
            </span>

            <div className="action-group">
              <motion.button
                className="ghost-button"
                onClick={loadTodos}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </motion.button>

              <motion.button
                className="ghost-button"
                onClick={clearCompleted}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              >
                <span>Clear completed</span>
              </motion.button>

              <motion.button
                className="ghost-button"
                onClick={onSignOut}
                whileHover={reduceMotion ? undefined : { y: -1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </motion.button>
            </div>
          </div>

          {errorMessage ? (
            <div className="error-box" role="alert" aria-live="polite">
              {errorMessage}
            </div>
          ) : null}

          {loading ? (
            <LoadingCard label="Loading tasks..." compact />
          ) : filteredTodos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">Nothing here yet.</div>
              <div className="empty-copy">
                Add a task, assign a date, or change the filters.
              </div>
            </div>
          ) : (
            <div className="todo-list" role="list">
              <AnimatePresence mode="popLayout">
                {filteredTodos.map((todo) => (
                  <motion.div
                    key={todo.id}
                    className="todo-item"
                    role="listitem"
                    layout
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
                  >
                    <motion.button
                      onClick={() => toggleTodo(todo.id, todo.completed)}
                      className={todo.completed ? "check-button checked" : "check-button"}
                      aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
                      whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    >
                      {todo.completed ? <Check size={14} /> : null}
                    </motion.button>

                    <div className="todo-text-wrap">
                      <p className={todo.completed ? "todo-text completed" : "todo-text"}>
                        {todo.text}
                      </p>
                      <div className="todo-meta">
                        <span className={todo.due_on ? "due-pill" : "due-pill muted"}>
                          <CalendarDays size={13} />
                          {formatDateLabel(todo.due_on)}
                        </span>
                      </div>
                    </div>

                    <motion.button
                      className="icon-button"
                      onClick={() => deleteTodo(todo.id)}
                      aria-label="Delete task"
                      whileHover={reduceMotion ? undefined : { scale: 1.03 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </motion.div>
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
