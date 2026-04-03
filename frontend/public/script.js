const canvas = document.getElementById("visualizerCanvas");
const ctx = canvas.getContext("2d");

const sourceSelect = document.getElementById("sourceSelect");
const modeSelect = document.getElementById("modeSelect");
const volumeSlider = document.getElementById("volumeSlider");
const sensitivitySlider = document.getElementById("sensitivitySlider");
const startBtn = document.getElementById("startBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const snapshotBtn = document.getElementById("snapshotBtn");
const hudResizeHandle = document.getElementById("hudResizeHandle");
const visualizerArea = document.querySelector(".visualizer-area");
const logoutBtn = document.getElementById("logoutBtn");
const sidebarLogoutBtn = document.getElementById("sidebarLogoutBtn");
const presetNameInput = document.getElementById("presetNameInput");
const presetSelect = document.getElementById("presetSelect");
const savePresetBtn = document.getElementById("savePresetBtn");
const applyPresetBtn = document.getElementById("applyPresetBtn");
const deletePresetBtn = document.getElementById("deletePresetBtn");
const startSessionBtn = document.getElementById("startSessionBtn");
const stopSessionBtn = document.getElementById("stopSessionBtn");
const exportSessionBtn = document.getElementById("exportSessionBtn");
const sessionInfo = document.getElementById("sessionInfo");
const sessionChart = document.getElementById("sessionChart");
const sessionCtx = sessionChart ? sessionChart.getContext("2d") : null;
const detailStatsChart = document.getElementById("detailStatsChart");
const detailStatsCtx = detailStatsChart ? detailStatsChart.getContext("2d") : null;

const bassValue = document.getElementById("bassValue");
const midValue = document.getElementById("midValue");
const trebleValue = document.getElementById("trebleValue");
const bassBar = document.getElementById("bassBar");
const midBar = document.getElementById("midBar");
const trebleBar = document.getElementById("trebleBar");
const dominantFreqValue = document.getElementById("dominantFreqValue");
const pitchValue = document.getElementById("pitchValue");
const centroidValue = document.getElementById("centroidValue");
const rolloffValue = document.getElementById("rolloffValue");
const rmsValue = document.getElementById("rmsValue");
const zcrValue = document.getElementById("zcrValue");
const fluxValue = document.getElementById("fluxValue");
const dynamicRangeValue = document.getElementById("dynamicRangeValue");
const bpmValue = document.getElementById("bpmValue");
const keyValue = document.getElementById("keyValue");
const moodValue = document.getElementById("moodValue");
const grooveValue = document.getElementById("grooveValue");
const lastMomentValue = document.getElementById("lastMomentValue");
const momentList = document.getElementById("momentList");
const exportInsightsBtn = document.getElementById("exportInsightsBtn");

const uploadInput = document.getElementById("uploadInput");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");
const uploadBox = document.getElementById("uploadBox");
const adminUsersBox = document.getElementById("adminUsersBox");
const userList = document.getElementById("userList");
const selectedUserInfo = document.getElementById("selectedUserInfo");
const fileListTitle = document.getElementById("fileListTitle");
const fileList = document.getElementById("fileList");
const fileSearchInput = document.getElementById("fileSearchInput");
const fileSortSelect = document.getElementById("fileSortSelect");
const libraryStats = document.getElementById("libraryStats");

const analyticsBox = document.getElementById("analyticsBox");
const analyticsUsers = document.getElementById("analyticsUsers");
const analyticsFiles = document.getElementById("analyticsFiles");
const analyticsAudio = document.getElementById("analyticsAudio");
const analyticsVideo = document.getElementById("analyticsVideo");
const analyticsRecent = document.getElementById("analyticsRecent");
const analyticsTopUploader = document.getElementById("analyticsTopUploader");

const welcomeUser = document.getElementById("welcomeUser");
const topUserName = document.getElementById("topUserName");
const statusText = document.getElementById("statusText");
const fpsStat = document.getElementById("fpsStat");
const levelStat = document.getElementById("levelStat");
const beatStat = document.getElementById("beatStat");

const appState = {
    audioContext: null,
    analyser: null,
    gainNode: null,
    sourceNode: null,
    mediaStream: null,
    mediaElement: null,
    animationId: null,
    frequencyData: null,
    waveformData: null,
    mode: "bars",
    sensitivity: 1.5,
    isRunning: false,
    isPaused: false,
    currentInput: "mic",
    currentUser: null,
    selectedAdminUser: null,
    selectedFile: null,
    filesCache: [],
    usersCache: [],
    filteredFilesCache: [],
    mediaObjectUrl: null,
    hue: 185,
    fps: 0,
    lastTime: performance.now(),
    searchQuery: "",
    fileSort: "recent",
    beatUntil: 0,
    previousLevel: 0,
    autoModeIndex: 0,
    lastAutoModeSwitch: 0
    ,
    presetsCache: [],
    sessionRecording: false,
    sessionStartedAt: 0,
    sessionMetrics: [],
    lastSessionSampleAt: 0,
    beatCount: 0,
    wasBeatLastFrame: false,
    lastCompletedSession: null,
    prevFrequencyFrame: null,
    detailedHistory: [],
    beatTimestamps: [],
    bpmEstimate: 0,
    keyEstimate: "--",
    keyConfidence: 0,
    grooveStability: 0,
    mood: "--",
    moments: [],
    lastMomentAt: 0,
    insightStartAt: 0,
    lastMomentLabel: "None",
    chromaHistory: [],
    hudHeightPx: 340,
    isHudResizing: false
};

function clampHudHeight(height, areaHeight) {
    const min = 180;
    const max = Math.max(240, areaHeight - 160);
    return Math.max(min, Math.min(max, height));
}

function applyHudHeight() {
    document.documentElement.style.setProperty("--hud-height-px", `${Math.round(appState.hudHeightPx)}px`);
}

function updateHudHeightFromPointer(clientY) {
    if (!visualizerArea) {
        return;
    }

    const rect = visualizerArea.getBoundingClientRect();
    const desired = clientY - rect.top - 6;
    appState.hudHeightPx = clampHudHeight(desired, rect.height);
    applyHudHeight();
}

function setCanvasPixelSize(canvasEl, cssHeight) {
    if (!canvasEl) {
        return;
    }

    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(canvasEl.clientWidth * ratio));
    const height = Math.max(1, Math.floor(cssHeight * ratio));

    if (canvasEl.width !== width || canvasEl.height !== height) {
        canvasEl.width = width;
        canvasEl.height = height;
    }
}

