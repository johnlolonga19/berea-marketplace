def _create_listing(client, headers, **overrides):
    payload = {
        "title": "Desk lamp",
        "description": "Works great",
        "price": "12.50",
    }
    payload.update(overrides)
    res = client.post("/api/v1/listings", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def test_list_listings_public_no_auth(client, auth_headers):
    headers = auth_headers()
    _create_listing(client, headers)

    res = client.get("/api/v1/listings")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_create_listing_requires_auth(client):
    res = client.post(
        "/api/v1/listings",
        json={"title": "Desk lamp", "description": "Works great", "price": "12.50"},
    )
    assert res.status_code == 401


def test_create_listing_success(client, auth_headers):
    headers = auth_headers()
    listing = _create_listing(client, headers, title="Textbook")
    assert listing["title"] == "Textbook"
    assert listing["is_sold"] is False
    assert listing["owner_id"] is not None


def test_get_listing_not_found(client):
    res = client.get("/api/v1/listings/999")
    assert res.status_code == 404


def test_get_listing_public(client, auth_headers):
    headers = auth_headers()
    listing = _create_listing(client, headers)

    res = client.get(f"/api/v1/listings/{listing['id']}")
    assert res.status_code == 200
    assert res.json()["id"] == listing["id"]


def test_update_listing_requires_ownership(client, auth_headers):
    owner_headers = auth_headers(email="owner@berea.edu")
    other_headers = auth_headers(email="other@berea.edu")
    listing = _create_listing(client, owner_headers)

    res = client.patch(
        f"/api/v1/listings/{listing['id']}", json={"price": "1.00"}, headers=other_headers
    )
    assert res.status_code == 403


def test_update_listing_owner_success(client, auth_headers):
    headers = auth_headers()
    listing = _create_listing(client, headers)

    res = client.patch(
        f"/api/v1/listings/{listing['id']}", json={"is_sold": True}, headers=headers
    )
    assert res.status_code == 200
    assert res.json()["is_sold"] is True


def test_update_listing_requires_auth(client, auth_headers):
    headers = auth_headers()
    listing = _create_listing(client, headers)

    res = client.patch(f"/api/v1/listings/{listing['id']}", json={"price": "1.00"})
    assert res.status_code == 401


def test_delete_listing_requires_ownership(client, auth_headers):
    owner_headers = auth_headers(email="owner2@berea.edu")
    other_headers = auth_headers(email="other2@berea.edu")
    listing = _create_listing(client, owner_headers)

    res = client.delete(f"/api/v1/listings/{listing['id']}", headers=other_headers)
    assert res.status_code == 403


def test_delete_listing_owner_success(client, auth_headers):
    headers = auth_headers()
    listing = _create_listing(client, headers)

    res = client.delete(f"/api/v1/listings/{listing['id']}", headers=headers)
    assert res.status_code == 204

    res = client.get(f"/api/v1/listings/{listing['id']}")
    assert res.status_code == 404


def test_list_listings_filter_by_is_sold(client, auth_headers):
    headers = auth_headers()
    sold = _create_listing(client, headers, title="Sold item")
    _create_listing(client, headers, title="Available item")
    client.patch(f"/api/v1/listings/{sold['id']}", json={"is_sold": True}, headers=headers)

    res = client.get("/api/v1/listings", params={"is_sold": True})
    assert res.status_code == 200
    titles = [l["title"] for l in res.json()]
    assert titles == ["Sold item"]


def test_search_matches_title_case_insensitively(client, auth_headers):
    headers = auth_headers()
    _create_listing(client, headers, title="Calculus Textbook")
    _create_listing(client, headers, title="Mini Fridge")

    res = client.get("/api/v1/listings", params={"q": "calculus"})
    assert res.status_code == 200
    titles = [l["title"] for l in res.json()]
    assert titles == ["Calculus Textbook"]


def test_search_matches_description(client, auth_headers):
    headers = auth_headers()
    _create_listing(client, headers, title="Lamp", description="Great for a dorm desk")
    _create_listing(client, headers, title="Bike", description="21-speed mountain bike")

    res = client.get("/api/v1/listings", params={"q": "dorm"})
    assert res.status_code == 200
    titles = [l["title"] for l in res.json()]
    assert titles == ["Lamp"]


def test_search_with_no_matches_returns_empty(client, auth_headers):
    headers = auth_headers()
    _create_listing(client, headers, title="Lamp")

    res = client.get("/api/v1/listings", params={"q": "nonexistent"})
    assert res.status_code == 200
    assert res.json() == []


def test_filter_by_price_range(client, auth_headers):
    headers = auth_headers()
    _create_listing(client, headers, title="Cheap", price="5.00")
    _create_listing(client, headers, title="Mid", price="50.00")
    _create_listing(client, headers, title="Expensive", price="500.00")

    res = client.get("/api/v1/listings", params={"min_price": "10.00", "max_price": "100.00"})
    assert res.status_code == 200
    titles = [l["title"] for l in res.json()]
    assert titles == ["Mid"]


def test_filter_by_min_price_only(client, auth_headers):
    headers = auth_headers()
    _create_listing(client, headers, title="Cheap", price="5.00")
    _create_listing(client, headers, title="Expensive", price="500.00")

    res = client.get("/api/v1/listings", params={"min_price": "100.00"})
    assert res.status_code == 200
    titles = [l["title"] for l in res.json()]
    assert titles == ["Expensive"]


def test_combined_search_and_price_filters(client, auth_headers):
    headers = auth_headers()
    _create_listing(client, headers, title="Cheap textbook", price="5.00")
    _create_listing(client, headers, title="Pricey textbook", price="500.00")
    _create_listing(client, headers, title="Cheap fridge", price="5.00")

    res = client.get(
        "/api/v1/listings", params={"q": "textbook", "max_price": "100.00"}
    )
    assert res.status_code == 200
    titles = [l["title"] for l in res.json()]
    assert titles == ["Cheap textbook"]
