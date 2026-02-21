
/**
 * SMS Service for sending text messages
 * Provider: SMS Works (https://thesmsworks.co.uk)
 */

interface SMSOptions {
  to: string;
  message: string;
}

// SMS Works configuration
const SMS_WORKS_JWT = process.env.SMS_WORKS_JWT || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXkiOiI4NmYyZWYwMS0zOTMxLTQ3NzUtOTIyYi1lYWFiM2QxOGNjODYiLCJzZWNyZXQiOiJmY2UzNzc4YjE3OTAwNTkwZjZiOWE3M2M3ZjE3MGJlNzY2NTJjNWJhY2E0ZDhjZjExMzQyNzNkZmQyYzRkZWE5IiwiaWF0IjoxNzcxMjQ5Mzk2LCJleHAiOjI1NTk2NDkzOTZ9.ZkcZ1aPHN55IY1OZDyOnQkGXBZ3Zq5NgBxka3Fgh__4';
const SMS_WORKS_API_URL = 'https://api.thesmsworks.co.uk/v1/message/send';
const PRODUCT_NAME = process.env.PRODUCT_NAME || 'Chatr';
const SMS_WORKS_SENDER = process.env.SMS_WORKS_SENDER || PRODUCT_NAME; // Use product name as sender

/**
 * Send an SMS message via SMS Works
 *
 * @param phoneNumber - Recipient phone number (E.164 format recommended: +1234567890)
 * @param message - SMS message content
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<void> {
  console.log('📱 [SMS Works] Sending SMS:');
  console.log(`   To: ${phoneNumber}`);
  console.log(`   Message: ${message}`);
  console.log(`   ---`);

  try {
    // SMS Works requires phone numbers WITHOUT the + prefix
    const cleanedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;

    console.log(`📱 [SMS Works] Original phone: ${phoneNumber}`);
    console.log(`📱 [SMS Works] Cleaned phone: ${cleanedPhone}`);
    console.log(`📱 [SMS Works] JWT token: ${SMS_WORKS_JWT.substring(0, 50)}...`);
    console.log(`📱 [SMS Works] API URL: ${SMS_WORKS_API_URL}`);
    console.log(`📱 [SMS Works] Sender: ${SMS_WORKS_SENDER}`);

    const requestBody = {
      sender: SMS_WORKS_SENDER,
      destination: cleanedPhone,
      content: message,
    };

    console.log('📱 [SMS Works] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(SMS_WORKS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `JWT ${SMS_WORKS_JWT}`,  // SMS Works requires "JWT " prefix
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📱 [SMS Works] Error Response:');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Body: ${errorText}`);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { rawError: errorText };
      }

      console.error('📱 [SMS Works] Parsed Error:', errorData);
      throw new Error(`SMS Works API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📱 [SMS Works] Success:', result);
    if (result && typeof result === 'object' && 'messageid' in result) {
      console.log(`   Message ID: ${result.messageid}`);
    }

  } catch (error) {
    console.error('📱 [SMS Works] Failed to send SMS:', error);
    // Don't throw error to prevent registration/login failures
    // Log the error and continue
    console.error('   SMS sending failed but continuing...');
  }
}

/**
 * Send phone verification code via SMS
 */
export async function sendPhoneVerificationSMS(
  phoneNumber: string,
  code: string,
  username: string
): Promise<void> {
  const message = `Hello ${username}! Your ${PRODUCT_NAME} verification code is: ${code}. This code expires in 15 minutes.`;

  console.log('📱 [SMS] Phone Verification');
  console.log(`   Phone: ${phoneNumber}`);
  console.log(`   Code: ${code}`);
  console.log(`   Username: ${username}`);

  await sendSMS(phoneNumber, message);
}

/**
 * Send login verification code via SMS
 */
export async function sendLoginVerificationSMS(
  phoneNumber: string,
  code: string,
  username: string
): Promise<void> {
  const message = `Hello ${username}! Your ${PRODUCT_NAME} login verification code is: ${code}. This code expires in 15 minutes.`;

  console.log('📱 [SMS] Login Verification');
  console.log(`   Phone: ${phoneNumber}`);
  console.log(`   Code: ${code}`);
  console.log(`   Username: ${username}`);

  await sendSMS(phoneNumber, message);
}

/**
 * Send password reset code via SMS
 */
export async function sendPasswordResetSMS(
  phoneNumber: string,
  code: string,
  username: string
): Promise<void> {
  const message = `Hello ${username}! Your ${PRODUCT_NAME} password reset code is: ${code}. This code expires in 15 minutes.`;

  console.log('📱 [SMS] Password Reset');
  console.log(`   Phone: ${phoneNumber}`);
  console.log(`   Code: ${code}`);
  console.log(`   Username: ${username}`);

  await sendSMS(phoneNumber, message);
}

/**
 * Validate phone number format (UK mobile only)
 * Accepts: +447xxxxxxxxxx (13-15 chars) or 07xxxxxxxxx (11 chars)
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // UK mobile formats:
  // +447... (+ and 12-14 digits: +44 + 10-12 mobile digits)
  // 07... (11 digits: 07 + 9 digits)
  if (cleaned.startsWith('+44')) {
    // Must start with +44, total length: + and 12-14 digits
    const totalLength = cleaned.length;
    return totalLength >= 13 && totalLength <= 15; // +447xxxxxxxxx (13) to +447xxxxxxxxxxxx (15)
  } else if (cleaned.startsWith('07')) {
    // Must be exactly 11 digits
    return cleaned.length === 11;
  }

  // Invalid: Must start with +44 or 07
  return false;
}


/**
 * Format phone number to E.164 format (+country code + number)
 * This is a simple formatter - use libphonenumber-js for production
 */
export function formatPhoneNumber(phoneNumber: string, defaultCountryCode: string = '+44'): string {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If it doesn't start with +, add default country code
  if (!cleaned.startsWith('+')) {
    // Remove leading 0 for UK numbers (07... becomes 7...)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    cleaned = `${defaultCountryCode}${cleaned}`;
  }

  return cleaned;
}

