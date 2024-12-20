const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const fpsDisplay = document.getElementById('fpsDisplay');
const eyeStateElement = document.getElementById('eyeState');

//眠気検出用の変数
var EarThreshold = 0.5; // 目を閉じているとみなす閾値
var CheckInterval = 5; // 眠気をチェックするインターバル[s]
let BlinkDatas = []; //瞬きデータを保持する { timestamp, duration } のオブジェクト配列
let EarLeftDatas = []; //EARの配列
let EarRightDatas = []; //EARの配列
let BlinkStartTime = null; // 瞬き開始時刻
let BlinkDurations = [];   // 瞬きの継続時間リスト
let DurMean = 0.0;
var DurCri = 130.0;
let Long10 = 0.0;
let SleapnessC = 0.0;
let SleapnessD = 0.0;
let CheckSleapness = false;// 眠気をチェックするかのフラグ
let isCalibrating = false;
let CalibrationStartTime = null; // キャリブレーション開始時刻
let CalibrationTime = 10000;
var EarScaleFactor = 4.0;
var EarShiftFactor = 0.0;

// EAR計算用の目のランドマークインデックス
const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

// FPS計算用の変数
let FrameCount = 0;
let LastTimestamp = performance.now();

// 初期設定の読み込み
document.addEventListener("DOMContentLoaded", () => {
    const savedDurCri = localStorage.getItem("DurCri");
    const defaultDurCri = savedDurCri ? parseFloat(savedDurCri) : 100; // 保存された値、またはデフォルト値
    document.getElementById("durCriSlider").value = defaultDurCri;
    document.getElementById("durCriValue").value = defaultDurCri;
    DurCri = defaultDurCri;
    console.log(`Loaded DurCri: ${DurCri}`);

    const savedEarThr = localStorage.getItem("EarThreshold");
    const defaultEarThr = savedEarThr ? parseFloat(savedEarThr) : 0.5; // 保存された値、またはデフォルト値
    document.getElementById("earThrSlider").value = defaultEarThr;
    document.getElementById("earThrValue").value = defaultEarThr;
    window['EarThreshold'] = defaultEarThr;
    console.log(`Loaded EAR_THRESHOLD: ${EarThreshold}`);

    const savedEarScale = localStorage.getItem("EarScaleFactor");
    const defaultEarScale = savedEarScale ? parseFloat(savedEarScale) : 0.4; // 保存された値、またはデフォルト値
    document.getElementById("earScaleSlider").value = defaultEarScale;
    document.getElementById("earScaleValue").value = defaultEarScale;
    window['EarScaleFactor'] = defaultEarScale;
    console.log(`Loaded EarScaleFactor: ${EarScaleFactor}`);

    const savedEarShift = localStorage.getItem("EarShiftFactor");
    const defaultEarShift = savedEarShift ? parseFloat(savedEarShift) : 0.0; // 保存された値、またはデフォルト値
    document.getElementById("earShiftSlider").value = defaultEarShift;
    document.getElementById("earShiftValue").value = defaultEarShift;
    window['EarShiftFactor'] = defaultEarShift;
    console.log(`Loaded EarShiftFactor: ${EarShiftFactor}`);
});

// 汎用的なスライダーとテキストボックスの同期関数
function updateValue(elementId, value, variableName) {
    const element = document.getElementById(elementId);
    if (element) {
        element.value = value; // 対象の要素を更新
    }
    window[variableName] = parseFloat(value); // グローバル変数を更新
    saveToLocalStorage(variableName, window[variableName]); // 保存関数を呼び出し
}

// 汎用的なローカルストレージ保存関数
function saveToLocalStorage(key, value) {
    localStorage.setItem(key, value);
    console.log(`Saved ${key}: ${value}`);
}

// タブの切り替え処理
function openTab(tabId) {
    // タブのコンテンツを非表示
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.style.display = 'none');

    // 全てのボタンのアクティブクラスを削除
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    // 選択されたタブを表示
    document.getElementById(tabId).style.display = 'flex';

    // 選択されたボタンにアクティブクラスを追加
    event.currentTarget.classList.add('active');
}

function startCalibration() {
    isCalibrating = true;
}

