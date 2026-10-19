
import mongoose from "mongoose";

const { Schema } = mongoose;

const cartItemSchema = new Schema(
    {
        service: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },

        addons: [
            {
                type: Schema.Types.ObjectId,
                ref: "ServiceAddon",
            },
        ],

        quantity: {
            type: Number,
            required: true,
            default: 1,
            min: 1,
            max: 100,
        },
    },
    { timestamps: true }
);

const cartSchema = new Schema(
    {
        client: {
            type: Schema.Types.ObjectId,
            ref: "Client",
            required: true,
            unique: true,
            index: true,
        },

        items: {
            type: [cartItemSchema],
            default: [],
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const Cart =
    mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;
