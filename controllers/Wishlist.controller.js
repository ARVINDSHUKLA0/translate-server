
// import mongoose from "mongoose";
// import Wishlist from "../models/Wishlist.model.js";
// import Service from "../models/Service.model.js";

// const isValidId = (id) => mongoose.isValidObjectId(id);

// const getClientId = (req) => {
//     return req.client?._id || req.client?.id;
// };

// // GET /api/wishlist
// export const getWishlist = async (req, res) => {
//     try {
//         const clientId = getClientId(req);

//         if (!clientId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Please log in to view your wishlist.",
//             });
//         }

//         let wishlist = await Wishlist.findOne({ client: clientId })
//             .populate({
//                 path: "services",
//                 select: "title name slug thumbnail startingPrice startingPriceCurrency status",
//             });

//         if (!wishlist) {
//             wishlist = await Wishlist.create({
//                 client: clientId,
//                 services: [],
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Wishlist fetched successfully.",
//             wishlist,
//         });
//     } catch (error) {
//         console.error("getWishlist error:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to fetch wishlist.",
//         });
//     }
// };

// // POST /api/wishlist/:serviceId
// export const addWishlistItem = async (req, res) => {
//     try {
//         const clientId = getClientId(req);
//         const { serviceId } = req.params;

//         if (!clientId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Please log in to add a service to your wishlist.",
//             });
//         }

//         if (!isValidId(serviceId)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid service ID.",
//             });
//         }

//         const service = await Service.findById(serviceId);

//         if (!service) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Service not found.",
//             });
//         }

//         if (service.status !== "active") {
//             return res.status(400).json({
//                 success: false,
//                 message: "This service is not currently available.",
//             });
//         }

//         const wishlist = await Wishlist.findOneAndUpdate(
//             { client: clientId },
//             { $addToSet: { services: service._id } },
//             {
//                 new: true,
//                 upsert: true,
//                 runValidators: true,
//                 setDefaultsOnInsert: true,
//             }
//         ).populate({
//             path: "services",
//             select: "title name slug thumbnail startingPrice startingPriceCurrency status",
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Service added to wishlist successfully.",
//             wishlist,
//         });
//     } catch (error) {
//         console.error("addWishlistItem error:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to add service to wishlist.",
//         });
//     }
// };

// // DELETE /api/wishlist/:serviceId
// export const removeWishlistItem = async (req, res) => {
//     try {
//         const clientId = getClientId(req);
//         const { serviceId } = req.params;

//         if (!clientId) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Please log in to modify your wishlist.",
//             });
//         }

//         if (!isValidId(serviceId)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid service ID.",
//             });
//         }

//         const wishlist = await Wishlist.findOneAndUpdate(
//             { client: clientId },
//             { $pull: { services: serviceId } },
//             {
//                 new: true,
//                 runValidators: true,
//             }
//         ).populate({
//             path: "services",
//             select: "title name slug thumbnail startingPrice startingPriceCurrency status",
//         });

//         if (!wishlist) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Wishlist not found.",
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Service removed from wishlist successfully.",
//             wishlist,
//         });
//     } catch (error) {
//         console.error("removeWishlistItem error:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to remove service from wishlist.",
//         });
//     }
// };










import mongoose from "mongoose";
import Wishlist from "../models/Wishlist.model.js";
import Service from "../models/Service.model.js";

const isValidId = (id) => mongoose.isValidObjectId(id);

const getClientId = (req) => {
    return req.client?._id || req.client?.id;
};

// Fields sent to the client for each wishlist service.
const populateOptions = {
    path: "services",
    select: "title name slug thumbnail startingPrice startingPriceCurrency discount status",
};

// Two requests at the same time can both try to create the same
// wishlist. The unique index rejects one of them (code 11000),
// so run the query one more time in that case.
const retryOnDuplicate = async (run) => {
    try {
        return await run();
    } catch (error) {
        if (error?.code === 11000) {
            return run();
        }

        throw error;
    }
};

// GET /api/wishlist
export const getWishlist = async (req, res) => {
    try {
        const clientId = getClientId(req);

        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: "Please log in to view your wishlist.",
            });
        }

        const wishlist = await retryOnDuplicate(() =>
            Wishlist.findOneAndUpdate(
                { client: clientId },
                { $setOnInsert: { services: [] } },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                }
            ).populate(populateOptions)
        );

        return res.status(200).json({
            success: true,
            message: "Wishlist fetched successfully.",
            wishlist,
        });
    } catch (error) {
        console.error("getWishlist error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch wishlist.",
        });
    }
};

// POST /api/wishlist/:serviceId
export const addWishlistItem = async (req, res) => {
    try {
        const clientId = getClientId(req);
        const { serviceId } = req.params;

        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: "Please log in to add a service to your wishlist.",
            });
        }

        if (!isValidId(serviceId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID.",
            });
        }

        const service = await Service.findById(serviceId);

        if (!service) {
            return res.status(404).json({
                success: false,
                message: "Service not found.",
            });
        }

        if (service.status !== "active") {
            return res.status(400).json({
                success: false,
                message: "This service is not currently available.",
            });
        }

        // $addToSet already prevents duplicates.
        const wishlist = await retryOnDuplicate(() =>
            Wishlist.findOneAndUpdate(
                { client: clientId },
                { $addToSet: { services: service._id } },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                }
            ).populate(populateOptions)
        );

        return res.status(200).json({
            success: true,
            message: "Service added to wishlist successfully.",
            wishlist,
        });
    } catch (error) {
        console.error("addWishlistItem error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add service to wishlist.",
        });
    }
};

// DELETE /api/wishlist/:serviceId
export const removeWishlistItem = async (req, res) => {
    try {
        const clientId = getClientId(req);
        const { serviceId } = req.params;

        if (!clientId) {
            return res.status(401).json({
                success: false,
                message: "Please log in to modify your wishlist.",
            });
        }

        if (!isValidId(serviceId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID.",
            });
        }

        const wishlist = await Wishlist.findOneAndUpdate(
            { client: clientId },
            { $pull: { services: serviceId } },
            { new: true }
        ).populate(populateOptions);

        if (!wishlist) {
            return res.status(404).json({
                success: false,
                message: "Wishlist not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service removed from wishlist successfully.",
            wishlist,
        });
    } catch (error) {
        console.error("removeWishlistItem error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to remove service from wishlist.",
        });
    }
};

