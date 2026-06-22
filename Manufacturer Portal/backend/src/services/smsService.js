/**
 * Africa's Talking SMS Service
 * Replace placeholder with real Africa's Talking SDK when credentials are ready.
 * Docs: https://developers.africastalking.com/docs/sms/sending
 */

// Uncomment and install when ready:
// import AfricasTalking from 'africastalking';
// const AT = AfricasTalking({
//   apiKey: process.env.AT_API_KEY,
//   username: process.env.AT_USERNAME,
// });
// const sms = AT.SMS;

/**
 * Send an SMS recall alert to a phone number
 * @param {string} phone - e.g. "+233241234567"
 * @param {string} message - The SMS body
 */
export const sendRecallSMS = async (phone, message) => {
  if (!process.env.AT_API_KEY || process.env.AT_API_KEY === 'your_africastalking_api_key') {
    // Placeholder: log instead of sending
    console.log(`[SMS PLACEHOLDER] To: ${phone} | Message: ${message}`);
    return { status: 'placeholder' };
  }

  // Real implementation (uncomment after adding credentials):
  // const response = await sms.send({
  //   to: [phone],
  //   message,
  //   from: process.env.AT_SENDER_ID,
  // });
  // return response;
};

/**
 * Build a recall SMS message
 */
export const buildRecallMessage = (productName, batchNumber, reason) => {
  return `FOODTRACE RECALL ALERT: ${productName} (Batch: ${batchNumber}) has been recalled. Reason: ${reason}. Do NOT consume. Visit foodtrace.gh for details.`;
};
