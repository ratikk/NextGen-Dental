// sesEmail.js
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const region = 'us-east-1';
const secretsClient = new SecretsManagerClient({ region });

async function getSESSecret() {
  const secretName = 'prod/lilacdental/aws-ses';

  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await secretsClient.send(command);
  return JSON.parse(response.SecretString);
}

export async function sendEmail({ toAddress, subject, body }) {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = await getSESSecret();

  const sesClient = new SESClient({
    region,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  const params = {
    Destination: { ToAddresses: [toAddress] },
    Message: {
      Body: { Text: { Data: body } },
      Subject: { Data: subject },
    },
    Source: 'info@lilacdentalaustintx.com', // must match verified domain/email
  };

  try {
    const command = new SendEmailCommand(params);
    const data = await sesClient.send(command);
    return data;
  } catch (err) {
    console.error("Error sending email", err);
    throw err;
  }
}

