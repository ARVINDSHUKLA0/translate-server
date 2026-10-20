// import multer from "multer";
// import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// import mammoth from "mammoth";
// import WordExtractor from "word-extractor";
// import { franc } from "franc-min";
// import WordPriceSetting from "../models/WordPriceSetting.model.js";

// // Compatibility for pdfjs-dist versions requiring Promise.withResolvers.
// if (typeof Promise.withResolvers !== "function") {
//   Promise.withResolvers = function () {
//     let resolve;
//     let reject;

//     const promise = new Promise((res, rej) => {
//       resolve = res;
//       reject = rej;
//     });

//     return { promise, resolve, reject };
//   };
// }

// const ALLOWED_EXTENSIONS = ["pdf", "docx", "doc", "txt"];

// const UNSUPPORTED_MESSAGE =
//   "Only PDF, DOC, DOCX, and TXT files are supported.";

// const getExtension = (filename = "") =>
//   filename.split(".").pop().toLowerCase();

// const hasValidContent = (extension, buffer) => {
//   if (!buffer || buffer.length === 0) return false;

//   if (extension === "pdf") {
//     return buffer
//       .subarray(0, 1024)
//       .toString("latin1")
//       .includes("%PDF-");
//   }

//   if (extension === "docx") {
//     return buffer[0] === 0x50 && buffer[1] === 0x4b;
//   }

//   if (extension === "doc") {
//     return (
//       buffer[0] === 0xd0 &&
//       buffer[1] === 0xcf &&
//       buffer[2] === 0x11 &&
//       buffer[3] === 0xe0
//     );
//   }

//   if (extension === "txt") {
//     return !buffer.subarray(0, 8000).includes(0);
//   }

//   return false;
// };

// const extractPdfText = async (buffer) => {
//   const loadingTask = pdfjsLib.getDocument({
//     data: new Uint8Array(buffer),
//     useSystemFonts: true,
//   });

//   try {
//     const pdfDocument = await loadingTask.promise;
//     const pages = [];

//     for (
//       let pageNumber = 1;
//       pageNumber <= pdfDocument.numPages;
//       pageNumber++
//     ) {
//       const page = await pdfDocument.getPage(pageNumber);
//       const content = await page.getTextContent();

//       const pageText = content.items
//         .map((item) => ("str" in item ? item.str : ""))
//         .join(" ");

//       pages.push(pageText);
//     }

//     return pages.join("\n");
//   } finally {
//     await loadingTask.destroy().catch(() => {});
//   }
// };

// const extractDocumentText = async (file) => {
//   const extension = getExtension(file.originalname);

//   if (extension === "txt") {
//     return file.buffer.toString("utf8");
//   }

//   if (extension === "pdf") {
//     return extractPdfText(file.buffer);
//   }

//   if (extension === "docx") {
//     const result = await mammoth.extractRawText({
//       buffer: file.buffer,
//     });

//     return result.value || "";
//   }

//   if (extension === "doc") {
//     const extractor = new WordExtractor();
//     const doc = await extractor.extract(file.buffer);

//     return doc.getBody() || "";
//   }

//   throw new Error(UNSUPPORTED_MESSAGE);
// };

// export const uploadMiddleware = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 100 * 1024 * 1024,
//   },
//   fileFilter: (req, file, callback) => {
//     const extension = getExtension(file.originalname);

//     if (!ALLOWED_EXTENSIONS.includes(extension)) {
//       return callback(new Error(UNSUPPORTED_MESSAGE));
//     }

//     callback(null, true);
//   },
// }).single("file");

// export const uploadDocument = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Please upload a document.",
//       });
//     }

//     const settings = await WordPriceSetting.findOne({
//       settingKey: "default",
//       isActive: true,
//     }).lean();

//     if (!settings) {
//       return res.status(503).json({
//         success: false,
//         message: "Active word pricing settings were not found.",
//       });
//     }

//     const maxFileSizeMB = Number(settings.maxFileSizeMB || 100);

//     if (req.file.size > maxFileSizeMB * 1024 * 1024) {
//       return res.status(413).json({
//         success: false,
//         message: `File size must not exceed ${maxFileSizeMB} MB.`,
//       });
//     }

//     const extension = getExtension(req.file.originalname);

//     if (!hasValidContent(extension, req.file.buffer)) {
//       return res.status(422).json({
//         success: false,
//         message: `This file is not a valid ${extension.toUpperCase()} document.`,
//       });
//     }

//     let rawText;

//     try {
//       rawText = await extractDocumentText(req.file);
//     } catch (extractError) {
//       console.error("Document extract error:", extractError);

//       return res.status(422).json({
//         success: false,
//         message:
//           "Unable to read this document. It may be corrupted or password-protected.",
//       });
//     }

//     const text = (rawText || "").normalize("NFC").trim();

//     if (!text) {
//       return res.status(422).json({
//         success: false,
//         message:
//           "No readable text found. Scanned PDFs may require OCR.",
//       });
//     }

//     // Count words across Unicode scripts, including Hindi.
//     const wordMatches = text.match(
//       /[\p{L}\p{M}\p{N}]+(?:['’.-][\p{L}\p{M}\p{N}]+)*/gu
//     );

//     const wordCount = wordMatches?.length || 0;

//     if (!wordCount) {
//       return res.status(422).json({
//         success: false,
//         message: "No words found in this document.",
//       });
//     }

//     const languageCode = franc(text.slice(0, 20000), {
//       minLength: 20,
//     });

//     if (languageCode === "und") {
//       return res.status(422).json({
//         success: false,
//         message: "Could not reliably detect the document language.",
//       });
//     }

//     const detectedLanguage =
//       languageCode === "eng" ? "English" : languageCode;

//     const baseLanguage = String(
//       settings.baseLanguage || "English"
//     ).trim();

//     const isBaseLanguage =
//       detectedLanguage.toLowerCase() === baseLanguage.toLowerCase();

//     // IMPORTANT: use the value saved by Admin, not a hardcoded 250.
//     const wordsPerPage = Number(settings.wordsPerPage);

//     if (
//       !Number.isSafeInteger(wordsPerPage) ||
//       wordsPerPage < 1
//     ) {
//       return res.status(500).json({
//         success: false,
//         message:
//           "Invalid words-per-page setting. Please update the Admin pricing settings.",
//       });
//     }

//     const minimumPages = Number(settings.minimumPages ?? 1);

//     if (!Number.isFinite(minimumPages) || minimumPages < 1) {
//       return res.status(500).json({
//         success: false,
//         message: "Invalid minimum-pages setting.",
//       });
//     }

//     const billablePages = Math.max(
//       minimumPages,
//       Math.ceil(wordCount / wordsPerPage)
//     );

//     const pricePerPage = Number(settings.pricePerPage);

//     if (!Number.isFinite(pricePerPage) || pricePerPage < 0) {
//       return res.status(500).json({
//         success: false,
//         message: "Invalid price per page in admin settings.",
//       });
//     }

//     const priceMultiplier = isBaseLanguage
//       ? Number(settings.baseLanguageMultiplier ?? 1)
//       : Number(settings.otherLanguageMultiplier ?? 2);

//     if (!Number.isFinite(priceMultiplier) || priceMultiplier < 0) {
//       return res.status(500).json({
//         success: false,
//         message: "Invalid language price multiplier.",
//       });
//     }

//     const totalPrice =
//       Math.round(
//         billablePages * pricePerPage * priceMultiplier * 100
//       ) / 100;

//     return res.status(200).json({
//       success: true,
//       message: "Document processed successfully.",
//       data: {
//         fileName: req.file.originalname,
//         detectedLanguage,
//         languageCode,
//         baseLanguage,
//         wordCount,
//         wordsPerPage,
//         billablePages,
//         pricePerPage,
//         currency: settings.currency || "USD",
//         priceMultiplier,
//         totalPrice,
//       },
//     });
//   } catch (error) {
//     console.error("Document upload error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Unable to read or process the uploaded document.",
//     });
//   }
// };













// import multer from "multer";
// import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// import mammoth from "mammoth";
// import WordExtractor from "word-extractor";
// import { franc } from "franc-min";
// import WordPriceSetting from "../models/WordPriceSetting.model.js";

// // Compatibility for PDF.js versions requiring Promise.withResolvers.
// if (typeof Promise.withResolvers !== "function") {
//   Promise.withResolvers = function () {
//     let resolve;
//     let reject;

//     const promise = new Promise((res, rej) => {
//       resolve = res;
//       reject = rej;
//     });

//     return { promise, resolve, reject };
//   };
// }

// const ALLOWED_EXTENSIONS = ["pdf", "docx", "doc", "txt"];

// const UNSUPPORTED_MESSAGE =
//   "Only PDF, DOC, DOCX, and TXT files are supported.";

// const getExtension = (filename = "") =>
//   filename.split(".").pop().toLowerCase();

// /* -------------------------------------------
//    Validate uploaded file
// -------------------------------------------- */

// const hasValidContent = (extension, buffer) => {
//   if (!buffer || buffer.length === 0) return false;

//   if (extension === "pdf") {
//     return buffer
//       .subarray(0, 1024)
//       .toString("latin1")
//       .includes("%PDF-");
//   }

//   if (extension === "docx") {
//     return (
//       buffer[0] === 0x50 &&
//       buffer[1] === 0x4b
//     );
//   }

//   if (extension === "doc") {
//     return (
//       buffer[0] === 0xd0 &&
//       buffer[1] === 0xcf &&
//       buffer[2] === 0x11 &&
//       buffer[3] === 0xe0
//     );
//   }

//   if (extension === "txt") {
//     return true;
//   }

//   return false;
// };

// /* -------------------------------------------
//    TXT extraction with common encoding support
// -------------------------------------------- */

// const extractTxtText = (buffer) => {
//   if (
//     buffer.length >= 2 &&
//     buffer[0] === 0xff &&
//     buffer[1] === 0xfe
//   ) {
//     return new TextDecoder("utf-16le").decode(
//       buffer.subarray(2)
//     );
//   }

//   if (
//     buffer.length >= 2 &&
//     buffer[0] === 0xfe &&
//     buffer[1] === 0xff
//   ) {
//     return new TextDecoder("utf-16be").decode(
//       buffer.subarray(2)
//     );
//   }

