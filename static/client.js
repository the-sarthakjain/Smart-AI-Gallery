let currentAlbum = null;

document.addEventListener("DOMContentLoaded", () => {
  const dashboard = document.getElementById('dashboard');

  const pages = {
    Home: `
      <h2>Welcome to Smart Gallery</h2>
      <p style="font-size: 23px; color: #cccccc; max-width: 700px;">
        Smart Gallery — your AI-powered photo assistant. Organize, explore & relive your memories with ease.
      </p>
      <ul style="margin-top: 30px; font-size: 20px; color: #ddd;">
        <li>Search photos instantly by keywords.</li>
        <li>Upload entire photo albums at once.</li>
        <li>Responsive gallery with fullscreen previews.</li>
      </ul>
      <p style="margin-top: 40px; font-size: 20px; color: #f3c622;">
        Go to <b>Albums</b> to upload, or head to <b>Gallery</b> to view your images.
      </p>
    `,
    About: `<h2>About Us</h2><p>This is Smart Gallery powered by AI.</p>`,
    Gallery: `
      <h2>Gallery</h2>
  <div style="display:flex; gap:10px; margin-bottom:20px;">
    <input type="text" id="searchQuery" placeholder="Search images..." style="flex:1; padding:10px; border-radius:6px;" />
    <button onclick="searchImages()" style="padding:10px 20px;">Search</button>
  </div>
  <div id="galleryAlbumList" style="margin-bottom: 30px;"></div>
  <div id="searchResults" class="gallery-grid"></div>
    `,
    Trips: `<h2>Trips</h2><ul><li>Shimla</li><li>Manali</li></ul>`,
    Albums: `
      <h2>Albums</h2>
      <input type="text" id="folderName" placeholder="New album name" />
      <input type="file" id="albumUpload" webkitdirectory directory multiple />
      <button onclick="uploadAlbum()">Upload Folder</button>
      <div id="uploadStatus" style="margin-top:10px;"></div>
      <div id="albumList"></div>
    `,
    Contact: `<h2>Contact Us</h2><form id="contactForm"><input type="text" name="name" placeholder="Your Name"/><input type="email" name="email" placeholder="Your Email"/><textarea name="message" placeholder="Your Message"></textarea><button>Send</button></form>`
  };

  function loadPage(page) {
    dashboard.innerHTML = pages[page];
    if (page === "Albums") fetchAlbums();
    if (page === "Gallery") {
      currentAlbum = null;
      loadPinnedImages(); // show pinned images only
    }
  }

  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.textContent.trim();
      currentAlbum = null;
      loadPage(page);
    });
  });

  loadPage("Home");
});

