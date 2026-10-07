"""Exchange-rate parsing for the storefront's display currencies. Display only:
nothing here touches a stored amount."""

from decimal import Decimal

import pytest

from app.services import fx_service


def test_rates_parse_as_decimals_and_kwd_is_one():
    body = b'{"result":"success","base_code":"KWD","rates":{"KWD":1,"SAR":12.129698,"USD":3.234595,"bad":"x","XX":2}}'
    rates = fx_service.parse_rates(body)
    assert rates["SAR"] == Decimal("12.129698")
    assert isinstance(rates["USD"], Decimal)
    assert rates["KWD"] == Decimal(1)
    assert "XX" not in rates and "BAD" not in rates


@pytest.mark.parametrize(
    "body",
    [
        b'{"result":"error"}',
        b'{"result":"success","base_code":"USD","rates":{"USD":1}}',
        b'{"result":"success","base_code":"KWD","rates":{"SAR":12}}',
    ],
)
def test_unusable_source_is_rejected(body):
    with pytest.raises(ValueError):
        fx_service.parse_rates(body)
