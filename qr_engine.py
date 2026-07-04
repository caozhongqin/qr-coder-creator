"""QR code generation engine: text splitting and image generation."""

import base64
import io

import qrcode
from qrcode.constants import ERROR_CORRECT_M

# Max bytes per QR chunk (UTF-8 encoded).
# QR Version 40 with error correction M supports ~2331 bytes in byte mode.
# 1800 is a safe conservative limit.
MAX_CHUNK_BYTES = 1800

# Error correction level M: 15% recovery capacity
EC_LEVEL = ERROR_CORRECT_M

# QR rendering settings
BOX_SIZE = 10
BORDER = 4


def split_text(text: str, max_bytes: int = MAX_CHUNK_BYTES) -> list[str]:
    """Split text into chunks that fit within max_bytes when UTF-8 encoded.

    Works at the character level to ensure multi-byte UTF-8 characters
    (Chinese, Japanese, etc.) are never split mid-character.

    Args:
        text: The input text to split.
        max_bytes: Maximum bytes per chunk (UTF-8 encoded).

    Returns:
        List of text chunks.
    """
    if not text:
        return []

    if len(text.encode("utf-8")) <= max_bytes:
        return [text]

    chunks: list[str] = []
    current_chunk = ""

    for char in text:
        test_chunk = current_chunk + char
        if len(test_chunk.encode("utf-8")) > max_bytes:
            if not current_chunk:
                # Single character exceeds max_bytes — extremely rare
                raise ValueError(
                    f"Single character requires {len(char.encode('utf-8'))} bytes, "
                    f"exceeds max_bytes={max_bytes}"
                )
            chunks.append(current_chunk)
            current_chunk = char
        else:
            current_chunk = test_chunk

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def generate_qr_image(data: str) -> str:
    """Generate a QR code image from data string and return as base64-encoded PNG.

    Args:
        data: The data to encode in the QR code.

    Returns:
        Base64-encoded PNG image string.
    """
    qr = qrcode.QRCode(
        version=None,  # Auto-determine minimum version
        error_correction=EC_LEVEL,
        box_size=BOX_SIZE,
        border=BORDER,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    return img_b64


def process_text(text: str) -> dict:
    """Process text and generate QR code(s).

    Splits text into chunks and generates a QR code image for each chunk.
    Each QR code contains only the raw text chunk — no metadata prefix.
    The frontend uses the returned index/total_parts for pagination display.

    Args:
        text: The input text to encode.

    Returns:
        Dict with keys:
        - total_parts: int
        - parts: list of {index, image, char_count}
    """
    if not text:
        raise ValueError("Input text is empty")

    chunks = split_text(text)
    total = len(chunks)
    parts = []

    for i, chunk in enumerate(chunks, 1):
        img_b64 = generate_qr_image(chunk)
        parts.append(
            {
                "index": i,
                "image": img_b64,
                "char_count": len(chunk),
            }
        )

    return {"total_parts": total, "parts": parts}
