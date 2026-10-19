// import mongoose from "mongoose";
// import Service from "../models/Service.model.js";
// import Category from "../models/Category.model.js";
// import Subcategory from "../models/Subcategory.model.js";
// import {
//     uploadFile,
//     deleteFile,
// } from "../utils/storage/index.js";

// const isValidObjectId = (id) => {
//     return mongoose.Types.ObjectId.isValid(id);
// };

// const cleanString = (value) => {
//     return typeof value === "string"
//         ? value.trim()
//         : "";
// };

// const normalizeSlug = (slug) => {
//     return cleanString(slug)
//         .toLowerCase()
//         .replace(/[^a-z0-9\s-]/g, "")
//         .replace(/\s+/g, "-")
//         .replace(/-+/g, "-")
//         .replace(/^-|-$/g, "");
// };

// const parseJson = (value, fallback) => {
//     if (
//         value === undefined ||
//         value === null ||
//         value === ""
//     ) {
//         return fallback;
//     }

//     if (typeof value === "object") {
//         return value;
//     }

//     try {
//         return JSON.parse(value);
//     } catch {
//         return fallback;
//     }
// };

// const toBoolean = (value, fallback = false) => {
//     if (
//         value === undefined ||
//         value === null ||
//         value === ""
//     ) {
//         return fallback;
//     }

//     if (typeof value === "boolean") {
//         return value;
//     }

//     return String(value).toLowerCase() === "true";
// };


// const normalizeTabs = (tabs) => {
//     if (!Array.isArray(tabs)) {
//         return [];
//     }

//     return tabs
//         .map((tab) => {
//             if (typeof tab === "string") {
//                 return tab.trim();
//             }

//             // Convert old object-format tabs to their title once.
//             // New data will always be stored as strings.
//             if (tab && typeof tab === "object" && typeof tab.title === "string") {
//                 return tab.title.trim();
//             }

//             return "";
//         })
//         .filter(Boolean);
// };

// const allowedDeliveryUnits = [
//     "hour",
//     "day",
//     "business_day",
// ];

// const allowedStatuses = [
//     "draft",
//     "active",
//     "inactive",
//     "archived",
// ];

// export const createService = async (req, res) => {
//     let uploadedThumbnail = null;
//     let uploadedImages = [];

//     try {
//         const body = req.body || {};
//         const category = cleanString(
//             body.category || req.query.category
//         );
//         const subcategory = cleanString(
//             body.subcategory || req.query.subcategory
//         );
//         const title = cleanString(body.title);
//         const slug = cleanString(body.slug);
//         const smallDescription =
//             cleanString(body.smallDescription);
//         const longDescription =
//             typeof body.longDescription === "string"
//                 ? body.longDescription
//                 : "";
//         const tabs = parseJson(
//             body.tabs,
//             []
//         );
//         const normalizedTabs = normalizeTabs(tabs);
//         const translatorInfo = parseJson(
//             body.translatorInfo,
//             {}
//         );

//         const delivery = parseJson(
//             body.delivery,
//             {}
//         );

//         const purchaseModes = parseJson(
//             body.purchaseModes,
//             {
//                 fixed: true,
//                 fileUpload: false,
//             }
//         );

//         const metadata = parseJson(
//             body.metadata,
//             {}
//         );

//         // ----------------------------------------------------
//         // MEDIA
//         // ----------------------------------------------------

//         const bodyImages = parseJson(
//             body.images,
//             []
//         );

//         const bodyThumbnail =
//             body.thumbnail !== undefined
//                 ? body.thumbnail
//                 : null;


//         // ----------------------------------------------------
//         // OTHER FIELDS
//         // ----------------------------------------------------

//         const startingPrice =
//             body.startingPrice !== undefined
//                 ? body.startingPrice
//                 : 0;

//         const startingPriceCurrency =
//             cleanString(
//                 body.startingPriceCurrency || "USD"
//             ).toUpperCase();

//         const discount = parseJson(
//             body.discount,
//             {}
//         );

//         const status =
//             body.status || "draft";

//         const sortOrder =
//             body.sortOrder !== undefined
//                 ? body.sortOrder
//                 : 0;

//         const isFeatured =
//             toBoolean(
//                 body.isFeatured,
//                 false
//             );

//         // ====================================================
//         // REQUIRED VALIDATION
//         // ====================================================

//         if (!category) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Category is required.",
//             });
//         }

//         if (!subcategory) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Subcategory is required.",
//             });
//         }

//         if (!title) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Service title is required.",
//             });
//         }

//         if (!slug) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Service slug is required.",
//             });
//         }

//         // ====================================================
//         // OBJECT ID VALIDATION
//         // ====================================================

//         if (!isValidObjectId(category)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid category ID.",
//             });
//         }

//         if (!isValidObjectId(subcategory)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid subcategory ID.",
//             });
//         }

//         // ====================================================
//         // CATEGORY CHECK
//         // ====================================================

//         const [categoryExists, subcategoryExists] =
//             await Promise.all([
//                 Category.exists({
//                     _id: category,
//                     isActive: true,
//                 }),
//                 Subcategory.exists({
//                     _id: subcategory,
//                     category: category,
//                     isActive: true,
//                 }),
//             ]);

//         if (!categoryExists) {
//             return res.status(404).json({
//                 success: false,
//                 message:
//                     "Category not found or inactive.",
//             });
//         }

//         // ====================================================
//         // SUBCATEGORY CHECK
//         // ====================================================


//         if (!subcategoryExists) {
//             return res.status(404).json({
//                 success: false,
//                 message:
//                     "Subcategory not found, inactive, or does not belong to selected category.",
//             });
//         }

//         // ====================================================
//         // SLUG
//         // ====================================================

//         const normalizedSlug =
//             normalizeSlug(slug);

//         if (!normalizedSlug) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Valid service slug is required.",
//             });
//         }

//         // ====================================================
//         // DUPLICATE SLUG
//         // ====================================================

//         const existingService =
//             await Service.exists({
//                 slug: normalizedSlug,
//             });

//         if (existingService) {
//             return res.status(409).json({
//                 success: false,
//                 message:
//                     "Service with this slug already exists.",
//             });
//         }

//         // ====================================================
//         // TRANSLATOR INFO
//         // ====================================================

//         const normalizedTranslatorInfo = {
//             numberOfTranslators:
//                 Number(
//                     translatorInfo?.numberOfTranslators
//                 ) || 0,

//             rating: {
//                 average:
//                     Number(
//                         translatorInfo?.rating?.average
//                     ) || 0,

//                 totalReviews:
//                     Number(
//                         translatorInfo?.rating?.totalReviews
//                     ) || 0,
//             },
//         };

//         if (
//             normalizedTranslatorInfo.rating.average < 0 ||
//             normalizedTranslatorInfo.rating.average > 5
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Rating must be between 0 and 5.",
//             });
//         }

//         // ====================================================
//         // DELIVERY
//         // ====================================================

//         const normalizedDelivery = {
//             value:
//                 Number(delivery?.value) || 1,

//             unit:
//                 delivery?.unit || "day",
//         };

//         if (
//             !allowedDeliveryUnits.includes(
//                 normalizedDelivery.unit
//             )
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Invalid delivery unit. Allowed: hour, day, business_day.",
//             });
//         }

//         // ====================================================
//         // PURCHASE MODES
//         // ====================================================

//         const normalizedPurchaseModes = {
//             fixed:
//                 purchaseModes?.fixed !== undefined
//                     ? toBoolean(
//                           purchaseModes.fixed
//                       )
//                     : true,

//             fileUpload:
//                 purchaseModes?.fileUpload !== undefined
//                     ? toBoolean(
//                           purchaseModes.fileUpload
//                       )
//                     : false,
//         };

//         if (
//             !normalizedPurchaseModes.fixed &&
//             !normalizedPurchaseModes.fileUpload
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "At least one purchase mode must be enabled.",
//             });
//         }

//         // ====================================================
//         // PRICE
//         // ====================================================

//         const normalizedStartingPrice =
//             Number(startingPrice);

//         if (
//             !Number.isInteger(
//                 normalizedStartingPrice
//             ) ||
//             normalizedStartingPrice < 0
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "startingPrice must be a non-negative integer amount in cents.",
//             });
//         }

//         // ====================================================
//         // DISCOUNT
//         // ====================================================

//         const normalizedDiscount = {
//             enabled: toBoolean(discount?.enabled, false),
//             type: discount?.type || "percentage",
//             value: Number(discount?.value) || 0,
//             currency: cleanString(
//                 discount?.currency || startingPriceCurrency
//             ).toUpperCase(),
//         };

//         if (!["percentage", "fixed"].includes(normalizedDiscount.type)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid discount type. Allowed: percentage, fixed.",
//             });
//         }

