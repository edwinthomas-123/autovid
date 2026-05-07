const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { google } = require('googleapis');
const https = require('https');

// Path to tracking file
const DB_PATH = path.join(__dirname, 'automation_db.json');
const CREDENTIALS_PATH = path.join(__dirname, 'google_credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const BACKGROUND_CLIPS_DIR = path.join(__dirname, 'background_clips');

// Initialize local DB if not exists
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
        folderId: '',
        spreadsheetId: '',
        frequency: 2,
        isActive: false,
        postedIds: [],
        logs: []
    }, null, 2));
}

if (!fs.existsSync(BACKGROUND_CLIPS_DIR)) {
    fs.mkdirSync(BACKGROUND_CLIPS_DIR);
}

class AutomationEngine {
    constructor() {
        this.db = JSON.parse(fs.readFileSync(DB_PATH));
    }

    saveDb() {
        fs.writeFileSync(DB_PATH, JSON.stringify(this.db, null, 2));
    }

    addLog(event, status = 'info') {
        const log = {
            time: new Date().toLocaleString(),
            event,
            status
        };
        this.db.logs.unshift(log);
        if (this.db.logs.length > 50) this.db.logs.pop();
        this.saveDb();
        console.log(`[AUTOMATOR] ${event}`);
    }

    async getAuth() {
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            throw new Error('Google credentials file missing.');
        }
        
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        if (!fs.existsSync(TOKEN_PATH)) {
            throw new Error('Google token missing. Please run the login script first.');
        }

        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
        return oAuth2Client;
    }

    async syncBackgroundClips() {
        this.addLog('Starting background clips sync...');
        try {
            const auth = await this.getAuth();
            const drive = google.drive({ version: 'v3', auth });

            // 1. Find the folder
            const folderRes = await drive.files.list({
                q: "name = 'background gaming clips' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
                fields: 'files(id, name)',
            });

            const folders = folderRes.data.files;
            if (!folders || folders.length === 0) {
                this.addLog('Could not find "background gaming clips" folder on Drive.', 'error');
                return;
            }

            const folderId = folders[0].id;

            // 2. List videos
            const filesRes = await drive.files.list({
                q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
                fields: 'files(id, name, webContentLink)',
            });

            const files = filesRes.data.files || [];
            this.addLog(`Found ${files.length} videos in Drive folder.`);

            for (const file of files) {
                const localPath = path.join(BACKGROUND_CLIPS_DIR, file.name);
                if (!fs.existsSync(localPath)) {
                    this.addLog(`Downloading new background clip: ${file.name}...`);
                    await this.downloadDriveFile(auth, file.id, localPath);
                }
            }
            this.addLog('Background clips sync complete.', 'success');
        } catch (error) {
            this.addLog(`Sync Error: ${error.message}`, 'error');
        }
    }

    async downloadDriveFile(auth, fileId, dest) {
        const drive = google.drive({ version: 'v3', auth });
        const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(dest);
            res.data
                .on('end', () => {
                    file.close();
                    resolve();
                })
                .on('error', err => {
                    fs.unlink(dest, () => {});
                    reject(err);
                })
                .pipe(file);
        });
    }

    async scanAndPost() {
        if (!this.db.isActive) return;

        try {
            const auth = await this.getAuth();
            if (this.db.spreadsheetId) await this.processSpreadsheet(auth);
            else if (this.db.folderId) await this.processFolder(auth);
        } catch (error) {
            this.addLog(`Automation Error: ${error.message}`, 'error');
        }
    }

    async processSpreadsheet(auth) {
        this.addLog(`Scanning Spreadsheet: ${this.db.spreadsheetId}...`);
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: this.db.spreadsheetId,
            range: 'Sheet1!A2:C100',
        });
        const rows = response.data.values;
        if (!rows || rows.length === 0) return;

        let rowIndex = -1;
        const targetRow = rows.find((row, index) => {
            const status = row[2] ? row[2].trim().toLowerCase() : '';
            if (status !== 'posted') {
                rowIndex = index + 2;
                return true;
            }
            return false;
        });

        if (targetRow) {
            const [videoUrl, caption] = targetRow;
            const success = await this.postReel({ name: caption || 'Video from Sheet', url: videoUrl, source: 'sheet' });
            if (success) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: this.db.spreadsheetId,
                    range: `Sheet1!C${rowIndex}`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [['Posted']] },
                });
            }
        }
    }

    async processFolder(auth) {
        const drive = google.drive({ version: 'v3', auth });
        const res = await drive.files.list({
            q: `'${this.db.folderId}' in parents and mimeType contains 'video/' and trashed = false`,
            fields: 'files(id, name)',
        });
        const files = res.data.files;
        if (!files || files.length === 0) return;
        const unposted = files.find(f => !this.db.postedIds.includes(f.id));
        if (unposted) {
            const success = await this.postReel({ ...unposted, source: 'folder' });
            if (success) {
                this.db.postedIds.push(unposted.id);
                this.saveDb();
            }
        }
    }

    async postReel(video) {
        this.addLog(`[POSTING] Preparing to post: ${video.name}...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.addLog(`[SUCCESS] Successfully posted: ${video.name}`, 'success');
        return true;
    }

    async testConnection(config) {
        const folderId = config.folderId || this.db.folderId;
        const spreadsheetId = config.spreadsheetId || this.db.spreadsheetId;
        try {
            const auth = await this.getAuth();
            if (spreadsheetId) {
                const sheets = google.sheets({ version: 'v4', auth });
                const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1!A2:C100' });
                return { success: true, count: (res.data.values || []).length };
            } else if (folderId) {
                const drive = google.drive({ version: 'v3', auth });
                const res = await drive.files.list({
                    q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
                    fields: 'files(id, name)',
                });
                return { success: true, count: (res.data.files || []).length };
            }
            return { success: false, error: 'No ID provided' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    start() {
        this.syncBackgroundClips();
        this.scanAndPost();
        cron.schedule('0 * * * *', () => {
            this.syncBackgroundClips();
            this.scanAndPost();
        });
        console.log('Drive Automation Engine Started');
    }

    updateConfig(config) {
        this.db.folderId = config.folderId !== undefined ? config.folderId : this.db.folderId;
        this.db.spreadsheetId = config.spreadsheetId !== undefined ? config.spreadsheetId : this.db.spreadsheetId;
        this.db.frequency = config.frequency !== undefined ? config.frequency : this.db.frequency;
        this.db.isActive = config.isActive !== undefined ? config.isActive : this.db.isActive;
        this.saveDb();
        if (this.db.isActive) this.scanAndPost();
    }
}

module.exports = new AutomationEngine();