// 🔍 Search functionality
async function searchImages() {
  const query = document.getElementById("searchQuery").value.trim();
  const container = document.getElementById("searchResults");
  container.innerHTML = `<p style="color:#f3c622;">🔍 Searching...</p>`;

  try {
    const url = "/api/search";
    const body = currentAlbum ? { query, album: currentAlbum } : { query };
    const res = await fetch(url, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    container.innerHTML = data.results.length > 0
      ? data.results.map(src => `<img src="${src}" onclick="showFullscreenImage('${src}')" />`).join("")
      : `<p style="color:red;">No results for "${query}".</p>`;
  } catch {
    container.innerHTML = `<p style="color:red;">❌ Search failed.</p>`;
  }
}

// 📁 Load albums in Albums tab
async function fetchAlbums() {
  const res = await fetch("/api/albums");
  const data = await res.json();
  const el = document.getElementById("albumList");

  if (!data.albums?.length) {
    el.innerHTML = "<p>No albums found.</p>";
    return;
  }

  el.innerHTML = data.albums.map(a => `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 10px 15px;
      margin-bottom: 10px;
      gap: 12px;
    ">
      <span
        style="flex: 1; color: #f3c622; font-weight: bold; cursor: pointer;"
        onclick="loadAlbumToGallery('${a}')"
      >${a}</span>

      <div style="display: flex; gap: 10px;">
        <button onclick="renameAlbumPrompt('${a}')" style="
          background-color: #3498db;
          color: white;
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
          Rename
        </button>

        <button onclick="deleteAlbum('${a}')" style="
          background-color: #e74c3c;
          color: white;
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        " onmouseover="this.style.background='#c0392b'" onmouseout="this.style.background='#e74c3c'">
          Delete
        </button>

        <button onclick="aiSortAlbum('${a}')" style="
          background-color: #27ae60;
          color: white;
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        " onmouseover="this.style.background='#1e8449'" onmouseout="this.style.background='#27ae60'">
          AI Sort
        </button>
      </div>
    </div>
  `).join("");
}


// 🖼️ Load albums onto Gallery page
async function fetchAlbumsForGallery() {
  const res = await fetch("/api/albums");
  const data = await res.json();
  const el = document.getElementById("galleryAlbumList");

  if (!data.albums?.length) {
    el.innerHTML = "<p>No albums found.</p>";
    return;
  }

  el.innerHTML = data.albums.map(album => `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 10px 15px;
      margin-bottom: 10px;
      gap: 12px;
    ">
      <span style="color: #f3c622; font-weight: bold; flex: 1; cursor: pointer;" onclick="loadAlbumToGallery('${album}')">${album}</span>

      <div style="display: flex; gap: 10px;">
        <button onclick="renameAlbumPrompt('${album}')" style="
          background-color: #3498db;
          color: white;
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
          Rename
        </button>

        <button onclick="deleteAlbum('${album}')" style="
          background-color: #e74c3c;
          color: white;
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        " onmouseover="this.style.background='#c0392b'" onmouseout="this.style.background='#e74c3c'">
          Delete
        </button>

        <button onclick="aiSortAlbum('${album}')" style="
          background-color: #27ae60;
          color: white;
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
        " onmouseover="this.style.background='#1e8449'" onmouseout="this.style.background='#27ae60'">
          AI Sort
        </button>
      </div>
    </div>
  `).join("");
}


// 👜 Load one album's photos in Gallery view
async function loadAlbumToGallery(album) {
  currentAlbum = album;

  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.textContent.trim() === "Gallery") link.click();
  });

  setTimeout(async () => {
    const res = await fetch(`/api/album_images/${album}`);
    const data = await res.json();
    const el = document.getElementById("searchResults");

    if (data.subfolders && data.subfolders.length > 0) {
      // Show category folders like food, group photo, etc.
      el.innerHTML = data.subfolders.map(sub => `
        <div style="padding:20px;text-align:center;cursor:pointer;" 
             onclick="loadSubfolder('${album}', '${sub}')">
          <span style="font-size:18px;color:#f3c622;">📁 ${sub}</span>
        </div>
      `).join("");
    } else if (data.images.length) {
el.innerHTML = data.images.map(src => `
  <div style="text-align:center; margin-bottom: 20px;">
    <img src="${src}" onclick="showFullscreenImage('${src}')" style="max-width:100%; border-radius:8px;" />
    <button onclick="togglePinImage('${src}', this)" 
      style="margin-top: 8px; padding: 6px 14px; border-radius: 6px;
             background: ${isImagePinned(src) ? 'red' : 'green'}; color: white; border: none; cursor: pointer;">
      ${isImagePinned(src) ? '📍Unpin' : '📌Pin'}
    </button>
  </div>
`).join("");


    } else {
      el.innerHTML = `<p>No images in "${album}".</p>`;
    }

    document.getElementById("searchQuery").placeholder = `Search in "${album}"`;
    document.getElementById("searchQuery").value = "";
  }, 200);
}

// AI Sort button placeholder (connects with backend later)
async function aiSortAlbum(album) {
  const confirmSort = confirm(`Run AI Sort on "${album}"?`);
  if (!confirmSort) return;

  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = `<p style="color: #f3c622; font-size: 20px;">⚙️ AI sorting in progress... please wait</p>`;

  try {
    const res = await fetch("/api/sort_album", {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album })
    });

    const data = await res.json();

    if (data.success && data.folder_name) {
      dashboard.innerHTML = `<h2>AI Sorted Album</h2><div id="searchResults" class="gallery-grid"></div>`;
      loadAlbumToGallery(data.folder_name);
    } else {
      dashboard.innerHTML = `<p style="color:red;">AI sorting failed: ${data.error || "Unknown error"}.</p>`;
    }
  } catch (err) {
    dashboard.innerHTML = `<p style="color:red;">❌ Error occurred during AI sort.</p>`;
  }
}

