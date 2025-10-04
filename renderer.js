const axios = require("axios");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const { ipcRenderer, clipboard, shell } = require("electron");
const { spawn } = require("child_process");


let downloadFolder = null;
let binPaths = null;
let videos = [];

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
        return false;
    }
}

// ---------- CONTATORE TOTALE ----------
const logArea = document.getElementById("logArea");
const videoList = document.getElementById("videoList");

function updateVideoCount() {
    if (totalCountSpan) totalCountSpan.textContent = videos.length;
}

const urlArea = document.getElementById("urlArea");
const clearListBtn = document.getElementById("clearList");
const audioOnlyChk = document.getElementById("audioOnlyChk");
const playlistChk = document.getElementById("playlistChk");
const folderInput = document.getElementById("folderLabel");
const openFolderBtn = document.getElementById("openFolderBtn");
const setFolderBtn = document.getElementById("setFolderBtn");
const addInlineBtn = document.getElementById("addInlineBtn");
const resetTextareaBtn = document.getElementById("resetTextareaBtn");
const pasteBtn = document.getElementById("pasteBtn");
const totalCountSpan = document.getElementById("totalCount");
const extraArgsInput = document.getElementById("extraArgsInput");

// --- Bottone "Aggiungi Link" ---
addInlineBtn.addEventListener("click", async () => {
    if (!urlArea) return;
    const text = urlArea.value.trim();
    if (!text) return;

    const extraArgs = document.getElementById("extraArgsInput")?.value.trim() || "";

    const validUrls = processTextInput(text).filter(isValidUrl);
    if (validUrls.length === 0) {
       logArea.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Nessun link valido!';
        logArea.style.color = "orange";
        return;
    }

    logArea.innerHTML = '<i class="bi bi-hourglass-split"></i> Caricamento video/playlist…';
    logArea.style.color = "#0080C0";

    for (let i = 0; i < validUrls.length; i++) {
        await addVideoOrPlaylist(validUrls[i], extraArgs, i + 1, validUrls.length);
    }

    logArea.innerHTML = `<i class="bi bi-check-circle"></i> Aggiunti ${validUrls.length} link!`;
    setTimeout(() => { logArea.textContent = ""; }, 5000);

    urlArea.value = "";
    updateVideoCount();
});


if (clearListBtn) {
    clearListBtn.addEventListener("click", () => {
        const overlay = document.getElementById("clearPopupOverlay");
        const yesBtn = document.getElementById("clearPopupYes");
        const noBtn = document.getElementById("clearPopupNo");

        overlay.style.display = "flex";
        overlay.style.opacity = 0;
        requestAnimationFrame(() => overlay.style.opacity = 1);

        const closePopup = () => { overlay.style.opacity = 0; setTimeout(() => overlay.style.display = "none", 300); };

        yesBtn.onclick = () => {
            // Stop download attivi
            videos.forEach(v => ipcRenderer.send("stop-download", v.url));
            videos = [];
            renderVideos();
            updateVideoCount();
            saveSettingsToMain();
            closePopup();
			updateVideoCount(); 
        };

        noBtn.onclick = closePopup;
    });
}

function setFolderPath(path) {
    if (!folderInput) return;
    folderInput.innerHTML = path.replace(
        /^([A-Za-z]:)/,
        '<span style="color:#0b84ff;font-weight:bold;">$1</span>'
    );
}
if (resetTextareaBtn && urlArea) {
    resetTextareaBtn.addEventListener("click", () => {
        urlArea.value = "";
        urlArea.focus();
    });
}

// ------------------ FILTRO CARATTERI NON VALIDI ------------------
function filterInvalidChars(text) {
    // Permette solo caratteri visibili ASCII, numeri, lettere, punteggiatura base e spazi
    return text.replace(/[^\x20-\x7E\n\r]/g, '');
}

// Applica filtro ai file .txt caricati
function processTextInput(text) {
    return filterInvalidChars(text).split(/\r?\n/).map(u => u.trim()).filter(u => u);
}


document.addEventListener("DOMContentLoaded", async () => {
    // --------------------- Variabili DOM ---------------------
    const logArea = document.getElementById("logArea");
    const themeToggle = document.getElementById("themeToggle");
    const folderInput = document.getElementById("folderLabel");
    const audioOnlyChk = document.getElementById("audioOnlyChk");
    const playlistChk = document.getElementById("playlistChk");

    const ytBtn = document.getElementById("ytDlpHelpBtn");
    const outputContainer = document.getElementById("ytHelpContainer");
    const output = document.getElementById("outputHelp");
    const closeBtn = document.getElementById("closeYtHelp");

    // --------------------- Gestione TAB ---------------------
    const tabLinkBtn = document.getElementById("tabLinkBtn");
    const tabConfigBtn = document.getElementById("tabConfigBtn");
    const tabLink = document.getElementById("tabLink");
    const tabConfig = document.getElementById("tabConfig");


    // Contenitori delle tab


    function mostraTab(tab) {
        if (!tabLink || !tabConfig || !tabLinkBtn || !tabConfigBtn) {
            console.warn("Uno o più elementi non sono stati trovati");
            return;
        }

        if (tab === "link") {
            tabLink.classList.add("active");
            tabConfig.classList.remove("active");
            tabLinkBtn.disabled = true;
            tabConfigBtn.disabled = false;
        } else {
            tabConfig.classList.add("active");
            tabLink.classList.remove("active");
            tabConfigBtn.disabled = true;
            tabLinkBtn.disabled = false;
        }
    }

    if (tabLinkBtn && tabConfigBtn) {
        tabLinkBtn.addEventListener("click", () => mostraTab("link"));
        tabConfigBtn.addEventListener("click", () => mostraTab("config"));
    }


    // --------------------- Bottoni Help ---------------------
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            closeBtn.style.display = "none";
            ytBtn.style.display = "inline-block";
        });
    }

    if (ytBtn) {
        ytBtn.addEventListener("click", () => {
            ytBtn.style.display = "none";
        });
    }

    // --------------------- Imposta cartella e tema ---------------------
    const settings = await ipcRenderer.invoke("get-settings");

    downloadFolder = settings.downloadFolder || "";
    if (downloadFolder) setFolderPath(downloadFolder);
    if (folderInput) folderInput.value = downloadFolder;

    const theme = settings.theme || "dark";
    document.body.dataset.theme = theme;
    if (themeToggle) {
    themeToggle.innerHTML = theme === "dark"
        ? '<i class="bi bi-moon"></i>'
        : '<i class="bi bi-sun"></i>';
}

    // --------------------- Checkbox ---------------------
    if (settings.options) {
        audioOnlyChk.checked = settings.options.audioOnly || false;
        playlistChk.checked = settings.options.playlist || false;
		if (extraArgsInput) extraArgsInput.value = settings.options.extraArgs || "";
    }
