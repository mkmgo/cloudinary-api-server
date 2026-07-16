require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

const app = express();
const port = 3000;

const getCloudinary = (account) => {
    const configs = {
        C1: { cloud_name: process.env.C1_NAME, api_key: process.env.C1_KEY, api_secret: process.env.C1_SECRET },
        C2: { cloud_name: process.env.C2_NAME, api_key: process.env.C2_KEY, api_secret: process.env.C2_SECRET },
        C3: { cloud_name: process.env.C3_NAME, api_key: process.env.C3_KEY, api_secret: process.env.C3_SECRET }
    };
    const cld = require('cloudinary').v2;
    cld.config(configs[account] || configs.C1);
    return cld;
};

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(express.json());

// --- UPLOAD ROUTE ---
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

// --- SHARED STYLES ---
const SHARED_HEAD = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #f8fafc; --surface: #ffffff; --surface-hover: #f1f5f9;
            --text: #0f172a; --text-sec: #64748b; --text-ter: #94a3b8;
            --border: #e2e8f0; --accent: #6366f1; --accent-light: #eef2ff;
            --success: #22c55e;
            --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
            --shadow-lg: 0 10px 25px rgba(0,0,0,0.07);
            --radius: 12px; --radius-sm: 8px;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #0f172a; --surface: #1e293b; --surface-hover: #334155;
                --text: #f1f5f9; --text-sec: #94a3b8; --text-ter: #64748b;
                --border: #334155; --accent: #818cf8; --accent-light: #1e1b4b;
                --shadow: 0 1px 3px rgba(0,0,0,0.3);
                --shadow-lg: 0 10px 25px rgba(0,0,0,0.4);
            }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg); color: var(--text);
            min-height: 100vh; padding: 2rem;
        }
        .copy-btn {
            background: var(--surface-hover); border: 1px solid var(--border);
            border-radius: var(--radius-sm); padding: 0.4rem 0.6rem;
            cursor: pointer; color: var(--text-sec); font-family: inherit;
            font-size: 0.78rem; transition: all 0.15s;
            display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap;
        }
        .copy-btn:hover { background: var(--accent); color: white; border-color: var(--accent); }
        .copy-btn.copied { background: var(--success); color: white; border-color: var(--success); }
        .copy-btn svg {
            width: 13px; height: 13px; fill: none; stroke: currentColor;
            stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
        }
    </style>`;

const COPY_ICON = '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

// --- DASHBOARD ---
app.get('/', (req, res) => {
    const accounts = [
        { id: 'C1', name: 'Core (dog0815barking@gmail.com)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>', color: '#6366f1' },
        { id: 'C2', name: 'Flow (scalable.focus@gmail.com)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>', color: '#8b5cf6' },
        { id: 'C3', name: 'Venture (mkmueller.mission@gmail.com)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c0-5 2-8 2-8s2 3 2 8"/><path d="M12 11c0-3 2-5 2-5s2 2 2 5"/></svg>', color: '#a78bfa' }
    ];
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloudinary Control Panel</title>
    ${SHARED_HEAD}
    <style>
        body { display: flex; align-items: center; justify-content: center; }
        .container { max-width: 520px; width: 100%; }
        .header { text-align: center; margin-bottom: 2.5rem; }
        .header h1 { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.025em; margin-bottom: 0.5rem; }
        .header p { color: var(--text-sec); font-size: 0.9rem; }
        .cards { display: flex; flex-direction: column; gap: 0.75rem; }
        .card {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: var(--radius); padding: 1.25rem 1.5rem;
            display: flex; align-items: center; gap: 1rem;
            text-decoration: none; color: var(--text);
            transition: all 0.15s ease; box-shadow: var(--shadow);
        }
        .card:hover { box-shadow: var(--shadow-lg); border-color: var(--accent); transform: translateY(-1px); }
        .card-icon {
            width: 44px; height: 44px; border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            color: white; flex-shrink: 0;
        }
        .card-icon svg { width: 22px; height: 22px; }
        .card-body { flex: 1; }
        .card-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.15rem; }
        .card-sub { color: var(--text-sec); font-size: 0.8rem; }
        .footer { text-align: center; margin-top: 2.5rem; color: var(--text-sec); font-size: 0.75rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Cloudinary API-Server Dashboard</h1>
            <p>Select an account to manage media</p>
        </div>
        <div class="cards">
            ${accounts.map((acc) => {
                const url = '/list-table/' + acc.id;
                return `<a class="card" href="${url}">
                    <div class="card-icon" style="background:${acc.color}">${acc.icon}</div>
                    <div class="card-body">
                        <div class="card-title">${acc.name}</div>
                        <div class="card-sub">Open media library</div>
                    </div>
                </a>`;
            }).join('')}
        </div>
        <div class="footer">Cloudinary API Server &middot; Port 3000</div>
    </div>
    <script>
        function copyLink(btn, path) {
            navigator.clipboard.writeText(location.origin + path).then(() => {
                btn.classList.add('copied');
                btn.querySelector('span').textContent = 'Copied!';
                setTimeout(() => { btn.classList.remove('copied'); btn.querySelector('span').textContent = 'Copy'; }, 1500);
            });
        }
    </script>
</body>
</html>`);
});