//   const utf8Buffer =
//     buffer[0] === 0xef &&
//     buffer[1] === 0xbb &&
//     buffer[2] === 0xbf
//       ? buffer.subarray(3)
//       : buffer;

//   return new TextDecoder("utf-8", {
//     fatal: false,
//   }).decode(utf8Buffer);
// };

// /* -------------------------------------------
//    PDF text reconstruction
// -------------------------------------------- */

// const extractPdfText = async (buffer) => {
//   const loadingTask = pdfjsLib.getDocument({
//     data: new Uint8Array(buffer),
//     useSystemFonts: true,
//   });

//   try {
//     const pdfDocument = await loadingTask.promise;
//     const pages = [];

//     for (
//       let pageNumber = 1;
//       pageNumber <= pdfDocument.numPages;
//       pageNumber++
//     ) {
//       const page = await pdfDocument.getPage(pageNumber);

//       try {
//         const content = await page.getTextContent();

//         let pageText = "";
//         let previousItem = null;
//         let previousY = null;
//         let previousHeight = 10;

//         for (const item of content.items) {
//           if (typeof item.str !== "string") continue;

//           const currentText = item.str;

//           if (!currentText) continue;

//           const transform = item.transform;
//           const hasPosition =
//             Array.isArray(transform) &&
//             transform.length >= 6;

//           if (!hasPosition) {
//             if (currentText.trim()) {
//               pageText += ` ${currentText}`;
//             }
//             previousItem = null;
//             previousY = null;
//             continue;
//           }

//           const currentX = transform[4];
//           const currentY = transform[5];
//           const currentHeight =
//             Math.abs(transform[3]) || 10;

//           if (previousItem && previousY !== null) {
//             const sameLine =
//               Math.abs(currentY - previousY) <
//               Math.max(currentHeight, previousHeight) * 0.35;

//             if (!sameLine) {
//               pageText += "\n";
//             } else {
//               const previousRight =
//                 previousItem.transform[4] +
//                 Math.max(0, previousItem.width || 0);

//               const gap = currentX - previousRight;

//               const spaceThreshold =
//                 Math.max(currentHeight, previousHeight) * 0.15;

//               if (
//                 gap > spaceThreshold &&
//                 !/\s$/u.test(pageText) &&
//                 !/^\s/u.test(currentText)
//               ) {
//                 pageText += " ";
//               }
//             }
//           }

//           pageText += currentText;

//           if (item.hasEOL) {
//             pageText += "\n";
//             previousItem = null;
//             previousY = null;
//             continue;
//           }

//           previousItem = item;
//           previousY = currentY;
//           previousHeight = currentHeight;
//         }

//         pages.push(pageText);
//       } finally {
//         page.cleanup();
//       }
//     }

//     return pages.join("\n");
//   } finally {
//     await loadingTask.destroy().catch(() => {});
//   }
// };

// /* -------------------------------------------
//    Extract document text
// -------------------------------------------- */

// const extractDocumentText = async (file) => {
//   const extension = getExtension(file.originalname);

//   if (extension === "txt") {
//     return extractTxtText(file.buffer);
//   }

//   if (extension === "pdf") {
//     return extractPdfText(file.buffer);
//   }

//   if (extension === "docx") {
//     const result = await mammoth.extractRawText({
//       buffer: file.buffer,
//     });

//     return result.value || "";
//   }

//   if (extension === "doc") {
//     const extractor = new WordExtractor();

//     const document = await extractor.extract(file.buffer);

//     return document.getBody() || "";
//   }

//   throw new Error(UNSUPPORTED_MESSAGE);
// };

// /* -------------------------------------------
//    Unicode-aware word counting
//    Supports English, Hindi and other scripts.
// -------------------------------------------- */

// // const WORD_PATTERN =
// //   /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*|\p{N}+/gu;

// const WORD_PATTERN =
//   /[**\p**{L}**\p**{M}]+(?:['’][**\p**{L}**\p**{M}]+)\*|**\p**{N}+/gu;

//   console.log("EXTRACTED TEXT END:", text.slice(-500));
// export const countWords = (input = "") => {
//   const text = String(input)
//     .normalize("NFC")
//     .replace(/\u00a0/gu, " ")
//     .replace(/\u200b/gu, "")
//     .replace(/\u0000/gu, "")
//     .trim();

//   if (!text) return 0;

//   let wordCount = 0;
//   let match;

//   // Count matches without creating an array containing
//   // every word in the document.
//   WORD_PATTERN.lastIndex = 0;

//   while ((match = WORD_PATTERN.exec(text)) !== null) {
//     wordCount++;

//     if (wordCount >= Number.MAX_SAFE_INTEGER) {
//       throw new Error(
//         "Document word count exceeds the supported limit."
//       );
//     }
//   }

//   return wordCount;
// };

// /* -------------------------------------------
//    Language detection
// -------------------------------------------- */

// const LANGUAGE_NAMES = {
//   eng: "English",
//   hin: "Hindi",
//   fra: "French",
//   deu: "German",
//   spa: "Spanish",
//   ita: "Italian",
//   por: "Portuguese",
//   rus: "Russian",
//   ara: "Arabic",
//   ben: "Bengali",
//   urd: "Urdu",
//   zho: "Chinese",
//   jpn: "Japanese",
//   kor: "Korean",
//   pan: "Punjabi",
//   tam: "Tamil",
//   tel: "Telugu",
//   mar: "Marathi",
//   guj: "Gujarati",
// };

// const detectLanguage = (text) => {
//   const sample = text
//     .replace(/\s+/gu, " ")
//     .trim()
//     .slice(0, 20000);

//   if ([...sample].length < 20) {
//     return {
//       code: "und",
//       name: "Unknown",
//     };
//   }

//   const code = franc(sample, {
//     minLength: 20,
//   });

//   if (!code || code === "und") {
//     return {
//       code: "und",
//       name: "Unknown",
//     };
//   }

//   return {
//     code,
//     name: LANGUAGE_NAMES[code] || code,
//   };
// };

// /* -------------------------------------------
//    Upload middleware
// -------------------------------------------- */

// export const uploadMiddleware = multer({
//   storage: multer.memoryStorage(),

//   limits: {
//     fileSize: 100 * 1024 * 1024,
//   },

//   fileFilter: (req, file, callback) => {
//     const extension = getExtension(file.originalname);

//     if (!ALLOWED_EXTENSIONS.includes(extension)) {
//       return callback(new Error(UNSUPPORTED_MESSAGE));
//     }

//     callback(null, true);
//   },
// }).single("file");

// /* -------------------------------------------
//    Upload and calculate document price
// -------------------------------------------- */

// export const uploadDocument = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Please upload a document.",
//       });
//     }

//     const settings = await WordPriceSetting.findOne({
//       settingKey: "default",
//       isActive: true,
//     }).lean();

//     if (!settings) {
//       return res.status(503).json({
//         success: false,
//         message:
//           "Active word pricing settings were not found.",
//       });
//     }

//     const maxFileSizeMB = Number(
//       settings.maxFileSizeMB || 100
//     );

//     if (
//       req.file.size >
//       maxFileSizeMB * 1024 * 1024
//     ) {
//       return res.status(413).json({
//         success: false,
//         message: `File size must not exceed ${maxFileSizeMB} MB.`,
//       });
//     }

//     const extension = getExtension(
//       req.file.originalname
//     );

//     if (
//       !hasValidContent(extension, req.file.buffer)
//     ) {
//       return res.status(422).json({
//         success: false,
//         message: `This file is not a valid ${extension.toUpperCase()} document.`,
//       });
//     }

//     let rawText;

//     try {
//       rawText = await extractDocumentText(req.file);
//     } catch (extractError) {
//       console.error(
//         "Document extract error:",
//         extractError
//       );

//       return res.status(422).json({
//         success: false,
//         message:
//           "Unable to read this document. It may be corrupted, unsupported, or password-protected.",
//       });
//     }

//     const text = String(rawText || "")
//       .normalize("NFC")
//       .replace(/\u0000/gu, "")
//       .trim();

//       console.log("FILE:", req.file.originalname);
// console.log("EXTRACTED TEXT LENGTH:", text.length);
// console.log("EXTRACTED TEXT END:", text.slice(-500));
// console.log("WEBSITE WORD COUNT:", countWords(text));

//     if (!text) {
//       return res.status(422).json({
//         success: false,
//         message:
//           "No readable text found. Scanned PDFs may require OCR.",
//       });
//     }

//     /* WORD COUNT */

//     const wordCount = countWords(text);

//     if (!wordCount) {
//       return res.status(422).json({
//         success: false,
//         message: "No words found in this document.",
//       });
//     }

//     /* LANGUAGE */

//     const language = detectLanguage(text);

//     if (language.code === "und") {
//       return res.status(422).json({
//         success: false,
//         message:
//           "Could not reliably detect the document language. Please upload a document containing more readable text.",
//       });
//     }

//     const detectedLanguage = language.name;

//     const baseLanguage = String(
//       settings.baseLanguage || "English"
//     ).trim();

//     const isBaseLanguage =
//       detectedLanguage.toLowerCase() ===
//       baseLanguage.toLowerCase();

//     /* BILLABLE PAGES */

//     const wordsPerPage = Number(
//       settings.wordsPerPage
//     );

//     if (
//       !Number.isSafeInteger(wordsPerPage) ||
//       wordsPerPage < 1
//     ) {
//       return res.status(500).json({
//         success: false,
//         message:
//           "Invalid words-per-page setting. Please update the Admin pricing settings.",
//       });
//     }

//     const minimumPages = Number(
//       settings.minimumPages ?? 1
//     );

//     if (
//       !Number.isSafeInteger(minimumPages) ||
//       minimumPages < 1
//     ) {
//       return res.status(500).json({
//         success: false,
//         message: "Invalid minimum-pages setting.",
//       });
//     }

//     const billablePages = Math.max(
//       minimumPages,
//       Math.ceil(wordCount / wordsPerPage)
//     );

//     /* PRICE CALCULATION
//        Existing pricing formula preserved.
//     */

//     const pricePerPage = Number(
//       settings.pricePerPage
//     );

//     if (
//       !Number.isFinite(pricePerPage) ||
//       pricePerPage < 0
//     ) {
//       return res.status(500).json({
//         success: false,
//         message:
//           "Invalid price per page in admin settings.",
//       });
//     }

