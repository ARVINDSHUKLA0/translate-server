
// import mongoose from "mongoose";

// import Cart from "../models/Cart.model.js";
// import Service from "../models/Service.model.js";
// import ServiceAddon from "../models/ServiceAddon.model.js";

// // ============================================================
// // HELPERS
// // ============================================================

// const isValidId = (id) => mongoose.isValidObjectId(id);

// const getClientId = (req) => {
//     return req.client?._id || req.client?.id;
// };

// // Calculate service price and fixed-dollar discount.
// const getServicePricing = (service) => {
//     const originalPrice = Number(service.startingPrice ?? 0);

//     if (!Number.isFinite(originalPrice) || originalPrice < 0) {
//         throw new Error("Invalid service starting price.");
//     }

//     const discountEnabled = service.discount?.enabled === true;

//     const configuredDiscount = discountEnabled
//         ? Number(service.discount?.value ?? 0)
//         : 0;

//     if (
//         !Number.isFinite(configuredDiscount) ||
//         configuredDiscount < 0
//     ) {
//         throw new Error("Invalid service discount.");
//     }

//     // Do not allow the discount to make the price negative.
//     const discountAmount = discountEnabled
//         ? Math.min(configuredDiscount, originalPrice)
//         : 0;

//     const discountedPrice = originalPrice - discountAmount;

//     return {
//         originalPrice,
//         discountEnabled,
//         discountAmount,
//         discountedPrice,
//         currency: service.startingPriceCurrency || "USD",
//     };
// };

// // Calculate add-on prices from the database.
// const getAddonPricing = (addons = []) => {
//     const details = [];
//     let addonTotal = 0;

//     for (const addon of addons) {
//         if (!addon) {
//             continue;
//         }

//         const price = Number(addon.price ?? 0);

//         if (!Number.isFinite(price) || price < 0) {
//             throw new Error(`Invalid add-on price: ${addon._id}`);
//         }

//         details.push({
//             _id: addon._id,
//             key: addon.key,
//             name: addon.name || addon.key || "Add-on",
//             price,
//         });

//         addonTotal += price;
//     }

//     return {
//         details,
//         addonTotal,
//     };
// };

// // Populate and calculate the current cart response.
// const serializeCart = async (cart) => {
//     await cart.populate({
//         path: "items.service",
//         select: [
//             "title",
//             "slug",
//             "thumbnail",
//             "startingPrice",
//             "startingPriceCurrency",
//             "discount",
//             "status",
//         ].join(" "),
//     });

//     await cart.populate({
//         path: "items.addons",
//         select: "key name price isActive",
//     });

//     const items = [];
//     let subtotal = 0;

//     for (const item of cart.items) {
//         const service = item.service;

//         // Skip deleted services safely.
//         if (!service) {
//             continue;
//         }

//         const pricing = getServicePricing(service);

//         const addonPricing = getAddonPricing(item.addons || []);

//         const quantity = Number(item.quantity) || 1;

//         // Discount is applied to the service price only.
//         // Add-on prices are then added to the discounted price.
//         const unitPrice =
//             pricing.discountedPrice + addonPricing.addonTotal;

//         const lineTotal = unitPrice * quantity;

//         subtotal += lineTotal;

//         items.push({
//             _id: item._id,

//             service: {
//                 _id: service._id,
//                 title: service.title,
//                 slug: service.slug || "",
//                 thumbnail: service.thumbnail || null,
//                 startingPrice: pricing.originalPrice,
//                 startingPriceCurrency: pricing.currency,
//                 status: service.status,
//             },

//             pricing: {
//                 originalPrice: pricing.originalPrice,
//                 discountEnabled: pricing.discountEnabled,
//                 discountAmount: pricing.discountAmount,
//                 discountedPrice: pricing.discountedPrice,
//                 addonTotal: addonPricing.addonTotal,
//                 unitPrice,
//                 currency: pricing.currency,
//             },

//             addons: addonPricing.details,

