import io
from types import SimpleNamespace

from PIL import Image

from app.images import derivative_key, make_derivatives
from app.services.shop_service import _media_image


def _png(width, height, mode="RGBA"):
    buffer = io.BytesIO()
    Image.new(mode, (width, height), (200, 180, 150, 255) if mode == "RGBA" else 128).save(buffer, format="PNG")
    return buffer.getvalue()


def test_large_image_gets_every_rendition_as_webp():
    renditions = make_derivatives(_png(2000, 3000))

    assert [width for width, _ in renditions] == [400, 800, 1200, 1600]
    for width, data in renditions:
        with Image.open(io.BytesIO(data)) as image:
            assert image.format == "WEBP"
            assert image.size == (width, width * 3 // 2)


def test_small_image_is_never_upscaled():
    assert [width for width, _ in make_derivatives(_png(1000, 1500))] == [400, 800, 1000]
    assert [width for width, _ in make_derivatives(_png(1600, 2400))] == [400, 800, 1200, 1600]
    assert [width for width, _ in make_derivatives(_png(300, 300, mode="P"))] == [300]


def test_unreadable_upload_has_no_renditions():
    assert make_derivatives(b"not an image") == []


def test_rendition_sits_beside_the_original():
    assert derivative_key("2026/10/abc.png", 800) == "2026/10/abc.w800.webp"


def test_shop_image_carries_srcset_of_renditions():
    media = SimpleNamespace(
        id=5,
        storage_key="2026/10/abc.png",
        width_px=2000,
        height_px=3000,
        derivatives={"400": "2026/10/abc.w400.webp", "800": "2026/10/abc.w800.webp"},
    )

    image = _media_image(media, "https://shop.test")

    assert image["url"] == "https://shop.test/uploads/2026/10/abc.png"
    assert image["srcset"] == (
        "https://shop.test/uploads/2026/10/abc.w400.webp 400w, "
        "https://shop.test/uploads/2026/10/abc.w800.webp 800w"
    )


def test_shop_image_without_renditions_falls_back_to_original():
    media = SimpleNamespace(id=5, storage_key="a.png", width_px=900, height_px=900, derivatives={})

    assert _media_image(media, "https://shop.test")["srcset"] is None