if (extraArgsInput) {
    extraArgsInput.addEventListener("input", () => {
        saveSettingsToMain();
    });
}
    // --------------------- Bin paths ---------------------
    binPaths = await ipcRenderer.invoke("get-bin-paths");

    // --------------------- Link salvati ---------------------
    if (settings.links && settings.links.length > 0) {
        try {
            const choice = await showPopup();
            if (choice === "yes") {
                for (const url of settings.links) {
                    await addVideo(url);
                }
            } else {
                ipcRenderer.send("save-settings", { links: [], options: settings.options || {} });
            }
        } catch (err) {
            console.error("Popup error:", err);
        }
    }

    // Aggiorna contatore e lista UI
    updateVideoCount();
    renderVideos();

    // --------------------- Bottone help yt-dlp ---------------------
    if (ytBtn && outputContainer && output && closeBtn) {
        ytBtn.addEventListener("click", async () => {
            outputContainer.style.display = "block";
            output.textContent = "Caricamento...";
            closeBtn.style.display = "none";

            try {
                const result = await ipcRenderer.invoke("yt-dlp-help");
                output.textContent = result;
                closeBtn.style.display = "inline-block";
            } catch (err) {
                output.textContent = `Errore: ${err}`;
                closeBtn.style.display = "inline-block";
            }
        });

        closeBtn.addEventListener("click", () => {
            outputContainer.style.display = "none";
        });
    }

    // --------------------- Avvio tab di default ---------------------
    mostraTab("link");
});

//
function showPopup() {
    return new Promise(resolve => {
        const overlay = document.getElementById("popupOverlay");
        const yesBtn = document.getElementById("popupYes");
        const noBtn = document.getElementById("popupNo");

        overlay.style.opacity = 0;
        overlay.style.display = "flex";
        requestAnimationFrame(() => {
            overlay.style.transition = "opacity 0.3s";
            overlay.style.opacity = 1;
        });

        const closePopup = (choice) => {
            overlay.style.opacity = 0;
            setTimeout(() => {
                overlay.style.display = "none";
                resolve(choice);
            }, 300);
        };

        yesBtn.onclick = () => closePopup("yes");
        noBtn.onclick = () => closePopup("no");
    });
}


  themeToggle.addEventListener("click", () => {
    // Cambia tema tra dark e light
    const newTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = newTheme;

    // Aggiorna icona del pulsante usando Bootstrap Icons
    themeToggle.innerHTML = newTheme === "dark"
      ? '<i class="bi bi-moon"></i>'
      : '<i class="bi bi-sun"></i>';

    // Invia tema al main process di Electron
    ipcRenderer.send("set-theme", newTheme);
  });


openFolderBtn.addEventListener("click", () => ipcRenderer.invoke("open-folder"));
setFolderBtn.addEventListener("click", async () => {
    const folder = await ipcRenderer.invoke("set-folder");
    if (folder) {
        ipcRenderer.invoke("save-download-folder", folder).then(savedFolder => {
            downloadFolder = savedFolder;
            if (folderInput) {
                folderInput.value = savedFolder;  // testo normale
                setFolderPath(savedFolder);       // evidenzia unità
            }
            saveSettingsToMain();
        });
    }
});


audioOnlyChk.addEventListener("change", () => {
    // Se vuoi, puoi aggiungere logica di disabilitazione di altri checkbox se necessario
    saveSettingsToMain();
});

playlistChk.addEventListener("change", () => {
    saveSettingsToMain();
});
//
function cleanYouTubeUrl(url) {
    try {
        const parsed = new URL(url);

        if (parsed.hostname.includes("youtube.com")) {
            const v = parsed.searchParams.get("v");
            const list = parsed.searchParams.get("list");

            if (v && !list) return `https://www.youtube.com/watch?v=${v}`;
            if (v && list) return `https://www.youtube.com/watch?v=${v}&list=${list}`;
            if (list) return `https://www.youtube.com/playlist?list=${list}`;
        }

        return url;
    } catch (e) {
        return url;
    }
}

