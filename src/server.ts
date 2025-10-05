import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import ipRangeCheck from 'ip-range-check';
import { SMTPServer } from 'smtp-server';
import { simpleParser, ParsedMail } from 'mailparser';
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";

// Logger-Klasse für Datei-Logging
class Logger {
    private logFile: string;
    private logStream: fs.WriteStream;

    constructor() {
        this.logFile = path.join(process.cwd(), 'smtp-relay.log');
        this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    }

    private formatMessage(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level}] ${message}\n`;
    }

    info(message: string): void {
        const formattedMessage = this.formatMessage('INFO', message);
        process.stdout.write(formattedMessage);
        this.logStream.write(formattedMessage);
    }

    error(message: string): void {
        const formattedMessage = this.formatMessage('ERROR', message);
        process.stderr.write(formattedMessage);
        this.logStream.write(formattedMessage);
    }

    warn(message: string): void {
        const formattedMessage = this.formatMessage('WARN', message);
        process.stdout.write(formattedMessage);
        this.logStream.write(formattedMessage);
    }

    close(): void {
        this.logStream.end();
    }
}

// Logger-Instanz erstellen
const logger = new Logger();

// Check and Generate .env
const configPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(configPath)) {
    logger.warn('.env file not found. Generating a new one with dummy values.');
    const dummyEnv = `
ALLOWED_IPS=127.0.0.1,192.168.0.0/24
SMTP_PORT=25
TENANT_ID=your_tenant_id_here
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
SENDER=default_sender@example.com
    `.trim();

    fs.writeFileSync(configPath, dummyEnv);
    logger.info('.env file created. Please update it with your actual values. App closes in 10 Seconds');
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
        logger.info(`New connection attempt from: ${clientIP}`);

        if (allowedIPs.length > 0 && !ipRangeCheck(clientIP, allowedIPs)) {
            logger.warn(`Connection rejected from unauthorized IP: ${clientIP}`);
            return callback(new Error('Connection rejected'));
        }

        logger.info(`Connection accepted from: ${clientIP}`);
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
                logger.error(`Error parsing email: ${err.message}`);
                return callback(err);
            }
    
            if (!parsed.to) {
                return callback(new Error('Missing required email fields (to)'));
            }
    
            try {
                // Immer den konfigurierten SENDER aus der .env verwenden
                const sender = process.env.SENDER;
                if (!sender) {
                    throw new Error('SENDER environment variable is not configured');
                }
                
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
                // Extrahieren der E-Mail-Adresse aus dem SENDER (falls es ein "Name <email>" Format ist)
                const senderEmail = sender.includes('<') && sender.includes('>') 
                    ? sender.match(/<([^>]+)>/)?.[1] || sender
                    : sender;
                
                await client.api('/users/' + encodeURIComponent(senderEmail) + '/sendMail')
                    .post({ message });
    
                logger.info(`Mail from Server ${session.remoteAddress} has been forwarded via ${senderEmail} to ${recipients.join(', ')}`);
    
                callback();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error(`Error sending email via Graph API: ${errorMessage}`);
                callback(new Error('Failed to send email'));
            }
        });
    },
});

const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 25;

server.listen(port, '0.0.0.0', () => {
    logger.info(`SMTP Relay server running on port ${port}`);
    logger.info(`Log file: ${logger['logFile']}`);
});

// Add a process termination handler
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Closing server.');
    server.close(() => {
        logger.info('Server closed.');
        logger.close();
        process.exit(0);
    });
});

// Graceful shutdown bei anderen Signalen
process.on('SIGINT', () => {
    logger.info('SIGINT received. Closing server.');
    server.close(() => {
        logger.info('Server closed.');
        logger.close();
        process.exit(0);
    });
});