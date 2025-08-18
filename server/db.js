const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI) // no need for useUnifiedTopology or useNewUrlParser
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const cardSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true }, // client uses Date.now() for demo
    content: { type: String, required: true },
    column: { type: String, required: true },
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
