"""Seed the database with a demo user and sample listings for local development.

Usage (from backend/, with the venv active and .env pointing at a real DB):
    python -m app.seed

Safe to re-run: does nothing if the demo user already exists.
"""

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app import models  # noqa: F401
from app.models.listing import Listing
from app.models.user import User

DEMO_EMAIL = "demo@berea.edu"
DEMO_PASSWORD = "demopassword123"
DEMO_NAME = "Demo Student"

DEMO_LISTINGS = [
    ("Calculus II Textbook", "Barely used, no highlighting. Covers Berea MATH 201.", "35.00"),
    ("Mini Fridge", "3.2 cu ft, works great, moving out and don't need it anymore.", "60.00"),
    ("Desk Lamp", "Adjustable LED desk lamp, three brightness settings.", "12.50"),
    ("Mountain Bike", "21-speed, some rust on the chain but rides fine.", "90.00"),
    ("TI-84 Plus Calculator", "Required for most intro math/science courses.", "45.00"),
    ("Twin XL Bedding Set", "Sheets, comforter, two pillowcases. Washed and ready.", "20.00"),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing is not None:
            print(f"Demo user {DEMO_EMAIL} already exists, skipping seed.")
            return

        demo_user = User(
            email=DEMO_EMAIL,
            hashed_password=hash_password(DEMO_PASSWORD),
            full_name=DEMO_NAME,
            is_verified=True,
        )
        db.add(demo_user)
        db.flush()

        for title, description, price in DEMO_LISTINGS:
            db.add(
                Listing(
                    title=title,
                    description=description,
                    price=price,
                    owner_id=demo_user.id,
                )
            )
        db.commit()
        print(f"Seeded demo user {DEMO_EMAIL} (password: {DEMO_PASSWORD}) with {len(DEMO_LISTINGS)} listings.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
