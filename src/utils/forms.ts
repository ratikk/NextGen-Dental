import { getRecaptchaToken } from './recaptcha';

// --- Configuration ---
// Get the Lambda endpoint from environment variables. This is the most important change.
const LAMBDA_ENDPOINT = import.meta.env.PUBLIC_LAMBDA_ENDPOINT;

// Fail-fast check: If the environment variable is missing, throw an error during development/build.
if (!LAMBDA_ENDPOINT) {
  throw new Error("FATAL: PUBLIC_LAMBDA_ENDPOINT environment variable is not set.");
}

interface FormData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phone: string;
  message?: string;
  preferredDate?: string;
  preferredTime?: string;
  reasonForVisit?: string;
  smsConsent: boolean;
  formType: 'appointment' | 'contact' | 'booking';
}

/**
 * Submits form data to the backend Lambda function.
 * @param data The form data to submit.
 * @returns The JSON response from the server on success.
 * @throws An error with a specific message if the submission fails.
 */
export async function submitForm(data: FormData) {
  try {
    // 1. Get a reCAPTCHA token for this specific form action
    const recaptchaToken = await getRecaptchaToken(`submit_${data.formType}`);

    // 2. Construct the payload exactly as the Lambda function expects it
    const payload = {
      fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      email: data.email,
      phone: data.phone,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      reasonForVisit: data.reasonForVisit,
      message: data.message,
      smsConsent: data.smsConsent,
      recaptchaToken: recaptchaToken, // Ensure the key name matches what the Lambda expects
    };

    // 3. Send the request to the Lambda endpoint
    const response = await fetch(LAMBDA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    // 4. Handle non-successful responses
    if (!response.ok) {
      let errorMessage = 'Form submission failed. Please try again.';
      try {
        // Try to parse a specific error message from the server's JSON response
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If the response isn't JSON, use the status text as a fallback
        errorMessage = `Server error: ${response.statusText} (${response.status})`;
      }
      throw new Error(errorMessage);
    }

    // 5. Return the successful response body
    return await response.json();

  } catch (error) {
    // Log the detailed error for developers and re-throw it for the UI to handle
    console.error('Error in submitForm utility:', error);
    throw error;
  }
}