//         if (!Number.isFinite(normalizedDiscount.value) || normalizedDiscount.value < 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Discount value must be a non-negative number.",
//             });
//         }

//         if (normalizedDiscount.type === "percentage" && normalizedDiscount.value > 100) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Percentage discount cannot be greater than 100.",
//             });
//         }

//         if (!normalizedDiscount.currency) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Discount currency is required.",
//             });
//         }

//         // ====================================================
//         // STATUS
//         // ====================================================

//         if (!allowedStatuses.includes(status)) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Invalid service status.",
//             });
//         }

//         // ====================================================
//         // CREATE
//         // ====================================================

//         const service =
//             await Service.create({
//                 category,
//                 subcategory,

//                 title,

//                 slug:
//                     normalizedSlug,

//                 smallDescription,

//                 longDescription,

//                 tabs: normalizedTabs,

//                 translatorInfo:
//                     normalizedTranslatorInfo,

//                 delivery:
//                     normalizedDelivery,

//                 thumbnail:
//                     bodyThumbnail,

//                 images:
//                     Array.isArray(bodyImages) ? bodyImages : [],

//                 purchaseModes:
//                     normalizedPurchaseModes,

//                 startingPrice:
//                     normalizedStartingPrice,

//                 startingPriceCurrency,

//                 discount: normalizedDiscount,

//                 status,

//                 sortOrder:
//                     Number(sortOrder) || 0,

//                 isFeatured,

//                 metadata:
//                     metadata &&
//                     typeof metadata === "object" &&
//                     !Array.isArray(metadata)
//                         ? metadata
//                         : {},
//             });

//         // ====================================================
//         // MEDIA UPLOAD - BACKGROUND
//         // API response does not wait for Cloudinary.
//         // ====================================================

//         const thumbnailFile = req.files?.thumbnail?.[0];
//         const imageFiles = req.files?.images || [];

//         if (thumbnailFile || imageFiles.length) {
//             void (async () => {
//                 try {
//                     const [thumbnailResult, imageResults] =
//                         await Promise.all([
//                             thumbnailFile
//                                 ? uploadFile(thumbnailFile, "translation/services")
//                                 : Promise.resolve(null),
//                             imageFiles.length
//                                 ? Promise.all(
//                                     imageFiles.map((file) =>
//                                         uploadFile(file, "translation/services")
//                                     )
//                                 )
//                                 : Promise.resolve([]),
//                         ]);

//                     const mediaUpdate = {};

//                     if (thumbnailResult) {
//                         mediaUpdate.thumbnail = {
//                             publicId: thumbnailResult.publicId,
//                             url: thumbnailResult.url,
//                         };
//                     }

//                     if (imageResults.length) {
//                         mediaUpdate.images = imageResults.map((image) => ({
//                             publicId: image.publicId,
//                             url: image.url,
//                         }));
//                     }

//                     if (Object.keys(mediaUpdate).length) {
//                         await Service.findByIdAndUpdate(
//                             service._id,
//                             { $set: mediaUpdate }
//                         );
//                     }
//                 } catch (mediaError) {
//                     console.error("CREATE SERVICE MEDIA ERROR:", mediaError);
//                 }
//             })();
//         }

//         // ====================================================
//         // RESPONSE
//         // ====================================================

//         return res.status(201).json({
//             success: true,
//             message:
//                 "Service created successfully.",
//             data: service,
//         });

//     } catch (error) {
//         console.error(
//             "CREATE SERVICE ERROR:",
//             error
//         );

//         if (uploadedThumbnail?.publicId) {
//             try {
//                 await deleteFile(uploadedThumbnail.publicId);
//             } catch (cleanupError) {
//                 console.error("THUMBNAIL CLEANUP ERROR:", cleanupError);
//             }
//         }

//         for (const image of uploadedImages) {
//             if (!image?.publicId) continue;
//             try {
//                 await deleteFile(image.publicId);
//             } catch (cleanupError) {
//                 console.error("IMAGE CLEANUP ERROR:", cleanupError);
//             }
//         }

//         if (error.code === 11000) {
//             return res.status(409).json({
//                 success: false,
//                 message:
//                     "Service with this slug already exists.",
//             });
//         }

//         if (
//             error.name ===
//             "ValidationError"
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Service validation failed.",
//                 errors:
//                     Object.values(
//                         error.errors
//                     ).map(
//                         (err) =>
//                             err.message
//                     ),
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             message:
//                 error.message ||
//                 "Failed to create service.",
//         });
//     }
// };

// // ============================================================
// // GET ALL SERVICES
// // GET /api/services
// // ============================================================

// export const getServices = async (
//     req,
//     res
// ) => {
//     try {
//         const filter = {};

//         // Normal list does not show archived services.
//         if (!req.query.status) {
//             filter.status = {
//                 $ne: "archived",
//             };
//         }

//         // Specific status requested
//         if (req.query.status) {
//             filter.status =
//                 req.query.status;
//         }

//         // ----------------------------------------------------
//         // CATEGORY FILTER
//         // ----------------------------------------------------

//         if (req.query.category) {
//             if (
//                 !isValidObjectId(
//                     req.query.category
//                 )
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "Invalid category ID.",
//                 });
//             }

//             filter.category =
//                 req.query.category;
//         }

//         // ----------------------------------------------------
//         // SUBCATEGORY FILTER
//         // ----------------------------------------------------

//         if (req.query.subcategory) {
//             if (
//                 !isValidObjectId(
//                     req.query.subcategory
//                 )
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "Invalid subcategory ID.",
//                 });
//             }

//             filter.subcategory =
//                 req.query.subcategory;
//         }

//         // ----------------------------------------------------
//         // FIND
//         // ----------------------------------------------------

//         const services =
//             await Service.find(filter)
//                 .populate(
//                     "category",
//                     "categoryName categoryImage"
//                 )
//                 .populate(
//                     "subcategory",
//                     "subcategoryName subcategoryImage"
//                 )
//                 .sort({
//                     sortOrder: 1,
//                     createdAt: -1,
//                 })
//                 .lean();

//         return res.status(200).json({
//             success: true,
//             count:
//                 services.length,
//             data:
//                 services,
//         });

//     } catch (error) {
//         console.error(
//             "GET SERVICES ERROR:",
//             error
//         );

//         return res.status(500).json({
//             success: false,
//             message:
//                 error.message ||
//                 "Failed to get services.",
//         });
//     }
// };

// // ============================================================
// // GET SINGLE SERVICE
// // GET /api/services/:id
// // ============================================================

// export const getServiceById = async (
//     req,
//     res
// ) => {
//     try {
//         const { id } =
//             req.params;

//         if (!isValidObjectId(id)) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Invalid service ID.",
//             });
//         }

//         const service =
//             await Service.findById(id)
//                 .populate(
//                     "category",
//                     "categoryName categoryImage"
//                 )
//                 .populate(
//                     "subcategory",
//                     "subcategoryName subcategoryImage"
//                 )
//                 .lean();

//         if (!service) {
//             return res.status(404).json({
//                 success: false,
//                 message:
//                     "Service not found.",
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             data: service,
//         });

//     } catch (error) {
//         console.error(
//             "GET SERVICE ERROR:",
//             error
//         );

//         return res.status(500).json({
//             success: false,
//             message:
//                 error.message ||
//                 "Failed to get service.",
//         });
//     }
// };

// // ============================================================
// // UPDATE SERVICE
// // PUT /api/services/:id
// // ============================================================

// export const updateService = async (
//     req,
//     res
// ) => {
//     let uploadedThumbnail = null;
//     let uploadedImages = [];
    

//     try {
//         // IMPORTANT:
//         // id was missing in previous version.
//         const { id } =
//             req.params;

//         if (!isValidObjectId(id)) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Invalid service ID.",
//             });
//         }

//         // IMPORTANT:
//         // Get existing service before using it.
//         const service =
//             await Service.findById(id);

//         if (!service) {
//             return res.status(404).json({
//                 success: false,
//                 message:
//                     "Service not found.",
//             });
//         }

//         const body =
//             req.body || {};

//         console.log("UPDATE BODY KEYS:", Object.keys(body), "existingImages:", body.existingImages, "images:", body.images);

//         // ----------------------------------------------------
//         // FIELDS
//         // ----------------------------------------------------

//         const category =
//             cleanString(
//                 body.category ||
//                 req.query.category
//             ) || undefined;

//         const subcategory =
//             cleanString(
//                 body.subcategory ||
//                 req.query.subcategory
//             ) || undefined;

//         const title =
//             body.title;

//         const slug =
//             body.slug;

//         const smallDescription =
//             body.smallDescription;

//         const longDescription =
//             body.longDescription;

//         const tabs =
//             parseJson(
//                 body.tabs,
//                 undefined
//             );

//         const translatorInfo =
//             parseJson(
//                 body.translatorInfo,
//                 undefined
//             );

