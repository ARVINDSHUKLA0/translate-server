import multer from "multer";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { franc } from "franc-min";
import WordPriceSetting from "../models/WordPriceSetting.model.js";

// Compatibility for pdfjs-dist versions requiring Promise.withResolvers.
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function () {
    let resolve;
    let reject;

    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  };
}

const ALLOWED_EXTENSIONS = ["pdf", "docx", "doc", "txt"];

const UNSUPPORTED_MESSAGE =
  "Only PDF, DOC, DOCX, and TXT files are supported.";

const getExtension = (filename = "") =>
  filename.split(".").pop().toLowerCase();

const hasValidContent = (extension, buffer) => {
  if (!buffer || buffer.length === 0) return false;

  if (extension === "pdf") {
    return buffer
      .subarray(0, 1024)
      .toString("latin1")
      .includes("%PDF-");
  }

  if (extension === "docx") {
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  }

  if (extension === "doc") {
    return (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    );
  }

  if (extension === "txt") {
    return !buffer.subarray(0, 8000).includes(0);
  }

  return false;
};

const extractPdfText = async (buffer) => {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  });

  try {
    const pdfDocument = await loadingTask.promise;
    const pages = [];

    for (
      let pageNumber = 1;
      pageNumber <= pdfDocument.numPages;
      pageNumber++
    ) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");

      pages.push(pageText);
    }

    return pages.join("\n");
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
};

const extractDocumentText = async (file) => {
  const extension = getExtension(file.originalname);

  if (extension === "txt") {
    return file.buffer.toString("utf8");
  }

  if (extension === "pdf") {
    return extractPdfText(file.buffer);
  }

  if (extension === "docx") {
    const result = await mammoth.extractRawText({
      buffer: file.buffer,
    });

    return result.value || "";
  }

  if (extension === "doc") {
    const extractor = new WordExtractor();
    const doc = await extractor.extract(file.buffer);

    return doc.getBody() || "";
  }

  throw new Error(UNSUPPORTED_MESSAGE);
};

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const extension = getExtension(file.originalname);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return callback(new Error(UNSUPPORTED_MESSAGE));
    }

    callback(null, true);
  },
}).single("file");

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a document.",
      });
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

    const maxFileSizeMB = Number(settings.maxFileSizeMB || 100);

    if (req.file.size > maxFileSizeMB * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: `File size must not exceed ${maxFileSizeMB} MB.`,
      });
    }

    const extension = getExtension(req.file.originalname);

    if (!hasValidContent(extension, req.file.buffer)) {
      return res.status(422).json({
        success: false,
        message: `This file is not a valid ${extension.toUpperCase()} document.`,
      });
    }

    let rawText;

    try {
      rawText = await extractDocumentText(req.file);
    } catch (extractError) {
      console.error("Document extract error:", extractError);

      return res.status(422).json({
        success: false,
        message:
          "Unable to read this document. It may be corrupted or password-protected.",
      });
    }

    const text = (rawText || "").normalize("NFC").trim();

    if (!text) {
      return res.status(422).json({
        success: false,
        message:
          "No readable text found. Scanned PDFs may require OCR.",
      });
    }

    // Count words across Unicode scripts, including Hindi.
    const wordMatches = text.match(
      /[\p{L}\p{M}\p{N}]+(?:['’.-][\p{L}\p{M}\p{N}]+)*/gu
    );

    const wordCount = wordMatches?.length || 0;

    if (!wordCount) {
      return res.status(422).json({
        success: false,
        message: "No words found in this document.",
      });
    }

    const languageCode = franc(text.slice(0, 20000), {
      minLength: 20,
    });

    if (languageCode === "und") {
      return res.status(422).json({
        success: false,
        message: "Could not reliably detect the document language.",
      });
    }

    const detectedLanguage =
      languageCode === "eng" ? "English" : languageCode;

    const baseLanguage = String(
      settings.baseLanguage || "English"
    ).trim();

    const isBaseLanguage =
      detectedLanguage.toLowerCase() === baseLanguage.toLowerCase();

    // IMPORTANT: use the value saved by Admin, not a hardcoded 250.
    const wordsPerPage = Number(settings.wordsPerPage);

    if (
      !Number.isSafeInteger(wordsPerPage) ||
      wordsPerPage < 1
    ) {
      return res.status(500).json({
        success: false,
        message:
          "Invalid words-per-page setting. Please update the Admin pricing settings.",
      });
    }

    const minimumPages = Number(settings.minimumPages ?? 1);

    if (!Number.isFinite(minimumPages) || minimumPages < 1) {
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

    const priceMultiplier = isBaseLanguage
      ? Number(settings.baseLanguageMultiplier ?? 1)
      : Number(settings.otherLanguageMultiplier ?? 2);

    if (!Number.isFinite(priceMultiplier) || priceMultiplier < 0) {
      return res.status(500).json({
        success: false,
        message: "Invalid language price multiplier.",
      });
    }

    const totalPrice =
      Math.round(
        billablePages * pricePerPage * priceMultiplier * 100
      ) / 100;

    return res.status(200).json({
      success: true,
      message: "Document processed successfully.",
      data: {
        fileName: req.file.originalname,
        detectedLanguage,
        languageCode,
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
    console.error("Document upload error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to read or process the uploaded document.",
    });
  }
};