function requireLogin() {
    const rawAuth = localStorage.getItem("authUser");
    if (rawAuth) {
        try {
            const parsed = JSON.parse(rawAuth);
            if (parsed && parsed.username) {
                return {
                    username: parsed.username,
                    role: parsed.role || "student"
                };
            }
        } catch (error) {
            // Ignore invalid JSON and fall back to older key.
        }
    }

    const usernameOnly = localStorage.getItem("loggedInUser");
    if (usernameOnly) {
        return { username: usernameOnly, role: "student" };
    }

    if (!usernameOnly) {
        window.location.href = "/login.html";
        return null;
    }

    return { username: usernameOnly, role: "student" };
}

function updateStatus(text) {
    statusText.textContent = text;
}

function getAuthHeaders() {
    if (!appState.currentUser) {
        return {};
    }

    return {
        "x-auth-user": appState.currentUser.username,
        "x-auth-role": appState.currentUser.role
    };
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    setCanvasPixelSize(sessionChart, 130);
    setCanvasPixelSize(detailStatsChart, 120);

    if (visualizerArea) {
        appState.hudHeightPx = clampHudHeight(appState.hudHeightPx, visualizerArea.clientHeight);
        applyHudHeight();
    }
}

function createAudioGraph() {
    appState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    appState.analyser = appState.audioContext.createAnalyser();
    appState.gainNode = appState.audioContext.createGain();

    appState.analyser.fftSize = 2048;
    appState.analyser.smoothingTimeConstant = 0.82;

    appState.frequencyData = new Uint8Array(appState.analyser.frequencyBinCount);
    appState.waveformData = new Uint8Array(appState.analyser.fftSize);
    appState.gainNode.gain.value = Number(volumeSlider.value);
}

function disconnectCurrentSource() {
    if (appState.sourceNode) {
        try {
            appState.sourceNode.disconnect();
        } catch (error) {
            console.warn("Could not disconnect source node:", error);
        }
        appState.sourceNode = null;
    }

    if (appState.mediaElement) {
        appState.mediaElement.pause();
        appState.mediaElement.src = "";
        if (appState.mediaElement.dataset.hiddenVideo === "true") {
            appState.mediaElement.remove();
        }
        appState.mediaElement = null;
    }

    if (appState.mediaObjectUrl) {
        URL.revokeObjectURL(appState.mediaObjectUrl);
        appState.mediaObjectUrl = null;
    }

    if (appState.mediaStream) {
        appState.mediaStream.getTracks().forEach((track) => track.stop());
        appState.mediaStream = null;
    }
}

async function setupMicrophone() {
    disconnectCurrentSource();
    updateStatus("Requesting microphone access...");

    appState.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    appState.sourceNode = appState.audioContext.createMediaStreamSource(appState.mediaStream);

    // Microphone input is analyzed without output to speakers to avoid feedback loop.
    appState.sourceNode.connect(appState.gainNode);
    appState.gainNode.connect(appState.analyser);

    appState.currentInput = "mic";
    updateStatus("Microphone visualizing");
}

async function setupLibraryAudio(fileEntry) {
    disconnectCurrentSource();

    if (appState.currentUser && appState.currentUser.role === "admin") {
        updateStatus("Admin can manage files but cannot listen");
        return;
    }

    const encoded = encodeURIComponent(fileEntry.filename);
    const mediaResponse = await fetch(`/media/${encoded}`, {
        headers: getAuthHeaders()
    });
    if (!mediaResponse.ok) {
        const data = await mediaResponse.json().catch(() => ({}));
        throw new Error(data.message || "Could not load media");
    }

    const mediaBlob = await mediaResponse.blob();
    const mediaUrl = URL.createObjectURL(mediaBlob);
    appState.mediaObjectUrl = mediaUrl;
    const name = fileEntry.originalName || fileEntry.filename;
    const mediaType = fileEntry.mediaType || "";
    const isVideo =
        mediaType.startsWith("video/") ||
        /\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(name);

    if (isVideo) {
        const hiddenVideo = document.createElement("video");
        hiddenVideo.src = mediaUrl;
        hiddenVideo.loop = true;
        hiddenVideo.preload = "auto";
        hiddenVideo.playsInline = true;
        hiddenVideo.crossOrigin = "anonymous";
        hiddenVideo.style.display = "none";
        hiddenVideo.dataset.hiddenVideo = "true";
        document.body.appendChild(hiddenVideo);
        appState.mediaElement = hiddenVideo;
    } else {
        appState.mediaElement = new Audio(mediaUrl);
        appState.mediaElement.crossOrigin = "anonymous";
        appState.mediaElement.loop = true;
    }

    appState.mediaElement.loop = true;

    appState.sourceNode = appState.audioContext.createMediaElementSource(appState.mediaElement);
    appState.sourceNode.connect(appState.gainNode);
    appState.gainNode.connect(appState.analyser);
    appState.gainNode.connect(appState.audioContext.destination);

    await appState.mediaElement.play();

    appState.currentInput = "library";
    appState.selectedFile = fileEntry;
    if (isVideo) {
        updateStatus(`Playing audio from video: ${name}`);
    } else {
        updateStatus(`Playing ${name}`);
    }
}

