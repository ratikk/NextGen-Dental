import { getRecaptchaToken } from './recaptcha';

const LAMBDA_ENDPOINT = import.meta.env.PUBLIC_LAMBDA_ENDPOINT;

if (!LAMBDA_ENDPOINT) {
  throw new Error("FATAL: PUBLIC_LAMBDA_ENDPOINT environment variable is not set.");
}

interface FormData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dob?: string; 
  email: string;
  phone: string;
  message?: string;
  preferredDate?: string;
  preferredTime?: string;
  reasonForVisit?: string;
  smsConsent: boolean;
  formType: 'appointment' | 'contact' | 'booking';
}

export async function submitForm(data: FormData) {
  try {
    const token = await getRecaptchaToken(`submit_${data.formType}`);

    // ✅ FIXED: Mapping data to match your OLD NextGen Lambda expectations
    const payload = {
      fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      email: data.email,
      phone: data.phone,
      dob: data.dob, // We are sending this, but Lambda needs update to read it
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      reasonForVisit: data.reasonForVisit,
      message: data.message,
      smsConsent: data.smsConsent,
      // ⚠️ CRITICAL CHANGE: Renamed 'recaptchaToken' to 'captchaToken' to match your Lambda
      captchaToken: token, 
    };

    const response = await fetch(LAMBDA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = 'Form submission failed.';
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        errorMessage = `Server error: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();

  } catch (error) {
    console.error('Error in submitForm utility:', error);
    throw error;
  }
}
