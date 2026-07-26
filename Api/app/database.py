from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.models.base import Base

__all__ = ["Base", "engine", "SessionLocal", "get_db"]

# Pool sizing matters a great deal here because the database is remote.
# Measured against the current host: ~205 ms TCP RTT, ~4.9 s to establish a
# brand-new connection (TCP + TLS + auth), and ~219 ms per statement once warm.
#
# So the expensive thing is *opening* connections, not running queries. The pool
# is therefore sized to comfortably cover concurrent requests and told never to
# discard idle connections, so a warm connection is almost always waiting.
#
#   pool_size / max_overflow
#       FastAPI runs sync `def` routes in a threadpool (40 workers by default),
#       and each in-flight request holds one connection for its lifetime. A
#       pool of 5 (the default) would serialise requests behind connection
#       checkout and, worse, churn overflow connections that each cost ~5 s.
#   pool_recycle = 1800
#       Server-side idle timeouts and NAT/firewall table expiry silently drop
#       long-lived connections. Recycling at 30 minutes stays under the common
#       defaults while still being far longer than any request.
#   pool_pre_ping = True
#       Costs one extra round trip (~219 ms) per checkout, which is not free —
#       but a stale connection surfaces to the user as a 500, and paying 219 ms
#       to never serve that is the right trade for an admin panel. Combined
#       with pool_recycle the ping almost always hits a healthy connection.
#   pool_timeout = 30
#       Fail with a clear pool-exhaustion error rather than hanging forever.
engine = create_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=10,
    pool_recycle=1800,
    pool_pre_ping=True,
    pool_timeout=30,
    # Round trips dominate, so let psycopg send parameters without a separate
    # prepare step for one-off statements.
    connect_args={"prepare_threshold": None},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