function clearCanvas(alpha = 0.18) {
    ctx.fillStyle = `rgba(4, 11, 20, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function getAudioMetrics() {
    appState.analyser.getByteFrequencyData(appState.frequencyData);
    appState.analyser.getByteTimeDomainData(appState.waveformData);

    let sum = 0;
    for (let i = 0; i < appState.frequencyData.length; i += 1) {
        sum += appState.frequencyData[i];
    }

    const avg = sum / appState.frequencyData.length;
    const intensity = Math.min(1, (avg / 255) * appState.sensitivity);
    return { avg, intensity };
}

function detectBeat(avg, now) {
    const threshold = Math.max(36, appState.previousLevel * 1.2);
    const isBeat = avg > threshold;
    if (isBeat) {
        appState.beatUntil = now + 140;
    }
    appState.previousLevel = avg * 0.45 + appState.previousLevel * 0.55;
    return now < appState.beatUntil;
}

function updateSessionInfo(text) {
    if (sessionInfo) {
        sessionInfo.textContent = text;
    }
}

function collectSessionMetric(now, avg, intensity, beat) {
    if (!appState.sessionRecording) {
        return;
    }

    if (appState.lastSessionSampleAt && now - appState.lastSessionSampleAt < 220) {
        return;
    }

    appState.lastSessionSampleAt = now;
    appState.sessionMetrics.push({
        t: Math.max(0, now - appState.sessionStartedAt),
        avg,
        intensity,
        beat: beat ? 1 : 0,
        fps: appState.fps,
        mode: appState.mode,
        input: appState.currentInput
    });

    drawSessionTimeline();
}

function drawSessionTimeline() {
    if (!sessionCtx || !sessionChart) {
        return;
    }

    const width = sessionChart.width;
    const height = sessionChart.height;
    sessionCtx.clearRect(0, 0, width, height);
    sessionCtx.fillStyle = "rgba(5, 15, 24, 0.9)";
    sessionCtx.fillRect(0, 0, width, height);

    const data = appState.sessionMetrics;
    if (!data.length) {
        sessionCtx.fillStyle = "rgba(159, 179, 207, 0.8)";
        sessionCtx.font = "12px Space Grotesk";
        sessionCtx.fillText("Session timeline appears here after recording starts", 14, 22);
        return;
    }

    const maxT = Math.max(1, data[data.length - 1].t);
    const levelBase = height - 14;
    const levelHeight = height - 24;

    sessionCtx.beginPath();
    sessionCtx.lineWidth = 2;
    sessionCtx.strokeStyle = "rgba(77, 224, 255, 0.95)";
    data.forEach((point, idx) => {
        const x = (point.t / maxT) * (width - 12) + 6;
        const y = levelBase - (point.avg / 255) * levelHeight;
        if (idx === 0) {
            sessionCtx.moveTo(x, y);
        } else {
            sessionCtx.lineTo(x, y);
        }
    });
    sessionCtx.stroke();

    sessionCtx.fillStyle = "rgba(126, 255, 199, 0.9)";
    data.forEach((point) => {
        if (point.beat !== 1) {
            return;
        }
        const x = (point.t / maxT) * (width - 12) + 6;
        sessionCtx.fillRect(x - 1, 4, 2, 8);
    });
}

function bandEnergy(minHz, maxHz, binHz) {
    if (!appState.frequencyData || appState.frequencyData.length === 0) {
        return 0;
    }

    const start = Math.max(0, Math.floor(minHz / binHz));
    const end = Math.min(appState.frequencyData.length - 1, Math.ceil(maxHz / binHz));
    if (end < start) {
        return 0;
    }

    let sum = 0;
    let count = 0;
    for (let i = start; i <= end; i += 1) {
        sum += appState.frequencyData[i];
        count += 1;
    }

    return count > 0 ? sum / count / 255 : 0;
}

function frequencyToNoteLabel(freq) {
    if (!Number.isFinite(freq) || freq < 20) {
        return "--";
    }

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const noteName = noteNames[(midi + 1200) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${noteName}${octave}`;
}

function computeDetailedAudioStats() {
    if (!appState.analyser || !appState.frequencyData || !appState.waveformData) {
        return null;
    }

    const sampleRate = appState.audioContext ? appState.audioContext.sampleRate : 44100;
    const fftSize = appState.analyser.fftSize || 2048;
    const binHz = sampleRate / fftSize;

    const bass = bandEnergy(20, 140, binHz);
    const lowMid = bandEnergy(140, 450, binHz);
    const mid = bandEnergy(400, 2000, binHz);
    const presence = bandEnergy(2000, 4500, binHz);
    const treble = bandEnergy(2000, 12000, binHz);
    const ultraHigh = bandEnergy(7000, 16000, binHz);

    let peakIndex = 0;
    let peakValue = 0;
    let weightedSum = 0;
    let totalMagnitude = 0;
    let logSum = 0;
    let activePeaks = 0;
    let broadEnergyBins = 0;
    const peakThreshold = 145;
    const broadThreshold = 58;

    for (let i = 0; i < appState.frequencyData.length; i += 1) {
        const magnitude = appState.frequencyData[i];
        if (magnitude > peakValue) {
            peakValue = magnitude;
            peakIndex = i;
        }

        if (magnitude >= peakThreshold) {
            activePeaks += 1;
        }

        if (magnitude >= broadThreshold) {
            broadEnergyBins += 1;
        }

        totalMagnitude += magnitude;
        weightedSum += magnitude * i * binHz;
        logSum += Math.log(magnitude + 1);
    }

    const dominantFreq = peakIndex * binHz;
    const spectralCentroid = totalMagnitude > 0 ? weightedSum / totalMagnitude : 0;
    const arithmeticMean = totalMagnitude / Math.max(1, appState.frequencyData.length);
    const geometricMean = Math.exp(logSum / Math.max(1, appState.frequencyData.length)) - 1;
    const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

    const rolloffTarget = totalMagnitude * 0.85;
    let cumulative = 0;
    let spectralRolloff = 0;
    for (let i = 0; i < appState.frequencyData.length; i += 1) {
        cumulative += appState.frequencyData[i];
        if (cumulative >= rolloffTarget) {
            spectralRolloff = i * binHz;
            break;
        }
    }

    let sumSquares = 0;
    let zeroCrossings = 0;
    let prevValue = (appState.waveformData[0] - 128) / 128;
    for (let i = 0; i < appState.waveformData.length; i += 1) {
        const normalized = (appState.waveformData[i] - 128) / 128;
        sumSquares += normalized * normalized;
        if (i > 0 && ((normalized >= 0 && prevValue < 0) || (normalized < 0 && prevValue >= 0))) {
            zeroCrossings += 1;
        }
        prevValue = normalized;
    }

    const rms = Math.sqrt(sumSquares / appState.waveformData.length);
    const zcr = zeroCrossings / Math.max(1, appState.waveformData.length - 1);

    let flux = 0;
    if (appState.prevFrequencyFrame) {
        for (let i = 0; i < appState.frequencyData.length; i += 1) {
            const diff = appState.frequencyData[i] - appState.prevFrequencyFrame[i];
            if (diff > 0) {
                flux += diff;
            }
        }
        flux = flux / (appState.frequencyData.length * 255);
    }
    appState.prevFrequencyFrame = new Uint8Array(appState.frequencyData);

    const dynamicRange = Math.max(0, peakValue / 255 - rms);
    const peakDensity = activePeaks / Math.max(1, appState.frequencyData.length);
    const broadEnergyRatio = broadEnergyBins / Math.max(1, appState.frequencyData.length);

    return {
        bass,
        lowMid,
        mid,
        presence,
        treble,
        ultraHigh,
        dominantFreq,
        pitch: frequencyToNoteLabel(dominantFreq),
        spectralCentroid,
        spectralRolloff,
        rms,
        zcr,
        flux,
        dynamicRange,
        spectralFlatness,
        peakDensity,
        broadEnergyRatio
    };
}