//         const delivery =
//             parseJson(
//                 body.delivery,
//                 undefined
//             );

//         const thumbnail =
//             body.thumbnail;

//         const images =
//             parseJson(
//                 body.images,
//                 undefined
//             );

//         const existingImages =
//             parseJson(
//                 body.existingImages,
//                 undefined
//             );

//         const purchaseModes =
//             parseJson(
//                 body.purchaseModes,
//                 undefined
//             );

//         const startingPrice =
//             body.startingPrice;

//         const startingPriceCurrency =
//             body.startingPriceCurrency;

//         const discount =
//             parseJson(
//                 body.discount,
//                 undefined
//             );

//         const status =
//             body.status;

//         const sortOrder =
//             body.sortOrder;

//         const isFeatured =
//             body.isFeatured;

//         const metadata =
//             parseJson(
//                 body.metadata,
//                 undefined
//             );

//         // ====================================================
//         // CATEGORY
//         // ====================================================

//         const newCategory =
//             category ||
//             String(service.category);

//         if (
//             !isValidObjectId(
//                 newCategory
//             )
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Invalid category ID.",
//             });
//         }

//         // ====================================================
//         // SUBCATEGORY
//         // ====================================================

//         const newSubcategory =
//             subcategory ||
//             String(service.subcategory);

//         if (
//             !isValidObjectId(
//                 newSubcategory
//             )
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Invalid subcategory ID.",
//             });
//         }

//         // ====================================================
//         // CATEGORY CHECK
//         // ====================================================

//         const [categoryExists, subcategoryExists] =
//             await Promise.all([
//                 Category.exists({
//                     _id: newCategory,
//                     isActive: true,
//                 }),
//                 Subcategory.exists({
//                     _id: newSubcategory,
//                     category: newCategory,
//                     isActive: true,
//                 }),
//             ]);

//         if (!categoryExists) {
//             return res.status(404).json({
//                 success: false,
//                 message:
//                     "Category not found or inactive.",
//             });
//         }

//         // ====================================================
//         // SUBCATEGORY CHECK
//         // ====================================================


//         if (!subcategoryExists) {
//             return res.status(404).json({
//                 success: false,
//                 message:
//                     "Subcategory not found, inactive, or does not belong to selected category.",
//             });
//         }

//         // ====================================================
//         // SLUG
//         // ====================================================

//         let newSlug =
//             service.slug;

//         if (
//             slug !== undefined
//         ) {
//             newSlug =
//                 normalizeSlug(
//                     slug
//                 );

//             if (!newSlug) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "Valid service slug is required.",
//                 });
//             }

//             const duplicateSlug =
//                 await Service.exists({
//                     slug:
//                         newSlug,

//                     _id: {
//                         $ne: id,
//                     },
//                 });

//             if (duplicateSlug) {
//                 return res.status(409).json({
//                     success: false,
//                     message:
//                         "Another service already uses this slug.",
//                 });
//             }
//         }

//         // ====================================================
//         // UPDATE OBJECT
//         // ====================================================

//         const updateData = {
//             category:
//                 newCategory,

//             subcategory:
//                 newSubcategory,

//             slug:
//                 newSlug,
//         };

//         // ----------------------------------------------------
//         // TITLE
//         // ----------------------------------------------------

//         if (
//             title !== undefined
//         ) {
//             if (
//                 typeof title !==
//                     "string" ||
//                 !title.trim()
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "Service title cannot be empty.",
//                 });
//             }

//             updateData.title =
//                 title.trim();
//         }

//         // ----------------------------------------------------
//         // DESCRIPTIONS
//         // ----------------------------------------------------

//         if (
//             smallDescription !==
//             undefined
//         ) {
//             updateData.smallDescription =
//                 String(
//                     smallDescription
//                 ).trim();
//         }

//         if (
//             longDescription !==
//             undefined
//         ) {
//             updateData.longDescription =
//                 String(
//                     longDescription
//                 );
//         }

//         // ----------------------------------------------------
//         // TABS
//         // ----------------------------------------------------

//         if (
//             tabs !== undefined
//         ) {
//             updateData.tabs = normalizeTabs(tabs);
//         }

//         // ----------------------------------------------------
//         // TRANSLATOR INFO
//         // ----------------------------------------------------

//         if (
//             translatorInfo !==
//             undefined
//         ) {
//             const average =
//                 Number(
//                     translatorInfo
//                         ?.rating
//                         ?.average
//                 ) || 0;

//             if (
//                 average < 0 ||
//                 average > 5
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "Rating must be between 0 and 5.",
//                 });
//             }

//             updateData.translatorInfo = {
//                 numberOfTranslators:
//                     Number(
//                         translatorInfo
//                             ?.numberOfTranslators
//                     ) || 0,

//                 rating: {
//                     average,

//                     totalReviews:
//                         Number(
//                             translatorInfo
//                                 ?.rating
//                                 ?.totalReviews
//                         ) || 0,
//                 },
//             };
//         }

//         // ----------------------------------------------------
//         // DELIVERY
//         // ----------------------------------------------------

//         if (
//             delivery !== undefined
//         ) {
//             const deliveryUnit =
//                 delivery?.unit ||
//                 "day";

//             if (
//                 !allowedDeliveryUnits.includes(
//                     deliveryUnit
//                 )
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "Invalid delivery unit. Allowed: hour, day, business_day.",
//                 });
//             }

//             updateData.delivery = {
//                 value:
//                     Number(
//                         delivery?.value
//                     ) || 1,

//                 unit:
//                     deliveryUnit,
//             };
//         }

//         // ----------------------------------------------------
//         // THUMBNAIL
//         // ----------------------------------------------------

//         if (thumbnail !== undefined) {
//             updateData.thumbnail = thumbnail;
//         }

//         // ----------------------------------------------------
//         // IMAGES
//         // ----------------------------------------------------

//         const keepImagesInput =
//             existingImages !== undefined
//                 ? existingImages
//                 : images !== undefined
//                     ? images
//                     : undefined;

//         if (keepImagesInput !== undefined) {
//             updateData.images = Array.isArray(keepImagesInput)
//                 ? keepImagesInput
//                 : [];
//         }

//         // ----------------------------------------------------
//         // PURCHASE MODES
//         // ----------------------------------------------------

//         if (
//             purchaseModes !==
//             undefined
//         ) {
//             const oldPurchaseModes =
//                 service.purchaseModes ||
//                 {};

//             const updatedPurchaseModes = {
//                 fixed:
//                     purchaseModes.fixed !==
//                     undefined
//                         ? toBoolean(
//                               purchaseModes.fixed
//                           )
//                         : toBoolean(
//                               oldPurchaseModes.fixed,
//                               true
//                           ),

//                 fileUpload:
//                     purchaseModes.fileUpload !==
//                     undefined
//                         ? toBoolean(
//                               purchaseModes.fileUpload
//                           )
//                         : toBoolean(
//                               oldPurchaseModes.fileUpload,
//                               false
//                           ),
//             };

//             if (
//                 !updatedPurchaseModes.fixed &&
//                 !updatedPurchaseModes.fileUpload
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "At least one purchase mode must be enabled.",
//                 });
//             }

//             updateData.purchaseModes =
//                 updatedPurchaseModes;
//         }

//         // ----------------------------------------------------
//         // PRICE
//         // ----------------------------------------------------

//         if (
//             startingPrice !==
//             undefined
//         ) {
//             const price =
//                 Number(
//                     startingPrice
//                 );

//             if (
//                 !Number.isInteger(
//                     price
//                 ) ||
//                 price < 0
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "startingPrice must be a non-negative integer amount in cents.",
//                 });
//             }

//             updateData.startingPrice =
//                 price;
//         }

//         // ----------------------------------------------------
//         // CURRENCY
//         // ----------------------------------------------------

//         if (
//             startingPriceCurrency !==
//             undefined
//         ) {
//             const currency =
//                 cleanString(
//                     startingPriceCurrency
//                 ).toUpperCase();

//             if (!currency) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "Starting price currency is required.",
//                 });
//             }

//             updateData.startingPriceCurrency =
//                 currency;
//         }

//         // ----------------------------------------------------
//         // DISCOUNT
//         // ----------------------------------------------------

//         if (discount !== undefined) {
//             const oldDiscount = service.discount || {};

//             const updatedDiscount = {
//                 enabled:
//                     discount.enabled !== undefined
//                         ? toBoolean(discount.enabled)
//                         : toBoolean(oldDiscount.enabled, false),

//                 type:
//                     discount.type !== undefined
//                         ? cleanString(discount.type)
//                         : (oldDiscount.type || "percentage"),

//                 value:
//                     discount.value !== undefined
//                         ? Number(discount.value)
//                         : Number(oldDiscount.value) || 0,

