import React, { useEffect, useMemo, useState } from "react";
import { login, signup } from "./api";
import { createSocket } from "./socket";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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
      setCards((p) => p.map((c) => (c.id === updated.id ? updated : c)))
    );
    socket.on("update-card", (updated) =>
      setCards((p) => p.map((c) => (c.id === updated.id ? updated : c)))
    );
    socket.on("delete-card", (id) =>
      setCards((p) => p.filter((c) => c.id !== id))
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
    const newCard = { id: Date.now(), content: newTask, column: "todo" };
    setCards((p) => [...p, newCard]);
    socket.emit("create-card", newCard);
    setNewTask("");
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const id = Number(result.draggableId);
    const toCol = result.destination.droppableId;
    const curr = cards.find((c) => c.id === id);
    if (!curr || curr.column === toCol) return;
    const updated = { ...curr, column: toCol };
    setCards((p) => p.map((c) => (c.id === id ? updated : c)));
    socket.emit("move-card", updated);
  }

  if (!token) {
    return (
      <div className="p-4 space-y-4">
        <form onSubmit={handleSignup} className="space-y-2">
          <h2 className="font-bold">Signup</h2>
          <input name="name" placeholder="Name" className="border p-1" />
          <input name="email" placeholder="Email" className="border p-1" />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="border p-1"
          />
          <button className="bg-green-500 text-white px-2 py-1">Signup</button>
        </form>

        <form onSubmit={handleLogin} className="space-y-2">
          <h2 className="font-bold">Login</h2>
          <input name="email" placeholder="Email" className="border p-1" />
          <input
            name="password"
            type="password"
            placeholder="Password"
            className="border p-1"
          />
          <button className="bg-blue-500 text-white px-2 py-1">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-bold">Welcome {user?.name}</h1>
        <button onClick={logout} className="bg-gray-200 px-2 py-1 rounded">
          Logout
        </button>
      </div>

      <div className="flex mb-4 space-x-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task..."
          className="border p-1 flex-1"
        />
        <button
          onClick={addCard}
          className="bg-blue-500 text-white px-2 py-1 rounded"
        >
          Add
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-3 gap-4">
          {columns.map((col) => (
            <Droppable droppableId={col} key={col}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-gray-100 p-2 rounded min-h-[200px]"
                >
                  <h2 className="font-bold capitalize mb-2">{col}</h2>
                  {cards
                    .filter((c) => c.column === col)
                    .map((card, index) => (
                      <Draggable
                        key={card.id}
                        draggableId={String(card.id)}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            ref={provided.innerRef}
                            className="p-2 bg-white rounded shadow mb-2 flex justify-between items-center"
                          >
                            {editingId === card.id ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  socket.emit("update-card", {
                                    ...card,
                                    content: editText,
                                  });
                                  setCards((p) =>
                                    p.map((c) =>
                                      c.id === card.id
                                        ? { ...c, content: editText }
                                        : c
                                    )
                                  );
                                  setEditingId(null);
                                }}
                                className="flex-1"
                              >
                                <input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="w-full border rounded px-1"
                                  autoFocus
                                />
                              </form>
                            ) : (
                              <span
                                className="flex-1 cursor-pointer"
                                onClick={() => {
                                  setEditingId(card.id);
                                  setEditText(card.content);
                                }}
                              >
                                {card.content}
                              </span>
                            )}

                            <button
                              onClick={() => {
                                socket.emit("delete-card", card.id);
                                setCards((p) =>
                                  p.filter((c) => c.id !== card.id)
                                );
                              }}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              ✖
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
