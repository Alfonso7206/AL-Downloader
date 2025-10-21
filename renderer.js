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


const helpInput = document.getElementById("helpSearch");
const sitesInput = document.getElementById("sitesSearch");
const helpOutput = document.getElementById("helpOutput");
const sitesOutput = document.getElementById("sitesOutput");

let helpText = "";
let sitesList = [];

document.querySelector("button[title='Help yt-dlp']").addEventListener("click", async () => {
  if (!helpText || !sitesList.length) {
    helpOutput.textContent = "⏳ Loading yt-dlp help...";
    sitesOutput.textContent = "⏳ Loading supported sites...";
    await loadYtDlpData();
  }
});

async function loadYtDlpData() {
  try {
    const [helpRaw, sitesRaw] = await Promise.all([
      ipcRenderer.invoke("yt-dlp-help"),
      ipcRenderer.invoke("yt-dlp-sites")
    ]);

    helpText = helpRaw;
    helpOutput.textContent = helpText;

    sitesList = sitesRaw
      .split("\n")
      .filter(line => !line.startsWith("---") && line.trim());
    sitesOutput.textContent = sitesList.join("\n");
  } catch (err) {
    helpOutput.textContent = "❗ Error loading help: " + err;
    sitesOutput.textContent = "❗Error loading sites: " + err;
  }
}

helpInput.addEventListener("input", e => {
  const query = e.target.value.trim();
  if (!query) {
    helpOutput.textContent = helpText;
    return;
  }
  const regex = new RegExp(query, "i");
  const filtered = helpText
    .split("\n")
    .filter(line => regex.test(line))
    .join("\n");
  helpOutput.textContent = filtered || "⚠️ no results found.";
});

sitesInput.addEventListener("input", e => {
  const query = e.target.value.trim().toLowerCase();
  if (!query) {
    sitesOutput.textContent = sitesList.join("\n");
    return;
  }
  const filtered = sitesList.filter(line => line.toLowerCase().includes(query));
  sitesOutput.textContent = filtered.join("\n") || "⚠️ No sites found.";
});


addInlineBtn?.addEventListener("click", async () => {
  const text = urlArea.value.trim();
  const urls = processTextInput(text);

  if (urls.length === 0) {
    logArea.textContent = "⚠️ No valid links found.";
    return;
  }

  logArea.textContent = `⏳ Loading of ${urls.length} link in progress...`;

  try {
    let count = 0;
    for (const url of urls) {
      await addVideoOrPlaylist(url);
      count++;
      logArea.textContent = `🔗✅ Added ${count}/${urls.length}: ${url}`;
    }

    logArea.textContent = `🔗✅ ${urls.length} links added successfully!`;
    setTimeout(() => { logArea.textContent = ""; }, 1500); 

  } catch (err) {
    console.error("❗ Error while adding:", err);
    logArea.textContent = "❗ Error adding links.";
  }
});


clearListBtn?.addEventListener("click", ()=>{
    videos=[];
    renderVideos();
    updateVideoCount();
    saveSettingsToMain();
});

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


function filterInvalidChars(text) {
    return text.replace(/[^\x20-\x7E\n\r]/g, '');
}


function processTextInput(text) {
    return filterInvalidChars(text).split(/\r?\n/).map(u => u.trim()).filter(u => u);
}


