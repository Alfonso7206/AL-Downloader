const { app, BrowserWindow, ipcMain, shell, Menu, nativeTheme, dialog } = require("electron");
const { spawn, exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const kill = require("tree-kill");
const extract = require("extract-zip");
const SETTINGS_PATH = path.join(app.getPath("userData"), "settings.json");

process.on("uncaughtException", (err) => {
    logError(`❓ Uncaught Exception: ${err.message}\n${err.stack}`);
});

process.on("unhandledRejection", (reason) => {
    logError(`Unhandled Rejection: ${reason}`);
});

let mainWindow;
let childProcesses = []; 
let activeDownloads = {};

let settings = {
    links: [],
    options: { audioOnly: false, playlist: false },
    downloadFolder: null,
    theme: "dark",
    extraArgs: ""
};


function logError(message) {
    const logFile = path.join(app.getPath("userData"), "error.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`, "utf8");
}

function getBinDir() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "app.asar.unpacked", "bin");
    } else {
        return path.join(__dirname, "bin");
    }
}
const ytDlpPath = path.join(getBinDir(), process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

function ensureYtDlpExists() {
    if (!fs.existsSync(ytDlpPath)) {
        const msg = `yt-dlp not found in: ${ytDlpPath}`;
        logError(msg);
        throw new Error(msg);
    }
}

function sanitizeSettings(s) {
    return {
        links: Array.isArray(s.links) ? s.links : [],
        options: s.options || { audioOnly: false, playlist: false },
        downloadFolder: s.downloadFolder || null,
        theme: ["dark","light"].includes(s.theme) ? s.theme : "dark",
        extraArgs: typeof s.extraArgs === "string" ? s.extraArgs : ""
    };
}

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const raw = fs.readFileSync(SETTINGS_PATH, "utf-8"); 
            const s = JSON.parse(raw);
            settings = sanitizeSettings(s);  
        } else saveSettings();
    } catch (e) {
        console.error("❗ Error loading settings:", e);
    }
}

function saveSettings() {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
    } catch (e) {
        console.error("❗ Error saving settings:", e);
    }
}

loadSettings();
nativeTheme.themeSource = settings.theme;

function sendToRenderer(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

function spawnProcess(command, args = [], options = {}) {
    const proc = spawn(command, args, options);
    childProcesses.push(proc);

    proc.on('exit', () => {
        const index = childProcesses.indexOf(proc);
        if (index > -1) childProcesses.splice(index, 1);
    });

    proc.on('error', err => {
        console.error('❗ Error process:', err);
    });

    return proc;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 1000,
		resizable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        backgroundColor: "#121212"
    });

    mainWindow.loadFile("index.html");
	mainWindow.webContents.on("context-menu", (e, params) => {
    Menu.buildFromTemplate([
    { role: "copy", label: "Copy   Ctrl + C" },
    { role: "paste", label: "Paste   Ctrl + V" },
    { role: "cut", label: "Cut   Ctrl + X" },
    { type: "separator" },
    { role: "selectAll", label: "SelectAll   Ctrl + A" }
  ]).popup();
});

 //mainWindow.webContents.openDevTools();
    Menu.setApplicationMenu(null);
    mainWindow.setMenuBarVisibility(false);

mainWindow.webContents.on("before-input-event", (event, input) => {
    if ((input.control || input.meta) && ["r", "i"].includes(input.key.toLowerCase())) {
        event.preventDefault();
    }
});

mainWindow.on("close", () => {
    killAllChildProcesses();
});
} 
app.whenReady().then(createWindow);


ipcMain.handle("get-settings", () => ({
    links: settings.links,
    options: settings.options,
    downloadFolder: settings.downloadFolder,
    theme: settings.theme,
    extraArgs: settings.extraArgs
}));

ipcMain.on("save-settings", (event, newSettings) => {
    if (typeof newSettings === "object") {
        if (Array.isArray(newSettings.links)) settings.links = newSettings.links;
        if (newSettings.options) settings.options = newSettings.options;
        if (newSettings.downloadFolder !== undefined) settings.downloadFolder = newSettings.downloadFolder;
        if (newSettings.theme) {
            settings.theme = newSettings.theme;
            nativeTheme.themeSource = settings.theme;
        }
        if (typeof newSettings.extraArgs === "string") settings.extraArgs = newSettings.extraArgs;
    }
    saveSettings();
});

