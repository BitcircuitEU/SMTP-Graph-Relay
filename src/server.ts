import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import ipRangeCheck from 'ip-range-check';
import { SMTPServer } from 'smtp-server';
import { simpleParser, ParsedMail } from 'mailparser';
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";

// Check and Generate .env
const configPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(configPath)) {
    console.log('.env file not found. Generating a new one with dummy values.');
    const dummyEnv = `
ALLOWED_IPS=127.0.0.1,192.168.0.0/24
SMTP_PORT=25
TENANT_ID=your_tenant_id_here
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
SENDER=default_sender@example.com
    `.trim();

    fs.writeFileSync(configPath, dummyEnv);
    console.log('.env file created. Please update it with your actual values. App closes in 10 Seconds');
    setTimeout(() => process.exit(1), 10000);
}

dotenv.config({ path: configPath });

// Load IP Whitelist
const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [];

// Graph API Client Setup
const credential = new ClientSecretCredential(
    process.env.TENANT_ID!,
    process.env.CLIENT_ID!,
    process.env.CLIENT_SECRET!
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
});

const client = Client.initWithMiddleware({
    authProvider: authProvider
});

// SMTP server setup
const server = new SMTPServer({
    secure: false,
    authOptional: true,
    onConnect(session, callback) {
        const clientIP = session.remoteAddress;
        console.log('New connection attempt from:', clientIP);

        if (allowedIPs.length > 0 && !ipRangeCheck(clientIP, allowedIPs)) {
            console.log(`Connection rejected from unauthorized IP: ${clientIP}`);
            return callback(new Error('Connection rejected'));
        }

        console.log(`Connection accepted from: ${clientIP}`);
        callback();
    },
    onMailFrom(address, session, callback) {
        callback();
    },
    onRcptTo(address, session, callback) {
        callback();
    },
    onData(stream, session, callback) {
        simpleParser(stream, {}, async (err, parsed: ParsedMail) => {
            if (err) {
                console.error('Error parsing email:', err);
                return callback(err);
            }
    
            if (!parsed.to) {
                return callback(new Error('Missing required email fields (to)'));
            }
    
            try {
                const sender = parsed.from?.text || process.env.SENDER;
                const recipients = Array.isArray(parsed.to) 
                    ? parsed.to.map(recipient => recipient.text)
                    : [parsed.to.text];
    
                // Erstellen der E-Mail-Nachricht für Graph API
                const message = {
                    subject: parsed.subject,
                    body: {
                        contentType: parsed.html ? 'HTML' : 'Text',
                        content: parsed.html || parsed.text
                    },
                    toRecipients: recipients.map(email => ({
                        emailAddress: { address: email }
                    })),
                    attachments: parsed.attachments?.map(attachment => ({
                        '@odata.type': '#microsoft.graph.fileAttachment',
                        name: attachment.filename,
                        contentType: attachment.contentType,
                        contentBytes: attachment.content.toString('base64')
                    }))
                };
    
                // Senden der E-Mail über Graph API
                await client.api('/users/' + sender + '/sendMail')
                    .post({ message });
    
                console.log(`[${new Date().toISOString()}] Mail from Server ${session.remoteAddress} has been forwarded via ${sender} to ${recipients.join(', ')}`);
    
                callback();
            } catch (error) {
                console.error('Error sending email via Graph API:', error);
                callback(new Error('Failed to send email'));
            }
        });
    },
});

const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 25;

server.listen(port, '0.0.0.0', () => {
    console.log(`SMTP Relay server running on port ${port}`);
});

// Add a process termination handler
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server.');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});