//     const priceMultiplier = isBaseLanguage
//       ? Number(
//           settings.baseLanguageMultiplier ?? 1
//         )
//       : Number(
//           settings.otherLanguageMultiplier ?? 2
//         );

//     if (
//       !Number.isFinite(priceMultiplier) ||
//       priceMultiplier < 0
//     ) {
//       return res.status(500).json({
//         success: false,
//         message:
//           "Invalid language price multiplier.",
//       });
//     }

//     const totalPrice =
//       Math.round(
//         billablePages *
//           pricePerPage *
//           priceMultiplier *
//           100
//       ) / 100;

//     /* RESPONSE: Existing field names preserved */

//     return res.status(200).json({
//       success: true,
//       message: "Document processed successfully.",

//       data: {
//         fileName: req.file.originalname,
//         detectedLanguage,
//         languageCode: language.code,
//         baseLanguage,
//         wordCount,
//         wordsPerPage,
//         billablePages,
//         pricePerPage,
//         currency: settings.currency || "USD",
//         priceMultiplier,
//         totalPrice,
//       },
//     });
//   } catch (error) {
//     console.error(
//       "Document upload error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message:
//         "Unable to read or process the uploaded document.",
//     });
//   }
// };







// // import multer from "multer";
// // import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// // import mammoth from "mammoth";
// // import WordExtractor from "word-extractor";
// // import { franc } from "franc-min";
// // import WordPriceSetting from "../models/WordPriceSetting.model.js";

// // // Compatibility for pdfjs-dist versions requiring Promise.withResolvers.
// // if (typeof Promise.withResolvers !== "function") {
// //   Promise.withResolvers = function () {
// //     let resolve;
// //     let reject;

// //     const promise = new Promise((res, rej) => {
// //       resolve = res;
// //       reject = rej;
// //     });

// //     return { promise, resolve, reject };
// //   };
// // }

// // const ALLOWED_EXTENSIONS = ["pdf", "docx", "doc", "txt"];

// // const UNSUPPORTED_MESSAGE =
// //   "Only PDF, DOC, DOCX, and TXT files are supported.";

// // const getExtension = (filename = "") =>
// //   filename.split(".").pop().toLowerCase();

// // const hasValidContent = (extension, buffer) => {
// //   if (!buffer || buffer.length === 0) return false;

// //   if (extension === "pdf") {
// //     return buffer
// //       .subarray(0, 1024)
// //       .toString("latin1")
// //       .includes("%PDF-");
// //   }

// //   if (extension === "docx") {
// //     return buffer[0] === 0x50 && buffer[1] === 0x4b;
// //   }

// //   if (extension === "doc") {
// //     return (
// //       buffer[0] === 0xd0 &&
// //       buffer[1] === 0xcf &&
// //       buffer[2] === 0x11 &&
// //       buffer[3] === 0xe0
// //     );
// //   }

// //   if (extension === "txt") {
// //     return !buffer.subarray(0, 8000).includes(0);
// //   }

// //   return false;
// // };

// // const extractPdfText = async (buffer) => {
// //   const loadingTask = pdfjsLib.getDocument({
// //     data: new Uint8Array(buffer),
// //     useSystemFonts: true,
// //   });

// //   try {
// //     const pdfDocument = await loadingTask.promise;
// //     const pages = [];

// //     for (
// //       let pageNumber = 1;
// //       pageNumber <= pdfDocument.numPages;
// //       pageNumber++
// //     ) {
// //       const page = await pdfDocument.getPage(pageNumber);
// //       const content = await page.getTextContent();

// //       const pageText = content.items
// //         .map((item) => ("str" in item ? item.str : ""))
// //         .join(" ");

// //       pages.push(pageText);
// //     }

// //     return pages.join("\n");
// //   } finally {
// //     await loadingTask.destroy().catch(() => {});
// //   }
// // };

// // const extractDocumentText = async (file) => {
// //   const extension = getExtension(file.originalname);

// //   if (extension === "txt") {
// //     return file.buffer.toString("utf8");
// //   }

// //   if (extension === "pdf") {
// //     return extractPdfText(file.buffer);
// //   }

// //   if (extension === "docx") {
// //     const result = await mammoth.extractRawText({
// //       buffer: file.buffer,
// //     });

// //     return result.value || "";
// //   }

// //   if (extension === "doc") {
// //     const extractor = new WordExtractor();
// //     const doc = await extractor.extract(file.buffer);

// //     return doc.getBody() || "";
// //   }

// //   throw new Error(UNSUPPORTED_MESSAGE);
// // };

// // export const uploadMiddleware = multer({
// //   storage: multer.memoryStorage(),
// //   limits: {
// //     fileSize: 100 * 1024 * 1024,
// //   },
// //   fileFilter: (req, file, callback) => {
// //     const extension = getExtension(file.originalname);

// //     if (!ALLOWED_EXTENSIONS.includes(extension)) {
// //       return callback(new Error(UNSUPPORTED_MESSAGE));
// //     }

// //     callback(null, true);
// //   },
// // }).single("file");

// // export const uploadDocument = async (req, res) => {
// //   try {
// //     if (!req.file) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Please upload a document.",
// //       });
// //     }

// //     const settings = await WordPriceSetting.findOne({
// //       settingKey: "default",
// //       isActive: true,
// //     }).lean();

// //     if (!settings) {
// //       return res.status(503).json({
// //         success: false,
// //         message: "Active word pricing settings were not found.",
// //       });
// //     }

// //     const maxFileSizeMB = Number(settings.maxFileSizeMB || 100);

// //     if (req.file.size > maxFileSizeMB * 1024 * 1024) {
// //       return res.status(413).json({
// //         success: false,
// //         message: `File size must not exceed ${maxFileSizeMB} MB.`,
// //       });
// //     }

// //     const extension = getExtension(req.file.originalname);

// //     if (!hasValidContent(extension, req.file.buffer)) {
// //       return res.status(422).json({
// //         success: false,
// //         message: `This file is not a valid ${extension.toUpperCase()} document.`,
// //       });
// //     }

// //     let rawText;

// //     try {
// //       rawText = await extractDocumentText(req.file);
// //     } catch (extractError) {
// //       console.error("Document extract error:", extractError);

// //       return res.status(422).json({
// //         success: false,
// //         message:
// //           "Unable to read this document. It may be corrupted or password-protected.",
// //       });
// //     }

// //     const text = (rawText || "").normalize("NFC").trim();

// //     if (!text) {
// //       return res.status(422).json({
// //         success: false,
// //         message:
// //           "No readable text found. Scanned PDFs may require OCR.",
// //       });
// //     }

// //     // Count words across Unicode scripts, including Hindi.
// //     const wordMatches = text.match(
// //       /[\p{L}\p{M}\p{N}]+(?:['’.-][\p{L}\p{M}\p{N}]+)*/gu
// //     );

// //     const wordCount = wordMatches?.length || 0;

// //     if (!wordCount) {
// //       return res.status(422).json({
// //         success: false,
// //         message: "No words found in this document.",
// //       });
// //     }

// //     const languageCode = franc(text.slice(0, 20000), {
// //       minLength: 20,
// //     });

// //     if (languageCode === "und") {
// //       return res.status(422).json({
// //         success: false,
// //         message: "Could not reliably detect the document language.",
// //       });
// //     }

// //     const detectedLanguage =
// //       languageCode === "eng" ? "English" : languageCode;

// //     const baseLanguage = String(
// //       settings.baseLanguage || "English"
// //     ).trim();

// //     const isBaseLanguage =
// //       detectedLanguage.toLowerCase() === baseLanguage.toLowerCase();

// //     // IMPORTANT: use the value saved by Admin, not a hardcoded 250.
// //     const wordsPerPage = Number(settings.wordsPerPage);

// //     if (
// //       !Number.isSafeInteger(wordsPerPage) ||
// //       wordsPerPage < 1
// //     ) {
// //       return res.status(500).json({
// //         success: false,
// //         message:
// //           "Invalid words-per-page setting. Please update the Admin pricing settings.",
// //       });
// //     }

// //     const minimumPages = Number(settings.minimumPages ?? 1);

// //     if (!Number.isFinite(minimumPages) || minimumPages < 1) {
// //       return res.status(500).json({
// //         success: false,
// //         message: "Invalid minimum-pages setting.",
// //       });
// //     }

// //     const billablePages = Math.max(
// //       minimumPages,
// //       Math.ceil(wordCount / wordsPerPage)
// //     );

// //     const pricePerPage = Number(settings.pricePerPage);

// //     if (!Number.isFinite(pricePerPage) || pricePerPage < 0) {
// //       return res.status(500).json({
// //         success: false,
// //         message: "Invalid price per page in admin settings.",
// //       });
// //     }

// //     const priceMultiplier = isBaseLanguage
// //       ? Number(settings.baseLanguageMultiplier ?? 1)
// //       : Number(settings.otherLanguageMultiplier ?? 2);

// //     if (!Number.isFinite(priceMultiplier) || priceMultiplier < 0) {
// //       return res.status(500).json({
// //         success: false,
// //         message: "Invalid language price multiplier.",
// //       });
// //     }

// //     const totalPrice =
// //       Math.round(
// //         billablePages * pricePerPage * priceMultiplier * 100
// //       ) / 100;

// //     return res.status(200).json({
// //       success: true,
// //       message: "Document processed successfully.",
// //       data: {
// //         fileName: req.file.originalname,
// //         detectedLanguage,
// //         languageCode,
// //         baseLanguage,
// //         wordCount,
// //         wordsPerPage,
// //         billablePages,
// //         pricePerPage,
// //         currency: settings.currency || "USD",
// //         priceMultiplier,
// //         totalPrice,
// //       },
// //     });
// //   } catch (error) {
// //     console.error("Document upload error:", error);

// //     return res.status(500).json({
// //       success: false,
// //       message: "Unable to read or process the uploaded document.",
// //     });
// //   }
// // };













 

// // Word-count / price calculator for uploaded documents.
// import multer from "multer";
// import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// import mammoth from "mammoth";
// import WordExtractor from "word-extractor";
// import JSZip from "jszip";
// import * as mupdf from "mupdf";
// import { franc } from "franc-min";
// import WordPriceSetting from "../models/WordPriceSetting.model.js";

// /* -------------------------------------------
//    PDF.js compatibility
// ------------------------------------------- */
// if (typeof Promise.withResolvers !== "function") {
//   Promise.withResolvers = function () {
//     let resolve, reject;
//     const promise = new Promise((res, rej) => {
//       resolve = res;
//       reject = rej;
//     });
//     return { promise, resolve, reject };
//   };
// }

