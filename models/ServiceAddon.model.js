import mongoose from "mongoose";

const { Schema } = mongoose;

const serviceAddonSchema = new Schema(
    {
        // Example: express, certified
        key: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 100,
        },

        // Example: Express, Certified
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
        },

        // Fixed extra charge in USD
        // Example: Express = 30, Certified = 50
        price: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export default mongoose.model("ServiceAddon", serviceAddonSchema);