ipcMain.handle("open-folder", async () => {
    const folder = settings.downloadFolder || app.getPath("downloads");
    const result = await shell.openPath(folder);
    if (result) console.error("❗ Error opening folder:", result);
    return folder;
});

ipcMain.handle("set-folder", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (!result.canceled && result.filePaths.length > 0) {
        settings.downloadFolder = result.filePaths[0];
        saveSettings();
        return settings.downloadFolder;
    }
    return null;
});

ipcMain.handle("save-download-folder", (event, folder) => {
    settings.downloadFolder = folder;
    saveSettings();
    return settings.downloadFolder;
});

ipcMain.handle("get-bin-paths", () => {
    const binDir = getBinDir();
    return {
        ytDlp: path.join(binDir, process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp"),
        ffmpeg: path.join(binDir, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
        ffprobe: path.join(binDir, process.platform === "win32" ? "ffprobe.exe" : "ffprobe")
    };
});

ipcMain.on("set-theme", (event, newTheme) => {
    settings.theme = newTheme;
    nativeTheme.themeSource = newTheme;
    saveSettings();
});

//

ipcMain.handle("yt-dlp-help", async () => {
  try {
    ensureYtDlpExists();
    return new Promise((resolve, reject) => {
      exec(`"${ytDlpPath}" -h`, { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) return reject(error.message);
        resolve(stdout || stderr); 
      });
    });
  } catch (err) {
    return Promise.reject(err.message);
  }
});

ipcMain.handle("yt-dlp-sites", async () => {
  try {
    ensureYtDlpExists();
    return new Promise((resolve, reject) => {
      exec(`"${ytDlpPath}" --list-extractors`, { windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) return reject(error.message);
        const extractors = (stdout || stderr).split(/\r?\n/).filter(Boolean);
        resolve(extractors.join("\n"));
      });
    });
  } catch (err) {
    return Promise.reject(err.message);
  }
});

//

ipcMain.handle("update-yt-dlp", async (event) => {
    try { ensureYtDlpExists(); } 
    catch (err) { return Promise.reject(err.message); }

    return new Promise((resolve, reject) => {
        const proc = spawn(ytDlpPath, ["-U"]);
        let output = "";

        proc.stdout.on("data", data => { output += data.toString(); event.sender.send("update-log", data.toString()); });
        proc.stderr.on("data", data => { output += data.toString(); event.sender.send("update-log", data.toString()); });

        proc.on("close", code => resolve({ code, output }));
        proc.on("error", err => { logError(`❗ Error update-yt-dlp: ${err.message}`); reject(err); });
    });
});



ipcMain.handle("download-binaries", async (event) => {
    const binFolder = getBinDir();

    try {
        if (fs.existsSync(binFolder)) {
            sendToRenderer("download-binaries-log", "🧹 Cleaning the binary folder...");
            fs.rmSync(binFolder, { recursive: true, force: true });
        }

        fs.mkdirSync(binFolder, { recursive: true });

        const ffZipPath = path.join(binFolder, "ffmpeg.zip");
        const tempFolder = path.join(binFolder, "ffmpeg-temp");

        sendToRenderer("download-binaries-log", "⬇️ Downloading FFmpeg/FFprobe ZIP...");
        await downloadFileWithRetry(
            "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip",
            ffZipPath
        );

        if (!fs.existsSync(ffZipPath) || fs.statSync(ffZipPath).size < 1024) {
            throw new Error("FFmpeg ZIP download failed or is incomplete.");
        }

        sendToRenderer("download-binaries-log", "🧪 Extracting FFmpeg/FFprobe...");
        await extract(ffZipPath, { dir: tempFolder });

        const extractedRoot = fs.readdirSync(tempFolder)
            .map(f => path.join(tempFolder, f))
            .find(f => fs.statSync(f).isDirectory());

        const internalBin = path.join(extractedRoot, "bin");
        const filesToMove = ["ffmpeg.exe", "ffprobe.exe"];

        for (const file of filesToMove) {
            const src = path.join(internalBin, file);
            const dest = path.join(binFolder, file);
            if (fs.existsSync(src)) fs.renameSync(src, dest);
        }

        if (fs.existsSync(ffZipPath)) fs.unlinkSync(ffZipPath);
        if (fs.existsSync(tempFolder)) fs.rmSync(tempFolder, { recursive: true, force: true });

        const ytdlpPath = path.join(binFolder, "yt-dlp.exe");
        sendToRenderer("download-binaries-log", "⬇️ Downloading yt-dlp...");
        await downloadFileWithRetry(
            "https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp.exe",
            ytdlpPath
        );

        if (!fs.existsSync(ytdlpPath) || fs.statSync(ytdlpPath).size < 1024) {
            throw new Error("yt-dlp download failed or is incomplete.");
        }

        sendToRenderer("download-binaries-log", "✅ All the tracks have been downloaded and ready!");
        return "Completed!";
    } catch (err) {
        logError(`❗ Download-binaries error: ${err.message}`);
        throw err;
    }
});



