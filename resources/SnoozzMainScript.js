const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const fpsDisplay = document.getElementById('fpsDisplay');
const eyeStateElement = document.getElementById('eyeState');
const graphCtx = document.getElementById('earGraph').getContext('2d');

//眠気検出用の変数
var EarThreshold = 0.5; // 目を閉じているとみなす閾値
var CheckInterval = 5; // 眠気をチェックするインターバル[s]
let BlinkDatas = []; //瞬きデータを保持する { timestamp, duration } のオブジェクト配列
let BlinkDatasForAnalyze = []; //瞬きデータを保持する { timestamp, duration } のオブジェクト配列
let EarLeftDatas = []; //EARの配列
let EarRightDatas = []; //EARの配列
let EarLeftRawDatas = []; //EARの配列
let EarRightRawDatas = []; //EARの配列

//let wEarLeftRawDatas = []; //EARの配列
//let wEarRightRawDatas = []; //EARの配列

let BlinkStartTime = null; // 瞬き開始時刻
let CloseElapsedTime = null; // 目を閉じている時間
var SleepDetectThresholdTime = null; // 眠気検出の閾値時間
let BlinkDurations = [];   // 瞬きの継続時間リスト
let DurMean = 0.0;
var DurCri = 130.0;
let Long10 = 0.0;
let SleapnessC = 0.0;
let SleapnessD = 0.0;
let CheckSleapness = false;// 眠気をチェックするかのフラグ
let isCalibrating = false;
let CalibrationStartTime = null; // キャリブレーション開始時刻
var CalibTime = null;
var EarLeftScaleFactor = 4.0;
var EarLeftShiftFactor = 0.0;
var EarRightScaleFactor = 4.0;
var EarRightShiftFactor = 0.0;

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

    const savedEarLeftScale = localStorage.getItem("EarLeftScaleFactor");
    const defaultEarLeftScale = savedEarLeftScale ? parseFloat(savedEarLeftScale) : 0.4; // 保存された値、またはデフォルト値
    document.getElementById("earLeftScaleSlider").value = defaultEarLeftScale;
    document.getElementById("earLeftScaleValue").value = defaultEarLeftScale;
    window['EarLeftScaleFactor'] = defaultEarLeftScale;
    console.log(`Loaded EarScaleLeftFactor: ${EarLeftScaleFactor}`);

    const savedEarLeftShift = localStorage.getItem("EarLeftShiftFactor");
    const defaultEarLeftShift = savedEarLeftShift ? parseFloat(savedEarLeftShift) : 0.0; // 保存された値、またはデフォルト値
    document.getElementById("earLeftShiftSlider").value = defaultEarLeftShift;
    document.getElementById("earLeftShiftValue").value = defaultEarLeftShift;
    window['EarLeftShiftFactor'] = defaultEarLeftShift;
    console.log(`Loaded EarLeftShiftFactor: ${EarLeftShiftFactor}`);

    const savedEarRightScale = localStorage.getItem("EarRightScaleFactor");
    const defaultEarRightScale = savedEarRightScale ? parseFloat(savedEarRightScale) : 0.4; // 保存された値、またはデフォルト値
    document.getElementById("earRightScaleSlider").value = defaultEarRightScale;
    document.getElementById("earRightScaleValue").value = defaultEarRightScale;
    window['EarRightScaleFactor'] = defaultEarRightScale;
    console.log(`Loaded EarScaleRightFactor: ${EarRightScaleFactor}`);

    const savedEarRightShift = localStorage.getItem("EarRightShiftFactor");
    const defaultEarRightShift = savedEarRightShift ? parseFloat(savedEarRightShift) : 0.0; // 保存された値、またはデフォルト値
    document.getElementById("earRightShiftSlider").value = defaultEarRightShift;
    document.getElementById("earRightShiftValue").value = defaultEarRightShift;
    window['EarRightShiftFactor'] = defaultEarRightShift;
    console.log(`Loaded EarRightShiftFactor: ${EarRightShiftFactor}`);

    const savedSleepDetectThresholdTime = localStorage.getItem("SleepDetectThresholdTime");
    const defaultESleepDetectThresholdTime = savedSleepDetectThresholdTime ? parseFloat(savedSleepDetectThresholdTime) : 5000; // 保存された値、またはデフォルト値
    document.getElementById("SleepDetectThresholdTimeSlider").value = defaultESleepDetectThresholdTime;
    document.getElementById("SleepDetectThresholdTimeValue").value = defaultESleepDetectThresholdTime;
    window['SleepDetectThresholdTime'] = defaultESleepDetectThresholdTime;
    console.log(`Loaded SleepDetectThresholdTime: ${SleepDetectThresholdTime}`);

    const savedCalibTime = localStorage.getItem("CalibTime");
    const defaultCalibTime = savedCalibTime ? parseFloat(savedCalibTime) : 1000 * 60 * 5; // 保存された値、またはデフォルト値
    document.getElementById("CalibTimeSlider").value = defaultCalibTime;
    document.getElementById("CalibTimeValue").value = defaultCalibTime;
    window['CalibTime'] = defaultCalibTime;
    console.log(`Loaded defaultCalibTime: ${CalibTime}`);
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
        CloseElapsedTime = timestamp - BlinkStartTime; // 目を閉じている時間を計算
        blinktimeDisplay.textContent = `BlinkTime: ${Math.round(CloseElapsedTime * 100) / 100} ms`;

        if (isCalibrating === false) {
            if (CloseElapsedTime > SleepDetectThresholdTime) {
                document.getElementById('warningMessage').style.display = 'flex';
            } else {
                document.getElementById('warningMessage').style.display = 'none';
            }
        }
        else {
            document.getElementById('warningMessage').style.display = 'none';
        }
    }
    else {
        // 目が開いた場合
        if (BlinkStartTime !== null) {
            CloseElapsedTime = timestamp - BlinkStartTime; // 瞬きの継続時間を計算
            BlinkDatas.push({ timestamp: currentTime, duration: CloseElapsedTime }); // データを配列に追加
            BlinkDatasForAnalyze.push({ timestamp: currentTime, duration: CloseElapsedTime }); // データを配列に追加
            blinktimeDisplay.textContent = `BlinkTime: ${Math.round(CloseElapsedTime * 100) / 100} ms`;
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
        calibratingMessage.innerHTML = `Calibration in progress...<br>(${Math.round((calibElapsedTime / CalibTime) * 100)} %)`;

        if (calibElapsedTime >= CalibTime) {

            DurCri = DurMean;
            updateValue('durCriSlider', DurCri, 'DurCri');
            updateValue('durCriValue', DurCri, 'DurCri');

            // 最大値を取得
            const maxEarLeft = Math.max(...EarLeftRawDatas.map(data => data.ear));
            const maxEarRight = Math.max(...EarRightRawDatas.map(data => data.ear));

            // 最小値を取得
            const minEarLeft = Math.min(...EarLeftRawDatas.map(data => data.ear));
            const minEarRight = Math.min(...EarRightRawDatas.map(data => data.ear));

            EarLeftDatas.length = 0;
            EarRightDatas.length = 0;
            EarLeftRawDatas.length = 0;
            EarRightRawDatas.length = 0;

            EarLeftScaleFactor = 1 / (maxEarLeft - minEarLeft);
            updateValue('earLeftScaleSlider', EarLeftScaleFactor, 'EarLeftScaleFactor');
            updateValue('earLeftScaleValue', EarLeftScaleFactor, 'EarLeftScaleFactor');
            EarLeftShiftFactor = -minEarLeft * EarLeftScaleFactor;
            updateValue('earLeftShiftSlider', EarLeftShiftFactor, 'EarLeftShiftFactor');
            updateValue('earLeftShiftValue', EarLeftShiftFactor, 'EarLeftShiftFactor');

            EarRightScaleFactor = 1 / (maxEarRight - minEarRight);
            updateValue('earRightScaleSlider', EarRightScaleFactor, 'EarRightScaleFactor');
            updateValue('earRightScaleValue', EarRightScaleFactor, 'EarRightScaleFactor');
            EarRightShiftFactor = -minEarRight * EarRightScaleFactor;
            updateValue('earRightShiftSlider', EarRightShiftFactor, 'EarRightShiftFactor');
            updateValue('earRightShiftValue', EarRightShiftFactor, 'EarRightShiftFactor');

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
    const vertical1 = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2 + (p2.z - p1.z) ** 2);
    const vertical2 = Math.sqrt((p4.x - p3.x) ** 2 + (p4.y - p3.y) ** 2 + (p4.z - p3.z) ** 2);
    // 横方向の距離
    const horizontal = Math.sqrt((p0.x - p3_.x) ** 2 + (p0.y - p3_.y) ** 2 + (p0.z - p3_.z) ** 2);

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

// Chart.js 設定
const chart = new Chart(graphCtx, {
    type: 'line',
    data: {
        labels: [], // X軸ラベル
        datasets: [{
            label: 'EAR Left Raw',
            data: [], // Y軸データ
            borderColor: 'rgb(255, 163, 113)',
            borderWidth: 1,
            pointRadius: 0, // プロットポイントのサイズ（小さく設定）
            pointHoverRadius: 4, // ホバー時のポイントサイズ
            fill: false,
        }, {
            label: 'EAR Right Raw',
            data: [], // Y軸データ
            borderColor: 'rgb(129, 198, 255)',
            borderWidth: 1,
            pointRadius: 0, // プロットポイントのサイズ（小さく設定）
            pointHoverRadius: 4, // ホバー時のポイントサイズ
            fill: false,
        }, {
            label: 'EAR Left',
            data: [], // Y軸データ
            borderColor: 'rgb(255, 89, 0)',
            borderWidth: 1.2,
            pointRadius: 0, // プロットポイントのサイズ（小さく設定）
            pointHoverRadius: 4, // ホバー時のポイントサイズ
            fill: false,
        }, {
            label: 'EAR Right',
            data: [], // Y軸データ
            borderColor: 'rgb(0, 140, 255)',
            borderWidth: 1.2,
            pointRadius: 0, // プロットポイントのサイズ（小さく設定）
            pointHoverRadius: 4, // ホバー時のポイントサイズ
            fill: false,
        }]
    },
    options: {
        responsive: true,
        animation: false, // アニメーションを無効化
        maintainAspectRatio: false, // 縦横比を固定しない
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Time (ms)'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'EAR Value'
                }
            }
        }
    }
});