// 🗑️ Utility operations
async function deleteAlbum(album) {
  const res = await fetch("/api/delete_album", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ album })
  });
  const data = await res.json();
  alert(data.status || data.error);
  fetchAlbums();
}

function showFullscreenImage(src) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;
    z-index:9999;
  `;
  overlay.innerHTML = `
    <img src="${src}" style="max-width:90%;max-height:90%;border-radius:12px;" />
    <button onclick="this.parentElement.remove()" style="position:absolute;top:20px;right:20px;
      background:#f3c622;color:black;padding:10px 15px;border:none;border-radius:5px;
      font-weight:bold;cursor:pointer;">Close</button>
  `;
  document.body.appendChild(overlay);
}

// ✏️ Rename prompt
async function renameAlbumPrompt(oldName) {
  const newName = prompt("New album name:", oldName);
  if (!newName || newName === oldName) return;
  const res = await fetch("/api/rename_album", {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_name: oldName, new_name: newName })
  });
  const data = await res.json();
  alert(data.message || data.error);
  fetchAlbums();
}

// ✏️ Upload folder
async function uploadAlbum() {
  const files = document.getElementById("albumUpload").files;
  const name = document.getElementById("folderName").value.trim() || "album";
  const statusEl = document.getElementById("uploadStatus");
  if (!files.length) {
    statusEl.innerHTML = "<p style='color:red;'>No files selected.</p>";
    return;
  }

  const formData = new FormData();
  formData.append("folder", name);
  for (let file of files) formData.append("images", file);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await res.json();

  if (data.uploaded && data.uploaded.length) {
    statusEl.innerHTML = `<p style="color:green;">Uploaded ${data.uploaded.length} files.</p>`;
    fetchAlbums();
  } else {
    statusEl.innerHTML = `<p style="color:red;">Upload failed.</p>`;
  }
}



async function triggerAISort() {
  const confirmSort = confirm("Run AI Sort to auto-group your photos?");
  if (!confirmSort) return;

  const res = await fetch("/api/sort_album", {
    method: "POST"
  });

  const data = await res.json();
  alert(data.status || "AI sorting done!");

  // Reload Albums tab
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.textContent.trim() === "Albums") link.click();
  });
}


async function loadSubfolder(parentAlbum, subfolder) {
  const res = await fetch(`/api/album_images/${parentAlbum}/${subfolder}`);
  const data = await res.json();
  const el = document.getElementById("searchResults");

  el.innerHTML = data.images.length
    ? data.images.map(src => `<img src="${src}" onclick="showFullscreenImage('${src}')" />`).join("")
    : `<p>No images in "${subfolder}".</p>`;

  document.getElementById("searchQuery").placeholder = `Search in "${subfolder}"`;
}


function togglePinImage(src, button) {
  const pinned = JSON.parse(localStorage.getItem("pinnedImages") || "[]");
  const index = pinned.indexOf(src);

  if (index === -1) {
    pinned.push(src);
    button.textContent = "📍 Unpin";
  } else {
    pinned.splice(index, 1);
    button.textContent = "📌 Pin";
  }

  localStorage.setItem("pinnedImages", JSON.stringify(pinned));
}

function isImagePinned(src) {
  const pinned = JSON.parse(localStorage.getItem("pinnedImages") || "[]");
  return pinned.includes(src);
}

async function loadPinnedImages() {
  const pinned = JSON.parse(localStorage.getItem("pinnedImages") || "[]");
  const el = document.getElementById("searchResults");
  const galleryAlbumList = document.getElementById("galleryAlbumList");
  if (galleryAlbumList) galleryAlbumList.innerHTML = ""; // remove album rows

  if (!pinned.length) {
    el.innerHTML = `<p style="color:gray;">No pinned images found.</p>`;
    return;
  }

el.innerHTML = pinned.map(src => `
  <div style="text-align:center; margin-bottom: 20px;">
    <img src="${src}" onclick="showFullscreenImage('${src}')" style="max-width:100%; border-radius:8px;" />
    <button onclick="togglePinImage('${src}', this)" 
      style="margin-top: 8px; padding: 6px 14px; border-radius: 6px;
             background: red; color: white; border: none; cursor: pointer;">
      📍 Unpin
    </button>
  </div>
`).join("");

}
