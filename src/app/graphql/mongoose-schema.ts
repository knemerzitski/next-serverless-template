import { randomUUID } from 'crypto';

import mongoose, { Schema } from 'mongoose';

export const Item =
  mongoose.models.Item ||
  mongoose.model(
    'Item',
    new Schema({
      _id: {
        type: Schema.Types.UUID,
        default: () => randomUUID(),
      },
      name: String,
      done: Boolean,
    })
  );