// 最新100データを抽出してグラフとHTMLに反映する関数
function updateChartAndDisplay() {
    // 最新100データを取得
    const latestEarLeftRawDatas = EarLeftRawDatas.slice(-1000);
    const latestEarRightRawDatas = EarRightRawDatas.slice(-1000);
    const latestEarLeftDatas = EarLeftDatas.slice(-1000);
    const latestEarRightDatas = EarRightDatas.slice(-1000);

    // グラフのデータを更新
    chart.data.labels = latestEarLeftDatas.map(data => Math.round(data.timestamp)); // X軸にインデックス
    chart.data.labels.min = Math.round(latestEarLeftDatas[0].timestamp);
    chart.data.datasets[0].data = latestEarLeftRawDatas.map(data => data.ear);
    chart.data.datasets[1].data = latestEarRightRawDatas.map(data => data.ear);
    chart.data.datasets[2].data = latestEarLeftDatas.map(data => data.ear);
    chart.data.datasets[3].data = latestEarRightDatas.map(data => data.ear);

    // グラフを更新
    chart.update();
}

// Mediapipe FaceMesh設定
faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

// MediaPipeの検出完了イベント
faceMesh.onResults((results) => {
    const timestamp = Date.now(); // 現在の時刻を取得
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

        const leftNromEAR = leftEAR * EarLeftScaleFactor + EarLeftShiftFactor;
        const rightNromEAR = rightEAR * EarRightScaleFactor + EarRightShiftFactor;

        const avgNromEAR = (leftNromEAR + rightNromEAR) / 2;

        console.log(`avgNromEAR: ${Math.round(avgNromEAR * 100) / 100}`);

        earDisplay.textContent = `EAR: ${Math.round(avgNromEAR * 100) / 100} (${Math.round(avgEAR * 100) / 100})`;


        //const wleftEAR = wcalculateEAR(landmarks, LEFT_EYE);
        //const wrightEAR = wcalculateEAR(landmarks, RIGHT_EYE);
        //wEarLeftRawDatas.push({ timestamp: timestamp, ear: wleftEAR }); // データを配列に追加
        //wEarRightRawDatas.push({ timestamp: timestamp, ear: wrightEAR }); // データを配列に追加

        EarLeftRawDatas.push({ timestamp: timestamp, ear: leftEAR }); // データを配列に追加
        EarRightRawDatas.push({ timestamp: timestamp, ear: rightEAR }); // データを配列に追加

        EarLeftDatas.push({ timestamp: timestamp, ear: leftNromEAR }); // データを配列に追加
        EarRightDatas.push({ timestamp: timestamp, ear: rightNromEAR }); // データを配列に追加

        // 瞬き時間を追跡
        trackBlink(avgNromEAR, timestamp);

        // メッシュを描画
        //drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
        drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, { color: 'rgb(255, 162, 112)', lineWidth: 1 });
        drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, { color: 'rgb(122, 195, 255)', lineWidth: 1 });

        // drawLandmarkIds(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, '#FF3030');
        // drawLandmarkIds(canvasCtx, landmarks, FACEMESH_LEFT_EYE, '#30FF30');
        //drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, { color: '#E0E0E0', lineWidth: 1 });

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