// /* -------------------------------------------
//    Config
// ------------------------------------------- */
// const UNSUPPORTED_MESSAGE = "Unsupported file type. Upload a readable PDF, DOC, DOCX, TXT, PPTX, XLSX, CSV, RTF, HTML, or ODT file.";
// const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
// const MAX_PDF_PAGES = 2000;
// const DEBUG_WORDCOUNT = true;

// const COUNT_SYMBOL_ONLY_TOKENS = false;

// /* -------------------------------------------
//    File type detection (signature based)
// ------------------------------------------- */
// const looksBinary = (buffer) => {
//   if (
//     buffer.length >= 2 &&
//     ((buffer[0] === 0xff && buffer[1] === 0xfe) ||
//       (buffer[0] === 0xfe && buffer[1] === 0xff))
//   ) {
//     return false;
//   }
//   const limit = Math.min(buffer.length, 8000);
//   for (let i = 0; i < limit; i++) {
//     if (buffer[i] === 0x00) return true;
//   }
//   return false;
// };

// const detectKind = async (buffer) => {
//   if (!buffer?.length) return null;

//   if (buffer.subarray(0, 1024).toString("latin1").includes("%PDF-")) {
//     return "pdf";
//   }

//   if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
//     try {
//       const zip = await JSZip.loadAsync(buffer);
//       if (zip.file("word/document.xml")) return "docx";
//       if (zip.file("ppt/presentation.xml") || zip.file("ppt/slides/slide1.xml")) return "pptx";
//       if (zip.file("xl/workbook.xml")) return "xlsx";
//       if (zip.file("content.xml") && (zip.file("mimetype") || zip.file("META-INF/manifest.xml"))) return "odt";
//     } catch {
//       /* corrupt zip */
//     }
//     return null;
//   }

//   if (
//     buffer[0] === 0xd0 &&
//     buffer[1] === 0xcf &&
//     buffer[2] === 0x11 &&
//     buffer[3] === 0xe0
//   ) {
//     return "doc";
//   }

//   const textStart = buffer.subarray(0, 4096).toString("utf8").replace(/^\uFEFF/, "").trimStart();
//   if (/^\{\\rtf/i.test(textStart)) return "rtf";
//   if (/^(?:<!doctype\s+html|<html\b|<head\b|<body\b)/i.test(textStart)) return "html";

//   if (!looksBinary(buffer)) return "txt";

//   return null;
// };

// /* -------------------------------------------
//    TXT extraction
// ------------------------------------------- */
// const extractTxtText = (buffer) => {
//   if (!buffer?.length) return "";
//   if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
//     return new TextDecoder("utf-16le").decode(buffer.subarray(2));
//   }
//   if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
//     return new TextDecoder("utf-16be").decode(buffer.subarray(2));
//   }
//   const hasUtf8Bom =
//     buffer.length >= 3 &&
//     buffer[0] === 0xef &&
//     buffer[1] === 0xbb &&
//     buffer[2] === 0xbf;
//   const data = hasUtf8Bom ? buffer.subarray(3) : buffer;
//   try {
//     return new TextDecoder("utf-8", { fatal: true }).decode(data);
//   } catch {
//     return new TextDecoder("windows-1252").decode(data);
//   }
// };

// /* -------------------------------------------
//    PDF extraction & Header/Footer Stripping
// ------------------------------------------- */
// const PAGE_NUMBER_LINE = /^(?:page\s*)?\d{1,4}(?:\s*(?:of|\/)\s*\d{1,4})?$/i;

// const STARTS_WITH_MARK = /^[\p{M}\u200c\u200d]/u;
// // FIX APPLIED HERE (\u200D instead of \200D)
// const ENDS_WITH_JOINER = /[\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D\u200D]$/u;
// const INDIC_SCRIPT = /[\u0900-\u0DFF]/;

// const buildPageText = (items) => {
//   let text = "";
//   let prev = null;

//   for (const item of items) {
//     if (typeof item.str !== "string") continue;

//     if (item.str === "") {
//       if (item.hasEOL && text && !text.endsWith("\n")) text += "\n";
//       continue;
//     }

//     const tf = item.transform;
//     const canCompare =
//       prev &&
//       Array.isArray(tf) &&
//       tf.length >= 6 &&
//       Array.isArray(prev.transform) &&
//       prev.transform.length >= 6;

//     if (
//       canCompare &&
//       !/\s$/.test(text) &&
//       !/^\s/.test(item.str) &&
//       !STARTS_WITH_MARK.test(item.str) &&
//       !ENDS_WITH_JOINER.test(text)
//     ) {
//       const h = Math.max(
//         Math.abs(tf[3]) || 10,
//         Math.abs(prev.transform[3]) || 10
//       );
//       const sameLine = Math.abs(tf[5] - prev.transform[5]) < h * 0.5;

//       if (!sameLine) {
//         text += " ";
//       } else if (prev.width > 0) {
//         const gap = tf[4] - (prev.transform[4] + prev.width);
//         const indic = INDIC_SCRIPT.test(item.str) || INDIC_SCRIPT.test(prev.str);
//         if (gap > h * (indic ? 0.3 : 0.18)) text += " ";
//       }
//     }

//     text += item.str;
//     prev = item;

//     if (item.hasEOL) text += "\n";
//   }

//   return text;
// };

// const stripPageNumberLines = (pageText) => {
//   const lines = pageText.split("\n").map(l => l.trim()).filter(Boolean);
//   while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
//   while (lines.length && !lines[0].trim()) lines.shift();

//   if (lines.length > 1 && PAGE_NUMBER_LINE.test(lines[lines.length - 1].trim())) {
//     lines.pop();
//   }
//   if (lines.length > 1 && PAGE_NUMBER_LINE.test(lines[0].trim())) {
//     lines.shift();
//   }
//   return lines.join("\n");
// };

// const extractPdfTextPdfJs = async (buffer) => {
//   const loadingTask = pdfjsLib.getDocument({
//     data: new Uint8Array(buffer),
//     useSystemFonts: true,
//     isEvalSupported: false,
//     disableFontFace: true,
//     verbosity: 0,
//   });

//   try {
//     const pdf = await loadingTask.promise;
//     if (pdf.numPages > MAX_PDF_PAGES) {
//       const err = new Error("PDF has too many pages.");
//       err.code = "PDF_TOO_MANY_PAGES";
//       throw err;
//     }

//     const pages = [];
//     for (let p = 1; p <= pdf.numPages; p++) {
//       const page = await pdf.getPage(p);
//       try {
//         const { items } = await page.getTextContent();
//         pages.push(stripPageNumberLines(buildPageText(items)));
//       } finally {
//         page.cleanup();
//       }
//     }

//     return pages.join("\n");
//   } finally {
//     await loadingTask.destroy().catch(() => {});
//   }
// };

// const extractPdfText = async (buffer) => {
//   let doc;
//   try {
//     doc = mupdf.Document.openDocument(buffer, "application/pdf");
//   } catch (e) {
//     console.warn("mupdf open failed, falling back to pdf.js:", e?.message);
//     return extractPdfTextPdfJs(buffer);
//   }

//   try {
//     if (doc.needsPassword()) {
//       const err = new Error("PDF is password protected.");
//       err.name = "PasswordException";
//       throw err;
//     }

//     const pageCount = doc.countPages();
//     if (pageCount > MAX_PDF_PAGES) {
//       const err = new Error("PDF has too many pages.");
//       err.code = "PDF_TOO_MANY_PAGES";
//       throw err;
//     }

//     const pages = [];
//     for (let p = 0; p < pageCount; p++) {
//       const page = doc.loadPage(p);
//       try {
//         const stext = page.toStructuredText("preserve-whitespace");
//         pages.push(stripPageNumberLines(stext.asText()));
//         stext.destroy?.();
//       } finally {
//         page.destroy?.();
//       }
//     }

//     return pages.join("\n");
//   } catch (e) {
//     if (e?.name === "PasswordException" || e?.code === "PDF_TOO_MANY_PAGES") {
//       throw e;
//     }
//     console.warn("mupdf extract failed, falling back to pdf.js:", e?.message);
//     return extractPdfTextPdfJs(buffer);
//   } finally {
//     doc.destroy?.();
//   }
// };

// /* -------------------------------------------
//    DOCX / DOC extraction
// ------------------------------------------- */
// const extractWithWordExtractor = async (buffer) => {
//   const extractor = new WordExtractor();
//   const doc = await extractor.extract(buffer);
//   return doc.getBody() || "";
// };

// const extractDocxText = async (buffer) => {
//   try {
//     const result = await mammoth.extractRawText({ buffer });
//     if (result?.value?.trim()) return result.value;
//   } catch (e) {
//     console.warn("mammoth failed:", e.message);
//   }
//   try {
//     return await extractWithWordExtractor(buffer);
//   } catch {
//     return "";
//   }
// };

// const extractDocText = (buffer) => extractWithWordExtractor(buffer);

// /* -------------------------------------------
//    PowerPoint / spreadsheet / OpenDocument extraction
// ------------------------------------------- */
// const decodeXml = (value = "") => String(value)
//   .replace(/&amp;/g, "&")
//   .replace(/&lt;/g, "<")
//   .replace(/&gt;/g, ">")
//   .replace(/&quot;/g, '"')
//   .replace(/&apos;/g, "'")
//   .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
//   .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

// const xmlText = (xml = "") => decodeXml(String(xml)
//   .replace(/<(?:a:br|text:line-break)\b[^>]*\/>/g, "\n")
//   .replace(/<\/(?:a:p|text:p|text:h)>/g, "\n")
//   .replace(/<(?:text:tab|text:s)\b[^>]*\/>/g, " ")
//   .replace(/<[^>]+>/g, ""));

// const extractPptxText = async (buffer) => {
//   const zip = await JSZip.loadAsync(buffer);
//   const slideNames = Object.keys(zip.files)
//     .filter((name) => /^ppt\/(?:slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml$/i.test(name) && !zip.files[name].dir)
//     .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
//   const chunks = [];
//   for (const name of slideNames) chunks.push(xmlText(await zip.file(name).async("string")));
//   return chunks.join("\n");
// };