ipcMain.handle("start-download", (event, video) => startDownload(video));

ipcMain.on("stop-download", (event, url) => {
    const entry = activeDownloads[url];
    if (!entry) return;

    const proc = entry.proc;
    if (proc && !proc.killed) {
        kill(proc.pid, "SIGTERM", (err) => {
            if (err) console.error("❗ Error killing proc:", err);
            entry.status = 'Stopped';

            event.sender.send("download-stopped", { url });
            delete activeDownloads[url];
        });
    }
});

function startDownload(video) {
    try { 
        ensureYtDlpExists(); 
    } catch (err) {
        logError(`yt-dlp not found: ${err.message}`);
        sendToRenderer("download-complete", { url: video.url || "🕵️‍♂️ unknown", code: 1, error: err.message });
        return;
    }

    const outputDir = video.outputDir || settings.downloadFolder || app.getPath("downloads");
    const safeTitle = video.title.replace(/[<>:"/\\|?*]/g, "_");
    const outputTemplate = path.join(outputDir, `${safeTitle}.%(ext)s`);

const args = ["-o", outputTemplate];

if (video.audioOnly) {
    args.push(
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "192K"
    );
} else if (video.format) {
    args.push("-f", video.format);
} else {
    args.push("-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]");
}

if (video.playlist) {
    args.push("--yes-playlist");
} else {
    args.push("--no-playlist");
}

    if (video.extraArgs) {
        const parsedArgs = video.extraArgs.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        args.push(...parsedArgs);
    }

    const downloadUrl = video.urlHls || video.url;
    if (!downloadUrl) {
        logError(`Download failed: URL not defined for ${video.title}`);
        sendToRenderer("download-complete", { url: video.url || "unknown", code: 1, error: "⚠️ URL not defined" });
        return;
    }
    args.push(downloadUrl);

    try {
        const proc = spawnProcess(ytDlpPath, args, { windowsHide: true });
        activeDownloads[video.url] = { proc, meta: { url: video.url, pid: proc.pid } };

        proc.stdout.on("data", chunk => sendToRenderer("download-progress", { url: video.url, data: chunk.toString() }));
        proc.stderr.on("data", chunk => sendToRenderer("download-progress", { url: video.url, data: chunk.toString() }));

        proc.on("close", code => {
            delete activeDownloads[video.url];
            sendToRenderer("download-complete", { url: video.url, code });
        });
    } catch (e) {
        logError(`Errore startDownload per ${video.url}: ${e.message}`);
        sendToRenderer("download-complete", { url: video.url, code: 1, error: e.message });
    }
}


async function downloadFile(url, dest) {
    const writer = fs.createWriteStream(dest);
    const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
        timeout: 60000, 
    });

    const total = parseInt(response.headers["content-length"], 10) || 0;
    let downloaded = 0;

    response.data.on("data", chunk => {
        downloaded += chunk.length;
        const percent = total ? Math.round((downloaded / total) * 100) : 0;
        sendToRenderer("download-binaries-progress", { percent });
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("error", err => {
            writer.close(() => reject(err));
        });

        writer.on("finish", () => {
            writer.close(async () => {
                try {
                    const stats = fs.statSync(dest);
                    if (stats.size < 1024) {
                        fs.unlinkSync(dest);
                        return reject(new Error("ERROR❗  Downloaded file is empty or incomplete."));
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });
    });
}


async function downloadFileWithRetry(url, dest, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try { 
            return await downloadFile(url, dest); 
        } catch(e) { 
            if (i === retries - 1) throw e; 
        }
    }
}


function killAllChildProcesses() {
    [...childProcesses, ...Object.values(activeDownloads).map(e => e.proc)].forEach(proc => {
        if (proc && !proc.killed) {
            try { kill(proc.pid, "SIGKILL"); } catch (e) {}
        }
    });
    childProcesses = [];
    activeDownloads = {};
}

app.on("window-all-closed", () => {
    killAllChildProcesses();
    app.quit(); 
});
