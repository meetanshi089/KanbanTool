const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    column: {
      type: String,
      required: true,
      enum: ["todo", "inprogress", "done"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Card = mongoose.model("Card", cardSchema);

module.exports = { Card };