// グリッドを更新
function updateBlinkDataGrid() {
    const grid = document.getElementById('blinkDataGrid');
    grid.innerHTML = ''; // 既存のグリッド内容をクリア

    // グリッドのヘッダーを作成
    const headerRow = document.createElement('div');
    headerRow.style.display = 'grid';
    headerRow.style.gridTemplateColumns = '1fr 1fr';
    headerRow.style.fontWeight = 'bold';
    headerRow.style.backgroundColor = '#ddd';
    headerRow.style.borderBottom = '2px solid #aaa';

    const timeHeader = document.createElement('div');
    timeHeader.textContent = 'Time';
    timeHeader.style.padding = '5px';
    timeHeader.style.textAlign = 'center';

    const durationHeader = document.createElement('div');
    durationHeader.textContent = 'Duration';
    durationHeader.style.padding = '5px';
    durationHeader.style.textAlign = 'center';

    headerRow.appendChild(timeHeader);
    headerRow.appendChild(durationHeader);
    grid.appendChild(headerRow);

    // 瞬目データを逆順で表示
    BlinkDatas.slice().reverse().forEach((data) => {
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr';
        row.style.borderBottom = '1px solid #ddd';

        // タイムスタンプを日本時間でフォーマット
        const time = new Intl.DateTimeFormat('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(data.timestamp);

        const duration = `${Math.round(data.duration * 100) / 100} ms`;

        const timeCell = document.createElement('div');
        timeCell.textContent = time;
        timeCell.style.padding = '5px';
        timeCell.style.textAlign = 'center';

        const durationCell = document.createElement('div');
        durationCell.textContent = duration;
        durationCell.style.padding = '5px';
        durationCell.style.textAlign = 'center';

        row.appendChild(timeCell);
        row.appendChild(durationCell);
        grid.appendChild(row);
    });
}

// 瞬き時間を追跡
function trackBlink(avgEAR, timestamp) {
    const FIVE_MINUTES = 5 * 60 * 1000; // 5分のミリ秒
    const currentTime = Date.now(); // 現在の時刻

    // 古いデータを削除（5分以上前のデータを除外）
    BlinkDatas = BlinkDatas.filter(data => currentTime - data.timestamp <= FIVE_MINUTES);

    if (BlinkDatas.length === 10 && CheckSleapness === false) {
        CheckSleapness = true;
    }

    if (avgEAR <= EarThreshold) {
        // 目が閉じ始めた場合
        if (BlinkStartTime === null) {
            BlinkStartTime = timestamp; // 瞬き開始時間を記録
        }
    }
    else {
        // 目が開いた場合
        if (BlinkStartTime !== null) {
            const blinkDuration = timestamp - BlinkStartTime; // 瞬きの継続時間を計算
            BlinkDatas.push({ timestamp: currentTime, duration: blinkDuration }); // データを配列に追加
            blinktimeDisplay.textContent = `BlinkTime: ${Math.round(blinkDuration * 100) / 100} ms`;
            BlinkStartTime = null; // 瞬き状態をリセット

            // グリッドを更新
            updateBlinkDataGrid();
        }
    }

    DurMean = calculateDurMean(BlinkDatas);

    if (isCalibrating === false) {
        Long10 = calculateLong10(BlinkDatas);
        if (CheckSleapness === true) {
            SleapnessC = calculateSleapnessC(Long10);
            SleapnessD = calculateSleapnessD(DurMean);
        }
    }
    else {
        if (CalibrationStartTime === null) {
            document.getElementById('calibratingMessage').style.display = 'flex';
            document.getElementById('calibrationButton').disabled = true;
            CalibrationStartTime = timestamp; // キャリブレーション開始時間を記録
        }

        const calibElapsedTime = timestamp - CalibrationStartTime;
        calibratingMessage.innerHTML = `Calibration in progress...<br>(${Math.round((calibElapsedTime / CalibrationTime) * 100)} %)`;

        if (calibElapsedTime >= 10000) {

            DurCri = DurMean;
            updateValue('durCriSlider', DurCri, 'DurCri');
            updateValue('durCriValue', DurCri, 'DurCri');

            // 最大値を取得
            const maxEar = (Math.max(...EarLeftDatas) + Math.max(...EarRightDatas)) / 2;
            // 最小値を取得
            const minEar = (Math.min(...EarLeftDatas) + Math.min(...EarRightDatas)) / 2;

            EarLeftDatas.length = 0;
            EarRightDatas.length = 0;

            EarScaleFactor = 1 / (maxEar - minEar);
            updateValue('earScaleSlider', EarScaleFactor, 'EarScaleFactor');
            updateValue('earScaleValue', EarScaleFactor, 'EarScaleFactor');
            EarShiftFactor = -minEar * EarScaleFactor;
            updateValue('earShiftSlider', EarShiftFactor, 'EarShiftFactor');
            updateValue('earShiftValue', EarShiftFactor, 'EarShiftFactor');

            CalibrationStartTime = null;
            isCalibrating = false;
            document.getElementById('calibratingMessage').style.display = 'none';
            document.getElementById('calibrationButton').disabled = false;
        }

    }
}

// EARを計算
function calculateEAR(landmarks, eyeIndices) {
    const p1 = landmarks[eyeIndices[1]];
    const p2 = landmarks[eyeIndices[5]];
    const p3 = landmarks[eyeIndices[2]];
    const p4 = landmarks[eyeIndices[4]];
    const p0 = landmarks[eyeIndices[0]];
    const p3_ = landmarks[eyeIndices[3]];

    // 縦方向の距離
    const vertical1 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    const vertical2 = Math.sqrt((p4.x - p3.x) ** 2 + (p4.y - p3.y) ** 2);
    // 横方向の距離
    const horizontal = Math.sqrt((p0.x - p3_.x) ** 2 + (p0.y - p3_.y) ** 2);

    // EAR計算
    return (vertical1 + vertical2) / (2.0 * horizontal);
}

// DurMeanを計算
function calculateDurMean(blinkDatas) {
    let retDurMean = 0.0
    if (blinkDatas.length > 0) {
        const totalDuration = blinkDatas.reduce((sum, data) => sum + data.duration, 0);
        retDurMean = totalDuration / blinkDatas.length;
        durmeanDisplay.textContent = `DurMean: ${Math.round(DurMean * 100) / 100} ms`;
    }
    return retDurMean;
}

// Long10を計算
function calculateLong10(blinkDatas) {
    const Nlong = blinkDatas.filter(data => data.duration > DurCri * 1.1).length;
    const NAnother = blinkDatas.length - Nlong;
    const retLong10 = (Nlong / (Nlong + NAnother)) * 100;
    long10Display.textContent = `Long10: ${Math.round(retLong10 * 100) / 100}`;

    return retLong10;
}

// SleapnessCを計算
function calculateSleapnessC(long10) {
    const retSlpC = 1.238 + 0.046 * long10
    if (retSlpC === 0) {
        slpcDisplay.textContent = `SleapnessC: 0`;
    } else {
        slpcDisplay.textContent = `SleapnessC: ${Math.round(retSlpC * 100) / 100}`;
    }
    return retSlpC;
}

// SleapnessDを計算
function calculateSleapnessD(durMean) {
    const retSlpD = -4.378 + 0.029 * durMean
    if (retSlpD === 0) {
        slpdDisplay.textContent = `SleapnessD: 0`;
    } else {
        slpdDisplay.textContent = `SleapnessD: ${Math.round(retSlpD * 100) / 100}`;
    }
    return retSlpD;
}

// FPSを計算
function calclateFPS() {
    FrameCount++;
    const now = performance.now();
    const elapsed = now - LastTimestamp;
    if (elapsed >= 1000) {
        const fps = Math.round((FrameCount / elapsed) * 100000) / 100;
        fpsDisplay.textContent = `FPS: ${fps}`;
        FrameCount = 0;
        LastTimestamp = now;
    }
}

// Mediapipe FaceMesh設定
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});