//             quantity,
//             unitPrice,
//             lineTotal,
//             currency: pricing.currency,
//         });
//     }

//     const currencies = [
//         ...new Set(items.map((item) => item.currency)),
//     ];

//     return {
//         _id: cart._id,
//         items,

//         itemCount: items.reduce(
//             (total, item) => total + item.quantity,
//             0
//         ),

//         subtotal,

//         currency: currencies.length === 1
//             ? currencies[0]
//             : currencies.length === 0
//                 ? "USD"
//                 : null,

//         mixedCurrencies: currencies.length > 1,
//         updatedAt: cart.updatedAt,
//     };
// };

// // ============================================================
// // GET CART
// // GET /api/cart
// // ============================================================

// export const getCart = async (req, res) => {
//     try {
//         const clientId = getClientId(req);

//         if (!clientId || !isValidId(clientId)) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Please log in to continue.",
//             });
//         }

//         let cart = await Cart.findOne({ client: clientId });

//         if (!cart) {
//             cart = await Cart.create({
//                 client: clientId,
//                 items: [],
//             });
//         }

//         const cartData = await serializeCart(cart);

//         return res.status(200).json({
//             success: true,
//             message: "Cart fetched successfully.",
//             cart: cartData,
//         });
//     } catch (error) {
//         console.error("GET CART ERROR:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to fetch cart.",
//         });
//     }
// };

// // ============================================================
// // ADD CART ITEM
// // POST /api/cart/items
// // Body: { serviceId, addonIds: [], quantity: 1 }
// // ============================================================

// export const addCartItem = async (req, res) => {
//     try {
//         const clientId = getClientId(req);

//         if (!clientId || !isValidId(clientId)) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Please log in to continue.",
//             });
//         }

//         const {
//             serviceId,
//             addonIds = [],
//             quantity = 1,
//         } = req.body || {};

//         if (!isValidId(serviceId)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "A valid serviceId is required.",
//             });
//         }

//         if (!Array.isArray(addonIds)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "addonIds must be an array.",
//             });
//         }

//         const qty = Number(quantity);

//         if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Quantity must be between 1 and 100.",
//             });
//         }

//         const uniqueAddonIds = [...new Set(addonIds.map(String))];

//         if (uniqueAddonIds.some((id) => !isValidId(id))) {
//             return res.status(400).json({
//                 success: false,
//                 message: "One or more add-on IDs are invalid.",
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

//         // Validate service pricing before saving the item.
//         getServicePricing(service);

//         if (uniqueAddonIds.length > 0) {
//             const addonDocuments = await ServiceAddon.find({
//                 _id: { $in: uniqueAddonIds },
//             });

//             if (addonDocuments.length !== uniqueAddonIds.length) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "One or more add-ons were not found.",
//                 });
//             }

//             for (const addon of addonDocuments) {
//                 if (addon.isActive !== true) {
//                     return res.status(400).json({
//                         success: false,
//                         message: `Add-on "${addon.name}" is not available.`,
//                     });
//                 }

//                 const price = Number(addon.price);

//                 if (!Number.isFinite(price) || price < 0) {
//                     return res.status(400).json({
//                         success: false,
//                         message: `Invalid price for add-on "${addon.name}".`,
//                     });
//                 }
//             }
//         }

//         let cart = await Cart.findOne({ client: clientId });

//         if (!cart) {
//             cart = new Cart({
//                 client: clientId,
//                 items: [],
//             });
//         }

//         // Same service + same add-ons = same cart line.
//         const sortedAddonIds = [...uniqueAddonIds].sort();

//         const existingItem = cart.items.find((item) => {
//             if (String(item.service) !== String(serviceId)) {
//                 return false;
//             }

//             const existingAddonIds = (item.addons || [])
//                 .map(String)
//                 .sort();

//             return (
//                 existingAddonIds.length === sortedAddonIds.length &&
//                 existingAddonIds.every(
//                     (id, index) => id === sortedAddonIds[index]
//                 )
//             );
//         });

//         if (existingItem) {
//             const newQuantity =
//                 Number(existingItem.quantity) + qty;

