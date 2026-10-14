import mongoose from "mongoose";

// User sentence schema
const sentenceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  tell: { type: String, required: true },
  show: { type: String, required: true },
  hideedit: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
  },
  toRedo: {
    type: Boolean,
    default: false,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
  GID: { type: String, required: true },
});

// Creating mongoose model
const Sentence = mongoose.model("Sentence", sentenceSchema);

export { Sentence };