// Mediapipe FaceMesh設定
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

// MediaPipeの検出完了イベント
faceMesh.onResults((results) => {
    const timestamp = performance.now(); // 現在の時刻を取得
    canvasElement.width = results.image.width;
    canvasElement.height = results.image.height;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // 左目と右目のEARを計算
        const leftEAR = calculateEAR(landmarks, LEFT_EYE);
        const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
        const avgEAR = (leftEAR + rightEAR) / 2;
        const avgNromEAR = avgEAR * EarScaleFactor + EarShiftFactor;

        console.log(`avgNromEAR: ${Math.round(avgNromEAR * 100) / 100}`);

        earDisplay.textContent = `EAR: ${Math.round(avgNromEAR * 100) / 100} (${Math.round(avgEAR * 100) / 100})`;

        if (isCalibrating === true) {
            EarLeftDatas.push(leftEAR); // データを配列に追加
            EarRightDatas.push(leftEAR); // データを配列に追加
        }

        // 瞬き時間を追跡
        trackBlink(avgNromEAR, timestamp);

        // メッシュを描画
        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
        drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, { color: '#FF3030', lineWidth: 1 });
        drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, { color: '#30FF30', lineWidth: 1 });
        drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, { color: '#E0E0E0', lineWidth: 1 });

        // EARに基づいてインジケータの状態を更新
        if (avgNromEAR > EarThreshold) {
            eyeStateElement.setAttribute("data-state", "open");
        } else {
            eyeStateElement.setAttribute("data-state", "close");
        }
    } else {
        eyeStateElement.setAttribute("data-state", "nofacedetected");
    }

    canvasCtx.restore();
    calclateFPS();
});

