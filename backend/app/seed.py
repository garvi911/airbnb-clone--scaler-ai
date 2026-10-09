from datetime import date, timedelta
from .database import connect, initialize

AMENITIES = ['Wifi', 'Kitchen', 'Pool', 'Free parking', 'Air conditioning', 'Washing machine', 'Workspace', 'Garden']
PHOTOS = [
    'photo-1613490493576-7fde63acd811', 'photo-1600210492486-724fe5c67fb0',
    'photo-1600607687920-4e2a09cf159d', 'photo-1600566753086-00f18fb6b3ea',
    'photo-1449158743715-0a90ebb6d2d8', 'photo-1449844908441-8829872d2607',
    'photo-1510798831971-661eb04b3739', 'photo-1518780664697-55e3ad937233',
    'photo-1522708323590-d24dbb6b0267', 'photo-1502672260266-1c1ef2d93688',
    'photo-1564013799919-ab600027ffc6', 'photo-1600047509807-ba8f99d2cdde',
]
PROPERTIES = [
    ('Sunlit villa with a private pool', 'Assagao, Goa', 'Villa', 'Pools', 6800, 6),
    ('A quiet cabin above the clouds', 'Jibhi, Himachal Pradesh', 'Cabin', 'Cabins', 4200, 4),
    ('Coastal escape with ocean views', 'Varkala, Kerala', 'House', 'Beachfront', 5100, 4),
    ('The courtyard house', 'Jaipur, Rajasthan', 'House', 'Design', 3900, 6),
    ('Forest hideaway with a garden', 'Coorg, Karnataka', 'Cabin', 'Countryside', 5800, 4),
    ('A little home in the hills', 'Mussoorie, Uttarakhand', 'Cabin', 'Amazing views', 3600, 2),
    ('Palm Grove pool villa', 'Siolim, Goa', 'Villa', 'Pools', 9200, 8),
    ('Mountain mornings at Cedar House', 'Manali, Himachal Pradesh', 'House', 'Amazing views', 4700, 6),
    ('The airy city studio', 'Bengaluru, Karnataka', 'Apartment', 'Design', 2800, 2),
    ('Slow days by the sea', 'Alibaug, Maharashtra', 'Villa', 'Beachfront', 7200, 6),
    ('Coffee estate cottage', 'Chikmagalur, Karnataka', 'Cabin', 'Countryside', 4400, 4),
    ('Terrace apartment in the old town', 'Udaipur, Rajasthan', 'Apartment', 'Amazing views', 3200, 3),
    ('Garden villa for unhurried weekends', 'Lonavala, Maharashtra', 'Villa', 'Pools', 8200, 8),
    ('Pine & peace woodland cabin', 'Nainital, Uttarakhand', 'Cabin', 'Cabins', 4100, 3),
    ('White walls, blue sea', 'Pondicherry, Tamil Nadu', 'House', 'Beachfront', 4900, 4),
    ('A thoughtfully designed loft', 'Mumbai, Maharashtra', 'Apartment', 'Design', 5500, 2),
    ('Tea garden retreat', 'Munnar, Kerala', 'House', 'Countryside', 6100, 6),
    ('The hillside reading room', 'Dharamshala, Himachal Pradesh', 'Cabin', 'Cabins', 3400, 2),
    ('Golden hour pool house', 'Anjuna, Goa', 'Villa', 'Pools', 7800, 6),
    ('Lakeview apartment with a balcony', 'Udaipur, Rajasthan', 'Apartment', 'Amazing views', 4500, 4),
    ('Beach walks at sunrise', 'Gokarna, Karnataka', 'House', 'Beachfront', 3800, 3),
    ('The mango orchard stay', 'Karjat, Maharashtra', 'House', 'Countryside', 5600, 6),
    ('Minimal home with warm details', 'Delhi, Delhi', 'Apartment', 'Design', 3300, 3),
    ('A-frame in the mountain forest', 'Kasol, Himachal Pradesh', 'Cabin', 'Cabins', 4600, 4),
]


def photo(index):
    return f'/stays/{index % len(PHOTOS) + 1}.jpg'


def cover(index, kind):
    choices = {'Villa': [0, 10, 11], 'Cabin': [4, 5, 6, 7], 'Apartment': [8, 9, 1], 'House': [11, 10, 3]}
    values = choices[kind]
    return values[(index - 1) % len(values)]


def seed():
    initialize()
    with connect() as db:
        db.execute('BEGIN IMMEDIATE')
        if db.execute('SELECT COUNT(*) FROM users').fetchone()[0]:
            db.rollback()
            return
        db.executemany('INSERT INTO users VALUES (?,?,?,?)', [
            (1, 'Ananya', 'AN', 'Always planning the next little escape.'),
            (2, 'Arjun', 'AR', 'Sharing beautiful spaces and local recommendations since 2021.'),
            (3, 'Meera', 'ME', 'Thoughtful homes, warm welcomes, and a love of the outdoors.'),
            (4, 'Kabir', 'KA', 'A traveller who feels at home in the mountains.'),
        ])
        db.executemany('INSERT INTO amenities(name) VALUES (?)', [(a,) for a in AMENITIES])
        for i, (title, location, kind, category, price, capacity) in enumerate(PROPERTIES, 1):
            description = f'Make yourself at home at {title.lower()} in {location.split(",")[0]}. Light-filled spaces, comfortable beds, and a peaceful setting make this a lovely base for a few days away.\n\nStart the morning slowly, explore the neighbourhood, and return to a space designed for time together. Your host shares local favourites before arrival. The entire property is yours during your stay.'
            db.execute('INSERT INTO listings VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',
                       (i, 2 if i % 2 else 3, title, description, location, kind, category, price * 100, capacity, max(1, capacity // 2), max(1, capacity // 3)))
            order = [cover(i, kind), 1, 2, 3, 9]
            db.executemany('INSERT INTO images(listing_id,url,position) VALUES (?,?,?)', [(i, photo(p), n) for n, p in enumerate(order)])
            aids = {1, 2, 4, 7, 8}
            if category == 'Pools':
                aids.add(3)
            if kind != 'Cabin':
                aids.update([5, 6])
            db.executemany('INSERT INTO listing_amenities VALUES (?,?)', [(i, a) for a in sorted(aids)])
            for user, rating, comment in [(1, 5, 'A beautiful space and a wonderfully easy stay. The photos capture it perfectly.'), (4, 5 if i % 3 else 4, 'We loved the peaceful setting. Our host was welcoming and shared some great local tips.')]:
                db.execute('INSERT INTO reviews(listing_id,user_id,rating,comment,created_at) VALUES (?,?,?,?,?)', (i, user, rating, comment, str(date.today() - timedelta(days=30 + i))))
            start = date.today() + timedelta(days=7 + i % 4)
            total = price * 100 * 3
            db.execute('INSERT INTO bookings(listing_id,guest_id,check_in,check_out,guests,nights,nightly_price,subtotal,fee,total,listing_title,location,image_url,request_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                       (i, 4, str(start), str(start + timedelta(days=3)), 2, 3, price * 100, total, total // 10, total + total // 10, title, location, photo(cover(i, kind)), f'seed-{i}'))
        db.commit()


if __name__ == '__main__':
    seed()
    print('Demo data ready. Existing databases are left unchanged.')
