require("dotenv").config();
const express = require("express");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

const app = express();
const port = 3000;

const getCloudinary = (account) => {
  const configs = {
    C1: {
      cloud_name: process.env.C1_NAME,
      api_key: process.env.C1_KEY,
      api_secret: process.env.C1_SECRET,
    },
    C2: {
      cloud_name: process.env.C2_NAME,
      api_key: process.env.C2_KEY,
      api_secret: process.env.C2_SECRET,
    },
    C3: {
      cloud_name: process.env.C3_NAME,
      api_key: process.env.C3_KEY,
      api_secret: process.env.C3_SECRET,
    },
  };
  const cld = require("cloudinary").v2;
  cld.config(configs[account] || configs.C1);
  return cld;
};

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(express.json());

// --- UPLOAD ROUTE ---
app.post("/upload/:account", upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: "No files." });
    const cld = getCloudinary(req.params.account);
    const folderName = req.body.folder || "my-express-uploads";
    const uploadResults = [];

    for (const file of req.files) {
      const b64 = Buffer.from(file.buffer).toString("base64");
      let dataURI = "data:" + file.mimetype + ";base64," + b64;
      const result = await cld.uploader.upload(dataURI, {
        folder: folderName,
        resource_type: "auto",
      });
      uploadResults.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }
    res.status(200).json({ message: "Uploaded", images: uploadResults });
  } catch (error) {
    res.status(500).json({ message: "Failed", error: error.message });
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

const COPY_ICON =
  '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

// --- DASHBOARD ---
app.get("/", (req, res) => {
  const accounts = [
    {
      id: "C1",
      name: "Core (dqwm4pdbz)",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
      color: "#6366f1",
    },
    {
      id: "C2",
      name: "Flow (dp455m4rk)",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
      color: "#8b5cf6",
    },
    {
      id: "C3",
      name: "Venture (dmkhsyfzf)",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 17a1 1 0 0 0-1 1v1a2 2 0 1 0 2-2z"/><path d="M20.97 3.61a.45.45 0 0 0-.58-.58C10.2 6.6 6.6 10.2 3.03 20.39a.45.45 0 0 0 .58.58C13.8 17.4 17.4 13.8 20.97 3.61"/><path d="m6.707 6.707 10.586 10.586"/><path d="M7 5a2 2 0 1 0-2 2h1a1 1 0 0 0 1-1z"/></svg>',
      color: "#a78bfa",
    },
  ];
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloudinary Control Panel</title>
    <link rel="icon" type="image/png" href="https://res.cloudinary.com/dp455m4rk/image/upload/v1784729841/media_lib_m3xz45.png">
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
        .card-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
        .card-exp-btn {
            display: inline-flex; align-items: center; gap: 0.3rem;
            text-decoration: none; font-size: 0.72rem; font-weight: 500;
            padding: 0.3rem 0.6rem; border-radius: 6px;
            border: 1px solid #f59e0b; color: #f59e0b;
            background: rgba(245,158,11,0.08); transition: all 0.15s;
        }
        .card-exp-btn:hover { background: #f59e0b; color: #000; }
        .card-exp-btn svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .card-exp-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; color: #f59e0b; font-weight: 700; }
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
            ${accounts
              .map((acc) => {
                const url = "/list-table/" + acc.id;
                const expUrl = "/experimental/" + acc.id;
                return `<a class="card" href="${url}">
                    <div class="card-icon" style="background:${acc.color}">${acc.icon}</div>
                    <div class="card-body">
                        <div class="card-title">${acc.name}</div>
                        <div class="card-sub">Open media library</div>
                        <div class="card-actions">
                            <a class="card-exp-btn" href="${expUrl}" onclick="event.stopPropagation();">
                                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                                JSON Mode
                            </a>
                            <span class="card-exp-label">Experimental</span>
                        </div>
                    </div>
                </a>`;
              })
              .join("")}
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

// --- EXPERIMENTAL MODE ---
app.get("/experimental/:account", (req, res) => {
  const acct = req.params.account;
  const acctInfo = {
    C1: { title: "Experimental: Core (dqwm4pdbz)", color: "#6366f1" },
    C2: { title: "Experimental: Flow (dp455m4rk)", color: "#8b5cf6" },
    C3: { title: "Experimental: Venture (dmkhsyfzf)", color: "#a78bfa" },
  };
  const info = acctInfo[acct] || { title: "Experimental", color: "#6366f1" };

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${info.title}</title>
    <link rel="icon" type="image/png" href="https://res.cloudinary.com/dp455m4rk/image/upload/v1784729841/media_lib_m3xz45.png">
    ${SHARED_HEAD}
    <style>
        .container { max-width: 1100px; margin: 0 auto; }
        .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.75rem; flex-wrap: wrap; }
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
        .exp-tag { background: #f59e0b; color: #000; font-size: 0.65rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .upload-zone {
            background: var(--surface); border: 2px dashed var(--border);
            border-radius: var(--radius); padding: 2.5rem 2rem;
            text-align: center; margin-bottom: 1.5rem; cursor: pointer;
            transition: all 0.2s;
        }
        .upload-zone:hover, .upload-zone.drag-over {
            border-color: var(--accent); background: var(--accent-light);
        }
        .upload-zone p { color: var(--text-sec); font-size: 0.9rem; margin-bottom: 0.75rem; }
        .upload-zone .hint { font-size: 0.75rem; color: var(--text-ter); }
        .upload-zone input { display: none; }
        .or-divider { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; color: var(--text-ter); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .json-input {
            width: 100%; min-height: 180px; background: var(--surface);
            border: 1px solid var(--border); border-radius: var(--radius-sm);
            padding: 1rem; font-family: 'JetBrains Mono', monospace;
            font-size: 0.78rem; color: var(--text); resize: vertical;
            margin-bottom: 1rem;
        }
        .json-input:focus { outline: none; border-color: var(--accent); }
        .process-btn {
            background: var(--accent); color: white; border: none;
            border-radius: var(--radius-sm); padding: 0.65rem 1.5rem;
            font-family: inherit; font-size: 0.85rem; font-weight: 600;
            cursor: pointer; transition: all 0.15s; display: inline-flex;
            align-items: center; gap: 0.4rem;
        }
        .process-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .process-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .process-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .results { margin-top: 1.5rem; display: none; }
        .results.active { display: block; }
        .results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
        .results-header h2 { font-size: 1.1rem; font-weight: 600; }
        .results-tabs { display: flex; gap: 0.25rem; background: var(--surface-hover); border-radius: var(--radius-sm); padding: 0.2rem; }
        .results-tabs button {
            background: none; border: none; padding: 0.4rem 0.85rem;
            border-radius: 6px; font-family: inherit; font-size: 0.78rem;
            font-weight: 500; color: var(--text-sec); cursor: pointer;
            transition: all 0.15s;
        }
        .results-tabs button.active { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .link-card {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: var(--radius-sm); padding: 0.85rem 1rem;
            margin-bottom: 0.5rem; display: flex; align-items: center;
            gap: 0.75rem; transition: all 0.1s;
        }
        .link-card:hover { border-color: var(--accent); }
        .link-label {
            font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.05em; color: var(--accent); min-width: 70px;
            flex-shrink: 0;
        }
        .link-url {
            flex: 1; font-family: 'JetBrains Mono', monospace;
            font-size: 0.72rem; color: var(--text-sec); overflow: hidden;
            text-overflow: ellipsis; white-space: nowrap;
        }
        .link-url a { color: inherit; text-decoration: none; }
        .link-url a:hover { color: var(--accent); text-decoration: underline; }
        .asset-group { margin-bottom: 1.5rem; }
        .asset-group-title { font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text); }
        .asset-group-id { font-size: 0.72rem; color: var(--text-ter); font-family: 'JetBrains Mono', monospace; margin-bottom: 0.65rem; }
        .copy-all-btn {
            background: var(--surface-hover); border: 1px solid var(--border);
            border-radius: var(--radius-sm); padding: 0.35rem 0.65rem;
            cursor: pointer; color: var(--text-sec); font-family: inherit;
            font-size: 0.72rem; transition: all 0.15s; display: inline-flex;
            align-items: center; gap: 0.3rem;
        }
        .copy-all-btn:hover { background: var(--accent); color: white; border-color: var(--accent); }
        .copy-all-btn svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-ter); font-size: 0.9rem; }
        .error-msg { color: #ef4444; font-size: 0.82rem; margin-top: 0.5rem; display: none; }
        .error-msg.active { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a class="back-btn" href="/">
                <svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Back
            </a>
            <a class="back-btn" href="/list-table/${acct}">
                <svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                Library
            </a>
            <span class="badge" style="background:${info.color}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </span>
            <h1>${info.title}</h1>
            <span class="exp-tag">Experimental</span>
        </div>

        <div class="upload-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
            <p>Drop a JSON file here or click to browse</p>
            <div class="hint">Supports arrays of objects with "url", "public_id", or "id" fields</div>
            <input type="file" id="fileInput" accept=".json,application/json">
        </div>

        <div class="or-divider">or paste JSON below</div>

        <textarea class="json-input" id="jsonInput" placeholder='[
  { "url": "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
  { "public_id": "my-folder/photo1" },
  { "id": "video/v1234" }
]'></textarea>

        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <button class="process-btn" id="processBtn" onclick="processJSON()">
                <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Process JSON
            </button>
            <button class="process-btn" id="loadLibBtn" onclick="loadFromLibrary()" style="background:var(--surface-hover); color:var(--text-sec); border:1px solid var(--border);">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Load from Library
            </button>
        </div>
        <div class="error-msg" id="errorMsg"></div>

        <div class="results" id="results">
            <div class="results-header">
                <h2 id="resultsTitle">Generated Links</h2>
                <div class="results-tabs">
                    <button class="active" onclick="switchTab('partial')">Partial Links</button>
                    <button onclick="switchTab('variations')">Link Variations</button>
                    <button onclick="switchTab('raw')">Raw JSON</button>
                </div>
            </div>
            <div class="tab-content active" id="tab-partial"></div>
            <div class="tab-content" id="tab-variations"></div>
            <div class="tab-content" id="tab-raw"></div>
        </div>
    </div>
    <script>
        const ACCOUNT = '${acct}';
        let currentResults = { partial: [], variations: [], raw: [] };

        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault(); dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) readFile(file);
        });
        fileInput.addEventListener('change', e => { if (e.target.files[0]) readFile(e.target.files[0]); });

        function readFile(file) {
            const reader = new FileReader();
            reader.onload = e => { document.getElementById('jsonInput').value = e.target.result; processJSON(); };
            reader.readAsText(file);
        }

        function showError(msg) {
            const el = document.getElementById('errorMsg');
            el.textContent = msg; el.classList.add('active');
        }
        function hideError() { document.getElementById('errorMsg').classList.remove('active'); }

        function extractAssets(json) {
            let data = json;
            if (!Array.isArray(data)) data = [data];
            return data.map(item => {
                if (typeof item === 'string') return { type: 'url', value: item };
                const url = item.url || item.secure_url || item.image || item.video;
                const id = item.public_id || item.id || item.publicId;
                if (url) return { type: 'url', value: url };
                if (id) return { type: 'id', value: id };
                return null;
            }).filter(Boolean);
        }

        function parseCloudinaryUrl(url) {
            try {
                const u = new URL(url);
                const parts = u.pathname.split('/');
                const uploadIdx = parts.indexOf('upload');
                if (uploadIdx === -1) return null;
                const before = parts.slice(0, uploadIdx);
                const after = parts.slice(uploadIdx + 1);
                let transformations = [];
                let publicIdParts = after;
                const lastPart = after[after.length - 1];
                const dotIdx = lastPart ? lastPart.lastIndexOf('.') : -1;
                if (dotIdx > 0) {
                    publicIdParts = after.slice(0, -1);
                    publicIdParts.push(lastPart.substring(0, dotIdx));
                }
                if (after.length > 0 && after[0].includes(',')) {
                    transformations = after[0].split(',');
                    publicIdParts = after.slice(1);
                }
                const publicId = publicIdParts.join('/');
                return { origin: u.origin, prefix: before.join('/'), publicId, transformations };
            } catch { return null; }
        }

        function buildPartialLinks(asset) {
            const links = [];
            if (asset.type === 'url') {
                const parsed = parseCloudinaryUrl(asset.value);
                if (parsed) {
                    const base = parsed.origin + parsed.prefix + '/upload/';
                    links.push({ label: 'Original', url: asset.value });
                    links.push({ label: 'No Trans.', url: base + parsed.publicId });
                    links.push({ label: 'Base URL', url: parsed.origin + parsed.prefix });
                    links.push({ label: 'Folder', url: parsed.origin + parsed.prefix + '/' + parsed.publicId.split('/').slice(0, -1).join('/') });
                }
            } else {
                const base = 'https://res.cloudinary.com/' + ACCOUNT === 'C1' ? 'dqwm4pdbz' : ACCOUNT === 'C2' ? 'dp455m4rk' : 'dmkhsyfzf';
                links.push({ label: 'Public ID', url: asset.value });
            }
            return links;
        }

        function buildVariations(asset) {
            const variations = [];
            if (asset.type !== 'url') return variations;
            const parsed = parseCloudinaryUrl(asset.value);
            if (!parsed) return variations;
            const base = parsed.origin + parsed.prefix + '/upload/';
            const ext = asset.value.split('.').pop().split('?')[0];
            const formats = ['jpg', 'png', 'webp', 'avif', 'gif', 'svg', 'mp4', 'webm'];
            formats.forEach(fmt => {
                variations.push({ label: fmt.toUpperCase(), url: base + parsed.publicId + '.' + fmt });
            });
            const sizes = [
                { label: '256w', t: 'w_256' },
                { label: '512w', t: 'w_512' },
                { label: '1024w', t: 'w_1024' },
                { label: 'Thumb', t: 'w_150,h_150,c_thumb' },
            ];
            sizes.forEach(s => {
                variations.push({ label: s.label, url: base + s.t + '/' + parsed.publicId + '.' + ext });
            });
            const crops = ['fill', 'fit', 'limit', 'pad', 'scale', 'thumb'];
            crops.forEach(c => {
                variations.push({ label: c, url: base + 'c_' + c + ',w_500,h_500/' + parsed.publicId + '.' + ext });
            });
            const effects = [
                { label: 'Grayscale', t: 'e_grayscale' },
                { label: 'Blur', t: 'e_blur:300' },
                { label: 'Sharpen', t: 'e_sharpen' },
                { label: 'Bright +20', t: 'e_brightness:20' },
                { label: 'Contrast +20', t: 'e_contrast:20' },
            ];
            effects.forEach(e => {
                variations.push({ label: e.label, url: base + e.t + '/' + parsed.publicId + '.' + ext });
            });
            return variations;
        }

        function processJSON() {
            hideError();
            const raw = document.getElementById('jsonInput').value.trim();
            if (!raw) { showError('Please paste or drop a JSON file.'); return; }
            let json;
            try { json = JSON.parse(raw); } catch (e) { showError('Invalid JSON: ' + e.message); return; }
            const assets = extractAssets(json);
            if (assets.length === 0) { showError('No valid assets found. Expected objects with "url", "public_id", or "id" fields.'); return; }
            generateResults(assets);
        }

        function loadFromLibrary() {
            window.location.href = '/list-table/' + ACCOUNT;
        }

        function generateResults(assets) {
            const allPartial = [];
            const allVariations = [];
            const allRaw = [];
            assets.forEach((asset, i) => {
                const partial = buildPartialLinks(asset);
                const variations = buildVariations(asset);
                allPartial.push({ asset, links: partial });
                allVariations.push({ asset, links: variations });
                allRaw.push({ asset, partial, variations });
            });
            currentResults = { partial: allPartial, variations: allVariations, raw: allRaw };
            document.getElementById('resultsTitle').textContent = assets.length + ' Asset' + (assets.length > 1 ? 's' : '') + ' Processed';
            renderTab('partial');
            document.getElementById('results').classList.add('active');
        }

        function renderTab(tab) {
            const container = document.getElementById('tab-' + tab);
            if (tab === 'raw') {
                container.innerHTML = '<pre style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:1rem;font-family:JetBrains Mono,monospace;font-size:0.72rem;color:var(--text-sec);overflow-x:auto;max-height:600px;">' + escapeHtml(JSON.stringify(currentResults.raw, null, 2)) + '</pre>';
                return;
            }
            const items = currentResults[tab];
            if (!items || items.length === 0) { container.innerHTML = '<div class="empty-state">No results. Process some JSON first.</div>'; return; }
            let html = '';
            items.forEach(group => {
                if (group.links.length === 0) return;
                const idLabel = group.asset.type === 'url' ? group.asset.value.split('/').pop() : group.asset.value;
                html += '<div class="asset-group">';
                html += '<div class="asset-group-title">' + truncate(idLabel, 50) + '</div>';
                if (group.asset.type === 'url') {
                    html += '<div class="asset-group-id">' + truncate(group.asset.value, 80) + '</div>';
                }
                group.links.forEach(link => {
                    html += '<div class="link-card">';
                    html += '<span class="link-label">' + link.label + '</span>';
                    html += '<span class="link-url"><a href="' + link.url + '" target="_blank" rel="noopener">' + truncate(link.url, 70) + '</a></span>';
                    html += '<button class="copy-btn" onclick="copyLink(this,\'' + escapeJs(link.url) + '\')" title="Copy">' + COPY_ICON + '</button>';
                    html += '</div>';
                });
                html += '</div>';
            });
            container.innerHTML = html || '<div class="empty-state">No links generated.</div>';
        }

        function switchTab(tab) {
            document.querySelectorAll('.results-tabs button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('tab-' + tab).classList.add('active');
            renderTab(tab);
        }

        function copyLink(btn, url) {
            navigator.clipboard.writeText(url).then(() => {
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 1200);
            });
        }

        function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
        function escapeJs(s) { return s.replace(/'/g,"\\\\'").replace(/"/g,'&quot;'); }
        function truncate(s, n) { return s.length > n ? s.substring(0, n) + '...' : s; }
    </script>
</body>
</html>`);
});

// --- TABLE VIEW ---
app.get("/list-table/:account", async (req, res) => {
  try {
    const cld = getCloudinary(req.params.account);
    const imageList = await cld.api.resources({
      max_results: 500,
      resource_type: "image",
    });
    const videoList = await cld.api.resources({
      max_results: 500,
      resource_type: "video",
    });
    const allAssets = [...imageList.resources, ...videoList.resources];
    const acct = req.params.account;
    const acctInfo = {
      C1: {
        title: "Media Library: Core (dqwm4pdbz)",
        color: "#6366f1",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
      },
      C2: {
        title: "Media Library: Flow (dp455m4rk)",
        color: "#8b5cf6",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
      },
      C3: {
        title: "Media Library: Venture (dmkhsyfzf)",
        color: "#a78bfa",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 17a1 1 0 0 0-1 1v1a2 2 0 1 0 2-2z"/><path d="M20.97 3.61a.45.45 0 0 0-.58-.58C10.2 6.6 6.6 10.2 3.03 20.39a.45.45 0 0 0 .58.58C13.8 17.4 17.4 13.8 20.97 3.61"/><path d="m6.707 6.707 10.586 10.586"/><path d="M7 5a2 2 0 1 0-2 2h1a1 1 0 0 0 1-1z"/></svg>',
      },
    };
    const info = acctInfo[acct] || {
      title: "Media Library",
      color: "#6366f1",
      icon: "",
    };

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${info.title}</title>
    <link rel="icon" type="image/png" href="https://res.cloudinary.com/dp455m4rk/image/upload/v1784729841/media_lib_m3xz45.png">
    ${SHARED_HEAD}
    <style>
        .container { max-width: 1100px; margin: 0 auto; }
        .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.75rem; flex-wrap: wrap; }
        .back-btn {
            display: inline-flex; align-items: center; gap: 0.4rem;
            text-decoration: none; color: var(--text-sec); font-size: 0.85rem;
            font-weight: 500; padding: 0.4rem 0.75rem; border-radius: var(--radius-sm);
            transition: all 0.15s;
        }
        .back-btn:hover { background: var(--surface); color: var(--text); }
        .back-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .header h1 { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em; }
        .header-right { margin-left: auto; display: flex; align-items: center; gap: 0.5rem; }
        .exp-mode-btn {
            display: inline-flex; align-items: center; gap: 0.35rem;
            text-decoration: none; font-size: 0.78rem; font-weight: 500;
            padding: 0.45rem 0.85rem; border-radius: var(--radius-sm);
            border: 1px solid #f59e0b; color: #f59e0b;
            background: rgba(245,158,11,0.08); transition: all 0.15s;
        }
        .exp-mode-btn:hover { background: #f59e0b; color: #000; }
        .exp-mode-btn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .badge { padding: 0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; color: white; flex-shrink: 0; }
        .badge svg { width: 22px; height: 22px; }
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
            <span class="badge" style="background:${info.color}">${info.icon}</span>
            <h1>${info.title}</h1>
            <div class="header-right">
                <a class="exp-mode-btn" href="/experimental/${acct}">
                    <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    JSON Mode
                </a>
            </div>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Preview</th><th>ID</th><th>URL</th><th></th></tr></thead>
                <tbody>
                    ${
                      allAssets.length === 0
                        ? '<tr><td colspan="4"><div class="empty-state">No assets found.</div></td></tr>'
                        : allAssets
                            .map((asset) => {
                              const isVideo = asset.resource_type === "video";
                              const thumbUrl = isVideo
                                ? asset.secure_url
                                    .replace(/\\.[^/.]+$/, ".jpg")
                                    .replace(
                                      "/upload/",
                                      "/upload/w_100,h_100,c_thumb,so_auto/",
                                    )
                                : asset.secure_url.replace(
                                    "/upload/",
                                    "/upload/w_100,h_100,c_thumb/",
                                  );
                              const safeUrl = asset.secure_url.replace(
                                /'/g,
                                "\\'",
                              );
                              return (
                                "<tr>" +
                                '<td><img class="thumb" src="' +
                                thumbUrl +
                                '" loading="lazy"></td>' +
                                '<td class="id-cell" title="' +
                                asset.public_id +
                                '">' +
                                asset.public_id +
                                "</td>" +
                                '<td class="url-cell" title="' +
                                asset.secure_url +
                                '">' +
                                asset.secure_url +
                                "</td>" +
                                '<td class="copy-cell"><button class="copy-btn" onclick="copyUrl(this,\'' +
                                safeUrl +
                                '\')" title="Copy URL">' +
                                COPY_ICON +
                                "</button></td></tr>"
                              );
                            })
                            .join("")
                    }
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
    res.status(500).send("Error: " + error.message);
  }
});

app.listen(port, () => console.log("Server: http://localhost:" + port));
