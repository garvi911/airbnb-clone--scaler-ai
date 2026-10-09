from contextlib import asynccontextmanager
from datetime import date
import os
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from urllib.parse import urlparse
from .database import connect, initialize


@asynccontextmanager
async def lifespan(app):
    initialize()
    yield


app = FastAPI(title='Airbnb assignment API', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('FRONTEND_ORIGINS', 'http://localhost:3000').split(','), allow_methods=['*'], allow_headers=['*'])


def fail(status, message):
    raise HTTPException(status_code=status, detail=message)


def user_id(db, value):
    if value is None or not db.execute('SELECT id FROM users WHERE id=?', (value,)).fetchone():
        fail(401, 'Select a demo user to continue.')
    return value


def listing(db, lid, active=True):
    row = db.execute('SELECT * FROM listings WHERE id=?' + (' AND active=1' if active else ''), (lid,)).fetchone()
    if not row:
        fail(404, 'This listing is no longer available.')
    return row


def serialize_listing(db, row):
    data = dict(row)
    data['images'] = [r[0] for r in db.execute('SELECT url FROM images WHERE listing_id=? ORDER BY position', (row['id'],))]
    data['amenities'] = [r[0] for r in db.execute('SELECT name FROM amenities JOIN listing_amenities ON amenities.id=amenity_id WHERE listing_id=? ORDER BY name', (row['id'],))]
    data['host'] = dict(db.execute('SELECT * FROM users WHERE id=?', (row['host_id'],)).fetchone())
    # Seeded review ratings only; review creation is outside required scope.
    reviews = [dict(r) for r in db.execute('SELECT reviews.*, users.name, users.initials FROM reviews JOIN users ON user_id=users.id WHERE listing_id=? ORDER BY created_at DESC', (row['id'],))]
    data['reviews'] = reviews
    data['rating'] = round(sum(r['rating'] for r in reviews) / len(reviews), 2) if reviews else None
    return data


class BookingInput(BaseModel):
    listing_id: int
    check_in: date
    check_out: date
    guests: Annotated[int, Field(strict=True, ge=1, le=30)]

    @model_validator(mode='after')
    def dates(self):
        if self.check_in < date.today() or self.check_out <= self.check_in:
            raise ValueError('Choose a future check-in and a later check-out.')
        return self


class ReservationInput(BookingInput):
    request_key: str = Field(min_length=8, max_length=100)


class ListingInput(BaseModel):
    title: str = Field(min_length=5, max_length=100)
    description: str = Field(min_length=30, max_length=5000)
    location: str = Field(min_length=3, max_length=150)
    property_type: str
    category: str
    price: Annotated[int, Field(strict=True, ge=10000, le=100000000)]
    capacity: Annotated[int, Field(strict=True, ge=1, le=30)]
    bedrooms: int = Field(ge=1, le=20)
    bathrooms: int = Field(ge=1, le=20)
    images: list[str] = Field(min_length=1, max_length=10)
    amenities: list[str] = Field(max_length=8)

    @model_validator(mode='after')
    def validate_choices(self):
        if self.property_type not in ['House', 'Apartment', 'Villa', 'Cabin']:
            raise ValueError('Choose a valid property type.')
        if self.category not in ['Pools', 'Cabins', 'Beachfront', 'Design', 'Countryside', 'Amazing views']:
            raise ValueError('Choose a valid category.')
        if not self.title.strip() or not self.description.strip() or not self.location.strip():
            raise ValueError('Text fields cannot be blank.')
        for image in self.images:
            parsed = urlparse(image)
            if image not in [f'/stays/{i}.jpg' for i in range(1, 13)] and not (parsed.scheme in ('https', 'http') and parsed.netloc):
                raise ValueError('Photos must be http(s) URLs or bundled demo images.')
        return self


def quote(db, data):
    row = listing(db, data.listing_id)
    if data.guests > row['capacity']:
        fail(422, f'This home accommodates up to {row["capacity"]} guests.')
    conflict = db.execute('SELECT id FROM bookings WHERE listing_id=? AND check_in < ? AND check_out > ?',
                          (data.listing_id, str(data.check_out), str(data.check_in))).fetchone()
    if conflict:
        fail(409, 'These dates are already booked. Please choose another stay.')
    nights = (data.check_out - data.check_in).days
    subtotal = row['price'] * nights
    fee = (subtotal + 5) // 10
    return dict(nights=nights, nightly_price=row['price'], subtotal=subtotal, fee=fee, total=subtotal + fee)


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.get('/users')
def users():
    with connect() as db:
        return [dict(r) for r in db.execute('SELECT * FROM users')]