function estimateKeyFromSpectrum(sampleRate, fftSize) {
    if (!appState.frequencyData) {
        return { label: "--", confidence: 0 };
    }

    const chroma = new Array(12).fill(0);
    const binHz = sampleRate / fftSize;

    for (let i = 1; i < appState.frequencyData.length; i += 1) {
        const freq = i * binHz;
        if (freq < 40 || freq > 5000) {
            continue;
        }

        const mag = appState.frequencyData[i];
        if (mag < 22) {
            continue;
        }

        const midi = Math.round(69 + 12 * Math.log2(freq / 440));
        const pc = ((midi % 12) + 12) % 12;
        chroma[pc] += mag;
    }

    appState.chromaHistory.push(chroma);
    if (appState.chromaHistory.length > 18) {
        appState.chromaHistory.shift();
    }

    const smooth = new Array(12).fill(0);
    appState.chromaHistory.forEach((row) => {
        for (let i = 0; i < 12; i += 1) {
            smooth[i] += row[i];
        }
    });

    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    const scoreFor = (root, profile) => {
        let score = 0;
        for (let i = 0; i < 12; i += 1) {
            score += smooth[i] * profile[(i - root + 12) % 12];
        }
        return score;
    };

    let best = { label: "--", score: 0 };
    let second = 0;
    for (let root = 0; root < 12; root += 1) {
        const maj = scoreFor(root, majorProfile);
        const min = scoreFor(root, minorProfile);
        if (maj > best.score) {
            second = best.score;
            best = { label: `${names[root]} major`, score: maj };
        } else if (maj > second) {
            second = maj;
        }

        if (min > best.score) {
            second = best.score;
            best = { label: `${names[root]} minor`, score: min };
        } else if (min > second) {
            second = min;
        }
    }

    const confidence = best.score > 0 ? Math.min(1, (best.score - second) / best.score) : 0;
    return { label: best.label, confidence };
}

function updateBpmFromBeats(now, beatOnset) {
    if (!beatOnset) {
        return appState.bpmEstimate;
    }

    appState.beatTimestamps.push(now);
    if (appState.beatTimestamps.length > 28) {
        appState.beatTimestamps.shift();
    }

    if (appState.beatTimestamps.length < 4) {
        return appState.bpmEstimate;
    }

    const intervals = [];
    for (let i = 1; i < appState.beatTimestamps.length; i += 1) {
        const dt = appState.beatTimestamps[i] - appState.beatTimestamps[i - 1];
        if (dt > 250 && dt < 2000) {
            intervals.push(dt);
        }
    }

    if (intervals.length < 3) {
        return appState.bpmEstimate;
    }

    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    const bpm = 60000 / median;

    if (!Number.isFinite(bpm) || bpm < 40 || bpm > 220) {
        return appState.bpmEstimate;
    }

    appState.bpmEstimate = appState.bpmEstimate
        ? appState.bpmEstimate * 0.75 + bpm * 0.25
        : bpm;

    const mean = intervals.reduce((acc, item) => acc + item, 0) / intervals.length;
    const variance = intervals.reduce((acc, item) => acc + (item - mean) ** 2, 0) / intervals.length;
    const cv = Math.sqrt(variance) / Math.max(1, mean);
    appState.grooveStability = Math.max(0, Math.min(1, 1 - cv * 3));

    return appState.bpmEstimate;
}

function classifyMood(avg, stats) {
    if (avg > 155 || (stats && stats.flux > 0.11)) {
        return "High Energy";
    }
    if (avg > 105) {
        return stats && stats.spectralCentroid > 2400 ? "Bright Groove" : "Groovy";
    }
    if (avg > 60) {
        return "Balanced";
    }
    return "Calm / Ambient";
}

function detectMoments(now, avg, stats, beatOnset) {
    if (!stats || now - appState.lastMomentAt < 2800) {
        return;
    }

    let label = "";
    if (avg > 168 && stats.flux > 0.12) {
        label = "Energy Drop";
    } else if (avg < 42 && stats.flux < 0.035) {
        label = "Breakdown";
    } else if (beatOnset && stats.dynamicRange > 0.2) {
        label = "Strong Hit";
    }

    if (!label) {
        return;
    }

    appState.lastMomentAt = now;
    const elapsed = appState.insightStartAt ? Math.max(0, now - appState.insightStartAt) : 0;
    const seconds = (elapsed / 1000).toFixed(1);
    const entry = {
        timeSec: Number(seconds),
        label,
        level: Number(avg.toFixed(1))
    };

    appState.lastMomentLabel = `${label} @ ${seconds}s`;
    appState.moments.unshift(entry);
    if (appState.moments.length > 12) {
        appState.moments.pop();
    }
}

function renderMoments() {
    if (!momentList) {
        return;
    }

    momentList.innerHTML = "";
    if (appState.moments.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No moments detected yet";
        momentList.appendChild(li);
        return;
    }

    appState.moments.slice(0, 6).forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `${item.label} at ${item.timeSec}s (level ${item.level})`;
        momentList.appendChild(li);
    });
}

function updateInsightsUI() {
    bpmValue.textContent = appState.bpmEstimate > 0 ? `${Math.round(appState.bpmEstimate)} BPM` : "--";

    if (appState.keyConfidence > 0.08) {
        keyValue.textContent = `${appState.keyEstimate} (${Math.round(appState.keyConfidence * 100)}%)`;
    } else {
        keyValue.textContent = "Uncertain";
    }

    moodValue.textContent = appState.mood;
    grooveValue.textContent = `${Math.round(appState.grooveStability * 100)}%`;
    lastMomentValue.textContent = appState.lastMomentLabel;
    renderMoments();
}

function updateMusicInsights(now, avg, stats, beatOnset) {
    if (!stats || !appState.audioContext || !appState.analyser) {
        return;
    }

    updateBpmFromBeats(now, beatOnset);
    const key = estimateKeyFromSpectrum(appState.audioContext.sampleRate, appState.analyser.fftSize || 2048);
    appState.keyEstimate = key.label;
    appState.keyConfidence = key.confidence;
    appState.mood = classifyMood(avg, stats);
    detectMoments(now, avg, stats, beatOnset);
    updateInsightsUI();
}

