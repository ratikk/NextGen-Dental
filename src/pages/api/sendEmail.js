import { sendEmail } from '../../lib/sesEmail';

export async function POST({ request }) {
  const { name, email, message } = await request.json();

  const subject = `New Contact from ${name}`;
  const body = `Name: ${name}\nEmail: ${email}\nMessage: ${message}`;

  try {
    await sendEmail({
      toAddress: 'your_existing_email@example.com',
      subject,
      body,
    });

    return new Response(JSON.stringify({ status: 'success' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error' }), { status: 500 });
  }
}