@app.get('/amenities')
def amenities():
    with connect() as db:
        return [r[0] for r in db.execute('SELECT name FROM amenities ORDER BY id')]


@app.get('/listings')
def listings(location: str = '', category: str = '', property_type: str = '', amenities: str = '', min_price: int = Query(0, ge=0), max_price: int = Query(100000000, ge=0), guests: int = Query(1, ge=1), check_in: date | None = None, check_out: date | None = None, page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=48)):
    if bool(check_in) != bool(check_out):
        fail(422, 'Provide both check-in and check-out.')
    if check_in and (check_in < date.today() or check_out <= check_in):
        fail(422, 'Choose valid future dates.')
    if min_price > max_price:
        fail(422, 'Minimum price cannot exceed maximum price.')
    conditions = ['active=1', 'location LIKE ?', 'capacity >= ?', 'price BETWEEN ? AND ?']
    args = [f'%{location}%', guests, min_price, max_price]
    for column, value in [('category', category), ('property_type', property_type)]:
        if value:
            conditions.append(f'{column}=?')
            args.append(value)
    for amenity in filter(None, amenities.split(',')):
        conditions.append('EXISTS (SELECT 1 FROM listing_amenities la JOIN amenities a ON a.id=la.amenity_id WHERE la.listing_id=listings.id AND a.name=?)')
        args.append(amenity)
    if check_in:
        conditions.append('NOT EXISTS (SELECT 1 FROM bookings b WHERE b.listing_id=listings.id AND b.check_in < ? AND b.check_out > ?)')
        args.extend([str(check_out), str(check_in)])
    clause = ' AND '.join(conditions)
    with connect() as db:
        count = db.execute('SELECT COUNT(*) FROM listings WHERE ' + clause, args).fetchone()[0]
        rows = db.execute('SELECT * FROM listings WHERE ' + clause + ' ORDER BY id LIMIT ? OFFSET ?', args + [page_size, (page - 1) * page_size]).fetchall()
        return {'items': [serialize_listing(db, r) for r in rows], 'total': count, 'page': page, 'page_size': page_size}


@app.get('/listings/{lid}')
def detail(lid: int):
    with connect() as db:
        return serialize_listing(db, listing(db, lid))


@app.get('/listings/{lid}/availability')
def availability(lid: int):
    with connect() as db:
        listing(db, lid)
        return [dict(r) for r in db.execute('SELECT check_in,check_out FROM bookings WHERE listing_id=? AND check_out > ? ORDER BY check_in', (lid, str(date.today())))]


@app.post('/bookings/quote')
def booking_quote(data: BookingInput):
    with connect() as db:
        return quote(db, data)