document.addEventListener("DOMContentLoaded", async () => {

const logArea = document.getElementById("logArea");
const themeToggle = document.getElementById("themeToggle");
const folderInput = document.getElementById("folderLabel");
const audioOnlyChk = document.getElementById("audioOnlyChk");
const playlistChk = document.getElementById("playlistChk");


const tabLinkBtn = document.getElementById("tabLinkBtn");
const tabConfigBtn = document.getElementById("tabConfigBtn");
const tabLink = document.getElementById("tabLink");
const tabConfig = document.getElementById("tabConfig");
const ytBtn = document.getElementById("ytDlpHelpBtn");
const closeBtn = document.getElementById("closeYtHelp");
const ytSitesBtn = document.getElementById("ytDlpSitesBtn");
const closeSitesBtn = document.getElementById("closeytDlpSites");
const outputContainer = document.getElementById("ytHelpContainer");
const output = document.getElementById("outputHelp");

    const parallelChk = document.getElementById("parallelChk");

    function mostraTab(tab) {
        if (!tabLink || !tabConfig || !tabLinkBtn || !tabConfigBtn) {
            console.warn("⚠️ One or more items were not found");
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


if (ytBtn) {
    ytBtn.addEventListener("click", () => {
        ytBtn.style.display = "none";
        ytSitesBtn.style.display = "none"; 
        closeBtn.style.display = "inline-block";
        outputContainer.style.display = "block";
        output.textContent = "⏳ Loading Help...";
    });
}

if (closeBtn) {
    closeBtn.addEventListener("click", () => {
        closeBtn.style.display = "none";
        ytBtn.style.display = "inline-block";
        ytSitesBtn.style.display = "inline-block";
        outputContainer.style.display = "none";
        output.textContent = "";
    });
}

if (ytSitesBtn) {
    ytSitesBtn.addEventListener("click", () => {
        ytSitesBtn.style.display = "none";
        ytBtn.style.display = "none"; 
        closeSitesBtn.style.display = "inline-block";
        outputContainer.style.display = "block";
        output.textContent = "⏳ Loading Sites..."; 
    });
}

if (closeSitesBtn) {
    closeSitesBtn.addEventListener("click", () => {
        closeSitesBtn.style.display = "none";
        ytSitesBtn.style.display = "inline-block";
        ytBtn.style.display = "inline-block";
        outputContainer.style.display = "none";
        output.textContent = "";
    });
}

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


    if (settings.options) {
        audioOnlyChk.checked = settings.options.audioOnly || false;
        playlistChk.checked = settings.options.playlist || false;
		parallelChk.checked = settings.options.parallel || false;
		
		if (extraArgsInput) extraArgsInput.value = settings.options.extraArgs || "";
    }
if (extraArgsInput) {
    extraArgsInput.addEventListener("input", () => {
        saveSettingsToMain();
    });
}

    binPaths = await ipcRenderer.invoke("get-bin-paths");

  if (settings.links && settings.links.length > 0) {
    logArea.textContent = "⏳ Links loading...";
    try {
      const choice = await showPopup();
      if (choice === "yes") {
        for (const v of settings.links) {
          await addVideo(v.url, v.extraArgs || "");

          const added = videos.find(x => x.url === v.url);
          if (added) {
            added.title = v.title || added.title;
            added.thumbnail = v.thumbnail || added.thumbnail;
            added.duration = v.duration || added.duration;
            added.format = v.format || added.format;
          }
        }

        logArea.textContent = "";

      } else {
        ipcRenderer.send("save-settings", { links: [], options: settings.options || {} });
        logArea.textContent = ""; 
      }
    } catch (err) {
      console.error("Popup error:", err);
      logArea.textContent = "❗Error loading links.";
    }
  }

    updateVideoCount();
    renderVideos();


    if (ytSitesBtn && outputContainer && output && closeSitesBtn) {
        ytSitesBtn.addEventListener("click", async () => {
            outputContainer.style.display = "block";
            output.textContent = "Loading...";
            closeSitesBtn.style.display = "none";

            try {
                const result = await ipcRenderer.invoke("yt-dlp-sites");
                output.textContent = result;
                closeSitesBtn.style.display = "inline-block";
            } catch (err) {
                output.textContent = `❗ Errore: ${err}`;
                closeSitesBtn.style.display = "inline-block";
            }
        });

        closeSitesBtn.addEventListener("click", () => {
            outputContainer.style.display = "none";
        });
    }
//

    if (ytBtn && outputContainer && output && closeBtn) {
        ytBtn.addEventListener("click", async () => {
            outputContainer.style.display = "block";
            output.textContent = "⏳ Loading...";
            closeBtn.style.display = "none";

            try {
                const result = await ipcRenderer.invoke("yt-dlp-help");
                output.textContent = result;
                closeBtn.style.display = "inline-block";
            } catch (err) {
                output.textContent = `❗ Errore: ${err}`;
                closeBtn.style.display = "inline-block";
            }
        });

        closeBtn.addEventListener("click", () => {
            outputContainer.style.display = "none";
        });
    }
//
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
        document.body.classList.add("popup-active"); 

        requestAnimationFrame(() => {
            overlay.style.transition = "opacity 0.3s";
            overlay.style.opacity = 1;
        });

        const closePopup = (choice) => {
            overlay.style.opacity = 0;
            setTimeout(() => {
                overlay.style.display = "none";
                document.body.classList.remove("popup-active"); 
                resolve(choice);
            }, 300);
        };

        yesBtn.onclick = () => closePopup("yes");
        noBtn.onclick = () => closePopup("no");
    });
}



  themeToggle.addEventListener("click", () => {
    const newTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = newTheme;

    themeToggle.innerHTML = newTheme === "dark"
      ? '<i class="bi bi-moon"></i>'
      : '<i class="bi bi-sun"></i>';

    ipcRenderer.send("set-theme", newTheme);
  });


openFolderBtn.addEventListener("click", () => ipcRenderer.invoke("open-folder"));
setFolderBtn.addEventListener("click", async () => {
    const folder = await ipcRenderer.invoke("set-folder");
    if (folder) {
        ipcRenderer.invoke("save-download-folder", folder).then(savedFolder => {
            downloadFolder = savedFolder;
            if (folderInput) {
                folderInput.value = savedFolder;  
                setFolderPath(savedFolder);       
            }
            saveSettingsToMain();
        });
    }
});


audioOnlyChk.addEventListener("change", () => {
    saveSettingsToMain();
});

playlistChk.addEventListener("change", () => {
    saveSettingsToMain();
});

parallelChk.addEventListener("change", () => {
    saveSettingsToMain();
});
//

async function addVideoOrPlaylist(inputUrl, extraArgs=""){
    if(!inputUrl) return;
    const cleanUrl = inputUrl.trim();
    if(binPaths?.ytDlp){
        return new Promise(resolve=>{
            const args=["--flat-playlist","-j", cleanUrl];
            const proc=spawn(binPaths.ytDlp,args);
            let dataStr="";
            proc.stdout.on("data", chunk=>dataStr+=chunk.toString());
            proc.on("close", ()=>{
                try{
                    const infos = dataStr.trim().split("\n").map(line=>JSON.parse(line));
                    if(playlistChk.checked && infos.length>1){
                        infos.forEach(info=>{
                            if(info.id && info.webpage_url) addVideo(info.webpage_url, extraArgs);
                            else if(info.id) addVideo(info.id, extraArgs);
                        });
                        resolve();
                    } else {
                        const firstInfo = infos[0];
                        if(firstInfo.id && firstInfo.webpage_url) resolve(addVideo(firstInfo.webpage_url, extraArgs));
                        else if(firstInfo.id) resolve(addVideo(firstInfo.id, extraArgs));
                        else resolve(addVideo(cleanUrl, extraArgs));
                    }
                }catch(e){ console.error("❗ Parsing error:", e); resolve(addVideo(cleanUrl, extraArgs)); }
            });
            proc.on("error", err=>{ console.error("❗ yt-dlp error:", err); resolve(addVideo(cleanUrl, extraArgs)); });
        });
    }
    return await addVideo(cleanUrl, extraArgs);
}


function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function getDomainFromUrl(url) { try { return new URL(url).hostname; } catch(e){ return null; } }
function escapeHtml(str){ if(!str) return ""; return str.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }



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
        title: "🔄 Loading...",
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

    video.extraArgs = document.getElementById("extraArgsInput")?.value.trim() || "";

    try {

        const html = await axios.get(video.url).then(r => r.data);
        const hlsMatch = html.match(/https?:\/\/[^\s"'<>]+\.m3u8/g);
        video.urlHls = hlsMatch ? hlsMatch[0] : null;

        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        if (titleMatch) video.title = titleMatch[1];

        const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        if (thumbMatch) video.thumbnail = thumbMatch[1];

        if (video.urlHls) video.urlForPlayer = video.urlHls;
    } catch (e) {
        console.error("❗fetchHlsData error:", e);
    }

    if (binPaths?.ytDlp) {
        fetchVideoDetails(video);
    }

    renderVideos();
    saveSettingsToMain();
    updateVideoCount();

    return video;
}

const groupBox = document.getElementById("groupBox");


function updateGroupBoxVisibility(anyThumbnailLoaded) {
    if (!groupBox) return;

    if (videos.length > 0 && anyThumbnailLoaded) {
        groupBox.style.display = "flex"; 
        requestAnimationFrame(() => {
            groupBox.style.opacity = 1;      
        });
    } else {
        groupBox.style.opacity = 0;             
        setTimeout(() => {
            if (videos.length === 0 || !anyThumbnailLoaded) {
                groupBox.style.display = "none";
            }
        }, 300); 
    }
}
function renderVideos(){
    if(!videoList) return;
    videoList.innerHTML="";
    let anyThumbnailLoaded=false;
    videos.forEach((video,index)=>{
        const div=document.createElement("div");
        div.className="video-item";
        div.dataset.pid=video.pid;
        div.draggable=true;

        let thumbHTML = video.thumbnail? `<img src="${video.thumbnail}" class="thumbnail" onclick="openThumbnail(${index})">` : `<div class="spinner"></div>`;
        if(video.thumbnail) anyThumbnailLoaded=true;

        const formatOptions=video.formats? video.formats.map(f=>`<option value="${f.format_id}">${f.format_id} (${f.ext})${f.sizeStr?" - "+f.sizeStr:""}</option>`).join("") : "";
        const domain=video.domain||getDomainFromUrl(video.url);
        const durationLabel=video.duration? `<i class="bi bi-clock"></i> ${video.duration}<br><small><i class="bi bi-globe"></i> ${domain}</small>` : `<small><i class="bi bi-globe"></i> ${domain}</small>`;

        div.innerHTML=`
        <div class="thumbnail-container">${thumbHTML}<div class="thumb-progress-bar"></div></div>
        <div class="video-info">
            <strong>${escapeHtml(video.title)}</strong>
            <div class="status">${video.status||""}</div>
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
            <button class="download-btn" onclick="downloadVideo(${index})"><i class="bi bi-download"></i></button>
            <button class="stop-btn" onclick="stopDownload(${index})"><i class="bi bi-sign-stop"></i></button>
            <button class="remove-btn" onclick="removeVideo(${index})"><i class="bi bi-trash"></i></button>
            <button class="paste-btn" onclick="pasteLink(${index})"><i class="bi bi-link"></i></button>
            <button class="open-btn" onclick="openLink(${index})"><i class="bi bi-globe2"></i></button>
        </div>`;
        videoList.appendChild(div);
    });
    const totalCountContainer=document.getElementById("totalCountContainer");
    if(totalCountContainer) totalCountContainer.style.display=anyThumbnailLoaded?"block":"none";
    if(clearListBtn) clearListBtn.style.display=videos.length>0?"inline-block":"none";
    updateGroupBoxVisibility(anyThumbnailLoaded);
    addDragAndDropHandlers();
}

window.pasteLink = (index) => { urlArea.value = videos[index]?.url || ""; urlArea.focus(); };
window.openLink = (index) => { if(videos[index]) shell.openExternal(videos[index].url); };
window.openThumbnail = (index) => { if(videos[index]?.thumbnail) shell.openExternal(videos[index].thumbnail); };
window.setFormat = (index, formatId) => { if(videos[index]) videos[index].format = formatId; };


window.removeVideo = (index) => {
    if (!videos[index]) return;

    const container = document.getElementById(`player-container-${index}`);
    if (container) {
        const videoEl = container.querySelector("video");
        if (videoEl) {
            videoEl.pause();
            videoEl.currentTime = 0;
        }
    }

    if (clipboard.readText().trim() === videos[index].url) clipboard.writeText("");

    if (urlArea.value.trim() === videos[index].url) {
    }

    videos.splice(index, 1);
    renderVideos();
    saveSettingsToMain();
    updateVideoCount();
};

videos.forEach(video => {
    const domain = getDomainFromUrl(video.url);
    console.log(video.url, "→", domain);
});

if (urlArea) {
    urlArea.addEventListener("dragover", e => { e.preventDefault(); urlArea.style.border = "1px dashed #007ACC"; });
    urlArea.addEventListener("dragleave", e => { e.preventDefault(); urlArea.style.border = ""; });
    urlArea.addEventListener("drop", async e => {
        e.preventDefault();
        urlArea.style.border = "";

        const processUrls = async text => {
            const urls = [...new Set((text.match(/https?:\/\/[^\s"'<>]+/gi) || []).filter(isValidUrl))];
            if (!urls.length) return;

            logArea.innerHTML = `<i class="bi bi-hourglass-split"></i> Drag & drop upload…`;
            logArea.style.color = "#0080FF";

            for (let i = 0; i < urls.length; i++) {
                await addVideoOrPlaylist(urls[i]);
                await sleep(300);
               logArea.innerHTML = `<i class="bi bi-hourglass-split"></i> Add ${i + 1} di ${urls.length}…`;

            }

            logArea.innerHTML = `<i class="bi bi-check-circle"></i> Added ${urls.length} link!`;
            setTimeout(() => logArea.textContent = "", 5000);

            updateVideoCount();
        };


        if (e.dataTransfer.files.length > 0) {
            for (const file of e.dataTransfer.files) {
                const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
                if ([".txt", ".json", ".html", ".htm", ".md"].includes(ext)) {
                    const text = await file.text();
                    await processUrls(text);
                } else {
                    alert(`Drag a valid file (${[".txt", ".json", ".html", ".htm", ".md"].join(", ")}) with connections.`);
                }
            }
            return;
        }

        const textData = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
        if (textData) await processUrls(textData);
    });
}


function fetchVideoDetails(video){
    if(!binPaths?.ytDlp) return;
    const args=["-j", video.url];
    const proc=spawn(binPaths.ytDlp, args);
    let dataStr="";
    proc.stdout.on("data", chunk=>dataStr+=chunk.toString());
    proc.stderr.on("data", ()=>{});
    proc.on("close", ()=>{
        try{
            const info=JSON.parse(dataStr);
            video.title=info.title||video.title;
            video.thumbnail=info.thumbnail?.replace(/hqdefault/,'maxresdefault')||video.thumbnail;
            video.duration=info.duration?formatDuration(info.duration):(info.duration_string||"");
            video.formats=(info.formats||[]).map(f=>{
                let sizeStr="";
                const bytes=f.filesize||f.filesize_approx;
                if(bytes) sizeStr=bytes<1024*1024?(bytes/1024).toFixed(1)+" KB":bytes<1024*1024*1024?(bytes/(1024*1024)).toFixed(1)+" MB":(bytes/(1024*1024*1024)).toFixed(2)+" GB";
                return {...f,sizeStr};
            });
        }catch(e){ console.error("❗ Parsing info error:", e); }
        renderVideos();
    });
}

async function downloadSingleVideo(video) {
    if (!video) return;

    const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`);
    if (!videoDiv) return;

    const spinner = videoDiv.querySelector(".spinner");
    const statusText = videoDiv.querySelector(".status");
    const progressBar = videoDiv.querySelector(".thumb-progress-bar");
    const detailsText = videoDiv.querySelector(".download-details");

    if (spinner) spinner.style.display = "inline-block";
   if (statusText) statusText.innerHTML = `<i class="bi bi-hourglass-split"></i> Download in progress...`;

    if (progressBar) {
        progressBar.style.width = "0%";
        progressBar.style.backgroundColor = "#2196F3";
    }
    if (detailsText) detailsText.textContent = "";

    const extraArgs = video.extraArgs || "";

    const fileName = sanitizeFileName(video.title) || "video";

    try {
await ipcRenderer.invoke("start-download", {
    ...video,
    outputDir: downloadFolder || null,
    outputName: video.title, 
    audioOnly: audioOnlyChk.checked,
    playlist: playlistChk.checked,
	parallel: parallelChk.checked,
    format: video.format || null,
    extraArgs
});

       if (progressBar) progressBar.style.width = "100%";
       if (progressBar) progressBar.style.backgroundColor = "#4CAF50";
       if (statusText) statusText.innerHTML = `<i class="bi bi-check-circle"></i> Completed! ✅`;

       if (detailsText) detailsText.innerHTML = `<i class="bi bi-check-circle"></i> Completed! ✅`;


    } catch (err) {
        if (progressBar) progressBar.style.backgroundColor = "#F44336";

if (detailsText) detailsText.innerHTML = `<i class="bi bi-x-circle"></i> ${err.message || " Unknown error"}`;

        console.error(`❗ Downloading error ${video.url}:`, err);
    } finally {
        if (spinner) spinner.style.display = "none";
    }
}

function sanitizeFileName(name){
    return name.replace(/[\/\\?%*:|"<>]/g, '-');
}

window.downloadVideo = async (index) => {
    const video = videos[index];
    if (!video) return;
    await downloadSingleVideo(video);
};


async function downloadAllParallel() {
    if (videos.length === 0) return;

    const concurrency = 3; 
    downloadAllBtn.disabled = true;
    logArea.innerHTML = `<i class="bi bi-arrow-down-circle"></i> Download all videos in parallel...`;

    logArea.style.color = "#0080FF";

    for (let i = 0; i < videos.length; i += concurrency) {
        const batch = videos.slice(i, i + concurrency);
        await Promise.all(batch.map(video => downloadSingleVideo(video)));
    }

   logArea.innerHTML = `<i class="bi bi-check-circle"></i> All downloads completed! ✔️`;

    setTimeout(() => { logArea.textContent = ""; }, 5000);
    downloadAllBtn.disabled = false;
}


ipcRenderer.on("download-progress", (event, { url, data }) => {

    const video = videos.find(v => v.url === url);
    if (!video) return;

    const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`);
    if (!videoDiv) return;

    const progressBar = videoDiv.querySelector(".thumb-progress-bar");
    const detailsText = videoDiv.querySelector(".download-details");
    const statusText = videoDiv.querySelector(".status");
    const spinner = videoDiv.querySelector(".spinner");


    const percentMatch = data.match(/(\d+(\.\d+)?)%/);
    const percent = percentMatch ? parseFloat(percentMatch[1]) : video.progress || 0;

    const etaMatch = data.match(/ETA\s*([\d:]+)/);
    const eta = etaMatch ? etaMatch[1] : "";

    const speedMatch = data.match(/([\d\.]+[KMG]i?B\/s)/i);
    const speedStr = speedMatch ? speedMatch[0] : "";


    video.progress = percent;

    if (progressBar) {
        progressBar.style.width = percent + "%";
        progressBar.style.backgroundColor = percent < 100 ? "#2196F3" : "#4CAF50";
    }

if (detailsText) detailsText.innerHTML = `
<span class="progress-text">
  <div>${percent}%</div>
  <div><i class="bi bi-speedometer2" style="margin-right:5px;"></i>${speedStr}</div>
  <div><i class="bi bi-clock" style="margin-right:5px;"></i>${eta}</div>
</span>
`;

    if (statusText) {
        if (percent >= 100) {
            statusText.innerHTML = `<i class="bi bi-check-circle"></i> Completato ✅`;

            if (spinner) spinner.style.display = "none";
        } else {
            statusText.innerHTML = `<i class="bi bi-cloud-download-fill"></i> Download in progress...`;
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

    if (spinner) spinner.style.display = "none"; 
    if (progressBar) {
        progressBar.style.width = "100%";
        progressBar.style.backgroundColor = code === 0 ? "#4CAF50" : "#F44336";
    }
if (statusText) statusText.innerHTML = code === 0 
    ? `<i class="bi bi-check-circle"></i> Completato` 
    : `<i class="bi bi-x-circle"></i> Errore${error ? ": " + error : ""}`;

if (detailsText) detailsText.innerHTML = code === 0 
    ? `<i class="bi bi-download"></i>Completato ✅` 
    : `<i class="bi bi-exclamation-triangle"></i> ${error || " Unknown error"}`;

});


ipcRenderer.on("download-stopped",(event,{url})=>{
    const video = videos.find(v=>v.url===url); if(!video) return;
    const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`); if(!videoDiv) return;
    const progressBar = videoDiv.querySelector(".thumb-progress-bar");
    const statusText = videoDiv.querySelector(".status");
    const detailsText = videoDiv.querySelector(".download-details");
    const stopBtn = videoDiv.querySelector(".stop-btn");

    if(progressBar) progressBar.style.backgroundColor="#F44336";
if (statusText) statusText.innerHTML = `<i class="bi bi-slash-circle"></i> Interrupted`;
if (detailsText) detailsText.innerHTML = `<i class="bi bi-download"></i> Interrupted`;

});
//

let logTimeout = null; 

function showLog(message, color = "black", duration = 5000) {
    if (!logArea) return;

    logArea.innerHTML = message;
    logArea.style.color = color;

    if (logTimeout) clearTimeout(logTimeout);

    logTimeout = setTimeout(() => {
        logArea.textContent = "";
        logTimeout = null;
    }, duration);
}

pasteBtn.addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
            showLog(`<i class="bi bi-exclamation-triangle-fill"></i>⚠️ Clipboard vuota!`, "orange");
            return;
        }

        const urls = processTextInput(text).filter(isValidUrl);
        if (urls.length === 0) {
            showLog(`<i class="bi bi-exclamation-triangle-fill"></i> No valid link in the clipboard!`, "red");
            return;
        }

        showLog(`<i class="bi bi-hourglass-split"></i> Loading clipboard…`, "#0080FF");

        for (let i = 0; i < urls.length; i++) {
            await addVideoOrPlaylist(urls[i]);
            await sleep(300);
            showLog(`<i class="bi bi-hourglass-split"></i> Add ${i + 1} of ${urls.length}…`, "#0080FF", 2000);
        }

        showLog(`<i class="bi bi-check-circle"></i> Added ${urls.length} link from the clipboard!`, "green");

        updateVideoCount();

    } catch (err) {
        console.error("❗ Errore leggendo clipboard:", err);
        showLog(`<i class="bi bi-x-circle"></i> Unable to read clipboard.`, "red");
    }
});



downloadAllBtn?.addEventListener("click", async () => {
    if (!videos.length) return;

    if (parallelChk?.checked) {
        await downloadAllParallelLimit(3); 
    } else {
        await downloadAllSequential();
    }
});


urlArea.addEventListener("input", () => {
    urlArea.value = filterInvalidChars(urlArea.value);
    if (!urlArea.value.trim()) {
        logArea.textContent = "";
    }
});


async function downloadAllSequential() {
    showLog("⬇️ Start sequential download...", "orange");
    for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (v.status !== "completed") {
            await downloadVideo(i);
        }
    }
    showLog("All sequential downloads completed ✅", "green");
}

async function downloadAllParallelLimit(maxParallel = 3) {
    showLog(`Starting parallel download (max ${maxParallel})...`, "orange");

    const queue = [...videos];
    let active = 0;

    return new Promise(resolve => {
        function next() {
            if (!queue.length && active === 0) {
                showLog("All parallel downloads completed ✅", "green");
                return resolve();
            }

            while (active < maxParallel && queue.length) {
                const video = queue.shift();
                const index = videos.indexOf(video);
                if (index === -1) continue;

                active++;
                downloadVideo(index)
                    .finally(() => {
                        active--;
                        next();
                    });
            }
        }
        next();
    });
}

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
		parallel: parallelChk.checked,
        extraArgs: document.getElementById("extraArgsInput")?.value.trim() || ""
    };
}
function saveSettingsToMain() {
    if (!videos) videos = [];

    const options = {
        audioOnly: audioOnlyChk?.checked || false,
        playlist: playlistChk?.checked || false,
		parallel: parallelChk?.checked || false,
        extraArgs: document.getElementById("extraArgsInput")?.value.trim() || ""
    };

    const links = videos.map(video => ({
        url: video.url,
        title: video.title,
        thumbnail: video.thumbnail,
        duration: video.duration,
        format: video.format,
        extraArgs: video.extraArgs
    }));

    ipcRenderer.send("save-settings", {
        downloadFolder,
        options,
        links
    });
}


const updateBtn = document.getElementById("updateYtDlpBtn");
const updateLog = document.getElementById("updateLog");

updateBtn.addEventListener("click", async () => {
    updateBtn.disabled = true;
    updateBtn.textContent = "🔄 Update...";
    updateLog.textContent = "";

    try {
        const result = await ipcRenderer.invoke("update-yt-dlp");
       updateLog.innerHTML = result.output || `<i class="bi bi-check2-circle"></i> Update finished ✅`;


        setTimeout(() => {
            updateLog.textContent = "";
        }, 5000);

    } catch (err) {
       updateLog.innerHTML = `<i class="bi bi-x-circle"></i>❗ Error while updating: ${err.message}`;

        setTimeout(() => {
            updateLog.textContent = "";
        }, 5000);
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<i class="bi bi-arrow-up-circle"></i> YT-DLP Update🔄';
    }
});
//
const downloadBtn = document.getElementById("download-binaries");
const downloadBarInner = document.getElementById("download-bar-inner");
const downloadPercentInner = document.getElementById("download-percent-inner");
const downloadStatus = document.getElementById("download-status");



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
        if(downloadStatus) downloadStatus.innerText = `❗ Error: ${err}`;
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

    const barWidth = parseFloat(document.getElementById("download-bar-inner").style.width) || 0;
    setDownloadProgressInner(barWidth, msg);
});

ipcRenderer.on("download-binaries-progress", (event, { percent }) => {
    const currentMsg = document.getElementById("download-status").innerText || "⬇️ Download in progress...";
    setDownloadProgressInner(percent, currentMsg);
});

function toggleFormControls(disable = true) {
    const controls = document.querySelectorAll("button, input, select, textarea");
    controls.forEach(ctrl => ctrl.disabled = disable);
}

if (rechargeLinkBtn) {
  rechargeLinkBtn.addEventListener("click", async () => {
    try {
      toggleFormControls(true); 
      logArea.innerHTML = `<i class="bi bi-arrow-repeat"></i> Restarting links in progress...`;


      videos.forEach(video => ipcRenderer.send("stop-download", video.url));


      videos = [];
      renderVideos();
      updateVideoCount();


      if (folderInput) setFolderPath(downloadFolder || "");


      const settings = await ipcRenderer.invoke("get-settings");


      if (settings.options) {
        audioOnlyChk.checked = settings.options.audioOnly || false;
        playlistChk.checked = settings.options.playlist || false;
        parallelChk.checked = settings.options.parallel || false;
      }

      // Carica i video salvati
      const links = settings.links || [];

      if (links.length > 0) {
        logArea.innerHTML = `<i class="bi bi-arrow-repeat"></i> Reloading of ${links.length} saved videos...`;
        for (const v of links) {
          await addVideoOrPlaylist(v.url, v.extraArgs || "");


          const added = videos.find(x => x.url === v.url);
          if (added) {
            added.title = v.title || added.title;
            added.thumbnail = v.thumbnail || added.thumbnail;
            added.duration = v.duration || added.duration;
            added.format = v.format || added.format;
          }
        }
      }

      renderVideos();
      updateVideoCount();

      logArea.innerHTML = `<i class="bi bi-check-circle"></i> Links restarted and videos reloaded!`;
      setTimeout(() => { logArea.textContent = ""; }, 2500);

    } catch (err) {
      console.error("❗ Error loading:", err);
      logArea.innerHTML = `<i class="bi bi-x-circle"></i> Error while reloading!`;
      logArea.style.color = "red";
      setTimeout(() => { logArea.textContent = ""; logArea.style.color = ""; }, 3000);
    } finally {
      toggleFormControls(false); 
    }
  });
}


window.stopDownload = (index) => {
    const video = videos[index];
    if (!video) return;
    ipcRenderer.send("stop-download", video.url);

    video.status = '<i class="bi bi-slash-circle"></i> Stopped ⛔';

    const videoDiv = document.querySelector(`.video-item[data-pid="${video.pid}"]`);
    if (videoDiv) {
        const statusText = videoDiv.querySelector(".status");
        const detailsText = videoDiv.querySelector(".download-details");
        const progressBar = videoDiv.querySelector(".thumb-progress-bar");


        if(progressBar) progressBar.style.backgroundColor="#F44336";


        if(statusText) statusText.innerHTML = video.status;

        if(detailsText) detailsText.innerHTML = '<i class="bi bi-download"></i> Stopped ⛔';
    }
};

window.addVideo = addVideo;