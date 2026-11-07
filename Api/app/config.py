from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    env: str = "development"

    database_url: str

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    upload_dir: str = "./uploads"
    public_media_base_url: str | None = None

    admin_cors_origins: list[str] = ["http://localhost:3000"]
    storefront_cors_origins: list[str] = ["http://localhost:3100"]
    # The storefront caches catalogue reads; after an admin write or an order
    # the API calls this so the change shows at once. Empty disables it.
    storefront_revalidate_url: str = ""
    storefront_revalidate_secret: str = ""

    # Where a password-reset link points. Must be the public storefront origin,
    # not the API's — the link is opened by a person, not by this service.
    storefront_base_url: str = "http://localhost:3100"

    # Hesabe. Leave any of these empty and online payment simply is not offered.
    # hesabe_base_url is https://api.hesabe.com, or https://sandbox.hesabe.com
    # with Hesabe's sandbox keys: never mix the two.
    hesabe_base_url: str = ""
    hesabe_merchant_code: str = ""
    hesabe_access_code: str = ""
    hesabe_secret_key: str = ""
    hesabe_iv_key: str = ""
    # Porter Express, the courier. Leave any empty and sending orders is off.
    # Signs in with the Porter portal account (support@...), so these are that
    # login: base URL https://api.porterex.com.
    porter_base_url: str = ""
    porter_email: str = ""
    porter_password: str = ""
    # This API as the public internet reaches it. Hesabe sends customers and
    # webhooks here, so unlike storefront_base_url it must be the API's origin.
    shop_api_public_url: str = "http://localhost:8000"

    # Mail. With no host configured the mailer logs the message instead of
    # sending it, so the flow is exercisable in development without a relay and
    # nothing silently pretends to have delivered an email.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    mail_from: str = "no-reply@grc.local"
    mail_from_name: str = "GR8"

    password_reset_token_expire_minutes: int = 60


settings = Settings()
