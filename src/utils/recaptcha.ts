declare global {
  interface Window {
    grecaptcha: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      ready: (callback: () => void) => void;
    };
  }
}

export async function getRecaptchaToken(action: string): Promise<string> {
  try {
    // Wait for reCAPTCHA to be ready
    await new Promise<void>((resolve) => {
      window.grecaptcha.ready(() => resolve());
    });

    // Execute reCAPTCHA with the specified action
    const token = await window.grecaptcha.execute(
      import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY, 
      { action }
    );
    
    return token;
  } catch (error) {
    console.error('Error getting reCAPTCHA token:', error);
    throw new Error('Failed to get reCAPTCHA token');
  }
}
