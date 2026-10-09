from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from app import database
from app.main import app
from app.seed import seed


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, 'DB_PATH', str(tmp_path / 'test.db'))
    seed()
    with TestClient(app) as client:
        yield client


def headers(user=1):
    return {'X-User-Id': str(user)}


def reservation(offset=50, nights=3, **overrides):
    start = date.today() + timedelta(days=offset)
    return dict(listing_id=1, check_in=str(start), check_out=str(start + timedelta(days=nights)), guests=2, request_key=str(uuid4()), **overrides)


def test_search_combines_criteria_and_paginates(client):
    first = client.get('/listings').json()
    second = client.get('/listings?page=2').json()
    assert first['total'] == 24
    assert len(first['items']) == 12
    assert not {x['id'] for x in first['items']} & {x['id'] for x in second['items']}
    filtered = client.get('/listings', params={'location': 'Goa', 'guests': 6, 'category': 'Pools', 'amenities': 'Pool,Wifi', 'max_price': 800000}).json()['items']
    assert len(filtered) == 2
    assert all('Goa' in x['location'] and 'Pool' in x['amenities'] and x['capacity'] >= 6 for x in filtered)
    assert client.get('/listings?check_in=2020-01-01').status_code == 422
    assert client.get('/listings?min_price=500&max_price=100').status_code == 422


def test_booking_persists_blocks_dates_and_is_idempotent(client):
    payload = reservation()
    response = client.post('/bookings', json={**payload, 'total': 1}, headers=headers())
    assert response.status_code == 201, response.text
    booked = response.json()
    assert booked['subtotal'] == 680000 * 3
    assert booked['total'] == 2244000
    again = client.post('/bookings', json=payload, headers=headers()).json()
    assert again['id'] == booked['id']
    assert len(client.get('/me/bookings', headers=headers()).json()) == 1
    assert client.get(f'/bookings/{booked["id"]}', headers=headers(3)).status_code == 404
    assert client.get(f'/bookings/{booked["id"]}', headers=headers()).json()['total'] == booked['total']
    clash = client.post('/bookings', json=reservation(offset=51), headers=headers(3))
    assert clash.status_code == 409
    assert client.post('/bookings', json=reservation(offset=53), headers=headers(3)).status_code == 201
    available = client.get('/listings', params={'check_in': payload['check_in'], 'check_out': payload['check_out']}).json()
    assert 1 not in [x['id'] for x in available['items']]
    # A fresh connection confirms data lives on disk rather than in API state.
    with database.connect() as db:
        assert db.execute('SELECT total FROM bookings WHERE id=?', (booked['id'],)).fetchone()[0] == booked['total']


def test_invalid_booking_and_concurrent_conflict(client):
    payload = reservation()
    assert client.post('/bookings', json=payload).status_code == 401
    assert client.post('/bookings/quote', json={**payload, 'guests': 10}).status_code == 422
    assert client.post('/bookings/quote', json={**payload, 'guests': 1.5}).status_code == 422
    assert client.post('/bookings/quote', json={**payload, 'check_out': payload['check_in']}).status_code == 422
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: client.post('/bookings', json=reservation(), headers=headers()).status_code, range(2)))
    assert sorted(responses) == [201, 409]


def test_host_crud_favorites_and_history(client):
    original = client.get('/listings/1').json()
    fields = {k: original[k] for k in ['title','description','location','property_type','category','price','capacity','bedrooms','bathrooms','images','amenities']}
    assert client.put('/listings/1', json=fields, headers=headers(3)).status_code == 403
    assert client.delete('/listings/1', headers=headers(3)).status_code == 403
    created = client.post('/listings', json={**fields, 'title': 'A newly created home'}, headers=headers()).json()
    lid = created['id']
    assert created['host_id'] == 1
    edited = client.put(f'/listings/{lid}', json={**fields, 'title': 'Edited home with a view'}, headers=headers())
    assert edited.status_code == 200
    assert edited.json()['title'] == 'Edited home with a view'
    assert client.put(f'/me/favorites/{lid}', headers=headers()).status_code == 200
    assert len(client.get('/me/favorites', headers=headers()).json()) == 1
    assert client.get('/me/favorites', headers=headers(3)).json() == []
    client.delete(f'/me/favorites/{lid}', headers=headers())
    assert client.get('/me/favorites', headers=headers()).json() == []
    booking = client.post('/bookings', json={**reservation(), 'listing_id': lid}, headers=headers(3)).json()
    assert len(client.get('/me/host-bookings', headers=headers()).json()) == 1
    client.delete(f'/listings/{lid}', headers=headers())
    assert client.get(f'/listings/{lid}').status_code == 404
    saved = client.get(f'/bookings/{booking["id"]}', headers=headers(3)).json()
    assert saved['listing_title'] == 'Edited home with a view'
    assert len(client.get('/me/host-bookings', headers=headers()).json()) == 1


def test_seed_is_non_destructive_and_invalid_edit_rolls_back(client):
    seed()
    assert client.get('/listings').json()['total'] == 24
    original = client.get('/listings/1').json()
    invalid = {**original, 'title': 'Should not persist', 'amenities': ['Unknown amenity']}
    assert client.put('/listings/1', json=invalid, headers=headers(2)).status_code == 422
    assert client.get('/listings/1').json()['title'] == original['title']