//                 currency:
//                     discount.currency !== undefined
//                         ? cleanString(discount.currency).toUpperCase()
//                         : (oldDiscount.currency || service.startingPriceCurrency || "USD"),
//             };

//             if (!["percentage", "fixed"].includes(updatedDiscount.type)) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Invalid discount type. Allowed: percentage, fixed.",
//                 });
//             }

//             if (!Number.isFinite(updatedDiscount.value) || updatedDiscount.value < 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Discount value must be a non-negative number.",
//                 });
//             }

//             if (updatedDiscount.type === "percentage" && updatedDiscount.value > 100) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Percentage discount cannot be greater than 100.",
//                 });
//             }

//             if (!updatedDiscount.currency) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Discount currency is required.",
//                 });
//             }

//             updateData.discount = updatedDiscount;
//         }

//         // ----------------------------------------------------
//         // STATUS
//         // ----------------------------------------------------

//         if (
//             status !== undefined
//         ) {
//             if (
//                 !allowedStatuses.includes(
//                     status
//                 )
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "Invalid service status.",
//                 });
//             }

//             updateData.status =
//                 status;
//         }

//         // ----------------------------------------------------
//         // SORT ORDER
//         // ----------------------------------------------------

//         if (
//             sortOrder !==
//             undefined
//         ) {
//             const numericSortOrder =
//                 Number(
//                     sortOrder
//                 );

//             if (
//                 !Number.isFinite(
//                     numericSortOrder
//                 )
//             ) {
//                 return res.status(400).json({
//                     success: false,
//                     message:
//                         "sortOrder must be a valid number.",
//                 });
//             }

//             updateData.sortOrder =
//                 numericSortOrder;
//         }

//         // ----------------------------------------------------
//         // FEATURED
//         // ----------------------------------------------------

//         if (
//             isFeatured !==
//             undefined
//         ) {
//             updateData.isFeatured =
//                 toBoolean(
//                     isFeatured
//                 );
//         }

//         // ----------------------------------------------------
//         // METADATA
//         // ----------------------------------------------------

//         if (
//             metadata !==
//             undefined
//         ) {
//             updateData.metadata =
//                 metadata &&
//                 typeof metadata ===
//                     "object" &&
//                 !Array.isArray(
//                     metadata
//                 )
//                     ? metadata
//                     : {};
//         }

//         // ====================================================
//         // UPDATE DATABASE
//         // ====================================================

//         const updatedService =
//             await Service.findByIdAndUpdate(
//                 id,

//                 {
//                     $set:
//                         updateData,
//                 },

//                 {
//                     new: true,
//                     runValidators: true,
//                 }
//             )
//                 .populate(
//                     "category",
//                     "categoryName categoryImage"
//                 )
//                 .populate(
//                     "subcategory",
//                     "subcategoryName subcategoryImage"
//                 );

//         if (!updatedService) {
//             return res.status(404).json({
//                 success: false,
//                 message:
//                     "Service not found.",
//             });
//         }

//         // ====================================================
//         // MEDIA UPDATE - BACKGROUND
//         // ====================================================

//         const thumbnailFile = req.files?.thumbnail?.[0];
//         const imageFiles = req.files?.images || [];

//         const oldThumbnailPublicId =
//             service.thumbnail?.publicId || null;

//         const oldImages =
//             Array.isArray(service.images)
//                 ? service.images
//                 : [];

//         // keepImagesInput = images which user wants to KEEP
//         const finalExistingImages =
//             Array.isArray(keepImagesInput)
//                 ? keepImagesInput
//                 : oldImages;

//         const finalImagePublicIds = new Set(
//             finalExistingImages
//                 .map((image) => image?.publicId)
//                 .filter(Boolean)
//         );

//         const removedImagePublicIds =
//             keepImagesInput === undefined
//                 ? []
//                 : oldImages
//                     .map((image) => image?.publicId)
//                     .filter(
//                         (publicId) =>
//                             publicId &&
//                             !finalImagePublicIds.has(publicId)
//                     );

//         if (
//             thumbnailFile ||
//             imageFiles.length ||
//             removedImagePublicIds.length
//         ) {
//             void (async () => {
//                 try {
//                     // ----------------------------------------
//                     // UPLOAD NEW FILES
//                     // ----------------------------------------

//                     const [thumbnailResult, imageResults] =
//                         await Promise.all([
//                             thumbnailFile
//                                 ? uploadFile(thumbnailFile, "translation/services")
//                                 : Promise.resolve(null),
//                             imageFiles.length
//                                 ? Promise.all(
//                                     imageFiles.map((file) =>
//                                         uploadFile(file, "translation/services")
//                                     )
//                                 )
//                                 : Promise.resolve([]),
//                         ]);

//                     // ----------------------------------------
//                     // PREPARE MEDIA UPDATE
//                     // ----------------------------------------

//                     const mediaUpdate = {};

//                     if (thumbnailResult) {
//                         mediaUpdate.thumbnail = {
//                             publicId: thumbnailResult.publicId,
//                             url: thumbnailResult.url,
//                         };
//                     }

//                     // Kept images + newly uploaded images only.
//                     // NEVER use service.images when user removed some.
//                     if (imageResults.length) {
//                         mediaUpdate.images = [
//                             ...finalExistingImages,
//                             ...imageResults.map((image) => ({
//                                 publicId: image.publicId,
//                                 url: image.url,
//                             })),
//                         ];
//                     }

//                     // ----------------------------------------
//                     // UPDATE DATABASE
//                     // ----------------------------------------

//                     if (Object.keys(mediaUpdate).length) {
//                         await Service.findByIdAndUpdate(id, {
//                             $set: mediaUpdate,
//                         });
//                     }

//                     // ----------------------------------------
//                     // DELETE OLD THUMBNAIL
//                     // ----------------------------------------

//                     if (thumbnailResult && oldThumbnailPublicId) {
//                         try {
//                             await deleteFile(oldThumbnailPublicId);
//                         } catch (deleteError) {
//                             console.error("OLD THUMBNAIL DELETE ERROR:", deleteError);
//                         }
//                     }

//                     // ----------------------------------------
//                     // DELETE REMOVED IMAGES FROM CLOUDINARY
//                     // ----------------------------------------

//                     for (const publicId of removedImagePublicIds) {
//                         try {
//                             await deleteFile(publicId);
//                         } catch (deleteError) {
//                             console.error("REMOVED IMAGE DELETE ERROR:", deleteError);
//                         }
//                     }
//                 } catch (mediaError) {
//                     console.error("UPDATE SERVICE MEDIA ERROR:", mediaError);
//                 }
//             })();
//         }

//         // ====================================================
//         // RESPONSE
//         // ====================================================

//         return res.status(200).json({
//             success: true,
//             message:
//                 "Service updated successfully.",
//             data:
//                 updatedService,
//         });

//     } catch (error) {
//         console.error(
//             "UPDATE SERVICE ERROR:",
//             error
//         );

//         if (uploadedThumbnail?.publicId) {
//             try {
//                 await deleteFile(uploadedThumbnail.publicId);
//             } catch (cleanupError) {
//                 console.error("NEW THUMBNAIL CLEANUP ERROR:", cleanupError);
//             }
//         }

//         for (const image of uploadedImages) {
//             if (!image?.publicId) continue;
//             try {
//                 await deleteFile(image.publicId);
//             } catch (cleanupError) {
//                 console.error("NEW IMAGE CLEANUP ERROR:", cleanupError);
//             }
//         }

//         if (error.code === 11000) {
//             return res.status(409).json({
//                 success: false,
//                 message:
//                     "Another service already uses this slug.",
//             });
//         }

//         if (
//             error.name ===
//             "ValidationError"
//         ) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Service validation failed.",
//                 errors:
//                     Object.values(
//                         error.errors
//                     ).map(
//                         (err) =>
//                             err.message
//                     ),
//             });
//         }

//         return res.status(500).json({
//             success: false,
//             message:
//                 error.message ||
//                 "Failed to update service.",
//         });
//     }
// };

// // ============================================================
// // DELETE / ARCHIVE SERVICE
// // DELETE /api/services/:id
// // ============================================================

// export const deleteService = async (req, res) => {
//     try {
//         const { id } = req.params;

//         if (!mongoose.Types.ObjectId.isValid(id)) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid service ID.",
//             });
//         }

//         const service = await Service.findById(id);

//         if (!service) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Service not found.",
//             });
//         }

//         const thumbnailPublicId = service.thumbnail?.publicId;
//         const imagePublicIds = Array.isArray(service.images)
//             ? service.images.map((image) => image?.publicId).filter(Boolean)
//             : [];

//         await Service.findByIdAndDelete(id);

//         // Cloudinary cleanup runs after the API response path.
//         void (async () => {
//             if (thumbnailPublicId) {
//                 try {
//                     await deleteFile(thumbnailPublicId);
//                 } catch (deleteError) {
//                     console.error("THUMBNAIL DELETE ERROR:", deleteError);
//                 }
//             }

