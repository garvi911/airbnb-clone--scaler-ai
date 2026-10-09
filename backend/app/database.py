import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = os.environ.get('DATABASE_PATH', str(Path(__file__).resolve().parents[1] / 'airbnb.db'))


@contextmanager
def connect():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=15, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys = ON')
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize():
    with connect() as db:
        db.execute('PRAGMA journal_mode = WAL')
        db.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL, initials TEXT NOT NULL,
            bio TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY, host_id INTEGER NOT NULL REFERENCES users(id),
            title TEXT NOT NULL, description TEXT NOT NULL, location TEXT NOT NULL,
            property_type TEXT NOT NULL, category TEXT NOT NULL,
            price INTEGER NOT NULL CHECK(price > 0), capacity INTEGER NOT NULL CHECK(capacity > 0),
            bedrooms INTEGER NOT NULL DEFAULT 1, bathrooms INTEGER NOT NULL DEFAULT 1,
            active INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id),
            url TEXT NOT NULL, position INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS amenities (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
        CREATE TABLE IF NOT EXISTS listing_amenities (
            listing_id INTEGER NOT NULL REFERENCES listings(id), amenity_id INTEGER NOT NULL REFERENCES amenities(id),
            PRIMARY KEY (listing_id, amenity_id)
        );
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id),
            user_id INTEGER NOT NULL REFERENCES users(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            comment TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id),
            guest_id INTEGER NOT NULL REFERENCES users(id), check_in TEXT NOT NULL, check_out TEXT NOT NULL,
            guests INTEGER NOT NULL CHECK(guests > 0), nights INTEGER NOT NULL,
            nightly_price INTEGER NOT NULL, subtotal INTEGER NOT NULL, fee INTEGER NOT NULL, total INTEGER NOT NULL,
            listing_title TEXT NOT NULL, location TEXT NOT NULL, image_url TEXT NOT NULL,
            request_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(guest_id, request_key), CHECK(check_out > check_in)
        );
        CREATE TABLE IF NOT EXISTS favorites (
            user_id INTEGER NOT NULL REFERENCES users(id), listing_id INTEGER NOT NULL REFERENCES listings(id),
            PRIMARY KEY(user_id, listing_id)
        );
        CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(listing_id, check_in, check_out);
        CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings(guest_id);
        CREATE INDEX IF NOT EXISTS idx_listing_host ON listings(host_id);
        ''')
