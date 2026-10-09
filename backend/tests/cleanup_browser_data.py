"""Remove only fixtures created by journeys.spec.ts from a local demo database."""
from app.database import connect

with connect() as db:
    db.execute('BEGIN IMMEDIATE')
    ids = [r[0] for r in db.execute("SELECT id FROM listings WHERE host_id=1 AND title IN ('Browser test garden home','Browser test garden retreat')")]
    for lid in ids:
        for table in ['bookings', 'favorites', 'reviews', 'images', 'listing_amenities']:
            db.execute(f'DELETE FROM {table} WHERE listing_id=?', (lid,))
        db.execute('DELETE FROM listings WHERE id=?', (lid,))
    db.commit()
print(f'Removed {len(ids)} browser-test listing fixtures.')