function drawLandmarkIds(canvasCtx, landmarks, points, color) {
    canvasCtx.fillStyle = color;
    canvasCtx.font = "8px Arial";

    points.forEach(([startIdx, endIdx]) => {
        const val = 3.0;

        // startIdxのランドマークにIDを描画
        const start = landmarks[startIdx];
        if (start) {
            canvasCtx.fillText(startIdx.toString(),
                (start.x * canvasCtx.canvas.width - canvasCtx.canvas.width / 2) * val + canvasCtx.canvas.width / 2,
                (start.y * canvasCtx.canvas.height - canvasCtx.canvas.height / 2) * val + canvasCtx.canvas.height / 2);
        }

        // endIdxのランドマークにIDを描画
        const end = landmarks[endIdx];
        if (end) {
            canvasCtx.fillText(endIdx.toString(),
                (end.x * canvasCtx.canvas.width - canvasCtx.canvas.width / 2) * val + canvasCtx.canvas.width / 2,
                (end.y * canvasCtx.canvas.height - canvasCtx.canvas.height / 2) * val + canvasCtx.canvas.height / 2);
        }
    });
}

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
function exportCSVs() {
    exportBlinkDatasToCSV();
    exportEARDatasToCSV();
}

// CSVデータ書き出し
function exportData1() {
    exportBlinkDatasToCSV();
}