//             for (const publicId of imagePublicIds) {
//                 try {
//                     await deleteFile(publicId);
//                 } catch (deleteError) {
//                     console.error("SERVICE IMAGE DELETE ERROR:", deleteError);
//                 }
//             }
//         })();

//         return res.status(200).json({
//             success: true,
//             message: "Service deleted successfully.",
//             data: {
//                 _id: id,
//             },
//         });

//     } catch (error) {
//         console.error("DELETE SERVICE ERROR:", error);

//         return res.status(500).json({
//             success: false,
//             message:
//                 error.message ||
//                 "Failed to delete service.",
//         });
//     }
// };


































import mongoose from "mongoose";

import Service from "../models/Service.model.js";

import Category from "../models/Category.model.js";

import Subcategory from "../models/Subcategory.model.js";

import {

    uploadFile,

    deleteFile,

} from "../utils/storage/index.js";



const isValidObjectId = (id) => {

    return mongoose.Types.ObjectId.isValid(id);

};



const cleanString = (value) => {

    return typeof value === "string"

        ? value.trim()

        : "";

};



const normalizeSlug = (slug) => {

    return cleanString(slug)

        .toLowerCase()

        .replace(/[^a-z0-9\s-]/g, "")

        .replace(/\s+/g, "-")

        .replace(/-+/g, "-")

        .replace(/^-|-$/g, "");

};



const parseJson = (value, fallback) => {

    if (

        value === undefined ||

        value === null ||

        value === ""

    ) {

        return fallback;

    }



    if (typeof value === "object") {

        return value;

    }



    try {

        return JSON.parse(value);

    } catch {

        return fallback;

    }

};



const toBoolean = (value, fallback = false) => {

    if (

        value === undefined ||

        value === null ||

        value === ""

    ) {

        return fallback;

    }



    if (typeof value === "boolean") {

        return value;

    }



    return String(value).toLowerCase() === "true";

};





const normalizeTabs = (tabs) => {

    if (!Array.isArray(tabs)) {

        return [];

    }



    return tabs

        .map((tab) => {

            if (typeof tab === "string") {

                return tab.trim();

            }



            // Convert old object-format tabs to their title once.

            // New data will always be stored as strings.

            if (tab && typeof tab === "object" && typeof tab.title === "string") {

                return tab.title.trim();

            }



            return "";

        })

        .filter(Boolean);

};



const allowedDeliveryUnits = [

    "hour",

    "day",

    "business_day",

];



const allowedStatuses = [

    "draft",

    "active",

    "inactive",

    "archived",

];



export const createService = async (req, res) => {

    let uploadedThumbnail = null;

    let uploadedImages = [];



    try {

        const body = req.body || {};

        const category = cleanString(

            body.category || req.query.category

        );

        const subcategory = cleanString(

            body.subcategory || req.query.subcategory

        );

        const title = cleanString(body.title);

        const slug = cleanString(body.slug);

        const smallDescription =

            cleanString(body.smallDescription);

        const longDescription =

            typeof body.longDescription === "string"

                ? body.longDescription

                : "";

        const tabs = parseJson(

            body.tabs,

            []

        );

        const normalizedTabs = normalizeTabs(tabs);

        const translatorInfo = parseJson(

            body.translatorInfo,

            {}

        );



        const delivery = parseJson(

            body.delivery,

            {}

        );



        const purchaseModes = parseJson(

            body.purchaseModes,

            {

                fixed: true,

                fileUpload: false,

            }

        );



        const metadata = parseJson(

            body.metadata,

            {}

        );



        // ----------------------------------------------------

        // MEDIA

        // ----------------------------------------------------



        const bodyImages = parseJson(

            body.images,

            []

        );



        const bodyThumbnail =

            body.thumbnail !== undefined

                ? body.thumbnail

                : null;





        // ----------------------------------------------------

        // OTHER FIELDS

        // ----------------------------------------------------



        const startingPrice =

            body.startingPrice !== undefined

                ? body.startingPrice

                : 0;



        const startingPriceCurrency =

            cleanString(

                body.startingPriceCurrency || "USD"

            ).toUpperCase();



        const discount = parseJson(

            body.discount,

            {}

        );



        const status =

            body.status || "draft";



        const sortOrder =

            body.sortOrder !== undefined

                ? body.sortOrder

                : 0;



        const isFeatured =

            toBoolean(

                body.isFeatured,

                false

            );



        // ====================================================

        // REQUIRED VALIDATION

        // ====================================================



        if (!category) {

            return res.status(400).json({

                success: false,

                message: "Category is required.",

            });

        }



        if (!subcategory) {

            return res.status(400).json({

                success: false,

                message: "Subcategory is required.",

            });

        }



        if (!title) {

            return res.status(400).json({

                success: false,

                message: "Service title is required.",

            });

        }



        if (!slug) {

            return res.status(400).json({

                success: false,

                message: "Service slug is required.",

            });

        }



        // ====================================================

        // OBJECT ID VALIDATION

        // ====================================================



        if (!isValidObjectId(category)) {

            return res.status(400).json({

                success: false,

                message: "Invalid category ID.",

            });

        }



        if (!isValidObjectId(subcategory)) {

            return res.status(400).json({

                success: false,

                message: "Invalid subcategory ID.",

            });

        }



        // ====================================================

        // CATEGORY CHECK

        // ====================================================



        const [categoryExists, subcategoryExists] =

            await Promise.all([

                Category.exists({

                    _id: category,

                    isActive: true,

                }),

                Subcategory.exists({

                    _id: subcategory,

                    category: category,

                    isActive: true,

                }),

            ]);



        if (!categoryExists) {

            return res.status(404).json({

                success: false,

                message:

                    "Category not found or inactive.",

            });

        }



        // ====================================================

        // SUBCATEGORY CHECK

        // ====================================================





        if (!subcategoryExists) {

            return res.status(404).json({

                success: false,

                message:

                    "Subcategory not found, inactive, or does not belong to selected category.",

            });

        }



        // ====================================================

        // SLUG

        // ====================================================



        const normalizedSlug =

            normalizeSlug(slug);



        if (!normalizedSlug) {

            return res.status(400).json({

                success: false,

                message:

                    "Valid service slug is required.",

            });

        }



        // ====================================================

        // DUPLICATE SLUG

        // ====================================================



        const existingService =

            await Service.exists({

                slug: normalizedSlug,

            });



        if (existingService) {

            return res.status(409).json({

                success: false,

                message:

                    "Service with this slug already exists.",

            });

        }



        // ====================================================

        // TRANSLATOR INFO

        // ====================================================



        const normalizedTranslatorInfo = {

            numberOfTranslators:

                Number(

                    translatorInfo?.numberOfTranslators

                ) || 0,



            rating: {

                average:

                    Number(

                        translatorInfo?.rating?.average

                    ) || 0,



                totalReviews:

                    Number(

                        translatorInfo?.rating?.totalReviews

                    ) || 0,

            },

        };



        if (

            normalizedTranslatorInfo.rating.average < 0 ||

            normalizedTranslatorInfo.rating.average > 5

        ) {

            return res.status(400).json({

                success: false,

                message:

                    "Rating must be between 0 and 5.",

            });

        }



        // ====================================================
        // ====================================================
        // DELIVERY
        // ====================================================

        const deliveryRange = cleanString(
            delivery?.range || delivery?.value || "1"
        ).replace(/\s+/g, "");

        const rangeParts = deliveryRange.split("-");

        const validDeliveryRange =
            rangeParts.length === 1
                ? /^\d+$/.test(rangeParts[0])
                : rangeParts.length === 2 &&
                  /^\d+$/.test(rangeParts[0]) &&
                  /^\d+$/.test(rangeParts[1]) &&
                  Number(rangeParts[1]) >= Number(rangeParts[0]);

        if (!validDeliveryRange) {
            return res.status(400).json({
                success: false,
                message: "Delivery range must be like 2-4, 0-1, or 3.",
            });
        }

        const normalizedDelivery = {
            range: deliveryRange,
            unit: delivery?.unit || "day",
        };

        if (!allowedDeliveryUnits.includes(normalizedDelivery.unit)) {
            return res.status(400).json({
                success: false,
                message: "Invalid delivery unit. Allowed: hour, day, business_day.",
            });
        }


        // PURCHASE MODES

        // ====================================================



        const normalizedPurchaseModes = {

            fixed:

                purchaseModes?.fixed !== undefined

                    ? toBoolean(

                          purchaseModes.fixed

                      )

                    : true,



            fileUpload:

                purchaseModes?.fileUpload !== undefined

                    ? toBoolean(

                          purchaseModes.fileUpload

                      )

                    : false,

        };



        if (

            !normalizedPurchaseModes.fixed &&

            !normalizedPurchaseModes.fileUpload

        ) {

            return res.status(400).json({

                success: false,

                message:

                    "At least one purchase mode must be enabled.",

            });

        }



        // ====================================================
        // ====================================================
        // PRICE
        // ====================================================

        const normalizedStartingPrice = Number(startingPrice);

        if (!Number.isFinite(normalizedStartingPrice) || normalizedStartingPrice < 0) {
            return res.status(400).json({
                success: false,
                message: "startingPrice must be a valid non-negative dollar amount.",
            });
        }
        // ====================================================
        // DISCOUNT
        // ====================================================

        const normalizedDiscount = {
            enabled: toBoolean(discount?.enabled, false),
            value: Number(discount?.value) || 0,
            currency: cleanString(
                discount?.currency || startingPriceCurrency
            ).toUpperCase(),
        };

        if (!Number.isFinite(normalizedDiscount.value) || normalizedDiscount.value < 0) {
            return res.status(400).json({
                success: false,
                message: "Discount amount must be a non-negative dollar amount.",
            });
        }

        if (!normalizedDiscount.currency) {
            return res.status(400).json({
                success: false,
                message: "Discount currency is required.",
            });
        }


        // STATUS

        // ====================================================



        if (!allowedStatuses.includes(status)) {

            return res.status(400).json({

                success: false,

                message:

                    "Invalid service status.",

            });

        }



        // ====================================================

        // CREATE

        // ====================================================



        const service =

            await Service.create({

                category,

                subcategory,



                title,



                slug:

                    normalizedSlug,



                smallDescription,



                longDescription,



                tabs: normalizedTabs,



                translatorInfo:

                    normalizedTranslatorInfo,



                delivery:

                    normalizedDelivery,



                thumbnail:

                    bodyThumbnail,



                images:

                    Array.isArray(bodyImages) ? bodyImages : [],



                purchaseModes:

                    normalizedPurchaseModes,



                startingPrice:

                    normalizedStartingPrice,



                startingPriceCurrency,



                discount: normalizedDiscount,



                status,



                sortOrder:

                    Number(sortOrder) || 0,



                isFeatured,



                metadata:

                    metadata &&

                    typeof metadata === "object" &&

                    !Array.isArray(metadata)

                        ? metadata

                        : {},

            });



        // ====================================================

        // MEDIA UPLOAD - BACKGROUND

        // API response does not wait for Cloudinary.

        // ====================================================



        const thumbnailFile = req.files?.thumbnail?.[0];

        const imageFiles = req.files?.images || [];



        if (thumbnailFile || imageFiles.length) {

            void (async () => {

                try {

                    const [thumbnailResult, imageResults] =

                        await Promise.all([

                            thumbnailFile

                                ? uploadFile(thumbnailFile, "translation/services")

                                : Promise.resolve(null),

                            imageFiles.length

                                ? Promise.all(

                                    imageFiles.map((file) =>

                                        uploadFile(file, "translation/services")

                                    )

                                )

                                : Promise.resolve([]),

                        ]);



                    const mediaUpdate = {};



                    if (thumbnailResult) {

                        mediaUpdate.thumbnail = {

                            publicId: thumbnailResult.publicId,

                            url: thumbnailResult.url,

                        };

                    }



                    if (imageResults.length) {

                        mediaUpdate.images = imageResults.map((image) => ({

                            publicId: image.publicId,

                            url: image.url,

                        }));

                    }



                    if (Object.keys(mediaUpdate).length) {

                        await Service.findByIdAndUpdate(

                            service._id,

                            { $set: mediaUpdate }

                        );

                    }

                } catch (mediaError) {

                    console.error("CREATE SERVICE MEDIA ERROR:", mediaError);

                }

            })();

        }



        // ====================================================

        // RESPONSE

        // ====================================================



        return res.status(201).json({

            success: true,

            message:

                "Service created successfully.",

            data: service,

        });



    } catch (error) {

        console.error(

            "CREATE SERVICE ERROR:",

            error

        );



        if (uploadedThumbnail?.publicId) {

            try {

                await deleteFile(uploadedThumbnail.publicId);

            } catch (cleanupError) {

                console.error("THUMBNAIL CLEANUP ERROR:", cleanupError);

            }

        }



        for (const image of uploadedImages) {

            if (!image?.publicId) continue;

            try {

                await deleteFile(image.publicId);

            } catch (cleanupError) {

                console.error("IMAGE CLEANUP ERROR:", cleanupError);

            }

        }



        if (error.code === 11000) {

            return res.status(409).json({

                success: false,

                message:

                    "Service with this slug already exists.",

            });

        }



        if (

            error.name ===

            "ValidationError"

        ) {

            return res.status(400).json({

                success: false,

                message:

                    "Service validation failed.",

                errors:

                    Object.values(

                        error.errors

                    ).map(

                        (err) =>

                            err.message

                    ),

            });

        }



        return res.status(500).json({

            success: false,

            message:

                error.message ||

                "Failed to create service.",

        });

    }

};



