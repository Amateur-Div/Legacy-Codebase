import { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: String,
    age: Number,
  },
  { timestamps: true },
);
