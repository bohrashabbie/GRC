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

    # Where a password-reset link points. Must be the public storefront origin,
    # not the API's — the link is opened by a person, not by this service.
    storefront_base_url: str = "http://localhost:3100"

    # Mail. With no host configured the mailer logs the message instead of
    # sending it, so the flow is exercisable in development without a relay and
    # nothing silently pretends to have delivered an email.
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    mail_from: str = "no-reply@grc.local"
    mail_from_name: str = "GRC"

    password_reset_token_expire_minutes: int = 60


settings = Settings()