function exportInsights() {
    const payload = {
        exportedAt: new Date().toISOString(),
        bpmEstimate: Number(appState.bpmEstimate.toFixed(2)),
        keyEstimate: appState.keyEstimate,
        keyConfidence: Number(appState.keyConfidence.toFixed(3)),
        mood: appState.mood,
        grooveStability: Number(appState.grooveStability.toFixed(3)),
        moments: appState.moments,
        source: appState.currentInput,
        mode: appState.mode
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const link = document.createElement("a");
    link.href = url;
    link.download = `music-insights-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    updateStatus("Insights exported");
}


function updateDetailedStatsUI(stats) {
    if (!stats) {
        return;
    }

    bassValue.textContent = `${(stats.bass * 100).toFixed(1)}%`;
    midValue.textContent = `${(stats.mid * 100).toFixed(1)}%`;
    trebleValue.textContent = `${(stats.treble * 100).toFixed(1)}%`;
    bassBar.style.width = `${Math.min(100, stats.bass * 100)}%`;
    midBar.style.width = `${Math.min(100, stats.mid * 100)}%`;
    trebleBar.style.width = `${Math.min(100, stats.treble * 100)}%`;

    dominantFreqValue.textContent = `${stats.dominantFreq.toFixed(1)} Hz`;
    pitchValue.textContent = stats.pitch;
    centroidValue.textContent = `${stats.spectralCentroid.toFixed(1)} Hz`;
    rolloffValue.textContent = `${stats.spectralRolloff.toFixed(1)} Hz`;
    rmsValue.textContent = stats.rms.toFixed(3);
    zcrValue.textContent = stats.zcr.toFixed(4);
    fluxValue.textContent = stats.flux.toFixed(3);
    dynamicRangeValue.textContent = stats.dynamicRange.toFixed(3);
}

function drawDetailedStatsChart(stats) {
    if (!detailStatsCtx || !detailStatsChart || !stats) {
        return;
    }

    appState.detailedHistory.push({
        bass: stats.bass,
        mid: stats.mid,
        treble: stats.treble,
        rms: stats.rms
    });
    if (appState.detailedHistory.length > 180) {
        appState.detailedHistory.shift();
    }

    const width = detailStatsChart.width;
    const height = detailStatsChart.height;
    detailStatsCtx.clearRect(0, 0, width, height);
    detailStatsCtx.fillStyle = "rgba(4, 14, 24, 0.92)";
    detailStatsCtx.fillRect(0, 0, width, height);

    const drawLine = (key, color, scale = 1) => {
        detailStatsCtx.beginPath();
        detailStatsCtx.lineWidth = 2;
        detailStatsCtx.strokeStyle = color;
        appState.detailedHistory.forEach((point, index) => {
            const x = appState.detailedHistory.length <= 1
                ? 0
                : (index / (appState.detailedHistory.length - 1)) * (width - 1);
            const y = height - point[key] * scale * (height - 6) - 3;
            if (index === 0) {
                detailStatsCtx.moveTo(x, y);
            } else {
                detailStatsCtx.lineTo(x, y);
            }
        });
        detailStatsCtx.stroke();
    };

    drawLine("bass", "rgba(77, 224, 255, 0.95)");
    drawLine("mid", "rgba(255, 215, 122, 0.95)");
    drawLine("treble", "rgba(126, 255, 199, 0.95)");
    drawLine("rms", "rgba(255, 143, 143, 0.82)", 1.2);
}

function buildSessionSummary() {
    if (!appState.sessionMetrics.length) {
        return null;
    }

    const first = appState.sessionMetrics[0];
    const last = appState.sessionMetrics[appState.sessionMetrics.length - 1];
    const durationMs = Math.max(0, last.t - first.t);
    let sum = 0;
    let peak = 0;
    appState.sessionMetrics.forEach((point) => {
        sum += point.avg;
        peak = Math.max(peak, point.avg);
    });

    const avgLevel = Number((sum / appState.sessionMetrics.length).toFixed(2));
    return {
        startedAt: new Date(appState.sessionStartedAt).toISOString(),
        endedAt: new Date().toISOString(),
        durationMs,
        avgLevel,
        peakLevel: Number(peak.toFixed(2)),
        beatCount: appState.beatCount,
        sampleCount: appState.sessionMetrics.length,
        inputSource: appState.currentInput,
        mode: appState.mode,
        metrics: appState.sessionMetrics
    };
}

async function startSessionRecording() {
    appState.sessionRecording = true;
    appState.sessionStartedAt = Date.now();
    appState.sessionMetrics = [];
    appState.lastSessionSampleAt = 0;
    appState.beatCount = 0;
    appState.lastCompletedSession = null;
    updateSessionInfo("Recording session...");
    drawSessionTimeline();
}

async function stopSessionRecording() {
    if (!appState.sessionRecording) {
        updateSessionInfo("No active session");
        return;
    }

    appState.sessionRecording = false;
    const summary = buildSessionSummary();
    appState.lastCompletedSession = summary;

    if (!summary) {
        updateSessionInfo("Session stopped (no samples)");
        return;
    }

    updateSessionInfo(
        `Session: ${(summary.durationMs / 1000).toFixed(1)}s, avg ${summary.avgLevel}, beats ${summary.beatCount}`
    );

    try {
        await fetch("/sessions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders()
            },
            body: JSON.stringify(summary)
        });
    } catch (error) {
        // Keep local summary even if persistence fails.
    }
}

function exportSessionJson() {
    if (!appState.lastCompletedSession) {
        updateSessionInfo("No finished session to export");
        return;
    }

    const blob = new Blob([JSON.stringify(appState.lastCompletedSession, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const link = document.createElement("a");
    link.href = url;
    link.download = `session-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function currentPresetPayload() {
    return {
        mode: modeSelect.value,
        volume: Number(volumeSlider.value),
        sensitivity: Number(sensitivitySlider.value),
        source: sourceSelect.value
    };
}

function populatePresetSelect() {
    if (!presetSelect) {
        return;
    }

    presetSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Saved presets";
    presetSelect.appendChild(placeholder);

    appState.presetsCache.forEach((preset) => {
        const option = document.createElement("option");
        option.value = String(preset.id);
        option.textContent = preset.name;
        presetSelect.appendChild(option);
    });
}

async function fetchPresets() {
    const response = await fetch("/presets", {
        headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load presets");
    }
    appState.presetsCache = data.presets || [];
    populatePresetSelect();
}

async function savePreset() {
    const name = String(presetNameInput.value || "").trim();
    if (!name) {
        updateStatus("Enter a preset name");
        return;
    }

    const response = await fetch("/presets", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders()
        },
        body: JSON.stringify({
            name,
            settings: currentPresetPayload()
        })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        updateStatus(data.message || "Could not save preset");
        return;
    }

    presetNameInput.value = "";
    await fetchPresets();
    updateStatus(`Preset saved: ${name}`);
}

function applyPreset() {
    const selectedId = Number(presetSelect.value);
    if (!selectedId) {
        updateStatus("Choose a preset to apply");
        return;
    }

    const preset = appState.presetsCache.find((item) => item.id === selectedId);
    if (!preset || !preset.settings) {
        updateStatus("Invalid preset");
        return;
    }

    const settings = preset.settings;
    if (settings.mode) {
        modeSelect.value = settings.mode;
    }
    if (typeof settings.volume === "number") {
        volumeSlider.value = String(settings.volume);
    }
    if (typeof settings.sensitivity === "number") {
        sensitivitySlider.value = String(settings.sensitivity);
    }
    if (settings.source && appState.currentUser && appState.currentUser.role !== "admin") {
        sourceSelect.value = settings.source;
    }

    updateHUD();
    updateStatus(`Preset applied: ${preset.name}`);
}

async function deletePreset() {
    const selectedId = Number(presetSelect.value);
    if (!selectedId) {
        updateStatus("Choose a preset to delete");
        return;
    }

    const response = await fetch(`/presets/${selectedId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        updateStatus(data.message || "Could not delete preset");
        return;
    }

    await fetchPresets();
    updateStatus("Preset deleted");
}

function resolveModeForFrame(avg, now) {
    if (appState.mode !== "auto") {
        return appState.mode;
    }

    if (now - appState.lastAutoModeSwitch < 2200) {
        return ["bars", "circular", "wave"][appState.autoModeIndex];
    }

    if (avg > 142) {
        appState.autoModeIndex = 1;
    } else if (avg > 94) {
        appState.autoModeIndex = 0;
    } else {
        appState.autoModeIndex = 2;
    }

    appState.lastAutoModeSwitch = now;
    return ["bars", "circular", "wave"][appState.autoModeIndex];
}

function drawBars(intensity) {
    const barCount = 110;
    const step = Math.floor(appState.frequencyData.length / barCount);
    const width = canvas.width / barCount;

    for (let i = 0; i < barCount; i += 1) {
        const value = appState.frequencyData[i * step] / 255;
        const barHeight = value * canvas.height * 0.82 * appState.sensitivity;
        const x = i * width;
        const y = canvas.height - barHeight;

        const hue = (appState.hue + i * 1.4) % 360;
        ctx.fillStyle = `hsl(${hue}, 82%, ${45 + intensity * 20}%)`;
        ctx.fillRect(x, y, Math.max(2, width - 2), barHeight);
    }
}

function drawCircular(intensity) {
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.58;
    const radius = Math.min(canvas.width, canvas.height) * 0.145;
    const points = 180;
    const step = Math.floor(appState.frequencyData.length / points);
    const safeMargin = 24;
    const maxReach = Math.min(
        cx - safeMargin,
        canvas.width - cx - safeMargin,
        cy - safeMargin,
        canvas.height - cy - safeMargin
    );

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < points; i += 1) {
        const angle = (Math.PI * 2 * i) / points;
        const value = appState.frequencyData[i * step] / 255;
        const rawSpike = value * (145 * appState.sensitivity);
        const spikeLimit = Math.max(18, maxReach - radius);
        const spike = Math.min(rawSpike, spikeLimit);

        const x1 = Math.cos(angle) * radius;
        const y1 = Math.sin(angle) * radius;
        const x2 = Math.cos(angle) * (radius + spike);
        const y2 = Math.sin(angle) * (radius + spike);

        ctx.strokeStyle = `hsla(${(appState.hue + i * 2.2) % 360}, 100%, ${50 + intensity * 25}%, 0.92)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle = `hsla(${appState.hue}, 95%, ${40 + intensity * 30}%, 0.2)`;
    ctx.arc(0, 0, radius * 0.84, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawWaveform(intensity) {
    ctx.beginPath();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = `hsl(${appState.hue}, 100%, ${56 + intensity * 20}%)`;

    const slice = canvas.width / appState.waveformData.length;
    // Shift waveform lower so it stays visible below the top HUD overlay.
    const waveCenterY = canvas.height * 0.62;
    const waveAmplitude = canvas.height * 0.34;
    let x = 0;

    for (let i = 0; i < appState.waveformData.length; i += 1) {
        const v = appState.waveformData[i] / 128;
        const y = waveCenterY + (v - 1) * waveAmplitude;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        x += slice;
    }

    ctx.lineTo(canvas.width, waveCenterY);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = `hsla(${(appState.hue + 45) % 360}, 100%, 68%, 0.46)`;

    x = 0;
    for (let i = 0; i < appState.waveformData.length; i += 2) {
        const v = appState.waveformData[i] / 128;
        const y = waveCenterY + (v - 1) * waveAmplitude + Math.sin(i * 0.03 + performance.now() * 0.002) * 8;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        x += slice * 2;
    }

    ctx.stroke();
}

function drawVisualizerFrame() {
    if (!appState.isRunning || !appState.analyser) {
        return;
    }

    const now = performance.now();
    const delta = now - appState.lastTime;
    appState.lastTime = now;
    appState.fps = Math.round(1000 / Math.max(1, delta));

    clearCanvas();
    const { avg, intensity } = getAudioMetrics();
    const detailStats = computeDetailedAudioStats();
    const beat = detectBeat(avg, now);
    const activeMode = resolveModeForFrame(avg, now);
    const beatOnset = beat && !appState.wasBeatLastFrame;
    if (beatOnset) {
        appState.beatCount += 1;
    }
    appState.wasBeatLastFrame = beat;
    appState.hue = (appState.hue + 0.6 + intensity * 1.5) % 360;
    document.documentElement.style.setProperty("--audio-pulse", String(intensity.toFixed(3)));
    collectSessionMetric(now, avg, intensity, beat);
    updateDetailedStatsUI(detailStats);
    drawDetailedStatsChart(detailStats);
    updateMusicInsights(now, avg, detailStats, beatOnset);

    if (activeMode === "bars") {
        drawBars(intensity);
    } else if (activeMode === "circular") {
        drawCircular(intensity);
    } else {
        drawWaveform(intensity);
    }

    fpsStat.textContent = `FPS: ${appState.fps}`;
    levelStat.textContent = `Level: ${avg.toFixed(1)}`;
    beatStat.textContent = beat ? "Beat: detected" : "Beat: steady";
    appState.animationId = requestAnimationFrame(drawVisualizerFrame);
}

async function setupAudio() {
    if (!appState.audioContext) {
        createAudioGraph();
    }

    if (appState.audioContext.state === "suspended") {
        await appState.audioContext.resume();
    }

    if (sourceSelect.value === "mic") {
        await setupMicrophone();
    } else {
        if (appState.currentUser && appState.currentUser.role === "admin") {
            updateStatus("Admin can manage files but cannot listen");
            return;
        }

        if (!appState.selectedFile) {
            updateStatus("Select a file from the library first");
            return;
        }
        await setupLibraryAudio(appState.selectedFile);
    }

    appState.mode = modeSelect.value;
    appState.sensitivity = Number(sensitivitySlider.value);
    appState.isRunning = true;
    appState.isPaused = false;
    appState.lastTime = performance.now();
    if (!appState.insightStartAt) {
        appState.insightStartAt = performance.now();
    }

    cancelAnimationFrame(appState.animationId);
    drawVisualizerFrame();
}

async function togglePlayPause() {
    if (!appState.audioContext) {
        updateStatus("Press Start first");
        return;
    }

    if (!appState.isPaused) {
        if (appState.currentInput === "library" && appState.mediaElement) {
            appState.mediaElement.pause();
        }
        await appState.audioContext.suspend();
        appState.isPaused = true;
        updateStatus("Paused");
    } else {
        await appState.audioContext.resume();
        if (appState.currentInput === "library" && appState.mediaElement) {
            await appState.mediaElement.play();
        }
        appState.isPaused = false;
        updateStatus("Running");
        drawVisualizerFrame();
    }
}

function updateHUD() {
    appState.mode = modeSelect.value;
    appState.sensitivity = Number(sensitivitySlider.value);

    if (appState.gainNode) {
        appState.gainNode.gain.value = Number(volumeSlider.value);
    }
}

function getFilteredAndSortedFiles() {
    const query = appState.searchQuery.trim().toLowerCase();
    let files = [...appState.filesCache];

    if (query) {
        files = files.filter((fileEntry) => {
            const text = `${fileEntry.originalName || ""} ${fileEntry.filename || ""}`.toLowerCase();
            return text.includes(query);
        });
    }

    if (appState.fileSort === "name") {
        files.sort((a, b) => {
            const nameA = (a.originalName || a.filename || "").toLowerCase();
            const nameB = (b.originalName || b.filename || "").toLowerCase();
            return nameA.localeCompare(nameB);
        });
    } else if (appState.fileSort === "type") {
        files.sort((a, b) => {
            const typeA = (a.mediaType || "").toLowerCase();
            const typeB = (b.mediaType || "").toLowerCase();
            return typeA.localeCompare(typeB);
        });
    } else {
        files.sort((a, b) => {
            const aTime = new Date(a.uploadTime || 0).getTime();
            const bTime = new Date(b.uploadTime || 0).getTime();
            return bTime - aTime;
        });
    }

    appState.filteredFilesCache = files;
    libraryStats.textContent = `${files.length} shown / ${appState.filesCache.length} total`;
    return files;
}

async function switchInputIfRunning() {
    if (!appState.isRunning || !appState.audioContext) {
        return;
    }
    await setupAudio();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
            updateStatus("Fullscreen not supported here");
        });
        return;
    }
    document.exitFullscreen();
}

async function fetchFiles() {
    let url = "/files";
    if (appState.currentUser && appState.currentUser.role === "admin" && appState.selectedAdminUser) {
        url = `/files?owner=${encodeURIComponent(appState.selectedAdminUser)}`;
    }

    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load file list");
    }

    appState.filesCache = data.files || [];
    renderFileList();
}

function renderFileList() {
    fileList.innerHTML = "";
    const displayFiles = getFilteredAndSortedFiles();

    if (displayFiles.length === 0) {
        const empty = document.createElement("li");
        empty.className = "file-item";
        empty.textContent = appState.filesCache.length === 0
            ? "No uploaded files yet."
            : "No files match the current search.";
        fileList.appendChild(empty);
        return;
    }

    displayFiles.forEach((fileEntry) => {
        const item = document.createElement("li");
        item.className = "file-item";

        const name = document.createElement("strong");
        name.className = "file-name";
        name.textContent = fileEntry.originalName || fileEntry.filename;

        const owner = fileEntry.uploadedBy || "-";
        const meta = document.createElement("span");
        meta.className = "file-meta";
        const dateText = fileEntry.uploadTime ? new Date(fileEntry.uploadTime).toLocaleString() : "-";
        meta.textContent = `${dateText} • ${owner}`;

        const actions = document.createElement("div");
        actions.className = "file-actions";

        const playBtn = document.createElement("button");
        playBtn.className = "btn btn-sm";
        playBtn.textContent = "Play";
        const isAdmin = appState.currentUser && appState.currentUser.role === "admin";
        if (isAdmin) {
            playBtn.disabled = true;
            playBtn.style.opacity = "0.5";
            playBtn.title = "Admin cannot listen to files";
        }
        playBtn.addEventListener("click", async () => {
            if (appState.currentUser && appState.currentUser.role === "admin") {
                updateStatus("Admin can manage files but cannot listen");
                return;
            }

            appState.selectedFile = fileEntry;
            sourceSelect.value = "library";
            updateStatus(`Selected: ${fileEntry.originalName || fileEntry.filename}`);
            try {
                await switchInputIfRunning();
            } catch (error) {
                updateStatus("Could not play selected file");
            }
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-danger btn-sm";
        deleteBtn.textContent = "Delete";
        deleteBtn.title = "Delete this file";
        deleteBtn.addEventListener("click", async () => {
            const ok = confirm("Delete this file?");
            if (!ok) {
                return;
            }

            try {
                const response = await fetch(`/file/${encodeURIComponent(fileEntry.filename)}`, {
                    method: "DELETE",
                    headers: getAuthHeaders()
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Delete failed");
                }

                if (appState.selectedFile && appState.selectedFile.filename === fileEntry.filename) {
                    disconnectCurrentSource();
                    appState.selectedFile = null;
                    appState.currentInput = "mic";
                    sourceSelect.value = "mic";
                    updateStatus("Deleted selected file. Switched to microphone mode");
                }

                await fetchFiles();
            } catch (error) {
                updateStatus(error.message);
            }
        });

        if (!isAdmin) {
            actions.append(playBtn);
        }

        actions.append(deleteBtn);
        item.append(name, meta, actions);
        fileList.appendChild(item);
    });
}

function renderAnalytics(stats) {
    analyticsUsers.textContent = String(stats.totalUsers ?? "-");
    analyticsFiles.textContent = String(stats.totalFiles ?? "-");
    analyticsAudio.textContent = String(stats.audioCount ?? "-");
    analyticsVideo.textContent = String(stats.videoCount ?? "-");
    analyticsRecent.textContent = String(stats.recentUploads ?? "-");
    analyticsTopUploader.textContent = stats.topUploader || "-";
}

async function fetchAnalytics() {
    if (!appState.currentUser || appState.currentUser.role !== "admin") {
        return;
    }

    let url = "/analytics";
    if (appState.selectedAdminUser) {
        url += `?owner=${encodeURIComponent(appState.selectedAdminUser)}`;
    }

    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load analytics");
    }

    renderAnalytics(data.stats || {});
}

function saveSnapshot() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `visualizer-${stamp}.png`;
    link.click();
    updateStatus("Snapshot saved");
}

async function fetchUsers() {
    const response = await fetch("/users", {
        headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load users");
    }

    appState.usersCache = data.users || [];
    renderUserList();
}

function renderUserList() {
    userList.innerHTML = "";

    const nonAdminUsers = appState.usersCache.filter((item) => item.username !== "admin");
    if (nonAdminUsers.length === 0) {
        const empty = document.createElement("li");
        empty.className = "file-item";
        empty.textContent = "No users yet";
        userList.appendChild(empty);
        return;
    }

    nonAdminUsers.forEach((user) => {
        const row = document.createElement("li");
        row.className = "user-item";

        // Add selected class if this user is currently selected
        if (appState.selectedAdminUser === user.username) {
            row.classList.add("selected");
        }

        const userBtn = document.createElement("button");
        userBtn.className = "user-name-btn";
        userBtn.textContent = `${user.username}`;
        userBtn.addEventListener("click", async () => {
            appState.selectedAdminUser = user.username;
            selectedUserInfo.textContent = `Files for ${user.username}`;
            fileListTitle.textContent = `Files of ${user.username}`;

            // Update UI to show selected state
            document.querySelectorAll(".user-item").forEach((item) => {
                item.classList.remove("selected");
            });
            row.classList.add("selected");

            try {
                await fetchFiles();
                await fetchAnalytics();
            } catch (error) {
                updateStatus(error.message);
            }
        });

        const deleteUserBtn = document.createElement("button");
        deleteUserBtn.className = "btn btn-danger btn-sm";
        deleteUserBtn.textContent = "Delete";
        deleteUserBtn.title = `Delete user ${user.username}`;
        deleteUserBtn.addEventListener("click", async () => {
            const ok = confirm(`Delete user "${user.username}" and all their files?`);
            if (!ok) {
                return;
            }

            try {
                const response = await fetch(`/user/${encodeURIComponent(user.username)}`, {
                    method: "DELETE",
                    headers: getAuthHeaders()
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Delete user failed");
                }

                if (appState.selectedAdminUser === user.username) {
                    appState.selectedAdminUser = null;
                    fileListTitle.textContent = "User Files";
                    selectedUserInfo.textContent = "Select a user to view files";
                    appState.filesCache = [];
                    renderFileList();
                }

                await fetchUsers();
                await fetchAnalytics();
                updateStatus(`Deleted ${user.username}`);
            } catch (error) {
                updateStatus(error.message);
            }
        });

        row.append(userBtn, deleteUserBtn);
        userList.appendChild(row);
    });
}

function applyRoleLayout() {
    const isAdmin = appState.currentUser && appState.currentUser.role === "admin";
    document.body.classList.toggle("admin-view", isAdmin);

    uploadBox.classList.toggle("hidden-panel", isAdmin);
    adminUsersBox.classList.toggle("hidden-panel", !isAdmin);
    analyticsBox.classList.toggle("hidden-panel", !isAdmin);

    // Admin uses sidebar logout and top HUD logout is hidden.
    logoutBtn.classList.toggle("hidden-panel", isAdmin);
    sidebarLogoutBtn.classList.toggle("hidden-panel", !isAdmin);

    if (isAdmin) {
        sourceSelect.value = "mic";
        sourceSelect.disabled = true;
        fileListTitle.textContent = "User Files";
    } else {
        sourceSelect.disabled = false;
        fileListTitle.textContent = "Uploaded Files";
    }
}

async function uploadAudioFile() {
    if (!uploadInput.files || uploadInput.files.length === 0) {
        uploadStatus.textContent = "Choose an audio or video file first";
        return;
    }

    const chosen = uploadInput.files[0];
    uploadStatus.textContent = `Uploading ${chosen.name}...`;

    const formData = new FormData();
    formData.append("audio", chosen);

    try {
        const response = await fetch("/upload", {
            method: "POST",
            headers: getAuthHeaders(),
            body: formData
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || "Upload failed");
        }

        uploadStatus.textContent = "Upload successful";
        uploadInput.value = "";
        await fetchFiles();
        await fetchAnalytics();
    } catch (error) {
        uploadStatus.textContent = error.message;
    }
}

function logoutUser() {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("authUser");
    window.location.href = "/login.html";
}

function setupEvents() {
    window.addEventListener("resize", resizeCanvas);

    if (hudResizeHandle) {
        hudResizeHandle.addEventListener("mousedown", (event) => {
            appState.isHudResizing = true;
            document.body.classList.add("resizing-hud");
            updateHudHeightFromPointer(event.clientY);
        });

        window.addEventListener("mousemove", (event) => {
            if (!appState.isHudResizing) {
                return;
            }
            updateHudHeightFromPointer(event.clientY);
        });

        window.addEventListener("mouseup", () => {
            if (!appState.isHudResizing) {
                return;
            }
            appState.isHudResizing = false;
            document.body.classList.remove("resizing-hud");
        });
    }

    startBtn.addEventListener("click", async () => {
        try {
            await setupAudio();
        } catch (error) {
            console.error(error);
            updateStatus("Audio setup failed. Check mic permission or selected file.");
        }
    });

    playPauseBtn.addEventListener("click", async () => {
        try {
            await togglePlayPause();
        } catch (error) {
            console.error(error);
            updateStatus("Unable to play/pause");
        }
    });

    fullscreenBtn.addEventListener("click", toggleFullscreen);
    snapshotBtn.addEventListener("click", saveSnapshot);
    savePresetBtn.addEventListener("click", async () => {
        try {
            await savePreset();
        } catch (error) {
            updateStatus("Could not save preset");
        }
    });
    applyPresetBtn.addEventListener("click", applyPreset);
    deletePresetBtn.addEventListener("click", async () => {
        try {
            await deletePreset();
        } catch (error) {
            updateStatus("Could not delete preset");
        }
    });
    startSessionBtn.addEventListener("click", async () => {
        await startSessionRecording();
    });
    stopSessionBtn.addEventListener("click", async () => {
        await stopSessionRecording();
    });
    exportSessionBtn.addEventListener("click", exportSessionJson);
    exportInsightsBtn.addEventListener("click", exportInsights);
    logoutBtn.addEventListener("click", logoutUser);
    sidebarLogoutBtn.addEventListener("click", logoutUser);
    uploadBtn.addEventListener("click", uploadAudioFile);

    sourceSelect.addEventListener("change", async () => {
        updateHUD();
        try {
            await switchInputIfRunning();
        } catch (error) {
            console.error(error);
            updateStatus("Input switch failed");
        }
    });

    modeSelect.addEventListener("change", updateHUD);
    sensitivitySlider.addEventListener("input", updateHUD);
    volumeSlider.addEventListener("input", updateHUD);
    fileSearchInput.addEventListener("input", () => {
        appState.searchQuery = fileSearchInput.value || "";
        renderFileList();
    });
    fileSortSelect.addEventListener("change", () => {
        appState.fileSort = fileSortSelect.value;
        renderFileList();
    });
}

async function init() {
    const auth = requireLogin();
    if (!auth) {
        return;
    }

    appState.currentUser = auth;
    welcomeUser.textContent = `User: ${auth.username} (${auth.role})`;
    topUserName.textContent = `${auth.username} (${auth.role})`;
    applyRoleLayout();

    if (visualizerArea) {
        appState.hudHeightPx = clampHudHeight(340, visualizerArea.clientHeight || 680);
        applyHudHeight();
    }

    resizeCanvas();
    updateHUD();
    setupEvents();
    clearCanvas(1);
    drawSessionTimeline();
    updateInsightsUI();
    updateStatus("Idle - choose source and press Start");

    try {
        if (auth.role === "admin") {
            await fetchUsers();
            appState.filesCache = [];
            renderFileList();
            await fetchAnalytics();
            updateStatus("Select a user to view and manage files");
        } else {
            await fetchFiles();
            await fetchPresets();
        }
    } catch (error) {
        updateStatus(error.message || "Could not load data");
    }
}

init();