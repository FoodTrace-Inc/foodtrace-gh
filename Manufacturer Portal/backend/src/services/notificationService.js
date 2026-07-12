/**
 * Push Notification Service (Firebase FCM)
 * Replace placeholder with real FCM implementation when server key is ready.
 * Docs: https://firebase.google.com/docs/cloud-messaging
 */

/**
 * Send a push notification recall alert
 * @param {string} pushToken - FCM device token
 * @param {object} payload - { title, body, data }
 */
export const sendPushNotification = async (pushToken, payload) => {
  if (!process.env.PUSH_SERVER_KEY || process.env.PUSH_SERVER_KEY === 'your_firebase_server_key') {
    console.log(`[PUSH PLACEHOLDER] Token: ${pushToken} | Payload:`, payload);
    return { status: 'placeholder' };
  }

  // Real FCM implementation (uncomment when ready):
  // const response = await fetch('https://fcm.googleapis.com/fcm/send', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `key=${process.env.PUSH_SERVER_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     to: pushToken,
  //     notification: { title: payload.title, body: payload.body },
  //     data: payload.data,
  //   }),
  // });
  // return response.json();
};

/**
 * Build a recall push notification payload
 */
export const buildRecallPushPayload = (productName, batchNumber, recallId) => ({
  title: '🚨 Product Recall Alert',
  body: `${productName} (Batch ${batchNumber}) has been recalled. Tap for details.`,
  data: { type: 'recall', recallId, batchNumber },
});
