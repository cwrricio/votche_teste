import { Schema, model } from 'mongoose';

const CounterSchema = new Schema({
  _id: { type: String, required: true }, // Sequence name
  sequence_value: { type: Number, required: true } // Current string value
});

export default model('Counter', CounterSchema);
