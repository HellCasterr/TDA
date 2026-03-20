export default function TodoApp() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Todo App</h1>
          <p className="mt-2 text-slate-600">A clean task manager with add, complete, filter, and delete actions.</p>
        </div>

        <TodoCard />
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

function TodoCard() {
  const [todos, setTodos] = useState([
    { id: 1, text: "Draft Q2 roadmap", completed: false },
    { id: 2, text: "Review onboarding funnel", completed: true },
    { id: 3, text: "Schedule design sync", completed: false },
  ]);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredTodos = useMemo(() => {
    if (filter === "active") return todos.filter((todo) => !todo.completed);
    if (filter === "completed") return todos.filter((todo) => todo.completed);
    return todos;
  }, [todos, filter]);

  const remaining = todos.filter((todo) => !todo.completed).length;

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) return;

    setTodos((current) => [
      { id: Date.now(), text, completed: false },
      ...current,
    ]);
    setNewTodo("");
  };

  const toggleTodo = (id) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    setTodos((current) => current.filter((todo) => !todo.completed));
  };

  return (
    <Card className="rounded-3xl border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-xl">Tasks</CardTitle>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "completed", label: "Completed" },
            ].map((option) => (
              <Button
                key={option.key}
                variant={filter === option.key ? "default" : "outline"}
                onClick={() => setFilter(option.key)}
                className="rounded-2xl"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTodo();
            }}
            placeholder="Add a new task..."
            className="h-12 rounded-2xl"
          />
          <Button onClick={addTodo} className="h-12 rounded-2xl px-5">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{remaining} remaining</span>
          <Button variant="ghost" onClick={clearCompleted} className="rounded-2xl text-sm">
            Clear completed
          </Button>
        </div>

        <div className="space-y-3">
          {filteredTodos.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
              No tasks in this view.
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <motion.div
                key={todo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm"
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                    todo.completed ? "bg-slate-900 text-white" : "bg-white"
                  }`}
                  aria-label={todo.completed ? "Mark as incomplete" : "Mark as complete"}
                >
                  {todo.completed ? <Check className="h-4 w-4" /> : null}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm sm:text-base ${
                      todo.completed ? "text-slate-400 line-through" : "text-slate-800"
                    }`}
                  >
                    {todo.text}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTodo(todo.id)}
                  className="rounded-2xl"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