// ============================================================

// GET ALL SERVICES

// GET /api/services

// ============================================================



export const getServices = async (

    req,

    res

) => {

    try {

        const filter = {};



        // Normal list does not show archived services.

        if (!req.query.status) {

            filter.status = {

                $ne: "archived",

            };

        }



        // Specific status requested

        if (req.query.status) {

            filter.status =

                req.query.status;

        }



        // ----------------------------------------------------

        // CATEGORY FILTER

        // ----------------------------------------------------



        if (req.query.category) {

            if (

                !isValidObjectId(

                    req.query.category

                )

            ) {

                return res.status(400).json({

                    success: false,

                    message:

                        "Invalid category ID.",

                });

            }



            filter.category =

                req.query.category;

        }



        // ----------------------------------------------------

        // SUBCATEGORY FILTER

        // ----------------------------------------------------



        if (req.query.subcategory) {

            if (

                !isValidObjectId(

                    req.query.subcategory

                )

            ) {

                return res.status(400).json({

                    success: false,

                    message:

                        "Invalid subcategory ID.",

                });

            }



            filter.subcategory =

                req.query.subcategory;

        }



        // ----------------------------------------------------

        // FIND

        // ----------------------------------------------------



        const services =

            await Service.find(filter)

                .populate(

                    "category",

                    "categoryName categoryImage"

                )

                .populate(

                    "subcategory",

                    "subcategoryName subcategoryImage"

                )

                .sort({

                    sortOrder: 1,

                    createdAt: -1,

                })

                .lean();



        return res.status(200).json({

            success: true,

            count:

                services.length,

            data:

                services,

        });



    } catch (error) {

        console.error(

            "GET SERVICES ERROR:",

            error

        );



        return res.status(500).json({

            success: false,

            message:

                error.message ||

                "Failed to get services.",

        });

    }

};



// ============================================================

// GET SINGLE SERVICE

// GET /api/services/:id

// ============================================================



export const getServiceById = async (

    req,

    res

) => {

    try {

        const { id } =

            req.params;



        if (!isValidObjectId(id)) {

            return res.status(400).json({

                success: false,

                message:

                    "Invalid service ID.",

            });

        }



        const service =

            await Service.findById(id)

                .populate(

                    "category",

                    "categoryName categoryImage"

                )

                .populate(

                    "subcategory",

                    "subcategoryName subcategoryImage"

                )

                .lean();



        if (!service) {

            return res.status(404).json({

                success: false,

                message:

                    "Service not found.",

            });

        }



        return res.status(200).json({

            success: true,

            data: service,

        });



    } catch (error) {

        console.error(

            "GET SERVICE ERROR:",

            error

        );



        return res.status(500).json({

            success: false,

            message:

                error.message ||

                "Failed to get service.",

        });

    }

};



// ============================================================

// UPDATE SERVICE

// PUT /api/services/:id

// ============================================================



