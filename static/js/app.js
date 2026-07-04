// QR Code Generator - Frontend Logic

let currentParts = [];
let currentPage = 0;
let fileContent = "";

// Tab switching
document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        const targetTab = tab.dataset.tab;

        // Update tab active state
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        // Update pane visibility
        document.querySelectorAll(".pane").forEach((p) => p.classList.remove("active"));
        document.getElementById(targetTab + "-pane").classList.add("active");
    });
});

// File upload handling
document.getElementById("file-input").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileInfo = document.getElementById("file-info");
    const preview = document.getElementById("file-content-preview");

    fileInfo.textContent = `正在读取: ${file.name}`;
    fileInfo.classList.remove("has-file");

    const reader = new FileReader();
    reader.onload = function (event) {
        fileContent = event.target.result;
        const sizeKB = (file.size / 1024).toFixed(1);

        fileInfo.textContent = `已选择: ${file.name} (${sizeKB} KB)`;
        fileInfo.classList.add("has-file");

        // Show preview
        preview.value = fileContent;
        preview.style.display = "block";
    };
    reader.onerror = function () {
        fileInfo.textContent = "文件读取失败，请重试";
        fileContent = "";
        preview.style.display = "none";
    };
    reader.readAsText(file, "UTF-8");
});

// Get current input text based on active tab
function getInputText() {
    const activeTab = document.querySelector(".tab.active").dataset.tab;

    if (activeTab === "text") {
        return document.getElementById("text-input").value;
    } else {
        return fileContent;
    }
}

// Show message
function showMessage(text, type) {
    const msg = document.getElementById("message");
    msg.textContent = text;
    msg.className = "message " + type;
    msg.style.display = "block";
}

function hideMessage() {
    document.getElementById("message").style.display = "none";
}

// Generate QR codes
document.getElementById("generate-btn").addEventListener("click", async () => {
    const text = getInputText();

    if (!text || !text.trim()) {
        showMessage("请输入文本内容或选择文件", "error");
        return;
    }

    // Check size (100KB)
    const sizeBytes = new Blob([text]).size;
    if (sizeBytes > 100 * 1024) {
        showMessage(
            `输入内容过大（${(sizeBytes / 1024).toFixed(1)} KB），最大支持 100 KB`,
            "error"
        );
        return;
    }

    // Disable button, show loading
    const btn = document.getElementById("generate-btn");
    btn.disabled = true;
    btn.textContent = "生成中...";
    hideMessage();

    try {
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text }),
        });

        const data = await response.json();

        if (data.success) {
            currentParts = data.parts;
            currentPage = 0;

            if (data.total_parts > 1) {
                showMessage(
                    `内容已分为 ${data.total_parts} 张二维码，请依次扫描`,
                    "success"
                );
            } else {
                hideMessage();
            }

            showQRPage(0);
        } else {
            showMessage(data.error || "生成失败", "error");
            showPlaceholder();
        }
    } catch (err) {
        showMessage("网络错误: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "生成二维码";
    }
});

// Show placeholder (no QR generated)
function showPlaceholder() {
    document.getElementById("qr-placeholder").style.display = "block";
    document.getElementById("qr-content").style.display = "none";
}

// Show QR page by index
function showQRPage(index) {
    if (currentParts.length === 0) return;

    // Hide placeholder, show QR content
    document.getElementById("qr-placeholder").style.display = "none";
    document.getElementById("qr-content").style.display = "block";

    const part = currentParts[index];
    document.getElementById("qr-image").src =
        "data:image/png;base64," + part.image;
    document.getElementById("page-info").textContent =
        `第 ${index + 1} / ${currentParts.length} 张`;
    document.getElementById("prev-btn").disabled = index === 0;
    document.getElementById("next-btn").disabled =
        index === currentParts.length - 1;

    // Show metadata
    const meta = document.getElementById("qr-meta");
    if (currentParts.length > 1) {
        meta.textContent = `本张包含 ${part.char_count} 个字符`;
    } else {
        meta.textContent = "";
    }
}

// Pagination buttons
document.getElementById("prev-btn").addEventListener("click", () => {
    if (currentPage > 0) {
        currentPage--;
        showQRPage(currentPage);
    }
});

document.getElementById("next-btn").addEventListener("click", () => {
    if (currentPage < currentParts.length - 1) {
        currentPage++;
        showQRPage(currentPage);
    }
});

// Keyboard navigation for pagination
document.addEventListener("keydown", (e) => {
    if (document.getElementById("qr-content").style.display === "none") return;
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    if (e.key === "ArrowLeft" && currentPage > 0) {
        currentPage--;
        showQRPage(currentPage);
    } else if (e.key === "ArrowRight" && currentPage < currentParts.length - 1) {
        currentPage++;
        showQRPage(currentPage);
    }
});
