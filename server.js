require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const app = express();
const port = 3000;

// Dynamic Cloudinary Factory
const getCloudinary = (account) => {
    const configs = {
        C1: { cloud_name: process.env.C1_NAME, api_key: process.env.C1_KEY, api_secret: process.env.C1_SECRET },
        C2: { cloud_name: process.env.C2_NAME, api_key: process.env.C2_KEY, api_secret: process.env.C2_SECRET },
        C3: { cloud_name: process.env.C3_NAME, api_key: process.env.C3_KEY, api_secret: process.env.C3_SECRET }
    };
    
    // Configure the singleton object dynamically
    const cld = require('cloudinary').v2;
    cld.config(configs[account] || configs.C1);
    return cld;
};

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(express.json());

// --- ROUTES ---

// Upload Route (Usage: POST /upload/C1)
app.post('/upload/:account', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files.' });
        const cld = getCloudinary(req.params.account);
        const folderName = req.body.folder || 'my-express-uploads';
        const uploadResults = [];
        
        for (const file of req.files) {
            const b64 = Buffer.from(file.buffer).toString('base64');
            let dataURI = "data:" + file.mimetype + ";base64," + b64;
            const result = await cld.uploader.upload(dataURI, { folder: folderName, resource_type: "auto" });
            uploadResults.push({ public_id: result.public_id, url: result.secure_url });
        }
        res.status(200).json({ message: 'Uploaded', images: uploadResults });
    } catch (error) {
        res.status(500).json({ message: 'Failed', error: error.message });
    }
});

// Table View (Usage: GET /list-table/C1)
app.get('/list-table/:account', async (req, res) => {
    try {
        const cld = getCloudinary(req.params.account);
        const selectedFolder = req.query.folder || "";
        const searchTerm = req.query.search || "";
        const selectedExt = req.query.extension || "";

        const options = { max_results: 500 };
        if (selectedFolder) options.prefix = selectedFolder;

        const imageList = await cld.api.resources({ ...options, resource_type: 'image' });
        const videoList = await cld.api.resources({ ...options, resource_type: 'video' });
        const folderResult = await cld.api.root_folders();

        let allAssets = [...imageList.resources, ...videoList.resources];
        const filtered = allAssets.filter(asset => {
            const matchesSearch = asset.public_id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesExt = selectedExt === "" || asset.format.toLowerCase() === selectedExt.toLowerCase();
            return matchesSearch && matchesExt;
        });

        const extensions = [...new Set(allAssets.map(a => a.format.toUpperCase()))].sort();

        let tableHtml = `
            <html>
            <style>
                body { font-family: 'Segoe UI', sans-serif; margin: 20px; background-color: #f4f7f6; }
                .controls { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; background: white; table-layout: fixed; }
                th, td { border: 1px solid #eee; padding: 12px; text-align: left; vertical-align: top; }
                th:nth-child(1) { width: 130px; }
                th:nth-child(2) { width: 250px; }
                .url-cell { overflow-wrap: break-word; font-family: monospace; font-size: 11px; }
                img { border-radius: 4px; border: 1px solid #ddd; display: block; }
            </style>
            <body>
                <h2>Media Library: ${req.params.account}</h2>
                <div class="controls">
                    <form action="/list-table/${req.params.account}" method="GET">
                        <input type="text" name="search" placeholder="Search..." value="${searchTerm}">
                        <select name="extension">
                            <option value="">All Formats</option>
                            ${extensions.map(ext => `<option value="${ext.toLowerCase()}" ${selectedExt === ext.toLowerCase() ? 'selected' : ''}>${ext}</option>`).join('')}
                        </select>
                        <select name="folder">
                            <option value="">All Folders</option>
                            ${folderResult.folders.map(f => `<option value="${f.name}" ${selectedFolder === f.name ? 'selected' : ''}>${f.name}</option>`).join('')}
                        </select>
                        <button type="submit">Apply</button>
                    </form>
                </div>
                <table>
                    <thead><tr><th>Preview</th><th>ID</th><th>URL</th></tr></thead>
                    <tbody>
                        ${filtered.map(asset => {
                            const isVideo = asset.resource_type === 'video';
                            const thumbUrl = isVideo ? asset.secure_url.replace(/\.[^/.]+$/, ".jpg").replace('/upload/', '/upload/w_100,h_100,c_thumb,so_auto/') : asset.secure_url.replace('/upload/', '/upload/w_100,h_100,c_thumb/');
                            return `<tr><td><img src="${thumbUrl}"></td><td>${asset.public_id}</td><td class="url-cell">${asset.secure_url}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </body>
            </html>`;
        res.send(tableHtml);
    } catch (error) {
        res.status(500).send("Error: " + error.message);
    }
});

app.listen(port, () => console.log(`Server: http://localhost:${port}`));
app.get('/', (req, res) => {
    res.send(`
        <h1>Cloudinary Control Panel</h1>
        <ul>
            <li><a href="/list-table/C1">Account 1 Library</a></li>
            <li><a href="/list-table/C2">Account 2 Library</a></li>
            <li><a href="/list-table/C3">Account 3 Library</a></li>
        </ul>
    `);
});