export const updateService = async (

    req,

    res

) => {

    let uploadedThumbnail = null;

    let uploadedImages = [];





    try {

        // IMPORTANT:

        // id was missing in previous version.

        const { id } =

            req.params;



        if (!isValidObjectId(id)) {

            return res.status(400).json({

                success: false,

                message:

                    "Invalid service ID.",

            });

        }



        // IMPORTANT:

        // Get existing service before using it.

        const service =

            await Service.findById(id);



        if (!service) {

            return res.status(404).json({

                success: false,

                message:

                    "Service not found.",

            });

        }



        const body =

            req.body || {};



        console.log("UPDATE BODY KEYS:", Object.keys(body), "existingImages:", body.existingImages, "images:", body.images);



        // ----------------------------------------------------

        // FIELDS

        // ----------------------------------------------------



        const category =

            cleanString(

                body.category ||

                req.query.category

            ) || undefined;



        const subcategory =

            cleanString(

                body.subcategory ||

                req.query.subcategory

            ) || undefined;



        const title =

            body.title;



        const slug =

            body.slug;



        const smallDescription =

            body.smallDescription;



        const longDescription =

            body.longDescription;



        const tabs =

            parseJson(

                body.tabs,

                undefined

            );



        const translatorInfo =

            parseJson(

                body.translatorInfo,

                undefined

            );



        const delivery =

            parseJson(

                body.delivery,

                undefined

            );



        const thumbnail =

            body.thumbnail;



        const images =

            parseJson(

                body.images,

                undefined

            );



        const existingImages =

            parseJson(

                body.existingImages,

                undefined

            );



        const purchaseModes =

            parseJson(

                body.purchaseModes,

                undefined

            );



        const startingPrice =

            body.startingPrice;



        const startingPriceCurrency =

            body.startingPriceCurrency;



        const discount =

            parseJson(

                body.discount,

                undefined

            );



        const status =

            body.status;



        const sortOrder =

            body.sortOrder;



        const isFeatured =

            body.isFeatured;



        const metadata =

            parseJson(

                body.metadata,

                undefined

            );



        // ====================================================

        // CATEGORY

        // ====================================================



        const newCategory =

            category ||

            String(service.category);



        if (

            !isValidObjectId(

                newCategory

            )

        ) {

            return res.status(400).json({

                success: false,

                message:

                    "Invalid category ID.",

            });

        }



        // ====================================================

        // SUBCATEGORY

        // ====================================================



        const newSubcategory =

            subcategory ||

            String(service.subcategory);



        if (

            !isValidObjectId(

                newSubcategory

            )

        ) {

            return res.status(400).json({

                success: false,

                message:

                    "Invalid subcategory ID.",

            });

        }



        // ====================================================

        // CATEGORY CHECK

        // ====================================================



        const [categoryExists, subcategoryExists] =

            await Promise.all([

                Category.exists({

                    _id: newCategory,

                    isActive: true,

                }),

                Subcategory.exists({

                    _id: newSubcategory,

                    category: newCategory,

                    isActive: true,

                }),

            ]);



        if (!categoryExists) {

            return res.status(404).json({

                success: false,

                message:

                    "Category not found or inactive.",

            });

        }



        // ====================================================

        // SUBCATEGORY CHECK

        // ====================================================





        if (!subcategoryExists) {

            return res.status(404).json({

                success: false,

                message:

                    "Subcategory not found, inactive, or does not belong to selected category.",

            });

        }



        // ====================================================

        // SLUG

        // ====================================================



        let newSlug =

            service.slug;



        if (

            slug !== undefined

        ) {

            newSlug =

                normalizeSlug(

                    slug

                );



            if (!newSlug) {

                return res.status(400).json({

                    success: false,

                    message:

                        "Valid service slug is required.",

                });

            }



            const duplicateSlug =

                await Service.exists({

                    slug:

                        newSlug,



                    _id: {

                        $ne: id,

                    },

                });



            if (duplicateSlug) {

                return res.status(409).json({

                    success: false,

                    message:

                        "Another service already uses this slug.",

                });

            }

        }



        // ====================================================

        // UPDATE OBJECT

        // ====================================================



        const updateData = {

            category:

                newCategory,



            subcategory:

                newSubcategory,



            slug:

                newSlug,

        };



        // ----------------------------------------------------

        // TITLE

        // ----------------------------------------------------



        if (

            title !== undefined

        ) {

            if (

                typeof title !==

                    "string" ||

                !title.trim()

            ) {

                return res.status(400).json({

                    success: false,

                    message:

                        "Service title cannot be empty.",

                });

            }



            updateData.title =

                title.trim();

        }



        // ----------------------------------------------------

        // DESCRIPTIONS

        // ----------------------------------------------------



        if (

            smallDescription !==

            undefined

        ) {

            updateData.smallDescription =

                String(

                    smallDescription

                ).trim();

        }



        if (

            longDescription !==

            undefined

        ) {

            updateData.longDescription =

                String(

                    longDescription

                );

        }



        // ----------------------------------------------------

        // TABS

        // ----------------------------------------------------



        if (

            tabs !== undefined

        ) {

            updateData.tabs = normalizeTabs(tabs);

        }



        // ----------------------------------------------------

        // TRANSLATOR INFO

        // ----------------------------------------------------



        if (

            translatorInfo !==

            undefined

        ) {

            const average =

                Number(

                    translatorInfo

                        ?.rating

                        ?.average

                ) || 0;



            if (

                average < 0 ||

                average > 5

            ) {

                return res.status(400).json({

                    success: false,

                    message:

                        "Rating must be between 0 and 5.",

                });

            }



            updateData.translatorInfo = {

                numberOfTranslators:

                    Number(

                        translatorInfo

                            ?.numberOfTranslators

                    ) || 0,



                rating: {

                    average,



                    totalReviews:

                        Number(

                            translatorInfo

                                ?.rating

                                ?.totalReviews

                        ) || 0,

                },

            };

        }



        // ----------------------------------------------------
        // ----------------------------------------------------
        // DELIVERY
        // ----------------------------------------------------

        if (delivery !== undefined) {
            const deliveryUnit = delivery?.unit || "day";

            if (!allowedDeliveryUnits.includes(deliveryUnit)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid delivery unit. Allowed: hour, day, business_day.",
                });
            }

            const deliveryRange = cleanString(
                delivery?.range || delivery?.value || "1"
            ).replace(/\s+/g, "");

            const rangeParts = deliveryRange.split("-");

            const validDeliveryRange =
                rangeParts.length === 1
                    ? /^\d+$/.test(rangeParts[0])
                    : rangeParts.length === 2 &&
                      /^\d+$/.test(rangeParts[0]) &&
                      /^\d+$/.test(rangeParts[1]) &&
                      Number(rangeParts[1]) >= Number(rangeParts[0]);

            if (!validDeliveryRange) {
                return res.status(400).json({
                    success: false,
                    message: "Delivery range must be like 2-4, 0-1, or 3.",
                });
            }

            updateData.delivery = {
                range: deliveryRange,
                unit: deliveryUnit,
            };
        }


        // THUMBNAIL

        // ----------------------------------------------------



        if (thumbnail !== undefined) {

            updateData.thumbnail = thumbnail;

        }



        // ----------------------------------------------------

        // IMAGES

        // ----------------------------------------------------



        const keepImagesInput =

            existingImages !== undefined

                ? existingImages

                : images !== undefined

                    ? images

                    : undefined;



        if (keepImagesInput !== undefined) {

            updateData.images = Array.isArray(keepImagesInput)

                ? keepImagesInput

                : [];

        }



        // ----------------------------------------------------

        // PURCHASE MODES

        // ----------------------------------------------------



        if (

            purchaseModes !==

            undefined

        ) {

            const oldPurchaseModes =

                service.purchaseModes ||

                {};



            const updatedPurchaseModes = {

                fixed:

                    purchaseModes.fixed !==

                    undefined

                        ? toBoolean(

                              purchaseModes.fixed

                          )

                        : toBoolean(

                              oldPurchaseModes.fixed,

                              true

                          ),



                fileUpload:

                    purchaseModes.fileUpload !==

                    undefined

                        ? toBoolean(

                              purchaseModes.fileUpload

                          )

                        : toBoolean(

                              oldPurchaseModes.fileUpload,

                              false

                          ),

            };



            if (

                !updatedPurchaseModes.fixed &&

                !updatedPurchaseModes.fileUpload

            ) {

                return res.status(400).json({

                    success: false,

                    message:

                        "At least one purchase mode must be enabled.",

                });

            }



            updateData.purchaseModes =

                updatedPurchaseModes;

        }



        // ----------------------------------------------------
        // ----------------------------------------------------
        // PRICE
        // ----------------------------------------------------

        if (startingPrice !== undefined) {
            const price = Number(startingPrice);

            if (!Number.isFinite(price) || price < 0) {
                return res.status(400).json({
                    success: false,
                    message: "startingPrice must be a valid non-negative dollar amount.",
                });
            }

            updateData.startingPrice = price;
        }


        // CURRENCY

        // ----------------------------------------------------



        if (

            startingPriceCurrency !==

            undefined

        ) {

            const currency =

                cleanString(

                    startingPriceCurrency

                ).toUpperCase();



            if (!currency) {

                return res.status(400).json({

                    success: false,

                    message:

                        "Starting price currency is required.",

                });

            }



            updateData.startingPriceCurrency =

                currency;

        }



        // ----------------------------------------------------
        // ----------------------------------------------------
        // DISCOUNT
        // ----------------------------------------------------

        if (discount !== undefined) {
            const oldDiscount = service.discount || {};

            const updatedDiscount = {
                enabled:
                    discount.enabled !== undefined
                        ? toBoolean(discount.enabled)
                        : toBoolean(oldDiscount.enabled, false),
                value:
                    discount.value !== undefined
                        ? Number(discount.value)
                        : Number(oldDiscount.value) || 0,
                currency:
                    discount.currency !== undefined
                        ? cleanString(discount.currency).toUpperCase()
                        : (oldDiscount.currency || service.startingPriceCurrency || "USD"),
            };

            if (!Number.isFinite(updatedDiscount.value) || updatedDiscount.value < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Discount amount must be a non-negative dollar amount.",
                });
            }

            if (!updatedDiscount.currency) {
                return res.status(400).json({
                    success: false,
                    message: "Discount currency is required.",
                });
            }

            updateData.discount = updatedDiscount;
        }


        // STATUS

        // ----------------------------------------------------



        if (

            status !== undefined

        ) {

            if (

                !allowedStatuses.includes(

                    status

                )

            ) {

                return res.status(400).json({

                    success: false,

                    message:

                        "Invalid service status.",

                });

            }



            updateData.status =

                status;

        }



        // ----------------------------------------------------

        // SORT ORDER

        // ----------------------------------------------------



        if (

            sortOrder !==

            undefined

        ) {

            const numericSortOrder =

                Number(

                    sortOrder

                );



            if (

                !Number.isFinite(

                    numericSortOrder

                )

            ) {

                return res.status(400).json({

                    success: false,

                    message:

                        "sortOrder must be a valid number.",

                });

            }



            updateData.sortOrder =

                numericSortOrder;

        }



        // ----------------------------------------------------

        // FEATURED

        // ----------------------------------------------------



        if (

            isFeatured !==

            undefined

        ) {

            updateData.isFeatured =

                toBoolean(

                    isFeatured

                );

        }



        // ----------------------------------------------------

        // METADATA

        // ----------------------------------------------------



        if (

            metadata !==

            undefined

        ) {

            updateData.metadata =

                metadata &&

                typeof metadata ===

                    "object" &&

                !Array.isArray(

                    metadata

                )

                    ? metadata

                    : {};

        }



        // ====================================================

        // UPDATE DATABASE

        // ====================================================



        const updatedService =

            await Service.findByIdAndUpdate(

                id,



                {

                    $set:

                        updateData,

                },



                {

                    new: true,

                    runValidators: true,

                }

            )

                .populate(

                    "category",

                    "categoryName categoryImage"

                )

                .populate(

                    "subcategory",

                    "subcategoryName subcategoryImage"

                );



        if (!updatedService) {

            return res.status(404).json({

                success: false,

                message:

                    "Service not found.",

            });

        }



        // ====================================================

        // MEDIA UPDATE - BACKGROUND

        // ====================================================



        const thumbnailFile = req.files?.thumbnail?.[0];

        const imageFiles = req.files?.images || [];



        const oldThumbnailPublicId =

            service.thumbnail?.publicId || null;



        const oldImages =

            Array.isArray(service.images)

                ? service.images

                : [];



        // keepImagesInput = images which user wants to KEEP

        const finalExistingImages =

            Array.isArray(keepImagesInput)

                ? keepImagesInput

                : oldImages;



        const finalImagePublicIds = new Set(

            finalExistingImages

                .map((image) => image?.publicId)

                .filter(Boolean)

        );



        const removedImagePublicIds =

            keepImagesInput === undefined

                ? []

                : oldImages

                    .map((image) => image?.publicId)

                    .filter(

                        (publicId) =>

                            publicId &&

                            !finalImagePublicIds.has(publicId)

                    );



        if (

            thumbnailFile ||

            imageFiles.length ||

            removedImagePublicIds.length

        ) {

            void (async () => {

                try {

                    // ----------------------------------------

                    // UPLOAD NEW FILES

                    // ----------------------------------------



                    const [thumbnailResult, imageResults] =

                        await Promise.all([

                            thumbnailFile

                                ? uploadFile(thumbnailFile, "translation/services")

                                : Promise.resolve(null),

                            imageFiles.length

                                ? Promise.all(

                                    imageFiles.map((file) =>

                                        uploadFile(file, "translation/services")

                                    )

                                )

                                : Promise.resolve([]),

                        ]);



                    // ----------------------------------------

                    // PREPARE MEDIA UPDATE

                    // ----------------------------------------



                    const mediaUpdate = {};



                    if (thumbnailResult) {

                        mediaUpdate.thumbnail = {

                            publicId: thumbnailResult.publicId,

                            url: thumbnailResult.url,

                        };

                    }



                    // Kept images + newly uploaded images only.

                    // NEVER use service.images when user removed some.

                    if (imageResults.length) {

                        mediaUpdate.images = [

                            ...finalExistingImages,

                            ...imageResults.map((image) => ({

                                publicId: image.publicId,

                                url: image.url,

                            })),

                        ];

                    }



                    // ----------------------------------------

                    // UPDATE DATABASE

                    // ----------------------------------------



                    if (Object.keys(mediaUpdate).length) {

                        await Service.findByIdAndUpdate(id, {

                            $set: mediaUpdate,

                        });

                    }



                    // ----------------------------------------

                    // DELETE OLD THUMBNAIL

                    // ----------------------------------------



                    if (thumbnailResult && oldThumbnailPublicId) {

                        try {

                            await deleteFile(oldThumbnailPublicId);

                        } catch (deleteError) {

                            console.error("OLD THUMBNAIL DELETE ERROR:", deleteError);

                        }

                    }



                    // ----------------------------------------

                    // DELETE REMOVED IMAGES FROM CLOUDINARY

                    // ----------------------------------------



                    for (const publicId of removedImagePublicIds) {

                        try {

                            await deleteFile(publicId);

                        } catch (deleteError) {

                            console.error("REMOVED IMAGE DELETE ERROR:", deleteError);

                        }

                    }

                } catch (mediaError) {

                    console.error("UPDATE SERVICE MEDIA ERROR:", mediaError);

                }

            })();

        }



        // ====================================================

        // RESPONSE

        // ====================================================



        return res.status(200).json({

            success: true,

            message:

                "Service updated successfully.",

            data:

                updatedService,

        });



    } catch (error) {

        console.error(

            "UPDATE SERVICE ERROR:",

            error

        );



        if (uploadedThumbnail?.publicId) {

            try {

                await deleteFile(uploadedThumbnail.publicId);

            } catch (cleanupError) {

                console.error("NEW THUMBNAIL CLEANUP ERROR:", cleanupError);

            }

        }



        for (const image of uploadedImages) {

            if (!image?.publicId) continue;

            try {

                await deleteFile(image.publicId);

            } catch (cleanupError) {

                console.error("NEW IMAGE CLEANUP ERROR:", cleanupError);

            }

        }



        if (error.code === 11000) {

            return res.status(409).json({

                success: false,

                message:

                    "Another service already uses this slug.",

            });

        }



        if (

            error.name ===

            "ValidationError"

        ) {

            return res.status(400).json({

                success: false,

                message:

                    "Service validation failed.",

                errors:

                    Object.values(

                        error.errors

                    ).map(

                        (err) =>

                            err.message

                    ),

            });

        }



        return res.status(500).json({

            success: false,

            message:

                error.message ||

                "Failed to update service.",

        });

    }

};



