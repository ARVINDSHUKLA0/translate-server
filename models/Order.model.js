
import mongoose from "mongoose";

const { Schema } = mongoose;

const orderItemSchema = new Schema({
    service: {
        type: Schema.Types.ObjectId,
        ref: "Service",
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        required: true,
        default: "USD",
    },
    addons: [{
        addonId: {
            type: Schema.Types.ObjectId,
            ref: "ServiceAddon",
        },
        name: String,
        price: {
            type: Number,
            min: 0,
            default: 0,
        },
    }],
}, { _id: false });

const orderSchema = new Schema({
    orderNumber: {
        type: String,
        unique: true,
        index: true,
    },
    client: {
        type: Schema.Types.ObjectId,
        ref: "Client",
        required: true,
        index: true,
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: (items) => Array.isArray(items) && items.length > 0,
            message: "Order must contain at least one item.",
        },
    },
    currency: {
        type: String,
        required: true,
        default: "USD",
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0,
    },
    total: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ["pending", "confirmed", "processing", "completed", "cancelled"],
        default: "pending",
        index: true,
    },
    paymentStatus: {
        type: String,
        enum: ["not_required_yet", "pending", "paid", "failed", "refunded"],
        default: "not_required_yet",
    },
    paymentProvider: {
        type: String,
        default: null,
    },
    paymentReference: {
        type: String,
        default: null,
    },
}, { timestamps: true, versionKey: false });

orderSchema.index({ client: 1, createdAt: -1 });

orderSchema.pre("validate", function () {
    if (!this.orderNumber) {
        this.orderNumber =
            `ORD-${new mongoose.Types.ObjectId().toString().toUpperCase()}`;
    }
});

export default mongoose.models.Order ||
    mongoose.model("Order", orderSchema);