// const extractXlsxText = async (buffer) => {
//   const zip = await JSZip.loadAsync(buffer);
//   const names = Object.keys(zip.files);
//   const chunks = [];
//   const sharedFile = zip.file("xl/sharedStrings.xml");
//   let sharedStrings = [];
//   if (sharedFile) {
//     const xml = await sharedFile.async("string");
//     sharedStrings = [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => xmlText(m[1]));
//   }
//   const sheetNames = names.filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name) && !zip.files[name].dir)
//     .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
//   for (const name of sheetNames) {
//     const xml = await zip.file(name).async("string");
//     for (const match of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
//       const type = /\bt="([^"]+)"/.exec(match[1])?.[1];
//       const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(match[2])?.[1];
//       if (type === "s" && value !== undefined) chunks.push(sharedStrings[Number(value)] || "");
//       else if (type === "inlineStr") chunks.push(xmlText(match[2]));
//       else if (value !== undefined) chunks.push(decodeXml(value));
//     }
//   }
//   return chunks.join("\n");
// };

// const extractRtfText = (buffer) => {
//   const src = extractTxtText(buffer);
//   const SKIP = new Set(["fonttbl","colortbl","stylesheet","info","pict","header","footer","headerl","headerr","headerf","footerl","footerr","footerf","themedata","colorschememapping","latentstyles","datastore","listtable","listoverridetable","revtbl","rsidtbl","generator","xmlnstbl","fldinst","object","bin"]);
//   let out = "", i = 0, skipDepth = 0, depth = 0, uc = 1, skipChars = 0, destPending = false;
//   while (i < src.length) {
//     const ch = src[i];
//     if (ch === "{") { depth++; destPending = true; i++; continue; }
//     if (ch === "}") { if (skipDepth && depth === skipDepth) skipDepth = 0; depth--; destPending = false; i++; continue; }
//     if (ch === "\\") {
//       const nx = src[i + 1];
//       if (nx === "'") {
//         const hex = src.substr(i + 2, 2); i += 4;
//         if (!skipDepth) { if (skipChars) skipChars--; else out += Buffer.from([parseInt(hex, 16)]).toString("latin1"); }
//         continue;
//       }
//       if (nx === "\\" || nx === "{" || nx === "}") { if (!skipDepth) out += nx; i += 2; destPending = false; continue; }
//       if (nx === "*") { if (!skipDepth && destPending) skipDepth = depth; i += 2; continue; }
//       const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(src.slice(i, i + 40));
//       if (m) {
//         const w = m[1], n = m[2];
//         i += m[0].length;
//         if (!skipDepth && destPending && SKIP.has(w)) skipDepth = depth;
//         destPending = false;
//         if (skipDepth) continue;
//         if (w === "par" || w === "line" || w === "row" || w === "sect" || w === "page") out += "\n";
//         else if (w === "tab" || w === "cell") out += " ";
//         else if (w === "uc" && n) uc = Number(n);
//         else if (w === "u" && n) { let c = Number(n); if (c < 0) c += 65536; out += String.fromCharCode(c); skipChars = uc; }
//         continue;
//       }
//       i += 2; continue;
//     }
//     destPending = false;
//     if (ch === "\r" || ch === "\n") { i++; continue; }
//     if (!skipDepth) { if (skipChars) skipChars--; else out += ch; }
//     i++;
//   }
//   return out;
// };

// const extractOdtText = async (buffer) => {
//   const zip = await JSZip.loadAsync(buffer);
//   const file = zip.file("content.xml");
//   return file ? xmlText(await file.async("string")) : "";
// };

// /* -------------------------------------------
//    Unified text cleaner (FIXED FOR HINDI/UNICODE)
// ------------------------------------------- */
// const cleanExtractedText = (text = "", kind = "") => {
//   if (!text) return "";

//   let cleaned = String(text)
//     .normalize("NFC")
//     .replace(/\r\n?/g, "\n")
//     .replace(/[\u00a0\u2007\u202f\u200b\u2028\u2029]/g, " ")
//     .replace(/[\u00ad\ufeff\u0000]/g, "")
//     .replace(/(\p{L})-\n(\p{L})/gu, "$1$2");

//   if (kind === "pdf") {
//     // A word can never START with a combining mark (matra, nukta, bindi, addak, etc.),
//     // so a space before one is an extraction artifact. Works for every script
//     // (Hindi, Punjabi, Bengali, Tamil, Arabic, Thai...).
//     // NOTE: we must NOT remove the space AFTER a virama/halant - many real words
//     // end with it (e.g. "विद्वान् पुरुष") and removing it merges two words into one.
//     cleaned = cleaned.replace(/[ \t]+(?=[\p{M}\u200c\u200d])/gu, "");
//   }

//   cleaned = cleaned
//     .replace(/[ \t]+/g, " ")
//     .replace(/\n\s*\n/g, "\n")
//     .trim();

//   return cleaned;
// };

// const extractDocumentText = async (file, kind) => {
//   let rawText = "";
//   if (kind === "txt") rawText = extractTxtText(file.buffer);
//   else if (kind === "pdf") rawText = await extractPdfText(file.buffer);
//   else if (kind === "docx") rawText = await extractDocxText(file.buffer);
//   else if (kind === "doc") rawText = await extractDocText(file.buffer);
//   else if (kind === "pptx") rawText = await extractPptxText(file.buffer);
//   else if (kind === "xlsx") rawText = await extractXlsxText(file.buffer);
//   else if (kind === "odt") rawText = await extractOdtText(file.buffer);
//   else if (kind === "csv") rawText = extractTxtText(file.buffer);
//   else if (kind === "rtf") rawText = extractRtfText(file.buffer);
//   else if (kind === "html") rawText = extractTxtText(file.buffer).replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
//   else throw new Error(UNSUPPORTED_MESSAGE);

//   const cleaned = cleanExtractedText(rawText, kind);

//   if (kind === "pdf" && cleaned) {
//     const bad = (cleaned.match(/[\uE000-\uF8FF\uFFFD\u0001-\u0008\u000B\u000C\u000E-\u001F]/g) || []).length;
//     const total = cleaned.replace(/\s/g, "").length || 1;
//     if (bad > 0 && bad / total > 0.05) {
//       const err = new Error("PDF font encoding is not readable.");
//       err.code = "PDF_BAD_ENCODING";
//       throw err;
//     }
//   }

//   return cleaned;
// };

// /* -------------------------------------------
//    Word counter with Punctuation Stripping
// ------------------------------------------- */
// const CJK_RANGE =
//   /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;
// const HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

// const SPACELESS_SCRIPT = /[\u0e00-\u0eff\u1000-\u109f\u1780-\u17ff]/;
// const wordSegmenter =
//   typeof Intl !== "undefined" && Intl.Segmenter
//     ? new Intl.Segmenter(undefined, { granularity: "word" })
//     : null;

// const countSpacelessToken = (token) => {
//   if (!wordSegmenter) return 1;
//   let n = 0;
//   for (const s of wordSegmenter.segment(token)) if (s.isWordLike) n++;
//   return n || 1;
// };

// export const countWords = (input = "") => {
//   const text = String(input || "");
//   if (!text.trim()) return 0;

//   const cjkCount = (text.match(CJK_RANGE) || []).length;
//   const rest = text.replace(CJK_RANGE, " ");

//   let tokens = rest.split(/\s+/).filter(Boolean);
//   let count = cjkCount;

//   for (let token of tokens) {
//     const cleanToken = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
//     if (!cleanToken) {
//       if (COUNT_SYMBOL_ONLY_TOKENS) count++;
//       continue;
//     }

//     if (HAS_LETTER_OR_NUMBER.test(cleanToken)) {
//       count += SPACELESS_SCRIPT.test(cleanToken) ? countSpacelessToken(cleanToken) : 1;
//     }
//   }
//   return count;
// };

// /* -------------------------------------------
//    Language detection
// ------------------------------------------- */
// const LANGUAGE_NAMES = {
//   eng: "English",
//   hin: "Hindi",
//   fra: "French",
//   deu: "German",
//   spa: "Spanish",
//   ita: "Italian",
//   por: "Portuguese",
//   rus: "Russian",
//   arb: "Arabic",
//   ara: "Arabic",
//   ben: "Bengali",
//   urd: "Urdu",
//   cmn: "Chinese",
//   zho: "Chinese",
//   jpn: "Japanese",
//   kor: "Korean",
//   pan: "Punjabi",
//   tam: "Tamil",
//   tel: "Telugu",
//   mar: "Marathi",
//   guj: "Gujarati",
//   kan: "Kannada",
//   mal: "Malayalam",
//   npi: "Nepali",
//   pes: "Persian",
//   tur: "Turkish",
//   nld: "Dutch",
//   pol: "Polish",
//   ukr: "Ukrainian",
//   vie: "Vietnamese",
//   tha: "Thai",
//   ind: "Indonesian",
// };

// const detectLanguage = (text) => {
//   const sample = text.replace(/\s+/g, " ").trim().slice(0, 20000);

//   const kana = (sample.match(/[\u3040-\u30ff]/g) || []).length;
//   const hangul = (sample.match(/[\uac00-\ud7af]/g) || []).length;
//   const han = (sample.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
//   const letters = (sample.match(/\p{L}/gu) || []).length || 1;
//   if ((kana + hangul + han) / letters > 0.3) {
//     if (kana > 0) return { code: "jpn", name: "Japanese" };
//     if (hangul > han) return { code: "kor", name: "Korean" };
//     return { code: "cmn", name: "Chinese" };
//   }

//   if ([...sample].length < 20) return { code: "und", name: "Unknown" };

//   const code = franc(sample, {
//     minLength: 20,
//     only: Object.keys(LANGUAGE_NAMES),
//   });
//   if (!code || code === "und") return { code: "und", name: "Unknown" };

//   return { code, name: LANGUAGE_NAMES[code] || code };
// };

// /* -------------------------------------------
//    Upload middleware
// ------------------------------------------- */
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
// }).single("file");

// export const uploadMiddleware = (req, res, next) => {
//   upload(req, res, (err) => {
//     if (!err) return next();

//     if (err instanceof multer.MulterError) {
//       const tooLarge = err.code === "LIMIT_FILE_SIZE";
//       return res.status(tooLarge ? 413 : 400).json({
//         success: false,
//         message: tooLarge
//           ? `File size must not exceed ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
//           : "Invalid upload request.",
//       });
//     }
//     return res
//       .status(400)
//       .json({ success: false, message: err.message || UNSUPPORTED_MESSAGE });
//   });
// };

