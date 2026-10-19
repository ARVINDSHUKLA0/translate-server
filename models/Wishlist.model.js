
import mongoose from "mongoose";

const { Schema } = mongoose;

const wishlistSchema = new Schema(
    {
        client: {
            type: Schema.Types.ObjectId,
            ref: "Client",
            required: true,
            unique: true,
            index: true,
        },

        services: [
            {
                type: Schema.Types.ObjectId,
                ref: "Service",
            },
        ],
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Prevent duplicate services in the same client's wishlist.
wishlistSchema.path("services").validate(function (services) {
    const ids = services.map((id) => String(id));
    return ids.length === new Set(ids).size;
}, "A service can only appear once in the wishlist.");

const Wishlist =
    mongoose.models.Wishlist ||
    mongoose.model("Wishlist", wishlistSchema);

export default Wishlist;