@app.post('/bookings', status_code=201)
def book(data: ReservationInput, x_user_id: int | None = Header(None)):
    with connect() as db:
        uid = user_id(db, x_user_id)
        # Serialize writers before checking availability. WAL permits readers during this transaction.
        db.execute('BEGIN IMMEDIATE')
        existing = db.execute('SELECT * FROM bookings WHERE guest_id=? AND request_key=?', (uid, data.request_key)).fetchone()
        if existing:
            if any(str(existing[k]) != str(getattr(data, k)) for k in ['listing_id', 'check_in', 'check_out', 'guests']):
                fail(409, 'Checkout reference was already used for another trip.')
            return dict(existing)
        prices = quote(db, data)
        row = listing(db, data.listing_id)
        image = db.execute('SELECT url FROM images WHERE listing_id=? ORDER BY position LIMIT 1', (data.listing_id,)).fetchone()[0]
        cur = db.execute('INSERT INTO bookings(listing_id,guest_id,check_in,check_out,guests,nights,nightly_price,subtotal,fee,total,listing_title,location,image_url,request_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                         (data.listing_id, uid, str(data.check_in), str(data.check_out), data.guests, prices['nights'], prices['nightly_price'], prices['subtotal'], prices['fee'], prices['total'], row['title'], row['location'], image, data.request_key))
        result = dict(db.execute('SELECT * FROM bookings WHERE id=?', (cur.lastrowid,)).fetchone())
        db.commit()
        return result


@app.get('/bookings/{bid}')
def booking(bid: int, x_user_id: int | None = Header(None)):
    with connect() as db:
        uid = user_id(db, x_user_id)
        row = db.execute('SELECT * FROM bookings WHERE id=? AND guest_id=?', (bid, uid)).fetchone()
        if not row:
            fail(404, 'Reservation not found for this demo user.')
        return dict(row)


@app.get('/me/bookings')
def trips(x_user_id: int | None = Header(None)):
    with connect() as db:
        return [dict(r) for r in db.execute('SELECT * FROM bookings WHERE guest_id=? ORDER BY check_in DESC', (user_id(db, x_user_id),))]


@app.get('/me/listings')
def host_listings(x_user_id: int | None = Header(None)):
    with connect() as db:
        return [serialize_listing(db, r) for r in db.execute('SELECT * FROM listings WHERE host_id=? AND active=1 ORDER BY id DESC', (user_id(db, x_user_id),))]


@app.get('/me/host-bookings')
def host_bookings(x_user_id: int | None = Header(None)):
    with connect() as db:
        return [dict(r) for r in db.execute('SELECT b.*,u.name AS guest_name FROM bookings b JOIN listings l ON l.id=b.listing_id JOIN users u ON u.id=b.guest_id WHERE l.host_id=? ORDER BY b.check_in DESC', (user_id(db, x_user_id),))]


def save_relations(db, lid, data):
    for name in data.amenities:
        if not db.execute('SELECT id FROM amenities WHERE name=?', (name,)).fetchone():
            fail(422, f'Unknown amenity: {name}')
    db.execute('DELETE FROM images WHERE listing_id=?', (lid,))
    db.execute('DELETE FROM listing_amenities WHERE listing_id=?', (lid,))
    db.executemany('INSERT INTO images(listing_id,url,position) VALUES (?,?,?)', [(lid, str(url), i) for i, url in enumerate(data.images)])
    for name in set(data.amenities):
        db.execute('INSERT INTO listing_amenities SELECT ?,id FROM amenities WHERE name=?', (lid, name))


@app.post('/listings', status_code=201)
def create_listing(data: ListingInput, x_user_id: int | None = Header(None)):
    with connect() as db:
        uid = user_id(db, x_user_id)
        db.execute('BEGIN IMMEDIATE')
        fields = data.model_dump(exclude={'images', 'amenities'})
        cur = db.execute(f'INSERT INTO listings(host_id,{",".join(fields)}) VALUES ({",".join("?" for _ in range(len(fields)+1))})', [uid] + list(fields.values()))
        save_relations(db, cur.lastrowid, data)
        db.commit()
        return serialize_listing(db, listing(db, cur.lastrowid))


@app.put('/listings/{lid}')
def edit_listing(lid: int, data: ListingInput, x_user_id: int | None = Header(None)):
    with connect() as db:
        uid = user_id(db, x_user_id)
        db.execute('BEGIN IMMEDIATE')
        if listing(db, lid)['host_id'] != uid:
            fail(403, 'Only the owner can edit this listing.')
        fields = data.model_dump(exclude={'images', 'amenities'})
        db.execute(f'UPDATE listings SET {",".join(k+"=?" for k in fields)} WHERE id=?', list(fields.values()) + [lid])
        save_relations(db, lid, data)
        db.commit()
        return serialize_listing(db, listing(db, lid))


@app.delete('/listings/{lid}')
def delete_listing(lid: int, x_user_id: int | None = Header(None)):
    with connect() as db:
        uid = user_id(db, x_user_id)
        if listing(db, lid)['host_id'] != uid:
            fail(403, 'Only the owner can delete this listing.')
        db.execute('UPDATE listings SET active=0 WHERE id=?', (lid,))
        return {'deleted': True}


@app.get('/me/favorites')
def favorites(x_user_id: int | None = Header(None)):
    with connect() as db:
        uid = user_id(db, x_user_id)
        return [serialize_listing(db, r) for r in db.execute('SELECT l.* FROM listings l JOIN favorites f ON f.listing_id=l.id WHERE f.user_id=? AND l.active=1 ORDER BY l.id', (uid,))]


@app.put('/me/favorites/{lid}')
def add_favorite(lid: int, x_user_id: int | None = Header(None)):
    with connect() as db:
        uid = user_id(db, x_user_id)
        listing(db, lid)
        db.execute('INSERT OR IGNORE INTO favorites VALUES (?,?)', (uid, lid))
        return {'saved': True}


@app.delete('/me/favorites/{lid}')
def remove_favorite(lid: int, x_user_id: int | None = Header(None)):
    with connect() as db:
        db.execute('DELETE FROM favorites WHERE user_id=? AND listing_id=?', (user_id(db, x_user_id), lid))
        return {'saved': False}
