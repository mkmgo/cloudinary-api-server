require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const app = express();
const port = 3000;

// 1. Configure Cloudinary (Strictly your working keys)
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(express.json());

// --- ROUTES ---

// Upload Route
app.post('/upload', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files.' });
        const folderName = req.body.folder || 'my-express-uploads';
        const uploadResults = [];
        for (const file of req.files) {
            const b64 = Buffer.from(file.buffer).toString('base64');
            let dataURI = "data:" + file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, {
                folder: folderName,
                resource_type: "auto" 
            });
            uploadResults.push({ public_id: result.public_id, url: result.secure_url });
        }
        res.status(200).json({ message: 'Uploaded', images: uploadResults });
    } catch (error) {
        res.status(500).json({ message: 'Failed', error: error.message });
    }
});

// Enhanced Table View with Full URLs and Extension Filter
app.get('/list-table', async (req, res) => {
    try {
        const selectedFolder = req.query.folder || "";
        const searchTerm = req.query.search || "";
        const selectedExt = req.query.extension || ""; // New Extension Filter

        const options = { max_results: 500 };
        if (selectedFolder) options.prefix = selectedFolder;

        const imageList = await cloudinary.api.resources({ ...options, resource_type: 'image' });
        const videoList = await cloudinary.api.resources({ ...options, resource_type: 'video' });
        const folderResult = await cloudinary.api.root_folders();

        let allAssets = [...imageList.resources, ...videoList.resources];

        // Apply Filters (Search and Extension)
        const filtered = allAssets.filter(asset => {
            const matchesSearch = asset.public_id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesExt = selectedExt === "" || asset.format.toLowerCase() === selectedExt.toLowerCase();
            return matchesSearch && matchesExt;
        });

        // Get unique extensions for the dropdown
        const extensions = [...new Set(allAssets.map(a => a.format.toUpperCase()))].sort();

        let tableHtml = `
            <html>
            <head>
                <title>Media Manager</title>
                <style>
                    body { font-family: 'Segoe UI', sans-serif; margin: 20px; background-color: #f4f7f6; }
                    .controls { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; }
                    table { width: 100%; border-collapse: collapse; background: white; table-layout: fixed; }
                    th, td { border: 1px solid #eee; padding: 10px; text-align: left; overflow-wrap: break-word; font-size: 13px; }
                    th { background-color: #007bff; color: white; text-transform: uppercase; width: 150px; }
                    .url-cell { font-family: monospace; background: #fafafa; color: #333; font-size: 11px; }
                    img, video { border-radius: 4px; border: 1px solid #ddd; }
                    .badge { padding: 3px 6px; border-radius: 4px; font-size: 10px; color: white; font-weight: bold; }
                </style>
            </head>
            <body>
                <h2>Media Library</h2>
                <div class="controls">
                    <form action="/list-table" method="GET" style="display: flex; gap: 10px; width: 100%;">
                        <input type="text" name="search" placeholder="Search name..." value="${searchTerm}" style="flex-grow: 1; padding: 8px;">
                        
                        <select name="extension" style="padding: 8px;">
                            <option value="">-- All Formats --</option>
                            ${extensions.map(ext => `<option value="${ext.toLowerCase()}" ${selectedExt === ext.toLowerCase() ? 'selected' : ''}>${ext}</option>`).join('')}
                        </select>

                        <select name="folder" style="padding: 8px;">
                            <option value="">-- All Folders --</option>
                            ${folderResult.folders.map(f => `<option value="${f.name}" ${selectedFolder === f.name ? 'selected' : ''}>${f.name}</option>`).join('')}
                        </select>

                        <button type="submit" style="padding: 8px 15px; background: #007bff; color: white; border: none; cursor: pointer; border-radius: 4px;">Apply Filters</button>
                        <a href="/list-table" style="padding: 8px; text-decoration: none; color: #666;">Reset</a>
                    </form>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 110px;">Preview</th>
                            <th style="width: 200px;">Public ID</th>
                            <th>Full Secure URL (Ready to Copy)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(asset => {
                            const isVideo = asset.resource_type === 'video';
                            const thumbUrl = isVideo 
                                ? asset.secure_url.replace(/\.[^/.]+$/, ".jpg").replace('/upload/', '/upload/w_100,h_100,c_thumb,so_auto/')
                                : asset.secure_url.replace('/upload/', '/upload/w_100,h_100,c_thumb/');

                            return `
                            <tr>
                                <td><img src="${thumbUrl}" width="100" height="100"></td>
                                <td>
                                    <span class="badge" style="background:${isVideo ? '#ffc107' : '#28a745'}">${asset.format.toUpperCase()}</span><br>
                                    <small>${asset.public_id}</small>
                                </td>
                                <td class="url-cell">
                                    <div style="margin-bottom: 5px;">${asset.secure_url}</div>
                                    <button onclick="navigator.clipboard.writeText('${asset.secure_url}')" style="cursor:pointer; font-size: 10px; padding: 2px 5px;">Copy URL</button>
                                </td>
                            </tr>`;
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