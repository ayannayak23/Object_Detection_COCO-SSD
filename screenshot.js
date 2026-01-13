
function takeScreenshot() {
    if (!video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw annotations
    boundingBoxes.forEach(el => {
        if (el.classList.contains('highlighter')) {
            const x = parseFloat(el.style.left);
            const y = parseFloat(el.style.top);
            const w = parseFloat(el.style.width);
            const h = parseFloat(el.style.height);

            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
        }

        // Labels
        if (el.tagName === 'P') {
            const x = parseFloat(el.style.marginLeft);
            const y = parseFloat(el.style.marginTop);

            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.fillText(el.innerText, x, y);
        }
    });

    // Timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const link = document.createElement('a');
    link.download = `detection-screenshot-${timestamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

screenshotBtn.addEventListener('click', takeScreenshot);