//             if (newQuantity > 100) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Maximum quantity per item is 100.",
//                 });
//             }

//             existingItem.quantity = newQuantity;
//         } else {
//             cart.items.push({
//                 service: serviceId,
//                 addons: uniqueAddonIds,
//                 quantity: qty,
//             });
//         }

//         await cart.save();

//         return res.status(200).json({
//             success: true,
//             message: "Service added to cart successfully.",
//             cart: await serializeCart(cart),
//         });
//     } catch (error) {
//         console.error("ADD CART ITEM ERROR:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to add service to cart.",
//         });
//     }
// };

// // ============================================================
// // UPDATE QUANTITY
// // PATCH /api/cart/items/:itemId
// // Body: { quantity: 2 }
// // ============================================================

// export const updateCartItem = async (req, res) => {
//     try {
//         const clientId = getClientId(req);
//         const { itemId } = req.params;
//         const quantity = Number(req.body?.quantity);

//         if (!clientId || !isValidId(clientId)) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Please log in to continue.",
//             });
//         }

//         if (!isValidId(itemId)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid cart item ID.",
//             });
//         }

//         if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Quantity must be between 1 and 100.",
//             });
//         }

//         const cart = await Cart.findOne({ client: clientId });

//         if (!cart) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Cart not found.",
//             });
//         }

//         const item = cart.items.id(itemId);

//         if (!item) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Cart item not found.",
//             });
//         }

//         item.quantity = quantity;

//         await cart.save();

//         return res.status(200).json({
//             success: true,
//             message: "Cart updated successfully.",
//             cart: await serializeCart(cart),
//         });
//     } catch (error) {
//         console.error("UPDATE CART ITEM ERROR:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to update cart.",
//         });
//     }
// };

// // ============================================================
// // REMOVE CART ITEM
// // DELETE /api/cart/items/:itemId
// // ============================================================

// export const removeCartItem = async (req, res) => {
//     try {
//         const clientId = getClientId(req);
//         const { itemId } = req.params;

//         if (!clientId || !isValidId(clientId)) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Please log in to continue.",
//             });
//         }

//         if (!isValidId(itemId)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid cart item ID.",
//             });
//         }

//         const cart = await Cart.findOne({ client: clientId });

//         if (!cart) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Cart not found.",
//             });
//         }

//         const item = cart.items.id(itemId);

//         if (!item) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Cart item not found.",
//             });
//         }

//         item.deleteOne();

//         await cart.save();

//         return res.status(200).json({
//             success: true,
//             message: "Item removed from cart successfully.",
//             cart: await serializeCart(cart),
//         });
//     } catch (error) {
//         console.error("REMOVE CART ITEM ERROR:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to remove cart item.",
//         });
//     }
// };

// // ============================================================
// // CLEAR CART
// // DELETE /api/cart
// // ============================================================

// export const clearCart = async (req, res) => {
//     try {
//         const clientId = getClientId(req);

//         if (!clientId || !isValidId(clientId)) {
//             return res.status(401).json({
//                 success: false,
//                 message: "Please log in to continue.",
//             });
//         }

//         let cart = await Cart.findOne({ client: clientId });

//         if (!cart) {
//             cart = await Cart.create({
//                 client: clientId,
//                 items: [],
//             });
//         } else {
//             cart.items = [];
//             await cart.save();
//         }

//         return res.status(200).json({
//             success: true,
//             message: "Cart cleared successfully.",
//             cart: await serializeCart(cart),
//         });
//     } catch (error) {
//         console.error("CLEAR CART ERROR:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to clear cart.",
//         });
//     }
// };
















































import mongoose from "mongoose";

import Cart from "../models/Cart.model.js";
import Service from "../models/Service.model.js";
import ServiceAddon from "../models/ServiceAddon.model.js";

// ============================================================
// HELPERS
// ============================================================

const isValidId = (id) => mongoose.isValidObjectId(id);