// /* -------------------------------------------
//    Main handler
// ------------------------------------------- */
// export { extractDocumentText, detectKind };

// export const uploadDocument = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Please upload a document." });
//     }

//     const settings = await WordPriceSetting.findOne({
//       settingKey: "default",
//       isActive: true,
//     }).lean();

//     if (!settings) {
//       return res.status(503).json({
//         success: false,
//         message: "Active word pricing settings were not found.",
//       });
//     }

//     const maxMB = Number(settings.maxFileSizeMB || 100);
//     if (req.file.size > maxMB * 1024 * 1024) {
//       return res.status(413).json({
//         success: false,
//         message: `File size must not exceed ${maxMB} MB.`,
//       });
//     }

//     const kind = await detectKind(req.file.buffer);
//     if (!kind) {
//       return res.status(422).json({
//         success: false,
//         message: UNSUPPORTED_MESSAGE,
//       });
//     }

//     let text;
//     try {
//       text = await extractDocumentText(req.file, kind);
//     } catch (e) {
//       console.error("Extract error:", e);
//       if (e?.name === "PasswordException") {
//         return res.status(422).json({
//           success: false,
//           message: "This PDF is password protected.",
//         });
//       }
//       if (e?.code === "PDF_BAD_ENCODING") {
//         return res.status(422).json({
//           success: false,
//           message:
//             "This PDF uses a font encoding that cannot be read reliably. Please upload DOCX/TXT or a PDF with Unicode text.",
//         });
//       }
//       if (e?.code === "PDF_TOO_MANY_PAGES") {
//         return res.status(422).json({
//           success: false,
//           message: `PDF must not exceed ${MAX_PDF_PAGES} pages.`,
//         });
//       }
//       return res
//         .status(422)
//         .json({ success: false, message: "Unable to read this document." });
//     }

//     if (!text) {
//       return res.status(422).json({
//         success: false,
//         message:
//           kind === "pdf"
//             ? "No readable text found. Scanned/image PDFs are not supported."
//             : "No readable text found.",
//       });
//     }

//     const wordCount = countWords(text);

//     if (DEBUG_WORDCOUNT) {
//       console.log("WORD COUNT DEBUG", {
//         file: req.file.originalname,
//         kind,
//         chars: text.length,
//         wordCount,
//         preview: JSON.stringify(text.slice(0, 300)),
//       });
//     }

//     if (!wordCount) {
//       return res
//         .status(422)
//         .json({ success: false, message: "No words found in this document." });
//     }

//     const language = detectLanguage(text);
//     if (language.code === "und") {
//       return res.status(422).json({
//         success: false,
//         message: "Could not reliably detect the document language.",
//       });
//     }

//     const detectedLanguage = language.name;
//     const baseLanguage = String(settings.baseLanguage || "English").trim();
//     const isBase =
//       detectedLanguage.toLowerCase() === baseLanguage.toLowerCase();

//     const wordsPerPage = Number(settings.wordsPerPage);
//     if (!Number.isSafeInteger(wordsPerPage) || wordsPerPage < 1) {
//       return res.status(500).json({
//         success: false,
//         message: "Invalid words-per-page setting.",
//       });
//     }

//     const minimumPages = Number(settings.minimumPages ?? 1);
//     if (!Number.isSafeInteger(minimumPages) || minimumPages < 1) {
//       return res.status(500).json({
//         success: false,
//         message: "Invalid minimum-pages setting.",
//       });
//     }

//     const billablePages = Math.max(
//       minimumPages,
//       Math.ceil(wordCount / wordsPerPage)
//     );

//     const pricePerPage = Number(settings.pricePerPage);
//     if (!Number.isFinite(pricePerPage) || pricePerPage < 0) {
//       return res.status(500).json({
//         success: false,
//         message: "Invalid price per page in admin settings.",
//       });
//     }

//     const priceMultiplier = isBase
//       ? Number(settings.baseLanguageMultiplier ?? 1)
//       : Number(settings.otherLanguageMultiplier ?? 2);

//     if (!Number.isFinite(priceMultiplier) || priceMultiplier < 0) {
//       return res.status(500).json({
//         success: false,
//         message: "Invalid language price multiplier.",
//       });
//     }

//     const totalPrice =
//       Math.round(billablePages * pricePerPage * priceMultiplier * 100) / 100;

//     return res.status(200).json({
//       success: true,
//       message: "Document processed successfully.",
//       data: {
//         fileName: req.file.originalname,
//         detectedLanguage,
//         languageCode: language.code,
//         baseLanguage,
//         wordCount,
//         wordsPerPage,
//         billablePages,
//         pricePerPage,
//         currency: settings.currency || "USD",
//         priceMultiplier,
//         totalPrice,
//       },
//     });
//   } catch (error) {
//     console.error("Upload error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Unable to read or process the uploaded document.",
//     });
//   }
// };











// Word-count / price calculator for uploaded documents.
// FIX: PDF extraction ab MuPDF se (pdf.js fallback), file type content se detect hota hai,
//      aur sab formats (PDF/DOCX/DOC/TXT) ek hi countWords() se count hote hain.
import multer from "multer";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import JSZip from "jszip";
import * as mupdf from "mupdf";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";
import { franc } from "franc-min";
import WordPriceSetting from "../models/WordPriceSetting.model.js";

/* -------------------------------------------
   PDF.js compatibility
------------------------------------------- */
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

/* -------------------------------------------
   Config
------------------------------------------- */
const UNSUPPORTED_MESSAGE = "Unsupported file type. Upload a readable PDF, DOC, DOCX, TXT, PPTX, XLSX, CSV, RTF, HTML, or ODT file.";
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_PDF_PAGES = 2000;
const DEBUG_WORDCOUNT = process.env.DEBUG_WORDCOUNT === "true";
const OCR_LANGS = process.env.OCR_LANGS || "eng+hin";
const OCR_SCALE = Math.max(1.5, Math.min(3, Number(process.env.OCR_DPI_SCALE || 2)));
const OCR_MAX_PAGES = Number(process.env.OCR_MAX_PAGES || 150);
const OCR_MIN_CONFIDENCE = Number(process.env.MIN_OCR_CONFIDENCE || 55);

// false  => sirf letters/numbers wale tokens count honge ("-", "•", "|" nahi)
//           teeno formats (PDF/DOCX/TXT) me sabse consistent count deta hai.
// true   => MS Word ki tarah har whitespace-separated token count hoga.
const COUNT_SYMBOL_ONLY_TOKENS = false;

/* -------------------------------------------
   File type detection (signature based)
------------------------------------------- */
const looksBinary = (buffer) => {
  // UTF-16 BOM => text file hai
  if (
    buffer.length >= 2 &&
    ((buffer[0] === 0xff && buffer[1] === 0xfe) ||
      (buffer[0] === 0xfe && buffer[1] === 0xff))
  ) {
    return false;
  }
  const limit = Math.min(buffer.length, 8000);
  for (let i = 0; i < limit; i++) {
    if (buffer[i] === 0x00) return true;
  }
  return false;
};

/**
 * Returns a readable document kind, based on its contents rather than its filename.
 *
 * IMPORTANT: file ka TYPE sirf uske CONTENT (signature) se decide hota hai,
 * extension se NAHI. Isliye:
 *   - resume.pdf ko resume.txt / resume.docx / resume.jpg bana do => same count
 *   - docx ko .doc bana do, ya txt ko .pdf bana do => same count
 */
const detectKind = async (buffer) => {
  if (!buffer?.length) return null;

  // PDF (header pehle 1KB me kahin bhi ho sakta hai)
  if (buffer.subarray(0, 1024).toString("latin1").includes("%PDF-")) {
    return "pdf";
  }

  // ZIP container => sirf tab docx jab andar word/document.xml ho
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    try {
      const zip = await JSZip.loadAsync(buffer);
      if (zip.file("word/document.xml")) return "docx";
      if (zip.file("ppt/presentation.xml") || zip.file("ppt/slides/slide1.xml")) return "pptx";
      if (zip.file("xl/workbook.xml")) return "xlsx";
      if (zip.file("content.xml") && (zip.file("mimetype") || zip.file("META-INF/manifest.xml"))) return "odt";
    } catch {
      /* corrupt zip */
    }
    return null; // normal ZIP / unsupported binary archive
  }

  // Legacy .doc (OLE2)
  if (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return "doc";
  }

  // Readable text formats identified from their contents.
  const textStart = buffer.subarray(0, 4096).toString("utf8").replace(/^\uFEFF/, "").trimStart();
  if (/^\{\\rtf/i.test(textStart)) return "rtf";
  if (/^(?:<!doctype\s+html|<html\b|<head\b|<body\b)/i.test(textStart)) return "html";

  // Baaki sab: binary nahi hai to plain text maano (kisi bhi extension me)
  if (!looksBinary(buffer)) return "txt";

  return null;
};

/* -------------------------------------------
   TXT extraction
------------------------------------------- */
const extractTxtText = (buffer) => {
  if (!buffer?.length) return "";
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer.subarray(2));
  }
  const hasUtf8Bom =
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf;
  const data = hasUtf8Bom ? buffer.subarray(3) : buffer;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    return new TextDecoder("windows-1252").decode(data);
  }
};

/* -------------------------------------------
   PDF extraction
------------------------------------------- */
const PAGE_NUMBER_LINE = /^(?:page\s*)?\d{1,4}(?:\s*(?:of|\/)\s*\d{1,4})?$/i;

// Hindi / Indic scripts: matra (combining mark) ya virama ke aas-paas word kabhi nahi tootta
const STARTS_WITH_MARK = /^[\p{M}\u200c\u200d]/u;
const ENDS_WITH_JOINER = /[\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D\u200D]$/u;
const INDIC_SCRIPT = /[\u0900-\u0DFF]/;

