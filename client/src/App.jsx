import React, { useEffect, useState } from "react";
import io from "socket.io-client";
const socket = io("http://localhost:4000");
export default function App() {
  const [cards, setCards] = useState([]);
  useEffect(() => {
    socket.on("load-cards", (serverCards) => {
      setCards(serverCards);
    });
    socket.on("move-cards", (updatedCards) => {
      setCards((prev) =>
        prev.map((card) => (card.id === updatedCards.id ? updatedCard : card))
      );
    });
    return () => {
      socket.off("load-cards");
      socket.off("move-card");
    };
  }, []);
  function moveCard(id, toColumn) {
    const card = cards.find((c) => c.id === id);
    if (!card) return;

    const updatedCard = { ...card, column: toColumn };
    setCards((prev) => prev.map((c) => (c.id === id ? updatedCard : c)));
    socket.emit("move-card", updatedCard);
  }
  const columns = ["todo", "inprogress", "done"];
  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      {columns.map((col) => (
        <div
          key={col}
          style={{
            border: "1px solid #ccc",
            borderRadius: "8px",
            width: "250px",
            padding: "10px",
            minHeight: "300px",
          }}
        >
          <h3 style={{ textTransform: "capitalize" }}>{col}</h3>

          {cards
            .filter((card) => card.column === col)
            .map((card) => (
              <div>
                {columns
                  .filter((c) => c !== col)
                  .map((targetCol) => (
                    <button
                      key={targetCol}
                      onClick={() => moveCard(card.id, targetCol)}
                      style={{
                        marginRight: "5px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    ></button>
                  ))}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