// ============================================================

// DELETE / ARCHIVE SERVICE

// DELETE /api/services/:id

// ============================================================



export const deleteService = async (req, res) => {

    try {

        const { id } = req.params;



        if (!mongoose.Types.ObjectId.isValid(id)) {

            return res.status(400).json({

                success: false,

                message: "Invalid service ID.",

            });

        }



        const service = await Service.findById(id);



        if (!service) {

            return res.status(404).json({

                success: false,

                message: "Service not found.",

            });

        }



        const thumbnailPublicId = service.thumbnail?.publicId;

        const imagePublicIds = Array.isArray(service.images)

            ? service.images.map((image) => image?.publicId).filter(Boolean)

            : [];



        await Service.findByIdAndDelete(id);



        // Cloudinary cleanup runs after the API response path.

        void (async () => {

            if (thumbnailPublicId) {

                try {

                    await deleteFile(thumbnailPublicId);

                } catch (deleteError) {

                    console.error("THUMBNAIL DELETE ERROR:", deleteError);

                }

            }



            for (const publicId of imagePublicIds) {

                try {

                    await deleteFile(publicId);

                } catch (deleteError) {

                    console.error("SERVICE IMAGE DELETE ERROR:", deleteError);

                }

            }

        })();



        return res.status(200).json({

            success: true,

            message: "Service deleted successfully.",

            data: {

                _id: id,

            },

        });



    } catch (error) {

        console.error("DELETE SERVICE ERROR:", error);



        return res.status(500).json({

            success: false,

            message:

                error.message ||

                "Failed to delete service.",

        });

    }

};