// Applica pulizia prima di aggiungere video
function addVideoClean(url) {
    const cleanUrl = cleanYouTubeUrl(url);
    addVideoOrPlaylist(cleanUrl); // chiama la funzione che gestisce sia video singoli che playlist
}
async function addVideoOrPlaylist(inputUrl, extraArgs = "") {
    if (!inputUrl) return;

    let cleanUrl = inputUrl.trim();
    const isPlaylist = /[?&]list=/.test(cleanUrl);

    // Caso 1: NON è playlist → aggiungi video singolo
    if (!isPlaylist) {
        return await addVideo(cleanUrl, extraArgs);
    }

    // Caso 2: È playlist e checkbox SPUNTATA → scarica TUTTI i video
    if (playlistChk.checked && binPaths?.ytDlp) {
        return new Promise(resolve => {
            const args = ["--flat-playlist", "-j", cleanUrl];
            const proc = spawn(binPaths.ytDlp, args);

            let dataStr = "";
            proc.stdout.on("data", chunk => dataStr += chunk.toString());

            proc.on("close", () => {
                try {
                    const infos = dataStr.trim().split("\n").map(line => JSON.parse(line));
                    infos.forEach(info => {
                        if (info.id) {
                            const videoUrl = `https://www.youtube.com/watch?v=${info.id}`;
                            addVideo(videoUrl, extraArgs);
                        }
                    });
                    resolve();
                } catch (e) {
                    console.error("Errore parsing playlist:", e);
                    resolve(addVideo(cleanUrl, extraArgs));
                }
            });

            proc.on("error", err => {
                console.error("yt-dlp error:", err);
                resolve(addVideo(cleanUrl, extraArgs));
            });
        });
    }

    // Caso 3: È playlist ma checkbox NON spuntata → prendi SOLO il primo video
    if (binPaths?.ytDlp) {
        return new Promise(resolve => {
            const args = ["--flat-playlist", "-j", cleanUrl];
            const proc = spawn(binPaths.ytDlp, args);

            let gotOne = false;
            proc.stdout.on("data", chunk => {
                if (!gotOne) {
                    gotOne = true;
                    const firstLine = chunk.toString().split("\n")[0];
                    try {
                        const info = JSON.parse(firstLine);
                        const firstVideoUrl = `https://www.youtube.com/watch?v=${info.id}`;
                        resolve(addVideo(firstVideoUrl, extraArgs));
                        proc.kill();
                    } catch (e) {
                        console.error("Errore parsing primo video playlist:", e);
                        resolve(addVideo(cleanUrl, extraArgs));
                    }
                }
            });

            proc.on("error", err => {
                console.error("yt-dlp error:", err);
                resolve(addVideo(cleanUrl, extraArgs));
            });
        });
    }

    // Fallback → aggiungi come singolo video
    return await addVideo(cleanUrl, extraArgs);
}

