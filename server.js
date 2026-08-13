require("dotenv").config();
const express = require("express");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");

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

// Collect an asset folder path and all its descendant folders (recursive).
const collectFolderPaths = async (cld, parent) => {
  const paths = [parent];
  const queue = [parent];
  while (queue.length) {
    const cur = queue.shift();
    try {
      const sub = await cld.api.sub_folders(cur);
      for (const s of sub.folders || []) {
        paths.push(s.path);
        queue.push(s.path);
      }
    } catch (e) {
      // ignore unreadable folders
    }
  }
  return paths;
};

// List every asset stored directly in one asset folder (paginated, newest first).
const listByAssetFolder = async (cld, folderPath) => {
  const out = [];
  let cursor;
  do {
    const opts = { max_results: 500, direction: "desc" };
    if (cursor) opts.next_cursor = cursor;
    const res = await cld.api.resources_by_asset_folder(folderPath, opts);
    out.push(...(res.resources || []));
    cursor = res.next_cursor;
  } while (cursor);
  return out;
};

// List assets in a folder and all its subfolders (newest first).
// 1) Search API subtree expression "asset_folder:folder/*" returns the
//    folder and every nested subfolder in one query.
// 2) Falls back to walking the sub-folder tree with resources_by_asset_folder.
// 3) Finally falls back to public-id prefix matching (fixed folder mode).
const listAssetsInFolderTree = async (cld, folder) => {
  const seen = new Map();
  const add = (arr) => {
    for (const a of arr || []) seen.set(a.asset_id || a.public_id, a);
  };

  try {
    let cursor = "";
    do {
      const res = await cld.search
        .expression(`asset_folder:"${folder}/*"`)
        .max_results(500)
        .sort_by("created_at", "desc")
        .next_cursor(cursor)
        .execute();
      add(res.resources);
      cursor = res.next_cursor || "";
    } while (cursor);
    if (seen.size) return [...seen.values()];
  } catch (e) {
    seen.clear();
  }

  try {
    const paths = await collectFolderPaths(cld, folder);
    for (const p of paths) add(await listByAssetFolder(cld, p));
    if (seen.size)
      return [...seen.values()].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
  } catch (e) {
    seen.clear();
  }

  try {
    const imageList = await cld.api.resources({
      max_results: 500,
      resource_type: "image",
      type: "upload",
      prefix: folder + "/",
    });
    const videoList = await cld.api.resources({
      max_results: 500,
      resource_type: "video",
      type: "upload",
      prefix: folder + "/",
    });
    add([...imageList.resources, ...videoList.resources]);
  } catch (e) {}

  return [...seen.values()].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
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

// --- RESOLVE ASSET ---
app.get("/asset/:account", (req, res) => {
  const cld = getCloudinary(req.params.account);
  const publicId = req.query.id;
  if (!publicId) return res.status(400).json({ message: "Missing ?id= parameter" });
  const { q, f, w, h, o, c, fl, ...rest } = req.query;

  const transformations = [];
  if (q) transformations.push(`q_${q}`);
  if (f) transformations.push(`f_${f}`);
  if (w) transformations.push(`w_${w}`);
  if (h) transformations.push(`h_${h}`);
  if (o) transformations.push(`o_${o}`);
  if (c) transformations.push(`c_${c}`);
  if (fl) transformations.push(`fl_${fl}`);

  const opts = {};
  if (transformations.length > 0) {
    opts.transformation = transformations.join(",");
  }

  const url = cld.url(publicId, opts);
  res.json({ public_id: publicId, url });
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

const TRANSFORM_ICON =
  '<svg viewBox="0 0 24 24"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/></svg>';

const AUDIO_FORMATS = new Set([
  "aac",
  "aiff",
  "amr",
  "flac",
  "m4a",
  "mp3",
  "oga",
  "ogg",
  "opus",
  "wav",
  "wma",
]);

const AUDIO_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
      '<rect width="96" height="96" rx="10" fill="#fffbeb"/>' +
      '<path d="M38 64V34l26-4v30" fill="none" stroke="#b45309" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="32" cy="64" r="6" fill="#b45309"/>' +
      '<circle cx="58" cy="60" r="6" fill="#b45309"/>' +
      "</svg>",
  );

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
                return `<a class="card" href="${url}">
                    <div class="card-icon" style="background:${acc.color}">${acc.icon}</div>
                    <div class="card-body">
                        <div class="card-title">${acc.name}</div>
                        <div class="card-sub">Open media library</div>
                    </div>
                </a>`;
              })
              .join("")}
        </div>
        <div class="footer">Cloudinary API Server &middot; Port 3000</div>
    </div>