// Round money to 2 decimals to avoid floating point errors.
const round2 = (value) =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getClientId = (req) => {
    return req.client?._id || req.client?.id;
};

// Calculate service price and fixed-dollar discount.
const getServicePricing = (service) => {
    const originalPrice = round2(service.startingPrice ?? 0);

    if (!Number.isFinite(originalPrice) || originalPrice < 0) {
        throw new Error("Invalid service starting price.");
    }

    const discountEnabled = service.discount?.enabled === true;

    const configuredDiscount = discountEnabled
        ? Number(service.discount?.value ?? 0)
        : 0;

    if (
        !Number.isFinite(configuredDiscount) ||
        configuredDiscount < 0
    ) {
        throw new Error("Invalid service discount.");
    }

    // Do not allow the discount to make the price negative.
    const discountAmount = discountEnabled
        ? round2(Math.min(configuredDiscount, originalPrice))
        : 0;

    const discountedPrice = round2(originalPrice - discountAmount);

    return {
        originalPrice,
        discountEnabled,
        discountAmount,
        discountedPrice,
        currency: service.startingPriceCurrency || "USD",
    };
};

// Calculate add-on prices from the database.
const getAddonPricing = (addons = []) => {
    const details = [];
    let addonTotal = 0;

    for (const addon of addons) {
        if (!addon) {
            continue;
        }

        const price = round2(addon.price ?? 0);

        if (!Number.isFinite(price) || price < 0) {
            throw new Error(`Invalid add-on price: ${addon._id}`);
        }

        details.push({
            _id: addon._id,
            key: addon.key,
            name: addon.name || addon.key || "Add-on",
            price,
        });

        addonTotal = round2(addonTotal + price);
    }

    return {
        details,
        addonTotal,
    };
};

// Populate and calculate the current cart response.
const serializeCart = async (cart) => {
    // Remember how many add-ons each item had before populate,
    // because populate silently drops deleted add-ons.
    const expectedAddonCounts = cart.items.map(
        (item) => (item.addons || []).length
    );

    await cart.populate({
        path: "items.service",
        select: [
            "title",
            "slug",
            "thumbnail",
            "startingPrice",
            "startingPriceCurrency",
            "discount",
            "status",
        ].join(" "),
    });

    await cart.populate({
        path: "items.addons",
        select: "key name price isActive",
    });

    const items = [];
    let subtotal = 0;

    for (let index = 0; index < cart.items.length; index++) {
        const item = cart.items[index];
        const service = item.service;

        // Skip deleted services safely.
        if (!service) {
            continue;
        }

        const issues = [];

        let pricing = {
            originalPrice: 0,
            discountEnabled: false,
            discountAmount: 0,
            discountedPrice: 0,
            currency: service.startingPriceCurrency || "USD",
        };

        let addonPricing = { details: [], addonTotal: 0 };

        // One broken service must not break the whole cart.
        try {
            pricing = getServicePricing(service);
            addonPricing = getAddonPricing(item.addons || []);
        } catch (error) {
            console.error("CART ITEM PRICING ERROR:", error.message);
            issues.push("Pricing is unavailable for this item.");
        }

        if (service.status !== "active") {
            issues.push("This service is no longer available.");
        }

        if ((item.addons || []).length < expectedAddonCounts[index]) {
            issues.push("One or more add-ons were removed.");
        }

        if ((item.addons || []).some((addon) => addon?.isActive === false)) {
            issues.push("One or more add-ons are no longer available.");
        }

        // Add-on prices are stored in USD.
        if (
            (item.addons || []).length > 0 &&
            String(pricing.currency).toUpperCase() !== "USD"
        ) {
            issues.push("Add-ons are only supported for USD services.");
        }

        const unavailable = issues.length > 0;

        const quantity = Number(item.quantity) || 1;

        // Discount is applied to the service price only.
        // Add-on prices are then added to the discounted price.
        const unitPrice = round2(
            pricing.discountedPrice + addonPricing.addonTotal
        );

        const lineTotal = round2(unitPrice * quantity);

        // Unavailable items are not counted in the subtotal.
        if (!unavailable) {
            subtotal = round2(subtotal + lineTotal);
        }

        items.push({
            _id: item._id,

            service: {
                _id: service._id,
                title: service.title,
                slug: service.slug || "",
                thumbnail: service.thumbnail || null,
                startingPrice: pricing.originalPrice,
                startingPriceCurrency: pricing.currency,
                status: service.status,
            },

            pricing: {
                originalPrice: pricing.originalPrice,
                discountEnabled: pricing.discountEnabled,
                discountAmount: pricing.discountAmount,
                discountedPrice: pricing.discountedPrice,
                addonTotal: addonPricing.addonTotal,
                unitPrice,
                currency: pricing.currency,
            },

            addons: addonPricing.details,

            quantity,
            unitPrice,
            lineTotal,
            currency: pricing.currency,

            unavailable,
            issues,
        });
    }

    const currencies = [
        ...new Set(
            items
                .filter((item) => !item.unavailable)
                .map((item) => item.currency)
        ),
    ];

    return {
        _id: cart._id,
        items,

        itemCount: items.reduce(
            (total, item) => total + item.quantity,
            0
        ),

        subtotal: round2(subtotal),

        currency: currencies.length === 1
            ? currencies[0]
            : currencies.length === 0
                ? "USD"
                : null,

        mixedCurrencies: currencies.length > 1,
        hasUnavailableItems: items.some((item) => item.unavailable),
        updatedAt: cart.updatedAt,
    };
};