const buildPageText = (items) => {
  let text = "";
  let prev = null;

  for (const item of items) {
    if (typeof item.str !== "string") continue;

    // Empty item: sirf line-break info ho sakti hai
    if (item.str === "") {
      if (item.hasEOL && text && !text.endsWith("\n")) text += "\n";
      continue;
    }

    const tf = item.transform;
    const canCompare =
      prev &&
      Array.isArray(tf) &&
      tf.length >= 6 &&
      Array.isArray(prev.transform) &&
      prev.transform.length >= 6;

    if (
      canCompare &&
      !/\s$/.test(text) &&
      !/^\s/.test(item.str) &&
      !STARTS_WITH_MARK.test(item.str) &&
      !ENDS_WITH_JOINER.test(text)
    ) {
      const h = Math.max(
        Math.abs(tf[3]) || 10,
        Math.abs(prev.transform[3]) || 10
      );
      const sameLine = Math.abs(tf[5] - prev.transform[5]) < h * 0.5;

      if (!sameLine) {
        text += " ";
      } else if (prev.width > 0) {
        // width 0 ho to guess nahi karte (warna word beech me toot jata hai)
        const gap = tf[4] - (prev.transform[4] + prev.width);
        // Indic scripts me glyph pieces alag items aate hain => bada threshold
        const indic = INDIC_SCRIPT.test(item.str) || INDIC_SCRIPT.test(prev.str);
        if (gap > h * (indic ? 0.3 : 0.18)) text += " ";
      }
    }

    text += item.str;
    prev = item;

    if (item.hasEOL) text += "\n";
  }

  return text;
};

// Page ki pehli / aakhri line agar sirf page number hai to hata do
const stripPageNumberLines = (pageText) => {
  const lines = pageText.split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  while (lines.length && !lines[0].trim()) lines.shift();

  if (lines.length > 1 && PAGE_NUMBER_LINE.test(lines[lines.length - 1].trim())) {
    lines.pop();
  }
  if (lines.length > 1 && PAGE_NUMBER_LINE.test(lines[0].trim())) {
    lines.shift();
  }
  return lines.join("\n");
};

const extractPdfTextPdfJs = async (buffer) => {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer), // copy => original buffer detach nahi hoga
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  });

  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      const err = new Error("PDF has too many pages.");
      err.code = "PDF_TOO_MANY_PAGES";
      throw err;
    }

    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      try {
        const { items } = await page.getTextContent();
        pages.push(stripPageNumberLines(buildPageText(items)));
      } finally {
        page.cleanup();
      }
    }

    return (
      pages
        .join("\n")
        // line-end hyphenation: "inter-\nnational" => "international"
        .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
        // Hindi fix: matra se pehle ka extra space hatao ("कि ताब" => "किताब")
        .replace(/[ \t]+(?=[\p{M}\u200c\u200d])/gu, "")
        // virama (halant) ke baad ka extra space hatao ("क् या" => "क्या")
        .replace(/([\u094D\u09CD\u0A4D\u0ACD\u0B4D\u0BCD\u0C4D\u0CCD\u0D4D])[ \t]+(?=\p{L})/gu, "$1")
    );
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
};


/* PDF extraction strategy:
   PDF.js is primary because it uses each text item's geometry to reconstruct
   spaces. MuPDF's "preserve-whitespace" can insert extra spaces between
   glyph fragments in some Hindi/Indic PDFs, inflating the billable word count.
   MuPDF is only a fallback if PDF.js fails or returns no usable text. */
const extractPdfTextLayer = async (buffer) => {
  let pdfJsError;

  try {
    const text = await extractPdfTextPdfJs(buffer);
    if (text && text.trim()) return text;
  } catch (error) {
    if (error?.name === "PasswordException" || error?.code === "PDF_TOO_MANY_PAGES") {
      throw error;
    }
    pdfJsError = error;
    console.warn("PDF.js extraction failed; trying MuPDF:", error?.message);
  }

  let doc;
  try {
    doc = mupdf.Document.openDocument(buffer, "application/pdf");
  } catch (error) {
    if (pdfJsError) throw pdfJsError;
    throw error;
  }

  try {
    if (doc.needsPassword()) {
      const err = new Error("PDF is password protected.");
      err.name = "PasswordException";
      throw err;
    }

    const pageCount = doc.countPages();
    if (pageCount > MAX_PDF_PAGES) {
      const err = new Error("PDF has too many pages.");
      err.code = "PDF_TOO_MANY_PAGES";
      throw err;
    }

    const pages = [];
    for (let p = 0; p < pageCount; p++) {
      const page = doc.loadPage(p);
      try {
        // Use default structured text rather than preserve-whitespace: the
        // latter may preserve artificial glyph gaps as word separators.
        const stext = page.toStructuredText();
        pages.push(stripPageNumberLines(stext.asText()));
        stext.destroy?.();
      } finally {
        page.destroy?.();
      }
    }

    return pages.join("\n").replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2");
  } finally {
    doc.destroy?.();
  }
};

// Hindi PDF font maps sometimes place vowel marks before their base letters.
// When the extracted text looks suspicious, OCR the rendered pages instead of
// silently billing a potentially incorrect text-layer count.
const hasSuspiciousPdfText = (text = "") => {
  const devanagariCount = (text.match(/[\u0900-\u097F]/gu) || []).length;
  const orphanMatras = (text.match(/(?:^|[\s([{])[\u093A-\u094F\u0951-\u0957\u0962-\u0963]/gu) || []).length;
  const replacementCount = (text.match(/[\uFFFD\uE000-\uF8FF]/gu) || []).length;
  const noSpaceText = text.replace(/\s/gu, "");
  return replacementCount > 0 || text.includes("\u0000") ||
    (devanagariCount >= 40 && orphanMatras >= 4 && orphanMatras / devanagariCount > 0.012) ||
    /(?:Ã.|Â.|â€)/u.test(noSpaceText);
};

const extractPdfOcr = async (buffer, pageCount) => {
  if (pageCount > OCR_MAX_PAGES) {
    const error = new Error(`PDF text is unreliable and OCR is limited to ${OCR_MAX_PAGES} pages. Upload a text-based PDF or split this file.`);
    error.code = "PDF_OCR_PAGE_LIMIT";
    throw error;
  }

  let worker;
  const pageTexts = [];
  const confidences = [];
  try {
    worker = await createWorker(OCR_LANGS);
    const task = pdfjsLib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false });
    try {
      const pdf = await task.promise;
      for (let number = 1; number <= pdf.numPages; number += 1) {
        const page = await pdf.getPage(number);
        try {
          const viewport = page.getViewport({ scale: OCR_SCALE });
          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          const result = await worker.recognize(canvas.toBuffer("image/png"));
          pageTexts.push(result?.data?.text || "");
          confidences.push(Number(result?.data?.confidence || 0));
        } finally { page.cleanup(); }
      }
    } finally { await task.destroy().catch(() => {}); }
  } finally {
    if (worker) await worker.terminate().catch(() => {});
  }

  const text = pageTexts.join("\n").trim();
  const confidence = confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : 0;
  if (!text || confidence < OCR_MIN_CONFIDENCE) {
    const error = new Error(`PDF could not be read confidently (OCR confidence ${Math.round(confidence)}%). Upload a clearer PDF or the original DOCX/TXT file.`);
    error.code = "PDF_OCR_LOW_CONFIDENCE";
    throw error;
  }
  return text;
};

const extractPdfText = async (buffer) => {
  const text = await extractPdfTextLayer(buffer);
  if (!text?.trim()) {
    // Empty text layers are commonly scanned/image PDFs.
    const task = pdfjsLib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false });
    let pageCount = 0;
    try { const pdf = await task.promise; pageCount = pdf.numPages; }
    finally { await task.destroy().catch(() => {}); }
    return extractPdfOcr(buffer, pageCount);
  }
  if (hasSuspiciousPdfText(text)) {
    const task = pdfjsLib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, isEvalSupported: false });
    let pageCount = 0;
    try { const pdf = await task.promise; pageCount = pdf.numPages; }
    finally { await task.destroy().catch(() => {}); }
    return extractPdfOcr(buffer, pageCount);
  }
  return text;
};

/* -------------------------------------------
   DOCX / DOC extraction
------------------------------------------- */
const extractWithWordExtractor = async (buffer) => {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  return doc.getBody() || "";
};

const extractDocxText = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (result?.value?.trim()) return result.value;
  } catch (e) {
    console.warn("mammoth failed:", e.message);
  }
  // Fallback: kabhi .docx naam ki file asal me .doc hoti hai
  try {
    return await extractWithWordExtractor(buffer);
  } catch {
    return "";
  }
};

const extractDocText = (buffer) => extractWithWordExtractor(buffer);

/* -------------------------------------------
   PowerPoint / spreadsheet / OpenDocument extraction
------------------------------------------- */
const decodeXml = (value = "") => String(value)
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const xmlText = (xml = "") => decodeXml(String(xml)
  .replace(/<a:br\b[^>]*\/>/g, "\n")
  .replace(/<\/a:p>/g, "\n")
  .replace(/<[^>]+>/g, " "));

const extractPptxText = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/(?:slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml$/i.test(name) && !zip.files[name].dir)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const chunks = [];
  for (const name of slideNames) chunks.push(xmlText(await zip.file(name).async("string")));
  return chunks.join("\n");
};

const extractXlsxText = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files);
  const chunks = [];
  const sharedFile = zip.file("xl/sharedStrings.xml");
  let sharedStrings = [];
  if (sharedFile) {
    const xml = await sharedFile.async("string");
    sharedStrings = [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => xmlText(m[1]));
  }
  const sheetNames = names.filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name) && !zip.files[name].dir)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const name of sheetNames) {
    const xml = await zip.file(name).async("string");
    for (const match of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const type = /\bt="([^"]+)"/.exec(match[1])?.[1];
      const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(match[2])?.[1];
      if (type === "s" && value !== undefined) chunks.push(sharedStrings[Number(value)] || "");
      else if (type === "inlineStr") chunks.push(xmlText(match[2]));
      else if (value !== undefined) chunks.push(decodeXml(value));
    }
  }
  return chunks.join("\n");
};

const extractOdtText = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file("content.xml");
  return file ? xmlText(await file.async("string")) : "";
};

