import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const BASE_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay"; 
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = 1; // Default salt index

export const PhonePeService = {
  async initiatePayment(amount) {
    try {
      const merchantTransactionId = `MT_${uuidv4()}`; // Ensure uniqueness

      const payload = {
        merchantId: MERCHANT_ID,
        merchantTransactionId,
        merchantUserId: `MUID_${uuidv4()}`, // Ensure uniqueness
        amount: amount * 100, // Convert to paise
        callbackUrl: `${process.env.BACKEND_URL}/api/v1/booking/phone-pay/callback`,
        paymentInstrument: {
          type: "PAY_PAGE",
        },
      };

      // Convert payload to Base64
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");

      // Generate SHA256 checksum (HMAC)
      const checksum = crypto.createHmac("sha256", SALT_KEY)
        .update(base64Payload + "/pg/v1/pay" + SALT_KEY)
        .digest("hex");

      // Send request to PhonePe API
      const response = await axios.post(BASE_URL, 
        { request: base64Payload }, 
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": `${checksum}###${SALT_INDEX}`,
          },
        }
      );

      return { success: true, data: response.data, transactionId: merchantTransactionId };
    } catch (error) {
      console.error("PhonePe Payment Error:", error.response?.data, error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  },
};