// ============================================================
// GET CART
// GET /api/cart
// ============================================================

export const getCart = async (req, res) => {
    try {
        const clientId = getClientId(req);

        if (!clientId || !isValidId(clientId)) {
            return res.status(401).json({
                success: false,
                message: "Please log in to continue.",
            });
        }

        let cart = await Cart.findOne({ client: clientId });

        if (!cart) {
            cart = await Cart.create({
                client: clientId,
                items: [],
            });
        }

        const cartData = await serializeCart(cart);

        return res.status(200).json({
            success: true,
            message: "Cart fetched successfully.",
            cart: cartData,
        });
    } catch (error) {
        console.error("GET CART ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch cart.",
        });
    }
};

// ============================================================
// ADD CART ITEM
// POST /api/cart/items
// Body: { serviceId, addonIds: [], quantity: 1 }
// ============================================================

export const addCartItem = async (req, res) => {
    try {
        const clientId = getClientId(req);

        if (!clientId || !isValidId(clientId)) {
            return res.status(401).json({
                success: false,
                message: "Please log in to continue.",
            });
        }

        const {
            serviceId,
            addonIds = [],
            quantity = 1,
        } = req.body || {};

        if (!isValidId(serviceId)) {
            return res.status(400).json({
                success: false,
                message: "A valid serviceId is required.",
            });
        }

        if (!Array.isArray(addonIds)) {
            return res.status(400).json({
                success: false,
                message: "addonIds must be an array.",
            });
        }

        const qty = Number(quantity);

        if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be between 1 and 100.",
            });
        }

        const uniqueAddonIds = [...new Set(addonIds.map(String))];

        if (uniqueAddonIds.some((id) => !isValidId(id))) {
            return res.status(400).json({
                success: false,
                message: "One or more add-on IDs are invalid.",
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

        // Validate service pricing before saving the item.
        getServicePricing(service);

        if (uniqueAddonIds.length > 0) {
            // Add-on prices are stored in USD.
            const serviceCurrency = String(
                service.startingPriceCurrency || "USD"
            ).toUpperCase();

            if (serviceCurrency !== "USD") {
                return res.status(400).json({
                    success: false,
                    message: "Add-ons are only available for USD services.",
                });
            }

            const addonDocuments = await ServiceAddon.find({
                _id: { $in: uniqueAddonIds },
            });

            if (addonDocuments.length !== uniqueAddonIds.length) {
                return res.status(400).json({
                    success: false,
                    message: "One or more add-ons were not found.",
                });
            }

            for (const addon of addonDocuments) {
                if (addon.isActive !== true) {
                    return res.status(400).json({
                        success: false,
                        message: `Add-on "${addon.name}" is not available.`,
                    });
                }

                const price = Number(addon.price);

                if (!Number.isFinite(price) || price < 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid price for add-on "${addon.name}".`,
                    });
                }
            }
        }

        let cart = await Cart.findOne({ client: clientId });

        if (!cart) {
            cart = new Cart({
                client: clientId,
                items: [],
            });
        }

        // Same service + same add-ons = same cart line.
        const sortedAddonIds = [...uniqueAddonIds].sort();

        const existingItem = cart.items.find((item) => {
            if (String(item.service) !== String(serviceId)) {
                return false;
            }

            const existingAddonIds = (item.addons || [])
                .map(String)
                .sort();

            return (
                existingAddonIds.length === sortedAddonIds.length &&
                existingAddonIds.every(
                    (id, index) => id === sortedAddonIds[index]
                )
            );
        });

        if (existingItem) {
            const newQuantity =
                Number(existingItem.quantity) + qty;

            if (newQuantity > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum quantity per item is 100.",
                });
            }

            existingItem.quantity = newQuantity;
        } else {
            cart.items.push({
                service: serviceId,
                addons: uniqueAddonIds,
                quantity: qty,
            });
        }

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Service added to cart successfully.",
            cart: await serializeCart(cart),
        });
    } catch (error) {
        console.error("ADD CART ITEM ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add service to cart.",
        });
    }
};

// ============================================================
// UPDATE QUANTITY
// PATCH /api/cart/items/:itemId
// Body: { quantity: 2 }
// ============================================================

export const updateCartItem = async (req, res) => {
    try {
        const clientId = getClientId(req);
        const { itemId } = req.params;
        const quantity = Number(req.body?.quantity);

        if (!clientId || !isValidId(clientId)) {
            return res.status(401).json({
                success: false,
                message: "Please log in to continue.",
            });
        }

        if (!isValidId(itemId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid cart item ID.",
            });
        }

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be between 1 and 100.",
            });
        }

        const cart = await Cart.findOne({ client: clientId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found.",
            });
        }

        const item = cart.items.id(itemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found.",
            });
        }

        item.quantity = quantity;

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Cart updated successfully.",
            cart: await serializeCart(cart),
        });
    } catch (error) {
        console.error("UPDATE CART ITEM ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update cart.",
        });
    }
};

// ============================================================
// REMOVE CART ITEM
// DELETE /api/cart/items/:itemId
// ============================================================

export const removeCartItem = async (req, res) => {
    try {
        const clientId = getClientId(req);
        const { itemId } = req.params;

        if (!clientId || !isValidId(clientId)) {
            return res.status(401).json({
                success: false,
                message: "Please log in to continue.",
            });
        }

        if (!isValidId(itemId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid cart item ID.",
            });
        }

        const cart = await Cart.findOne({ client: clientId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found.",
            });
        }

        const item = cart.items.id(itemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found.",
            });
        }

        item.deleteOne();

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Item removed from cart successfully.",
            cart: await serializeCart(cart),
        });
    } catch (error) {
        console.error("REMOVE CART ITEM ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to remove cart item.",
        });
    }
};

// ============================================================
// CLEAR CART
// DELETE /api/cart
// ============================================================

export const clearCart = async (req, res) => {
    try {
        const clientId = getClientId(req);

        if (!clientId || !isValidId(clientId)) {
            return res.status(401).json({
                success: false,
                message: "Please log in to continue.",
            });
        }

        let cart = await Cart.findOne({ client: clientId });

        if (!cart) {
            cart = await Cart.create({
                client: clientId,
                items: [],
            });
        } else {
            cart.items = [];
            await cart.save();
        }

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully.",
            cart: await serializeCart(cart),
        });
    } catch (error) {
        console.error("CLEAR CART ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to clear cart.",
        });
    }
};

