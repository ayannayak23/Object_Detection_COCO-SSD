// ROI (Region of Interest) functionality

let isDraggingROI = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Draw ROI rectangle on the live view
function drawROI(canvas) {
    if (!roi.active) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);
    ctx.setLineDash([]);

    // Draw corner handles
    const handleSize = 8;
    ctx.fillStyle = 'yellow';
    ctx.fillRect(roi.x - handleSize / 2, roi.y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(roi.x + roi.width - handleSize / 2, roi.y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(roi.x - handleSize / 2, roi.y + roi.height - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(roi.x + roi.width - handleSize / 2, roi.y + roi.height - handleSize / 2, handleSize, handleSize);
}

// ROI dragging on live view
document.addEventListener('DOMContentLoaded', () => {
    const liveView = document.getElementById('liveView');
    const toggleROIBtn = document.getElementById('toggleROI');

    // Mouse events for ROI dragging
    liveView.addEventListener('mousedown', (e) => {
        if (!roi.active) return;

        const rect = liveView.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Check if mouse is inside ROI
        if (
            mouseX >= roi.x &&
            mouseX <= roi.x + roi.width &&
            mouseY >= roi.y &&
            mouseY <= roi.y + roi.height
        ) {
            isDraggingROI = true;
            dragOffsetX = mouseX - roi.x;
            dragOffsetY = mouseY - roi.y;
        }
    });

    liveView.addEventListener('mousemove', (e) => {
        if (!isDraggingROI || !roi.active) return;

        const rect = liveView.getBoundingClientRect();
        roi.x = e.clientX - rect.left - dragOffsetX;
        roi.y = e.clientY - rect.top - dragOffsetY;

        // Keep ROI within bounds
        roi.x = Math.max(0, Math.min(roi.x, liveView.offsetWidth - roi.width));
        roi.y = Math.max(0, Math.min(roi.y, liveView.offsetHeight - roi.height));
    });

    liveView.addEventListener('mouseup', () => {
        isDraggingROI = false;
    });

    liveView.addEventListener('mouseleave', () => {
        isDraggingROI = false;
    });

    // Toggle ROI button
    if (toggleROIBtn) {
        toggleROIBtn.addEventListener('click', () => {
            roi.active = !roi.active;
            toggleROIBtn.textContent = roi.active ? 'ROI: ON' : 'ROI: OFF';
            toggleROIBtn.style.backgroundColor = roi.active ? '#4CAF50' : '#f44336';
        });
    }
});