/* -------------------------------------------
   Unified text cleaner (sab formats ke liye same)
------------------------------------------- */
const cleanExtractedText = (text = "") => {
  if (!text) return "";
  return String(text)
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    // invisible spaces => real space (word separator hote hain)
    .replace(/[\u00a0\u2007\u202f\u200b\u2028\u2029]/g, " ")
    // soft hyphen, BOM, NUL => hata do
    .replace(/[\u00ad\ufeff\u0000]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
};

const extractDocumentText = async (file, kind) => {
  let rawText = "";
  if (kind === "txt") rawText = extractTxtText(file.buffer);
  else if (kind === "pdf") rawText = await extractPdfText(file.buffer);
  else if (kind === "docx") rawText = await extractDocxText(file.buffer);
  else if (kind === "doc") rawText = await extractDocText(file.buffer);
  else if (kind === "pptx") rawText = await extractPptxText(file.buffer);
  else if (kind === "xlsx") rawText = await extractXlsxText(file.buffer);
  else if (kind === "odt") rawText = await extractOdtText(file.buffer);
  else if (kind === "csv") rawText = extractTxtText(file.buffer);
  else if (kind === "rtf") rawText = extractTxtText(file.buffer).replace(/\'[0-9a-f]{2}/gi, " ").replace(/\[a-z]+-?\d* ?/gi, " ").replace(/[{}]/g, " ");
  else if (kind === "html") rawText = extractTxtText(file.buffer).replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  else throw new Error(UNSUPPORTED_MESSAGE);

  const cleaned = cleanExtractedText(rawText);

  // Kharab font encoding => Private-Use / replacement characters
  if (kind === "pdf" && cleaned) {
    const bad = (cleaned.match(/[\uE000-\uF8FF\uFFFD]/g) || []).length;
    const total = cleaned.replace(/\s/g, "").length || 1;
    if (bad > 0 && bad / total > 0.05) {
      const err = new Error("PDF font encoding is not readable.");
      err.code = "PDF_BAD_ENCODING";
      throw err;
    }
  }

  return cleaned;
};

/* -------------------------------------------
   Word counter (Word-style, Unicode safe)
------------------------------------------- */
const CJK_RANGE =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;
const HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;

// Thai / Lao / Myanmar / Khmer me words ke beech space nahi hota => ICU dictionary se todo
const SPACELESS_SCRIPT = /[\u0e00-\u0eff\u1000-\u109f\u1780-\u17ff]/;
const wordSegmenter =
  typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;

const countSpacelessToken = (token) => {
  if (!wordSegmenter) return 1;
  let n = 0;
  for (const s of wordSegmenter.segment(token)) if (s.isWordLike) n++;
  return n || 1;
};

export const countWords = (input = "") => {
  const text = String(input || "").normalize("NFC")
    .replace(/[\u00a0\u2007\u202f\u200b\u2028\u2029]/gu, " ")
    .replace(/[\u00ad\ufeff\u0000]/gu, "").trim();
  if (!text) return 0;

  // Keep the project's established whitespace-token policy so DOCX/TXT counts
  // remain consistent with the existing baseline (e.g. 1,970 in hindi.docx).
  // CJK characters are counted individually because those scripts usually have
  // no spaces between words. Detached marks/punctuation are not billable words.
  const cjkCount = (text.match(CJK_RANGE) || []).length;
  const rest = text.replace(CJK_RANGE, " ");
  let count = cjkCount;
  for (const token of rest.split(/\s+/u)) {
    if (!token) continue;
    if (HAS_LETTER_OR_NUMBER.test(token)) {
      count += SPACELESS_SCRIPT.test(token) ? countSpacelessToken(token) : 1;
    }
  }
  return count;
};

/* -------------------------------------------
   Language detection
   NOTE: franc ISO 639-3 codes deta hai (Chinese = "cmn", Arabic = "arb")
------------------------------------------- */
const LANGUAGE_NAMES = {
  eng: "English",
  hin: "Hindi",
  fra: "French",
  deu: "German",
  spa: "Spanish",
  ita: "Italian",
  por: "Portuguese",
  rus: "Russian",
  arb: "Arabic",
  ara: "Arabic",
  ben: "Bengali",
  urd: "Urdu",
  cmn: "Chinese",
  zho: "Chinese",
  jpn: "Japanese",
  kor: "Korean",
  pan: "Punjabi",
  tam: "Tamil",
  tel: "Telugu",
  mar: "Marathi",
  guj: "Gujarati",
  kan: "Kannada",
  mal: "Malayalam",
  npi: "Nepali",
  pes: "Persian",
  tur: "Turkish",
  nld: "Dutch",
  pol: "Polish",
  ukr: "Ukrainian",
  vie: "Vietnamese",
  tha: "Thai",
  ind: "Indonesian",
};

const detectLanguage = (text) => {
  const sample = text.replace(/\s+/g, " ").trim().slice(0, 20000);

  // CJK: chhota text bhi poora meaning rakhta hai, aur franc inme kam-text par fail hota hai.
  // Script se seedha pehchano (kana => Japanese, hangul => Korean, sirf Han => Chinese).
  const kana = (sample.match(/[\u3040-\u30ff]/g) || []).length;
  const hangul = (sample.match(/[\uac00-\ud7af]/g) || []).length;
  const han = (sample.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  const letters = (sample.match(/\p{L}/gu) || []).length || 1;
  if ((kana + hangul + han) / letters > 0.3) {
    if (kana > 0) return { code: "jpn", name: "Japanese" };
    if (hangul > han) return { code: "kor", name: "Korean" };
    return { code: "cmn", name: "Chinese" };
  }

  if ([...sample].length < 20) return { code: "und", name: "Unknown" };

  const code = franc(sample, {
    minLength: 20,
    only: Object.keys(LANGUAGE_NAMES), // sirf supported languages me se chuno
  });
  if (!code || code === "und") return { code: "und", name: "Unknown" };

  return { code, name: LANGUAGE_NAMES[code] || code };
};

/* -------------------------------------------
   Upload middleware (errors JSON me return)
------------------------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  // NOTE: extension filter jaan-boojh kar nahi hai; type content se detect hota hai.
}).single("file");

export const uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === "LIMIT_FILE_SIZE";
      return res.status(tooLarge ? 413 : 400).json({
        success: false,
        message: tooLarge
          ? `File size must not exceed ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
          : "Invalid upload request.",
      });
    }
    return res
      .status(400)
      .json({ success: false, message: err.message || UNSUPPORTED_MESSAGE });
  });
};

/* -------------------------------------------
   Main handler
------------------------------------------- */
export { extractDocumentText, detectKind };

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload a document." });
    }

    const settings = await WordPriceSetting.findOne({
      settingKey: "default",
      isActive: true,
    }).lean();

    if (!settings) {
      return res.status(503).json({
        success: false,
        message: "Active word pricing settings were not found.",
      });
    }

    const maxMB = Number(settings.maxFileSizeMB || 100);
    if (req.file.size > maxMB * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: `File size must not exceed ${maxMB} MB.`,
      });
    }

    const kind = await detectKind(req.file.buffer);
    if (!kind) {
      return res.status(422).json({
        success: false,
        message: UNSUPPORTED_MESSAGE,
      });
    }

    let text;
    try {
      text = await extractDocumentText(req.file, kind);
    } catch (e) {
      console.error("Extract error:", e);
      if (e?.name === "PasswordException") {
        return res.status(422).json({
          success: false,
          message: "This PDF is password protected.",
        });
      }
      if (e?.code === "PDF_BAD_ENCODING") {
        return res.status(422).json({
          success: false,
          message:
            "This PDF uses a font encoding that cannot be read reliably. Please upload DOCX/TXT or a PDF with Unicode text.",
        });
      }
      if (e?.code === "PDF_OCR_PAGE_LIMIT" || e?.code === "PDF_OCR_LOW_CONFIDENCE") {
        return res.status(422).json({ success: false, message: e.message });
      }
      if (e?.code === "PDF_TOO_MANY_PAGES") {
        return res.status(422).json({
          success: false,
          message: `PDF must not exceed ${MAX_PDF_PAGES} pages.`,
        });
      }
      return res
        .status(422)
        .json({ success: false, message: "Unable to read this document." });
    }

    if (!text) {
      return res.status(422).json({
        success: false,
        message:
          kind === "pdf"
            ? "No readable text found. Scanned/image PDFs are not supported."
            : "No readable text found.",
      });
    }

    const wordCount = countWords(text);

    if (DEBUG_WORDCOUNT) {
      console.log("WORD COUNT DEBUG", {
        file: req.file.originalname,
        kind,
        chars: text.length,
        wordCount,
      });
    }

    if (!wordCount) {
      return res
        .status(422)
        .json({ success: false, message: "No words found in this document." });
    }

    const language = detectLanguage(text);
    if (language.code === "und") {
      return res.status(422).json({
        success: false,
        message: "Could not reliably detect the document language.",
      });
    }

    const detectedLanguage = language.name;
    const baseLanguage = String(settings.baseLanguage || "English").trim();
    const isBase =
      detectedLanguage.toLowerCase() === baseLanguage.toLowerCase();

    const wordsPerPage = Number(settings.wordsPerPage);
    if (!Number.isSafeInteger(wordsPerPage) || wordsPerPage < 1) {
      return res.status(500).json({
        success: false,
        message: "Invalid words-per-page setting.",
      });
    }

    const minimumPages = Number(settings.minimumPages ?? 1);
    if (!Number.isSafeInteger(minimumPages) || minimumPages < 1) {
      return res.status(500).json({
        success: false,
        message: "Invalid minimum-pages setting.",
      });
    }

    const billablePages = Math.max(
      minimumPages,
      Math.ceil(wordCount / wordsPerPage)
    );

    const pricePerPage = Number(settings.pricePerPage);
    if (!Number.isFinite(pricePerPage) || pricePerPage < 0) {
      return res.status(500).json({
        success: false,
        message: "Invalid price per page in admin settings.",
      });
    }

    const priceMultiplier = isBase
      ? Number(settings.baseLanguageMultiplier ?? 1)
      : Number(settings.otherLanguageMultiplier ?? 2);

    if (!Number.isFinite(priceMultiplier) || priceMultiplier < 0) {
      return res.status(500).json({
        success: false,
        message: "Invalid language price multiplier.",
      });
    }

    const totalPrice =
      Math.round(billablePages * pricePerPage * priceMultiplier * 100) / 100;

    return res.status(200).json({
      success: true,
      message: "Document processed successfully.",
      data: {
        fileName: req.file.originalname,
        detectedLanguage,
        languageCode: language.code,
        baseLanguage,
        wordCount,
        wordsPerPage,
        billablePages,
        pricePerPage,
        currency: settings.currency || "USD",
        priceMultiplier,
        totalPrice,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to read or process the uploaded document.",
    });
  }
};