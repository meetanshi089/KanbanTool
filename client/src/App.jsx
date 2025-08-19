import React, { useEffect, useMemo, useState } from "react";
import { login, signup } from "./api";
import { createSocket } from "./socket";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const columns = ["todo", "inprogress", "done"];

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [cards, setCards] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const socket = useMemo(() => (token ? createSocket(token) : null), [token]);

  // auth handlers
  async function handleSignup(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { token, user } = await signup(
      form.get("name"),
      form.get("email"),
      form.get("password")
    );
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { token, user } = await login(
      form.get("email"),
      form.get("password")
    );
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setCards([]);
    if (socket) socket.disconnect();
  }

  // socket lifecycle
  useEffect(() => {
    if (!socket) return;

    socket.on("load-cards", (serverCards) => setCards(serverCards));
    socket.on("create-card", (newCard) => setCards((p) => [...p, newCard]));
    socket.on("move-card", (updated) =>
      setCards((p) => p.map((c) => (c._id === updated._id ? updated : c)))
    );
    socket.on("update-card", (updated) =>
      setCards((p) => p.map((c) => (c._id === updated._id ? updated : c)))
    );
    socket.on("delete-card", (id) =>
      setCards((p) => p.filter((c) => c._id !== _id))
    );

    return () => {
      socket.off("load-cards");
      socket.off("create-card");
      socket.off("move-card");
      socket.off("update-card");
      socket.off("delete-card");
      socket.disconnect();
    };
  }, [socket]);

  // board actions
  function addCard() {
    if (!newTask.trim()) return;
    const newCard = { _id: Date.now(), content: newTask, column: "todo" };
    setCards((p) => [...p, newCard]);
    socket.emit("create-card", newCard);
    setNewTask("");
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const id = Number(result.draggableId);
    const toCol = result.destination.droppableId;
    const curr = cards.find((c) => c._id === _id);
    if (!curr || curr.column === toCol) return;
    const updated = { ...curr, column: toCol };
    setCards((p) => p.map((c) => (c._id === _id ? updated : c)));
    socket.emit("move-card", updated);
  }

  // auth screen
  if (!token) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-6">
        <Card>
          <CardContent className="space-y-2 p-4">
            <h2 className="font-bold">Signup</h2>
            <form onSubmit={handleSignup} className="space-y-2">
              <Input name="name" placeholder="Name" />
              <Input name="email" placeholder="Email" />
              <Input name="password" type="password" placeholder="Password" />
              <Button type="submit" className="w-full">
                Signup
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <h2 className="font-bold">Login</h2>
            <form onSubmit={handleLogin} className="space-y-2">
              <Input name="email" placeholder="Email" />
              <Input name="password" type="password" placeholder="Password" />
              <Button type="submit" variant="secondary" className="w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // board screen
  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Welcome {user?.name}</h1>
        <Button variant="outline" onClick={logout}>
          Logout
        </Button>
      </div>

      <div className="flex mb-6 space-x-2">
        <Input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task..."
        />
        <Button onClick={addCard}>Add</Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-3 gap-4">
          {columns.map((col) => (
            <Droppable droppableId={col} key={col}>
              {(provided) => (
                <Card
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-gray-50"
                >
                  <CardContent className="p-3 min-h-[200px]">
                    <h2 className="font-bold capitalize mb-3">{col}</h2>
                    {cards
                      .filter((c) => c.column === col)
                      .map((card, index) => (
                        <Draggable
                          key={card._id}
                          draggableId={String(card._id)}
                          index={index}
                        >
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="mb-2 shadow-sm"
                            >
                              <CardContent className="p-2 flex justify-between items-center">
                                {editingId === card._id ? (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      socket.emit("update-card", {
                                        ...card,
                                        content: editText,
                                      });
                                      setCards((p) =>
                                        p.map((c) =>
                                          c.id === card._id
                                            ? { ...c, content: editText }
                                            : c
                                        )
                                      );
                                      setEditingId(null);
                                    }}
                                    className="flex-1"
                                  >
                                    <Input
                                      value={editText}
                                      onChange={(e) =>
                                        setEditText(e.target.value)
                                      }
                                      autoFocus
                                    />
                                  </form>
                                ) : (
                                  <span
                                    className="flex-1 cursor-pointer"
                                    onClick={() => {
                                      setEditingId(card._id);
                                      setEditText(card.content);
                                    }}
                                  >
                                    {card.content}
                                  </span>
                                )}
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    socket.emit("delete-card", card._id);
                                    setCards((p) =>
                                      p.filter((c) => c._id !== card._id)
                                    );
                                  }}
                                >
                                  ✖
                                </Button>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </CardContent>
                </Card>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