// 使用可能なカメラデバイスを取得
async function getCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    // カメラデバイス (videoinput) を抽出
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    return videoDevices;
}

// 特定のカメラを選択して起動
async function startCamera(deviceId) {
    const constraints = {
        video: {
            deviceId: deviceId ? { exact: deviceId } : undefined, // カメラを指定 (デフォルトは自動選択)
            width: 640, // 解像度を指定
            height: 480,
            frameRate: { ideal: 60, max: 60 } // FPS を指定
        }
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // 映像を <video> 要素に設定
        const videoElement = document.querySelector('video');
        videoElement.srcObject = stream;
        videoElement.play();

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await faceMesh.send({ image: videoElement }); // FaceMesh にフレームを送信
            },
            width: 640,
            height: 480,
        });
        camera.start(); // カメラの処理を開始

    } catch (error) {
        console.error('Error accessing the camera:', error);
    }
}

// CSVデータ書き出し
function exportToCSV() {
    const header = ['Timestamp', 'BlinkDuration(ms)', 'SleapnessC', 'SleapnessD']; // ヘッダーを定義
    const rows = BlinkDatas.map((data, index) => {
        const sleapnessCValue = index < BlinkDatas.length ? calculateSleapnessC(calculateLong10(BlinkDatas.slice(0, index + 1))) : '';
        const sleapnessDValue = index < BlinkDatas.length ? calculateSleapnessD(calculateDurMean(BlinkDatas.slice(0, index + 1))) : '';

        return [
            new Date(data.timestamp).toISOString(), // タイムスタンプをISOフォーマットで
            data.duration.toFixed(2), // 瞬きの継続時間
            sleapnessCValue.toFixed(2), // SleapnessC
            sleapnessDValue.toFixed(2) // SleapnessD
        ].join(',');
    });

    // ヘッダーとデータを結合してCSVフォーマット
    const csvContent = [header.join(','), ...rows].join('\n');

    // ダウンロードリンクを生成
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `blink_data_${new Date().toISOString()}.csv`; // ファイル名を設定
    link.click(); // 自動的にダウンロード開始
}

// init
async function init() {
    isCalibrating = true;

    const cameras = await getCameras();
    console.log('Available Cameras:', cameras);

    if (cameras.length > 0) {
        // 最初のカメラを使用
        await startCamera(cameras[0].deviceId);
    } else {
        console.error('No cameras found.');
    }

    // 1分おきに SleapnessD をチェックするタイマーを設定
    setInterval(() => {
        if (isCalibrating === false) {
            if (SleapnessC > 3 || SleapnessD > 3) {
                document.getElementById('warningMessage').style.display = 'flex';
            } else {
                document.getElementById('warningMessage').style.display = 'none';
            }
        }
        else {
            document.getElementById('warningMessage').style.display = 'none';
        }
    }, CheckInterval * 1000);
}

init();