"""Flask web application for QR code generation."""

import threading
import webbrowser

from flask import Flask, jsonify, render_template, request

from qr_engine import process_text

app = Flask(__name__)

# Max input size: 100KB
MAX_INPUT_BYTES = 100 * 1024


@app.route("/")
def index():
    """Serve the main UI page."""
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def generate():
    """Generate QR code(s) from input text.

    Request JSON:
        {"text": "string (required)"}

    Response JSON (success):
        {"success": true, "total_parts": N, "parts": [...]}

    Response JSON (error):
        {"success": false, "error": "message"}
    """
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"success": False, "error": "无效的请求数据"}), 400

    text = data.get("text", "")

    if not text or not text.strip():
        return jsonify({"success": False, "error": "请输入文本内容"}), 400

    # Check input size
    text_bytes = len(text.encode("utf-8"))
    if text_bytes > MAX_INPUT_BYTES:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"输入内容过大（{text_bytes} 字节），最大支持 {MAX_INPUT_BYTES} 字节",
                }
            ),
            400,
        )

    try:
        result = process_text(text)
        return jsonify({"success": True, **result})
    except ValueError as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"生成二维码失败: {e}"}), 500


def open_browser():
    """Open the default web browser to the app URL."""
    webbrowser.open("http://127.0.0.1:5000")


if __name__ == "__main__":
    # Open browser after a short delay to ensure server is ready
    threading.Timer(1.0, open_browser).start()
    app.run(host="127.0.0.1", port=5000, debug=False)
