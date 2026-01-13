
async function setBackend(backend) {
    await tf.setBackend(backend);
    await tf.ready();
    console.log("Using backend:", tf.getBackend());

    if (tf.getBackend() === "cpu") {
        document.getElementById("status").innerText = "⚠ CPU mode: real-time performance limited";
    } else {
        document.getElementById("status").innerText = "";
    }

}

document.getElementById("backend").addEventListener("change", (e) => {
    setBackend(e.target.value);
});

// Initial backend setup
setBackend("webgl");