</body>
</html>`);
});

// --- TABLE VIEW ---
app.get("/list-table/:account", async (req, res) => {
  try {
    const acct = req.params.account;
    const cld = getCloudinary(acct);
    const folder = req.query.folder || "";

    let allAssets;
    if (folder) {
      allAssets = await listAssetsInFolderTree(cld, folder);
    } else {
      const [imageList, videoList] = await Promise.all([
        cld.api.resources({ max_results: 500, resource_type: "image", type: "upload" }),
        cld.api.resources({ max_results: 500, resource_type: "video", type: "upload" }),
      ]);
      allAssets = [...imageList.resources, ...videoList.resources].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
    }

    let folders = [];
    try {
      const folderResult = folder
        ? await cld.api.sub_folders(folder)
        : await cld.api.root_folders();
      folders = (folderResult.folders || []).map((f) => f.name);
    } catch (e) {
      folders = [];
    }

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

    // Breadcrumb from folder path (e.g. foo/bar)
    const segments = folder ? folder.split("/") : [];
    const crumbs = [{ label: "Root", path: "" }];
    let cumulative = "";
    for (const seg of segments) {
      cumulative = cumulative ? cumulative + "/" + seg : seg;
      crumbs.push({ label: seg, path: cumulative });
    }
    const breadcrumbHtml = crumbs
      .map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        if (isLast)
          return `<span class="crumb current">${crumb.label}</span>`;
        const href = crumb.path
          ? `/list-table/${acct}?folder=${encodeURIComponent(crumb.path)}`
          : `/list-table/${acct}`;
        return `<a class="crumb" href="${href}">${crumb.label}</a><span class="sep">/</span>`;
      })
      .join("");

    const folderChipsHtml = folders
      .map((f) => {
        const target = folder ? folder + "/" + f : f;
        return `<a class="folder-chip" href="/list-table/${acct}?folder=${encodeURIComponent(target)}">${f}</a>`;
      })
      .join("");

    const rowsHtml =
      allAssets.length === 0
        ? '<tr><td colspan="5"><div class="empty-state">No assets found in this folder.</div></td></tr>'
        : allAssets
            .map((asset) => {
              const isVideo = asset.resource_type === "video";
              const isAudio = isVideo && AUDIO_FORMATS.has(asset.format);
              const safeUrl = asset.secure_url.replace(/'/g, "\\'");
              const encUrl = encodeURIComponent(asset.secure_url);
              const uploaded = new Date(asset.created_at).toLocaleString();

              let thumbHtml, typeBadge, toolLinks;
              if (isAudio) {
                thumbHtml =
                  '<img class="thumb" src="' +
                  AUDIO_PLACEHOLDER +
                  '" alt="audio" title="' +
                  asset.public_id +
                  '">';
                typeBadge = '<span class="type-badge type-audio">AUDIO</span>';
                toolLinks = "";
              } else if (isVideo) {
                const thumbUrl = asset.secure_url
                  .replace(/\.[^/.]+$/, ".jpg")
                  .replace(
                    "/upload/",
                    "/upload/w_160,h_160,c_thumb,so_auto,f_jpg/",
                  );
                thumbHtml =
                  '<a class="thumb-link" href="/inject/' +
                  acct +
                  "?url=" +
                  encUrl +
                  '" target="_blank" title="Open with Grid &amp; Crop tool"><img class="thumb" src="' +
                  thumbUrl +
                  '" loading="lazy"></a>';
                typeBadge = '<span class="type-badge type-video">VIDEO</span>';
                toolLinks =
                  '<a class="icon-btn" href="/transform/' +
                  acct +
                  "?url=" +
                  encUrl +
                  '" target="_blank" title="Smart Transform">' +
                  TRANSFORM_ICON +
                  "</a>";
              } else {
                const thumbUrl = asset.secure_url.replace(
                  "/upload/",
                  "/upload/w_160,h_160,c_thumb/",
                );
                thumbHtml =
                  '<a class="thumb-link" href="/inject/' +
                  acct +
                  "?url=" +
                  encUrl +
                  '" target="_blank" title="Open with Grid &amp; Crop tool"><img class="thumb" src="' +
                  thumbUrl +
                  '" loading="lazy"></a>';
                typeBadge = '<span class="type-badge type-image">IMAGE</span>';
                toolLinks =
                  '<a class="icon-btn" href="/transform/' +
                  acct +
                  "?url=" +
                  encUrl +
                  '" target="_blank" title="Smart Transform">' +
                  TRANSFORM_ICON +
                  "</a>";
              }

              return (
                "<tr>" +
                '<td class="thumb-cell">' +
                thumbHtml +
                "</td>" +
                "<td>" +
                typeBadge +
                "</td>" +
                '<td class="id-cell" title="' +
                asset.public_id +
                '">' +
                asset.public_id +
                "</td>" +
                '<td class="date-cell">' +
                uploaded +
                "</td>" +
                '<td class="actions-cell">' +
                '<button class="copy-btn" onclick="copyUrl(this,\'' +
                safeUrl +
                '\')" title="Copy URL">' +
                COPY_ICON +
                "</button>" +
                toolLinks +
                "</td></tr>"
              );
            })
            .join("");

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${info.title}${folder ? " - " + folder : ""}</title>
    <link rel="icon" type="image/png" href="https://res.cloudinary.com/dp455m4rk/image/upload/v1784729841/media_lib_m3xz45.png">
    ${SHARED_HEAD}
    <style>
        .container { max-width: 1200px; margin: 0 auto; }
        .header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
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
        .meta-line { margin-left: auto; color: var(--text-sec); font-size: 0.8rem; white-space: nowrap; }
        .folder-bar { margin-bottom: 1.25rem; }
        .breadcrumb { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-sec); margin-bottom: 0.6rem; flex-wrap: wrap; }
        .breadcrumb .crumb { color: var(--text-sec); text-decoration: none; }
        .breadcrumb a.crumb:hover { color: var(--accent); }
        .breadcrumb .crumb.current { color: var(--text); font-weight: 600; }
        .breadcrumb .sep { color: var(--text-ter); }
        .folder-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .folder-chip {
            background: var(--surface); border: 1px solid var(--border); color: var(--text-sec);
            padding: 0.4rem 0.9rem; border-radius: 999px; font-size: 0.8rem; font-weight: 500;
            text-decoration: none; transition: all 0.15s; max-width: 220px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .folder-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
        .no-folders { color: var(--text-ter); font-size: 0.8rem; }
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
        th:nth-child(1) { width: 116px; }
        th:nth-child(2) { width: 88px; }
        th:nth-child(3) { width: auto; }
        th:nth-child(4) { width: 150px; }
        th:nth-child(5) { width: 96px; }
        tbody tr { border-bottom: 1px solid var(--border); transition: background 0.1s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: var(--surface-hover); }
        tbody td { padding: 0.75rem 1rem; vertical-align: middle; }
        .thumb-link { display: inline-block; position: relative; border-radius: 10px; line-height: 0; }
        .thumb {
            width: 96px; height: 96px; border-radius: 10px; object-fit: cover;
            border: 1px solid var(--border); transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
        }
        .thumb-link:hover .thumb { transform: scale(1.04); box-shadow: var(--shadow-lg); border-color: var(--accent); }
        .type-badge {
            display: inline-block; padding: 0.22rem 0.65rem; border-radius: 999px;
            font-size: 0.66rem; font-weight: 700; letter-spacing: 0.05em; white-space: nowrap;
        }
        .type-image { background: #eef2ff; color: #4f46e5; }
        .type-video { background: #fae8ff; color: #a21caf; }
        .type-audio { background: #fffbeb; color: #b45309; }
        @media (prefers-color-scheme: dark) {
            .type-image { background: #1e1b4b; color: #a5b4fc; }
            .type-video { background: #3b0764; color: #e9d5ff; }
            .type-audio { background: #451a03; color: #fcd34d; }
        }
        .id-cell { font-size: 0.82rem; color: var(--text-sec); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .date-cell { font-size: 0.78rem; color: var(--text-sec); white-space: nowrap; }
        .actions-cell { white-space: nowrap; }
        .icon-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 30px; height: 30px; border-radius: var(--radius-sm);
            border: 1px solid var(--border); background: var(--surface-hover);
            color: var(--text-sec); cursor: pointer; text-decoration: none;
            margin-left: 0.35rem; transition: all 0.15s; vertical-align: middle;
        }
        .icon-btn:hover { background: var(--accent); color: white; border-color: var(--accent); }
        .icon-btn svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .empty-state { text-align: center; padding: 3rem 1rem; color: var(--text-ter); font-size: 0.9rem; }
        .cost-note {
            background: var(--accent-light); border: 1px solid var(--border);
            border-radius: var(--radius-sm); padding: 0.6rem 0.9rem;
            font-size: 0.75rem; color: var(--text-sec); margin-bottom: 1.25rem;
        }
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
            <span class="meta-line">${allAssets.length} asset${allAssets.length === 1 ? "" : "s"}</span>
        </div>
        <div class="cost-note">Thumbnails and previews are Cloudinary transformations and count toward your monthly quota. Copying URLs and opening the tools are free.</div>
        <div class="folder-bar">
            <div class="breadcrumb">${breadcrumbHtml}</div>
            <div class="folder-chips">${folderChipsHtml || '<span class="no-folders">No subfolders</span>'}</div>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Preview</th><th>Type</th><th>ID</th><th>Uploaded</th><th></th></tr></thead>
                <tbody>
                    ${rowsHtml}
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

// --- SMART TRANSFORM TOOL (cloudsmart_transform.html) ---
app.get("/transform/:account", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "transform.html"));
});

// --- GRID SEGMENT & CROP TOOL (objectsinject.html) ---
app.get("/inject/:account", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "inject.html"));
});

app.listen(port, () => console.log("Server: http://localhost:" + port));
