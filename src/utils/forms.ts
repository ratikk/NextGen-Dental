// Location: src/utils/forms.ts

import { getRecaptchaToken } from './recaptcha';

const LAMBDA_ENDPOINT = import.meta.env.PUBLIC_LAMBDA_ENDPOINT;

if (!LAMBDA_ENDPOINT) {
  throw new Error("FATAL: PUBLIC_LAMBDA_ENDPOINT environment variable is not set.");
}

interface FormData {
  [key: string]: any;
  formType: 'booking' | 'contact';
}

export async function submitForm(data: FormData) {
  try {
    // 1. Attempt to get the reCAPTCHA token.
    const token = await getRecaptchaToken(`submit_${data.formType}`);

    // ✅ DEBUGGING STEP: Log the token to the browser console.
    // This will tell us if the token is being generated correctly.
    console.log('reCAPTCHA token received by submitForm:', token);

    if (!token) {
      throw new Error('Could not retrieve a valid CAPTCHA token. It might be empty.');
    }

    // 2. Construct the payload for the Lambda function.
    const payload = {
      ...data,
      captchaToken: token,
    };

    // 3. Send the data to the Lambda endpoint.
    const response = await fetch(LAMBDA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || 'An unknown server error occurred.');
    }

    return responseData;

  } catch (error) {
    console.error('Error in submitForm utility:', error);
    throw error;
  }
}