// CSVデータ書き出し
function exportData2() {
    exportEARDatasToCSV();
}


// CSVデータ書き出し
function exportBlinkDatasToCSV() {
    const header = ['Timestamp', 'BlinkDuration(ms)', 'Long10', 'DurMean', 'SleapnessC', 'SleapnessD']; // ヘッダーを定義
    const rows = BlinkDatasForAnalyze.map((data, index) => {
        const long10Value = index < BlinkDatasForAnalyze.length ? calculateLong10(BlinkDatasForAnalyze.slice(0, index + 1)) : '';
        const durMeanValue = index < BlinkDatasForAnalyze.length ? calculateDurMean(BlinkDatasForAnalyze.slice(0, index + 1)) : '';
        const sleapnessCValue = index < BlinkDatasForAnalyze.length ? calculateSleapnessC(calculateLong10(BlinkDatasForAnalyze.slice(0, index + 1))) : '';
        const sleapnessDValue = index < BlinkDatasForAnalyze.length ? calculateSleapnessD(calculateDurMean(BlinkDatasForAnalyze.slice(0, index + 1))) : '';

        return [
            data.timestamp, // タイムスタンプをISOフォーマットで
            data.duration.toFixed(2), // 瞬きの継続時間
            long10Value.toFixed(2), // long10Value
            durMeanValue.toFixed(2), // durMeanValue
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

// CSVデータ書き出し
function exportEARDatasToCSV() {
    const header = ['Timestamp', 'RawLeftEAR', 'RawRightEAR', 'LeftEAR', 'RightEAR']; // ヘッダーを定義
    const rows = EarLeftRawDatas.map((data, index) => {
        const rawLeftEAR = index < EarLeftRawDatas.length ? EarLeftRawDatas[index].ear : '';
        const rawRightEAR = index < EarLeftRawDatas.length ? EarRightRawDatas[index].ear : '';
        const leftEAR = index < EarLeftRawDatas.length ? EarLeftDatas[index].ear : '';
        const rightEAR = index < EarLeftRawDatas.length ? EarRightDatas[index].ear : '';

        return [
            data.timestamp,
            rawLeftEAR.toFixed(2), // long10Value
            rawRightEAR.toFixed(2), // durMeanValue
            leftEAR.toFixed(2), // SleapnessC
            rightEAR.toFixed(2) // SleapnessD
        ].join(',');
    });

    // ヘッダーとデータを結合してCSVフォーマット
    const csvContent = [header.join(','), ...rows].join('\n');

    // ダウンロードリンクを生成
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ear_data_${new Date().toISOString()}.csv`; // ファイル名を設定
    link.click(); // 自動的にダウンロード開始
}

function exportDataAsZIP() {
    const zip = new JSZip();

    // BlinkデータのCSV作成
    const blinkHeader = ['Timestamp', 'BlinkDuration(ms)', 'Long10', 'DurMean', 'SleapnessC', 'SleapnessD'];
    const blinkRows = BlinkDatasForAnalyze.map((data, index) => {
        const long10Value = calculateLong10(BlinkDatasForAnalyze.slice(0, index + 1));
        const durMeanValue = calculateDurMean(BlinkDatasForAnalyze.slice(0, index + 1));
        const sleapnessCValue = calculateSleapnessC(long10Value);
        const sleapnessDValue = calculateSleapnessD(durMeanValue);

        return [
            data.timestamp,
            data.duration.toFixed(2),
            long10Value.toFixed(2),
            durMeanValue.toFixed(2),
            sleapnessCValue.toFixed(2),
            sleapnessDValue.toFixed(2),
        ].join(',');
    });
    const blinkCSV = [blinkHeader.join(','), ...blinkRows].join('\n');
    zip.file(`blink_data_${new Date().toISOString()}.csv`, blinkCSV);

    // EARデータのCSV作成
    const earHeader = ['Timestamp', 'RawLeftEAR', 'RawRightEAR', 'LeftEAR', 'RightEAR', 'SelfEval'];
    const earRows = EarLeftRawDatas.map((data, index) => {
        const rawLeftEAR = EarLeftRawDatas[index]?.ear ?? '';
        const rawRightEAR = EarRightRawDatas[index]?.ear ?? '';
        const leftEAR = EarLeftDatas[index]?.ear ?? '';
        const rightEAR = EarRightDatas[index]?.ear ?? '';

        return [
            data.timestamp,
            rawLeftEAR.toFixed(2),
            rawRightEAR.toFixed(2),
            leftEAR.toFixed(2),
            rightEAR.toFixed(2),
            data.selfEval ?? ''
        ].join(',');
    });
    const earCSV = [earHeader.join(','), ...earRows].join('\n');
    zip.file(`ear_data_${new Date().toISOString()}.csv`, earCSV);

    // ZIPファイルを生成してダウンロード
    zip.generateAsync({ type: 'blob' }).then((content) => {
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Measurement_Data_${new Date().toISOString()}.zip`;
        link.click();
        URL.revokeObjectURL(url); // メモリ解放
    });
}

// init
async function init() {
    isCalibrating = false;

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
                document.getElementById('cautionMessage').style.display = 'flex';
            } else {
                document.getElementById('cautionMessage').style.display = 'none';
            }
        }
        else {
            document.getElementById('cautionMessage').style.display = 'none';
        }
    }, CheckInterval * 1000);

    // 定期的にグラフと配列表示を更新
    setInterval(() => {
        updateChartAndDisplay();
    }, 100); // 0.5秒ごとに更新
}

init();

/*
処理A：
    基準瞬目持続時間の計測
    DurCri[ms]＝（5分間にした瞬目持続時間の合計[ms]/瞬目回数[回]）/300000[ms]

処理B：B～Dは直近5分間の瞬目を対象とする→5分たった瞬目データは削除する
    DurMean[ms]=（5分間にした瞬目持続時間の合計[ms]/瞬目回数[回]）
    Long10=Nlong/(Nlong+NAnother)
    Nlong = DurCri*1.1以上の個数
    NAnother = 瞬目回数 - Nlong
処理C：
    SleapnessC=1.238+0.046*Long10
処理D：
    SleapnessD=-4.378+0.029*DurMean

処理E：1分おきに判定
    SleapnessC>3||SleapnessD>3
    →警告
    SleapnessC=<3&&SleapnessD=<3
    →Bに戻る
*/