// ===================== Helper esistenti =====================
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function getDomainFromUrl(url) { try { return new URL(url).hostname; } catch(e){ return null; } }
function escapeHtml(str){ if(!str) return ""; return str.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ----------------- fetchHlsData -----------------
async function fetchHlsData(video) {
    try {
        const html = await axios.get(video.url).then(r => r.data);

        // Trova link m3u8
        const hlsMatch = html.match(/https?:\/\/[^\s"'<>]+\.m3u8/g);
        video.urlHls = hlsMatch ? hlsMatch[0] : null;

        // Trova titolo e thumbnail
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        video.title = titleMatch ? titleMatch[1] : video.title;

        const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        video.thumbnail = thumbMatch ? thumbMatch[1] : video.thumbnail;

        // URL per il player
        if (video.urlHls) video.urlForPlayer = video.urlHls;

    } catch (e) {
        console.error("fetchHlsData error:", e);
    }
}

// --- Funzione aggiornata addVideo con extraArgs ---
function formatDuration(seconds) {
    if (!seconds) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return (h > 0 ? h.toString().padStart(2,'0') + ':' : '') +
           m.toString().padStart(2,'0') + ':' +
           s.toString().padStart(2,'0');
}

async function addVideo(url, extraArgs = "") {
    if (!url || videos.find(v => v.url === url)) return;

    const video = {
        url,
        urlHls: null,
        domain: getDomainFromUrl(url),
        title: "Loading...",
        thumbnail: "",
        duration: "",
        formats: null,
        status: "",
        progress: 0,
        pid: Date.now(),
        format: null,
        extraArgs
    };

    videos.push(video);
    renderVideos();
    saveSettingsToMain();
    updateVideoCount();

    // Aggiorna extraArgs dall'input dell'utente
    video.extraArgs = document.getElementById("extraArgsInput")?.value.trim() || "";

    try {
        // Recupera titolo, thumbnail e HLS dall'HTML
        const html = await axios.get(video.url).then(r => r.data);
        const hlsMatch = html.match(/https?:\/\/[^\s"'<>]+\.m3u8/g);
        video.urlHls = hlsMatch ? hlsMatch[0] : null;

        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        if (titleMatch) video.title = titleMatch[1];

        const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        if (thumbMatch) video.thumbnail = thumbMatch[1];

        if (video.urlHls) video.urlForPlayer = video.urlHls;
    } catch (e) {
        console.error("fetchHlsData error:", e);
    }

    // Recupera info dettagliate tramite yt-dlp, anche per video singoli
    if (binPaths?.ytDlp) {
        fetchVideoDetails(video);
    }

    renderVideos();
    saveSettingsToMain();
    updateVideoCount();

    return video;
}

// Supponendo che tu abbia un contenitore div che raggruppa i due bottoni
const groupBox = document.getElementById("groupBox");

// Funzione per mostrare/nascondere il groupBox con fade
function updateGroupBoxVisibility(anyThumbnailLoaded) {
    if (!groupBox) return;

    if (videos.length > 0 && anyThumbnailLoaded) {
        groupBox.style.display = "flex"; // Mostra il contenitore
        requestAnimationFrame(() => {
            groupBox.style.opacity = 1;          // Fade-in
        });
    } else {
        groupBox.style.opacity = 0;             // Fade-out
        setTimeout(() => {
            if (videos.length === 0 || !anyThumbnailLoaded) {
                groupBox.style.display = "none";
            }
        }, 300); // tempo fade-out
    }
}
function renderVideos() {
    if (!videoList) return;
    videoList.innerHTML = "";
    let anyThumbnailLoaded = false;

    videos.forEach((video, index) => {
        const div = document.createElement("div");
        div.className = "video-item";
        div.dataset.pid = video.pid;
        div.draggable = true;

        // Thumbnail o spinner
        let thumbHTML = "";
        if (video.thumbnail) {
            anyThumbnailLoaded = true;
            thumbHTML = `<img src="${video.thumbnail}" class="thumbnail" onclick="openThumbnail(${index})">`;
        } else {
            thumbHTML = `<div class="spinner"></div>`;
        }

        // Formati video
        const formatOptions = video.formats
            ? video.formats.map(f => `<option value="${f.format_id}">${f.format_id} (${f.ext})${f.sizeStr ? " - " + f.sizeStr : ""}</option>`).join("")
            : "";

        const domain = video.domain || getDomainFromUrl(video.url);
        const durationLabel = video.duration
    ? `<i class="bi bi-clock"></i> ${video.duration}<br><small><i class="bi bi-globe"></i> ${domain}</small>`
    : `<small><i class="bi bi-globe"></i> ${domain}</small>`;

        div.innerHTML = `
            <div class="thumbnail-container">
                ${thumbHTML}
                <div class="thumb-progress-bar"></div>
            </div>
            <div class="video-info">
                <strong>${escapeHtml(video.title)}</strong>
                <div class="status">${video.status || ""}</div>
                <label>
                    <select class="quality-select" onchange="setFormat(${index}, this.value)">
                        <option value="">Best MP4</option>
                        ${formatOptions}
                    </select>
                </label>
                <div class="duration">${durationLabel}</div>
                <div class="download-details"></div>

            </div>
            <div class="video-buttons">
                <button class="download-btn" onclick="downloadVideo(${index})">
				<i class="bi bi-download"></i> 
				</button>
                <button class="stop-btn" onclick="stopDownload(${index})">
				<i class="bi bi-sign-stop"></i> 
				</button>
                <button class="remove-btn" onclick="removeVideo(${index})">
				<i class="bi bi-trash"></i> 
				</button>
                <button class="paste-btn" onclick="pasteLink(${index})">
				<i class="bi bi-link"></i> 
				</button>
                <button class="open-btn" onclick="openLink(${index})">
                <i class="bi bi-globe2"></i> 
                </button>
            </div>
        `;

        videoList.appendChild(div);
    });

    // Mostra/Nascondi container totale link
    const totalCountContainer = document.getElementById("totalCountContainer");
    if (totalCountContainer) totalCountContainer.style.display = anyThumbnailLoaded ? "block" : "none";

    if (clearListBtn) clearListBtn.style.display = videos.length > 0 ? "inline-block" : "none";

    updateGroupBoxVisibility(anyThumbnailLoaded);
    addDragAndDropHandlers();
}

window.pasteLink = (index) => { urlArea.value = videos[index]?.url || ""; urlArea.focus(); };
window.openLink = (index) => { if(videos[index]) shell.openExternal(videos[index].url); };
window.openThumbnail = (index) => { if(videos[index]?.thumbnail) shell.openExternal(videos[index].thumbnail); };
window.setFormat = (index, formatId) => { if(videos[index]) videos[index].format = formatId; };


window.removeVideo = (index) => {
    if (!videos[index]) return;

    // Ferma e resetta il player se aperto
    const container = document.getElementById(`player-container-${index}`);
    if (container) {
        const videoEl = container.querySelector("video");
        if (videoEl) {
            videoEl.pause();
            videoEl.currentTime = 0;
        }
    }

    // Cancella la clipboard se corrisponde al video
    if (clipboard.readText().trim() === videos[index].url) clipboard.writeText("");

    // Cancella il log se la textarea contiene il link rimosso
    if (urlArea.value.trim() === videos[index].url) {
        // eventualmente puoi svuotare urlArea qui
    }

    // Rimuove il video dall’array
    videos.splice(index, 1);
    renderVideos();
    saveSettingsToMain();
    updateVideoCount(); // aggiorna il totale
};

// stampa domini dei video
videos.forEach(video => {
    const domain = getDomainFromUrl(video.url);
    console.log(video.url, "→", domain);
});

// ---------- DRAG & DROP ----------
if (urlArea) {
    urlArea.addEventListener("dragover", e => { e.preventDefault(); urlArea.style.border = "1px dashed #007ACC"; });
    urlArea.addEventListener("dragleave", e => { e.preventDefault(); urlArea.style.border = ""; });
    urlArea.addEventListener("drop", async e => {
        e.preventDefault();
        urlArea.style.border = "";

        const processUrls = async text => {
            const urls = [...new Set((text.match(/https?:\/\/[^\s"'<>]+/gi) || []).filter(isValidUrl))];
            if (!urls.length) return;

            logArea.innerHTML = `<i class="bi bi-hourglass-split"></i> Caricamento drag&drop…`;
            logArea.style.color = "#0080FF";

            for (let i = 0; i < urls.length; i++) {
                await addVideoOrPlaylist(urls[i]);
                await sleep(300);
               logArea.innerHTML = `<i class="bi bi-hourglass-split"></i> Aggiunto ${i + 1} di ${urls.length}…`;

            }

            logArea.innerHTML = `<i class="bi bi-check-circle"></i> Aggiunti ${urls.length} link!`;
            setTimeout(() => logArea.textContent = "", 5000);

            updateVideoCount();
        };

        // File
        if (e.dataTransfer.files.length > 0) {
            for (const file of e.dataTransfer.files) {
                const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
                if ([".txt", ".json", ".html", ".htm", ".md", ".dat"].includes(ext)) {
                    const text = await file.text();
                    await processUrls(text);
                } else {
                    alert(`Trascina un file valido (${[".txt", ".json", ".html", ".htm", ".md"].join(", ")}) con collegamenti.`);
                }
            }
            return;
        }

        // Testo incollato
        const textData = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
        if (textData) await processUrls(textData);
    });
}



// Funzione aggiornata fetchVideoDetails
function fetchVideoDetails(video){
    if(!binPaths?.ytDlp) return;

    const args = ["-j"];
    args.push(video.url);

    const proc = spawn(binPaths.ytDlp, args);
    let dataStr = "";

    proc.stdout.on("data", chunk => dataStr += chunk.toString());
    proc.stderr.on("data", () => {});

    proc.on("close", () => {
        try{
            const info = JSON.parse(dataStr);
            video.title = info.title || video.title;
            video.thumbnail = info.thumbnail?.replace(/hqdefault/, 'maxresdefault') || video.thumbnail;
            
            // Durata in hh:mm:ss
            if(info.duration) video.duration = formatDuration(info.duration);
            else if(info.duration_string) video.duration = info.duration_string;

            video.formats = (info.formats || []).map(f => {
                let sizeStr = '';
                const bytes = f.filesize || f.filesize_approx;
                if(bytes) sizeStr = bytes < 1024*1024 
                    ? (bytes/1024).toFixed(1)+' KB' 
                    : bytes < 1024*1024*1024 
                        ? (bytes/(1024*1024)).toFixed(1)+' MB' 
                        : (bytes/(1024*1024*1024)).toFixed(2)+' GB';
                return {...f, sizeStr};
            });
        } catch(e){ 
            console.error("Parsing info error:", e); 
        }
        renderVideos();
    });
}
// Funzione helper per delay

// Funzione base per scaricare un video (gestisce UI, spinner, progress bar)
async function downloadSingleVideo(video) {
    if (!video) return;

    const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`);
    if (!videoDiv) return;

    const spinner = videoDiv.querySelector(".spinner");
    const statusText = videoDiv.querySelector(".status");
    const progressBar = videoDiv.querySelector(".thumb-progress-bar");
    const detailsText = videoDiv.querySelector(".download-details");

    // Mostra spinner e resetta UI
    if (spinner) spinner.style.display = "inline-block";
   if (statusText) statusText.innerHTML = `<i class="bi bi-hourglass-split"></i> Download in corso...`;

    if (progressBar) {
        progressBar.style.width = "0%";
        progressBar.style.backgroundColor = "#2196F3";
    }
    if (detailsText) detailsText.textContent = "";

    const extraArgs = video.extraArgs || "";

    // Usa sempre il titolo mostrato come fileName
    const fileName = sanitizeFileName(video.title) || "video";

    try {
await ipcRenderer.invoke("start-download", {
    ...video,
    outputDir: downloadFolder || null,
    outputName: video.title, // Titolo reale
    audioOnly: audioOnlyChk.checked,
    playlist: playlistChk.checked,
    format: video.format || null,
    extraArgs
});

        // Aggiorna UI a download completato
        if (progressBar) progressBar.style.width = "100%";
        if (progressBar) progressBar.style.backgroundColor = "#4CAF50";
       if (statusText) statusText.innerHTML = `<i class="bi bi-check-circle"></i> Completato`;

       if (detailsText) detailsText.innerHTML = `<i class="bi bi-check-circle"></i> Completato`;


    } catch (err) {
        if (progressBar) progressBar.style.backgroundColor = "#F44336";
       // if (statusText) statusText.textContent = " Errore";
if (detailsText) detailsText.innerHTML = `<i class="bi bi-x-circle"></i> ${err.message || "Errore sconosciuto"}`;

        console.error(`ErrorE downloading ${video.url}:`, err);
    } finally {
        if (spinner) spinner.style.display = "none";
    }
}

// Funzione helper per pulire il titolo
function sanitizeFileName(name){
    return name.replace(/[\/\\?%*:|"<>]/g, '-');
}

// Wrapper per download singolo
window.downloadVideo = async (index) => {
    const video = videos[index];
    if (!video) return;
    await downloadSingleVideo(video);
};


// Download All sequenziale usando la stessa funzione base
async function downloadAllParallel() {
    if (videos.length === 0) return;

    const concurrency = 3; // numero di download simultanei
    downloadAllBtn.disabled = true;
    logArea.innerHTML = `<i class="bi bi-arrow-down-circle"></i>Scaricamento di tutti i video in parallelo...`;

    logArea.style.color = "#0080FF";

    for (let i = 0; i < videos.length; i += concurrency) {
        const batch = videos.slice(i, i + concurrency);
        await Promise.all(batch.map(video => downloadSingleVideo(video)));
    }

   logArea.innerHTML = `<i class="bi bi-check-circle"></i> Tutti i download completati!`;

    setTimeout(() => { logArea.textContent = ""; }, 5000);
    downloadAllBtn.disabled = false;
}


ipcRenderer.on("download-progress", (event, { url, data }) => {
    // Trova il video corrispondente
    const video = videos.find(v => v.url === url);
    if (!video) return;

    const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`);
    if (!videoDiv) return;

    const progressBar = videoDiv.querySelector(".thumb-progress-bar");
    const detailsText = videoDiv.querySelector(".download-details");
    const statusText = videoDiv.querySelector(".status");
    const spinner = videoDiv.querySelector(".spinner");

    // Parsing dati yt-dlp
    const percentMatch = data.match(/(\d+(\.\d+)?)%/);
    const percent = percentMatch ? parseFloat(percentMatch[1]) : video.progress || 0;

    const etaMatch = data.match(/ETA\s*([\d:]+)/);
    const eta = etaMatch ? etaMatch[1] : "";

    const speedMatch = data.match(/([\d\.]+[KMG]i?B\/s)/i);
    const speedStr = speedMatch ? speedMatch[0] : "";

    // Aggiorna stato video in memoria
    video.progress = percent;

    // Aggiorna barra di progresso
    if (progressBar) {
        progressBar.style.width = percent + "%";
        progressBar.style.backgroundColor = percent < 100 ? "#2196F3" : "#4CAF50";
    }

    // Aggiorna dettagli
if (detailsText) detailsText.innerHTML = `
  <span class="progress-text">
    ${percent}%<br>
    <i class="bi bi-speedometer2" style="margin-right:5px;"></i>${speedStr}<br>
    <i class="bi bi-clock" style="margin-right:5px;"></i>${eta}
  </span>
`;

    // Aggiorna status
    if (statusText) {
        if (percent >= 100) {
            statusText.innerHTML = `<i class="bi bi-check-circle"></i> Completato`;

            if (spinner) spinner.style.display = "none";
        } else {
            statusText.innerHTML = `<i class="bi bi-cloud-download-fill"></i> Download in corso...`;
            if (spinner) spinner.style.display = "inline-block";
        }
    }
});


ipcRenderer.on("download-complete", (event, { url, code, error }) => {
    const video = videos.find(v => v.url === url);
    if (!video) return;

    const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`);
    if (!videoDiv) return;

    const spinner = videoDiv.querySelector(".spinner");
    const statusText = videoDiv.querySelector(".status");
    const progressBar = videoDiv.querySelector(".thumb-progress-bar");
    const detailsText = videoDiv.querySelector(".download-details");

    if (spinner) spinner.style.display = "none"; // nasconde spinner
    if (progressBar) {
        progressBar.style.width = "100%";
        progressBar.style.backgroundColor = code === 0 ? "#4CAF50" : "#F44336";
    }
if (statusText) statusText.innerHTML = code === 0 
    ? `<i class="bi bi-check-circle"></i> Completato` 
    : `<i class="bi bi-x-circle"></i> Errore${error ? ": " + error : ""}`;

if (detailsText) detailsText.innerHTML = code === 0 
    ? `<i class="bi bi-download"></i> Completato` 
    : `<i class="bi bi-exclamation-triangle"></i> ${error || "Errore sconosciuto"}`;

});


ipcRenderer.on("download-stopped",(event,{url})=>{
    const video = videos.find(v=>v.url===url); if(!video) return;
    const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`); if(!videoDiv) return;
    const progressBar = videoDiv.querySelector(".thumb-progress-bar");
    const statusText = videoDiv.querySelector(".status");
    const detailsText = videoDiv.querySelector(".download-details");
    const stopBtn = videoDiv.querySelector(".stop-btn");

    if(progressBar) progressBar.style.backgroundColor="#F44336";
if (statusText) statusText.innerHTML = `<i class="bi bi-slash-circle"></i> Interrotto`;
if (detailsText) detailsText.innerHTML = `<i class="bi bi-download"></i> Interrotto`;

});
//

let logTimeout = null; // Timeout globale

function showLog(message, color = "black", duration = 5000) {
    if (!logArea) return;

    logArea.innerHTML = message;
    logArea.style.color = color;

    // Se esiste un timeout precedente, lo cancella
    if (logTimeout) clearTimeout(logTimeout);

    logTimeout = setTimeout(() => {
        logArea.textContent = "";
        logTimeout = null;
    }, duration);
}
// ---------- PASTE LINK ----------
pasteBtn.addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
            showLog(`<i class="bi bi-exclamation-triangle-fill"></i> Clipboard vuota!`, "orange");
            return;
        }

        const urls = processTextInput(text).filter(isValidUrl);
        if (urls.length === 0) {
            showLog(`<i class="bi bi-exclamation-triangle-fill"></i> Nessun link valido nella clipboard!`, "red");
            return;
        }

        showLog(`<i class="bi bi-hourglass-split"></i> Caricamento clipboard…`, "#0080FF");

        for (let i = 0; i < urls.length; i++) {
            await addVideoOrPlaylist(urls[i]);
            await sleep(300);
            showLog(`<i class="bi bi-hourglass-split"></i> Aggiunto ${i + 1} di ${urls.length}…`, "#0080FF", 2000);
        }

        showLog(`<i class="bi bi-check-circle"></i> Aggiunti ${urls.length} link dalla clipboard!`, "green");

        updateVideoCount();

    } catch (err) {
        console.error("Errore leggendo clipboard:", err);
        showLog(`<i class="bi bi-x-circle"></i> Impossibile leggere la clipboard.`, "red");
    }
});



if (downloadAllBtn) {
    downloadAllBtn.addEventListener("click", async () => {
        if (videos.length === 0) return;

        downloadAllBtn.disabled = true;
        logArea.innerHTML = `<i class="bi bi-hourglass-split"></i> Scaricamento di tutti i video (modalità ad alta velocità)...`;

        logArea.style.color = "#0080FF";

        const concurrency = 10; // numero di download simultanei, aumenta la velocità

        for (let i = 0; i < videos.length; i += concurrency) {
            const batch = videos.slice(i, i + concurrency);

            await Promise.all(batch.map(async (video) => {
                const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`);
                if (!videoDiv) return;

                const spinner = videoDiv.querySelector(".spinner");
                const statusText = videoDiv.querySelector(".status");
                const progressBar = videoDiv.querySelector(".thumb-progress-bar");
                const detailsText = videoDiv.querySelector(".download-details");

                if (spinner) spinner.style.display = "inline-block";
                if (statusText) statusText.innerHTML = `<i class="bi bi-hourglass-split"></i> Download in corso...`;


                try {
                    await ipcRenderer.invoke("start-download", {
                        ...video,
                        url: video.urlHls || video.url,
                        outputDir: downloadFolder || null,
                        fileName: video.title ? sanitizeFileName(video.title) : "video",
                        audioOnly: audioOnlyChk.checked,
                        playlist: playlistChk.checked,
                        format: video.format || null,
                        extraArgs: video.extraArgs || ""
                    });

                    if (progressBar) {
                        progressBar.style.width = "100%";
                        progressBar.style.backgroundColor = "#4CAF50";
                    }
if (statusText) statusText.innerHTML = `<i class="bi bi-check2-circle"></i> Completato`;
if (detailsText) detailsText.innerHTML = `<i class="bi bi-download"></i> Completato`;


                } catch (err) {
                    if (progressBar) progressBar.style.backgroundColor = "#F44336";
if (statusText) statusText.innerHTML = '<i class="bi bi-x-circle"></i> Errore';
if (detailsText) detailsText.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${err.message || "Errore sconosciuto"}`;

                    console.error(`Error downloading ${video.url}:`, err);
                } finally {
                    if (spinner) spinner.style.display = "none";
                }
            }));
        }

  showLog(`<i class="bi bi-check2-circle"></i> Tutti i download sono stati completati!`, "green");


        setTimeout(() => { logArea.textContent = ""; }, 5000);
        downloadAllBtn.disabled = false;
    });
}



urlArea.addEventListener("input", () => {
    urlArea.value = filterInvalidChars(urlArea.value);
    if (!urlArea.value.trim()) {
        logArea.textContent = "";
    }
});


let dragSrcEl=null;
function handleDragStart(e){dragSrcEl=this;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/html',this.outerHTML);this.classList.add('dragging');}
function handleDragOver(e){e.preventDefault(); e.dataTransfer.dropEffect='move'; return false;}
function handleDragEnter(){this.classList.add('over');}
function handleDragLeave(){this.classList.remove('over');}
function handleDrop(e){
    e.stopPropagation();
    if(dragSrcEl!==this){
        const parent=this.parentNode;
        const mouseY=e.clientY;
        const targetRect=this.getBoundingClientRect();
        const insertAfter=mouseY>targetRect.top+targetRect.height/2;
        parent.removeChild(dragSrcEl);
        if(insertAfter) this.insertAdjacentElement('afterend', dragSrcEl);
        else this.insertAdjacentElement('beforebegin', dragSrcEl);
        const newOrder=[];
        parent.querySelectorAll('.video-item').forEach(el=>{
            const pid=parseInt(el.dataset.pid);
            const vid=videos.find(v=>v.pid===pid);
            if(vid) newOrder.push(vid);
        });
        videos=newOrder;
        addDragAndDropHandlers();
        saveSettingsToMain();
    }
    this.classList.remove('over');
    return false;
}
function handleDragEnd(){this.classList.remove('dragging'); document.querySelectorAll('.video-item').forEach(item=>item.classList.remove('over'));}
function addDragAndDropHandlers(){document.querySelectorAll('.video-item').forEach(item=>{
    item.addEventListener('dragstart', handleDragStart,false);
    item.addEventListener('dragenter', handleDragEnter,false);
    item.addEventListener('dragover', handleDragOver,false);
    item.addEventListener('dragleave', handleDragLeave,false);
    item.addEventListener('drop', handleDrop,false);
    item.addEventListener('dragend', handleDragEnd,false);
});}



function getOptions() {
    return {
        audioOnly: audioOnlyChk.checked,
        playlist: playlistChk.checked,
        extraArgs: document.getElementById("extraArgsInput")?.value.trim() || ""
    };
}
function saveSettingsToMain() {
    ipcRenderer.send("save-settings", {
        links: videos.map(v => v.url),
        options: getOptions(),
        downloadFolder
    });
}

// --- altre funzioni esistenti ---

const updateBtn = document.getElementById("updateYtDlpBtn");
const updateLog = document.getElementById("updateLog");

updateBtn.addEventListener("click", async () => {
    updateBtn.disabled = true;
    updateBtn.textContent = "Aggiornamento...";
    updateLog.textContent = "";

    try {
        const result = await ipcRenderer.invoke("update-yt-dlp");
       updateLog.innerHTML = result.output || `<i class="bi bi-check2-circle"></i> Aggiornamento terminato`;


        // Timer per far sparire il log dopo 5 secondi
        setTimeout(() => {
            updateLog.textContent = "";
        }, 5000);

    } catch (err) {
       updateLog.innerHTML = `<i class="bi bi-x-circle"></i> Errore durante l'aggiornamento: ${err.message}`;

        setTimeout(() => {
            updateLog.textContent = "";
        }, 5000);
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<i class="bi bi-arrow-up-circle"></i> Aggiornamento YT-DLP';
    }
});
//
const downloadBtn = document.getElementById("download-binaries");
const downloadBarInner = document.getElementById("download-bar-inner");
const downloadPercentInner = document.getElementById("download-percent-inner");
const downloadStatus = document.getElementById("download-status");


// Listener del bottone "Scarica Binaries"
downloadBtn.addEventListener("click", async () => {
    if(downloadBarInner) downloadBarInner.style.width = "0%";
    if(downloadPercentInner) downloadPercentInner.innerText = "0%";
    if(downloadStatus) downloadStatus.innerText = "";

    try {
        const result = await ipcRenderer.invoke("download-binaries");
        if(downloadStatus) downloadStatus.innerText = result;

        setTimeout(() => {
            if(downloadBarInner) downloadBarInner.style.width = "0%";
            if(downloadPercentInner) downloadPercentInner.innerText = "0%";
            if(downloadStatus) downloadStatus.innerText = "";
        }, 3000);

    } catch (err) {
        if(downloadStatus) downloadStatus.innerText = `Errore: ${err}`;
        setTimeout(() => {
            if(downloadBarInner) downloadBarInner.style.width = "0%";
            if(downloadPercentInner) downloadPercentInner.innerText = "0%";
            if(downloadStatus) downloadStatus.innerText = "";
        }, 3000);
    }
});
function setDownloadProgressInner(percent, message) {
    if(downloadBarInner) downloadBarInner.style.width = `${percent}%`;
    if(downloadPercentInner) downloadPercentInner.innerText = `${percent}%`;
    if(downloadStatus) downloadStatus.innerText = message;
}

ipcRenderer.on("download-binaries-log", (event, msg) => {
    // Mantieni percentuale corrente, aggiorna solo il messaggio
    const barWidth = parseFloat(document.getElementById("download-bar-inner").style.width) || 0;
    setDownloadProgressInner(barWidth, msg);
});

ipcRenderer.on("download-binaries-progress", (event, { percent }) => {
    const currentMsg = document.getElementById("download-status").innerText || "Download in corso...";
    setDownloadProgressInner(percent, currentMsg);
});

function toggleFormControls(disable = true) {
    const controls = document.querySelectorAll("button, input, select, textarea");
    controls.forEach(ctrl => ctrl.disabled = disable);
}

if (resetFormBtn) {
    resetFormBtn.addEventListener("click", async () => {
        try {
            toggleFormControls(true); // disabilita tutti i controlli
           logArea.innerHTML = `<i class="bi bi-arrow-repeat"></i> Restarting form...`;


            // Ferma tutti i download attivi
            videos.forEach(video => ipcRenderer.send("stop-download", video.url));

            // Resetta array video e UI
            videos = [];
            renderVideos();
            updateVideoCount();

            // Resetta cartella download nella UI
            if (folderInput) setFolderPath(downloadFolder || "");

            // Resetta checkbox ai valori salvati nei settings
            const settings = await ipcRenderer.invoke("get-settings");
            if (settings.options) {
                audioOnlyChk.checked = settings.options.audioOnly || false;
                playlistChk.checked = settings.options.playlist || false;
            }

            // Carica i video salvati nei settings
            const links = settings.links || [];
            for (let i = 0; i < links.length; i++) {
                await addVideoOrPlaylist(links[i]);
            }

            renderVideos();
            updateVideoCount();

            logArea.innerHTML = `<i class="bi bi-arrow-repeat"></i> Form riavviato e video ricaricati!`;

            setTimeout(() => { logArea.textContent = ""; }, 3000);

        } catch (err) {
            console.error("Errore nel reset:", err);
           logArea.innerHTML = `<i class="bi bi-x-circle"></i> Errore durante il reset!`;

            logArea.style.color = "red";
            setTimeout(() => { logArea.textContent = ""; }, 3000);
        } finally {
            toggleFormControls(false); // riabilita tutti i controlli
        }
    });
}

window.stopDownload = (index) => {
    const video = videos[index];
    if (!video) return;
    ipcRenderer.send("stop-download", video.url);

    // Aggiorna immediatamente stato locale
    video.status = '<i class="bi bi-slash-circle"></i> Fermato';

    const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`);
    if (videoDiv) {
        const statusText = videoDiv.querySelector(".status");
        const detailsText = videoDiv.querySelector(".download-details");
        const progressBar = videoDiv.querySelector(".thumb-progress-bar");

        // Barra rossa
        if(progressBar) progressBar.style.backgroundColor="#F44336";

        // Stato con icona
        if(statusText) statusText.innerHTML = video.status;

        // Dettagli con icona download
        if(detailsText) detailsText.innerHTML = '<i class="bi bi-download"></i> Interrotto';
    }
};

window.addVideo = addVideo;