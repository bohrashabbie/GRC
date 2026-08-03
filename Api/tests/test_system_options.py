from types import SimpleNamespace

import pytest

from app.middleware.error import BusinessRuleError
from app.services import catalog_service


class FakeSession:
    def __init__(self, option):
        self.option = option
        self.added = []

    def get(self, model, _object_id, **_kwargs):
        if model.__name__ == "Option":
            return self.option
        return None

    def add(self, value):
        self.added.append(value)

    def flush(self):
        for index, value in enumerate(self.added, start=1):
            if getattr(value, "id", None) is None:
                value.id = index

    def commit(self):
        pass

    def refresh(self, _value):
        pass


def test_staff_cannot_create_a_third_option():
    with pytest.raises(BusinessRuleError) as exc:
        catalog_service.create_option(None, None)

    assert exc.value.code == "system_options_only"


def test_staff_cannot_add_a_value_to_a_retired_option():
    db = FakeSession(SimpleNamespace(code="length"))
    payload = SimpleNamespace(option_id=1)

    with pytest.raises(BusinessRuleError) as exc:
        catalog_service.create_option_value(db, payload)

    assert exc.value.code == "system_option_locked"


def test_staff_can_add_a_colour_value(monkeypatch):
    db = FakeSession(SimpleNamespace(code="colour"))
    payload = SimpleNamespace(
        option_id=1,
        code="navy",
        hex_color="#001F3F",
        swatch_media_id=None,
        length_cm=None,
        width_cm=None,
        sort_order=0,
        translations=[],
    )
    monkeypatch.setattr(catalog_service, "_sync_label_translations", lambda *_args: None)

    value = catalog_service.create_option_value(db, payload)

    assert value.code == "navy"
    assert value.hex_color.strip() == "#001F3F"


def test_staff_can_add_a_size_value(monkeypatch):
    db = FakeSession(SimpleNamespace(code="size"))
    payload = SimpleNamespace(
        option_id=1,
        code="xl",
        hex_color=None,
        swatch_media_id=None,
        length_cm=160,
        width_cm=62,
        sort_order=5,
        translations=[],
    )
    monkeypatch.setattr(catalog_service, "_sync_label_translations", lambda *_args: None)

    value = catalog_service.create_option_value(db, payload)

    assert value.code == "xl"
    assert value.sort_order == 5
    assert value.length_cm == 160
    assert value.width_cm == 62


def test_a_size_never_carries_a_swatch(monkeypatch):
    """A hex sent against a size is dropped, not stored: the storefront's colour
    filter groups by hex and would render the size as a swatch."""
    db = FakeSession(SimpleNamespace(code="size"))
    payload = SimpleNamespace(
        option_id=1,
        code="xxl",
        hex_color="#001F3F",
        swatch_media_id=7,
        length_cm=None,
        width_cm=None,
        sort_order=6,
        translations=[],
    )
    monkeypatch.setattr(catalog_service, "_sync_label_translations", lambda *_args: None)

    value = catalog_service.create_option_value(db, payload)

    assert value.hex_color is None
    assert value.swatch_media_id is None


def test_a_colour_never_carries_measurements(monkeypatch):
    """The mirror rule: garment length/width sent against a colour are dropped,
    so the PDP never captions a swatch with centimetres."""
    db = FakeSession(SimpleNamespace(code="colour"))
    payload = SimpleNamespace(
        option_id=1,
        code="olive",
        hex_color="#6B6B47",
        swatch_media_id=None,
        length_cm=150,
        width_cm=58,
        sort_order=3,
        translations=[],
    )
    monkeypatch.setattr(catalog_service, "_sync_label_translations", lambda *_args: None)

    value = catalog_service.create_option_value(db, payload)

    assert value.length_cm is None
    assert value.width_cm is None
