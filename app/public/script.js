const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');
const stopButton = document.getElementById('stopWebcam');
const filterList = document.getElementById('filterList');
const confidenceSlider = document.getElementById('confidenceSlider');
const confidenceValue = document.getElementById('confidenceValue');
const fpsValue = document.getElementById('fpsValue');
const timeValue = document.getElementById('timeValue');

let activeClasses = new Set();
let createdClasses = new Set();


let webcamRunning = false;
let animationFrameId = null;

let confidenceThreshold = 0.66;

let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;

let lastInferenceTime = 0;
const CPU_INFERENCE_INTERVAL = 10000;



// Store the resulting model in the global scope of our app.
var model = undefined;
console.log(tf.version.tfjs);

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !! (navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function enableCam() {
    // Only continue if the model has finished loading.
    if (!model) {
        return;
    }
    
    liveView.classList.remove('invisible');

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia({ video: true })
    .then(function(stream) {
        video.srcObject = stream;
        webcamRunning = true;

        enableWebcamButton.disabled = true;
        stopButton.disabled = false;
        document.getElementById('noCamMessage').classList.add('invisible');
        document.getElementById('classFilters').classList.remove('invisible');
        document.getElementById('confidenceControl').classList.remove('invisible');
        document.querySelector('.view-panel').classList.remove('invisible');
        document.getElementById('imageCanvas').classList.add('invisible');
        video.addEventListener('loadeddata', predictWebcam);
    })
    .catch(function(err) {
        document.getElementById('noCamMessage').classList.remove('invisible');
        liveView.classList.add('invisible');
        document.querySelector('.view-panel').classList.add('invisible');
    });

}

// Stop the webcam and prediction loop
function stopWebcam() {
    if (!webcamRunning) return;

    // Stop prediction loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Stop camera stream
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    // Remove bounding boxes
    boundingBoxes.forEach(el => liveView.removeChild(el));
    boundingBoxes = [];

    webcamRunning = false;
    liveView.classList.add('invisible');
    document.getElementById('classFilters').classList.add('invisible');
    document.getElementById('confidenceControl').classList.add('invisible');

    // Clear filters
    filterList.innerHTML = '';
    activeClasses.clear();
    createdClasses.clear();

    enableWebcamButton.disabled = false;
    stopButton.disabled = true;
}


// If webcam supported, add event listener to button
// for when user wants to activate it to call enableCam
if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}

stopButton.addEventListener('click', stopWebcam);

// getUsermedia parameters to force video but not audio.
const constraints = {
    video: true
};

// Warm up the model by running a single detection on a dummy image.
function warmupModel() {
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 300;
    dummyCanvas.height = 300;

    // Run one detection to force tensor allocation
    model.detect(dummyCanvas).then(() => {
        console.log('Model warmup completed');
    });
}


// wait for the model to load before using
// note: coco-ssd is an external object loaded from our index.html
const loadingElement = document.getElementById('loading');
const modelInfoPanel = document.getElementById('modelInfo');


cocoSsd.load().then(function(loadedModel) {
    model = loadedModel;

    warmupModel();

    // Hide loading message
    loadingElement.classList.add('invisible');
    modelInfoPanel.classList.remove('invisible');

    // Show demo section
    demosSection.classList.remove('dimmed');
});

confidenceSlider.addEventListener('input', () => {
    confidenceThreshold = confidenceSlider.value / 100;
    confidenceValue.textContent = confidenceSlider.value + '%';
});


// Update class filters based on predictions
function updateClassFilters(predictions) {

    if (createdClasses.size === 0 && predictions.length > 0) {
        filterList.innerHTML = '';
    }

    predictions.forEach(pred => {
        if (!createdClasses.has(pred.class)) {
            createdClasses.add(pred.class);
            activeClasses.add(pred.class);

            const label = document.createElement('label');
            const checkbox = document.createElement('input');

            checkbox.type = 'checkbox';
            checkbox.checked = true;
            checkbox.value = pred.class;

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    activeClasses.add(pred.class);
                } else {
                    activeClasses.delete(pred.class);
                }
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + pred.class));

            filterList.appendChild(label);
            filterList.appendChild(document.createElement('br'));
        }
    });
}


var boundingBoxes = [];

// Prediction loop
function predictWebcam(timestamp) {
    if (!webcamRunning) return;

    const backend = tf.getBackend();

    // Throttle inference on CPU
    if (backend === 'cpu') {
        if (timestamp - lastInferenceTime < CPU_INFERENCE_INTERVAL) {
            animationFrameId = requestAnimationFrame(predictWebcam);
            return;
        }
        lastInferenceTime = timestamp;
    }

    const startTime = performance.now();

    // Now let's start classifying a frame in the stream.
    model.detect(video).then(function(predictions) {
        tf.tidy(() => {
            updateClassFilters(predictions);
            const endTime = performance.now();
            timeValue.textContent = (endTime - startTime).toFixed(1);
            
            // Calculate scaling factor for responsive design
            const videoWidth = video.offsetWidth;
            const videoHeight = video.offsetHeight;
            const scaleX = videoWidth / video.videoWidth;
            const scaleY = videoHeight / video.videoHeight;
            
            // Remove any highlighting we did previous frame.
            for (let i = 0; i < boundingBoxes.length; i++) {
                liveView.removeChild(boundingBoxes[i]);
            }
            boundingBoxes.splice(0);
            // Now lets loop through predictions and draw them to the live view if
            // they have a high confidence score.
            for (let n = 0; n < predictions.length; n++) {
                // If we are over 50% sure we are sure we classified it right, draw it!
                if (predictions[n].score >= confidenceThreshold && activeClasses.has(predictions[n].class)) {
                    const p = document.createElement('p');
                    p.innerText = predictions[n].class + ' - with ' +
                        Math.round(parseFloat(predictions[n].score) * 100) +
                        '% confidence.';
                    p.style = 'margin-left: ' + (predictions[n].bbox[0] * scaleX) + 'px; margin-top: ' +
                        (predictions[n].bbox[1] * scaleY - 10) + 'px; width: ' +
                        (predictions[n].bbox[2] * scaleX - 10) + 'px; top: 0; left: 0;';
                    const highlighter = document.createElement('div');
                    highlighter.setAttribute('class', 'highlighter');

                    highlighter.style = 'left: ' + (predictions[n].bbox[0] * scaleX) + 'px; top: ' +
                        (predictions[n].bbox[1] * scaleY) + 'px; width: ' +
                        (predictions[n].bbox[2] * scaleX) + 'px; height: ' +
                        (predictions[n].bbox[3] * scaleY) + 'px;';

                    liveView.appendChild(highlighter);
                    liveView.appendChild(p);

                    boundingBoxes.push(highlighter);
                    boundingBoxes.push(p);
                }
            }

            frameCount++;
            const now = performance.now();

            if (now - lastFrameTime >= 1000) {
                fps = frameCount;
                frameCount = 0;
                lastFrameTime = now;
                fpsValue.textContent = fps;
            }

        });
        // Call this function again to keep predicting when the browser is ready.
        animationFrameId = window.requestAnimationFrame(predictWebcam);
    });
}