// --- TABLE VIEW ---
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
        const acct = req.params.account;
        const acctInfo = {
            C1: { title: 'Media Library: Core (dog0815braking@gmail.com)', color: '#6366f1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>' },
            C2: { title: 'Media Library: Flow (scalable.focus@gmail.com)', color: '#8b5cf6', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>' },
            C3: { title: 'Media Library: Venture (mkmueller.mission@gmail.com)', color: '#a78bfa', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c0-5 2-8 2-8s2 3 2 8"/><path d="M12 11c0-3 2-5 2-5s2 2 2 5"/></svg>' }
        };
        const info = acctInfo[acct] || { title: 'Media Library', color: '#6366f1', icon: '' };

        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${info.title}</title>
    ${SHARED_HEAD}
    <style>
        .container { max-width: 1100px; margin: 0 auto; }
        .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.75rem; }
        .back-btn {
            display: inline-flex; align-items: center; gap: 0.4rem;
            text-decoration: none; color: var(--text-sec); font-size: 0.85rem;
            font-weight: 500; padding: 0.4rem 0.75rem; border-radius: var(--radius-sm);
            transition: all 0.15s;
        }
        .back-btn:hover { background: var(--surface); color: var(--text); }
        .back-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .header h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em; }
        .badge { padding: 0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; color: white; flex-shrink: 0; }
        .badge svg { width: 22px; height: 22px; }
        .controls {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: var(--radius); padding: 1rem 1.25rem;
            margin-bottom: 1.5rem; box-shadow: var(--shadow);
        }
        .controls form { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
        .controls input, .controls select {
            font-family: 'Inter', sans-serif; font-size: 0.85rem;
            padding: 0.55rem 0.85rem; border: 1px solid var(--border);
            border-radius: var(--radius-sm); background: var(--bg);
            color: var(--text); outline: none; transition: border-color 0.15s;
        }
        .controls input:focus, .controls select:focus { border-color: var(--accent); }
        .controls input { flex: 1; min-width: 180px; }
        .controls select { min-width: 140px; }
        .controls button {
            font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600;
            padding: 0.55rem 1.25rem; background: var(--accent); color: white;
            border: none; border-radius: var(--radius-sm); cursor: pointer; transition: opacity 0.15s;
        }
        .controls button:hover { opacity: 0.9; }
        .stats { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .stat-pill {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 20px; padding: 0.35rem 0.85rem;
            font-size: 0.78rem; color: var(--text-sec); font-weight: 500;
        }
        .stat-pill strong { color: var(--text); }
        .table-wrap {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow);
        }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        thead th {
            background: var(--surface-hover); padding: 0.75rem 1rem;
            text-align: left; font-size: 0.75rem; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.05em;
            color: var(--text-sec); border-bottom: 1px solid var(--border);
        }
        th:nth-child(1) { width: 80px; }
        th:nth-child(2) { width: 30%; }
        th:nth-child(3) { width: auto; }
        th:nth-child(4) { width: 70px; }
        tbody tr { border-bottom: 1px solid var(--border); transition: background 0.1s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: var(--surface-hover); }
        tbody td { padding: 0.65rem 1rem; vertical-align: middle; }
        .thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); display: block; }
        .id-cell { font-size: 0.82rem; color: var(--text-sec); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .url-cell { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; color: var(--text-ter); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .copy-cell { text-align: center; }
        .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-ter); font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a class="back-btn" href="/">
                <svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Back
            </a>
            <h1>${info.title}</h1>
            <span class="badge" style="background:${info.color}">${info.icon}</span>
        </div>
        <div class="controls">
            <form action="/list-table/${acct}" method="GET">
                <input type="text" name="search" placeholder="Search by ID..." value="${searchTerm}">
                <select name="extension">
                    <option value="">All Formats</option>
                    ${extensions.map(ext => '<option value="' + ext.toLowerCase() + '"' + (selectedExt === ext.toLowerCase() ? ' selected' : '') + '>' + ext + '</option>').join('')}
                </select>
                <select name="folder">
                    <option value="">All Folders</option>
                    ${folderResult.folders.map(f => '<option value="' + f.name + '"' + (selectedFolder === f.name ? ' selected' : '') + '>' + f.name + '</option>').join('')}
                </select>
                <button type="submit">Apply</button>
            </form>
        </div>
        <div class="stats">
            <span class="stat-pill"><strong>${filtered.length}</strong> assets</span>
            <span class="stat-pill"><strong>${extensions.length}</strong> formats</span>
            <span class="stat-pill"><strong>${folderResult.folders.length}</strong> folders</span>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Preview</th><th>ID</th><th>URL</th><th></th></tr></thead>
                <tbody>
                    ${filtered.length === 0 ? '<tr><td colspan="4"><div class="empty-state">No assets found matching your filters.</div></td></tr>' :
                    filtered.map(asset => {
                        const isVideo = asset.resource_type === 'video';
                        const thumbUrl = isVideo
                            ? asset.secure_url.replace(/\\.[^/.]+$/, '.jpg').replace('/upload/', '/upload/w_100,h_100,c_thumb,so_auto/')
                            : asset.secure_url.replace('/upload/', '/upload/w_100,h_100,c_thumb/');
                        const safeUrl = asset.secure_url.replace(/'/g, "\\'");
                        return '<tr>' +
                            '<td><img class="thumb" src="' + thumbUrl + '" loading="lazy"></td>' +
                            '<td class="id-cell" title="' + asset.public_id + '">' + asset.public_id + '</td>' +
                            '<td class="url-cell" title="' + asset.secure_url + '">' + asset.secure_url + '</td>' +
                            '<td class="copy-cell"><button class="copy-btn" onclick="copyUrl(this,\'' + safeUrl + '\')" title="Copy URL">' +
                            COPY_ICON + '</button></td></tr>';
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
    <script>
        function copyUrl(btn, url) {
            navigator.clipboard.writeText(url).then(() => {
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 1200);
            });
        }
    </script>
</body>
</html>`);
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
});

app.listen(port, () => console.log('Server: http://localhost:' + port));
