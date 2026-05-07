const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendVideoEmail(videoPath, receiverEmail, settings) {
    if (!settings.emailEnabled || !settings.emailUser || !settings.emailPass) {
        console.log('[EMAIL] Email not configured or disabled.');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: settings.emailService || 'gmail',
        auth: {
            user: settings.emailUser,
            pass: settings.emailPass
        }
    });

    const stats = fs.statSync(videoPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    let attachments = [];
    let body = `Your video is ready!\n\nFile: ${path.basename(videoPath)}\nSize: ${fileSizeMB.toFixed(2)} MB`;

    if (fileSizeMB < 24) { // Typical limit is 25MB
        attachments.push({
            filename: path.basename(videoPath),
            path: videoPath
        });
        body += `\n\nThe video is attached to this email.`;
    } else {
        body += `\n\nThe video is too large to attach (>25MB). You can find it in your server's output folder: ${videoPath}`;
        // If we had a public URL, we'd include it here. 
        // For now, we'll just notify.
    }

    const mailOptions = {
        from: settings.emailUser,
        to: receiverEmail || settings.emailReceiver,
        subject: `AutoVid: Your Video is Ready - ${path.basename(videoPath)}`,
        text: body,
        attachments: attachments
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[EMAIL] Email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('[EMAIL ERROR]', error);
        throw error;
    }
}

module.exports = { sendVideoEmail };
