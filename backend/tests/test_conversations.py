def _create_listing(client, headers, **overrides):
    payload = {"title": "Desk lamp", "description": "Works great", "price": "12.50"}
    payload.update(overrides)
    res = client.post("/api/v1/listings", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def test_start_conversation_requires_auth(client, auth_headers):
    seller_headers = auth_headers(email="seller@berea.edu")
    listing = _create_listing(client, seller_headers)

    res = client.post(
        "/api/v1/conversations", json={"listing_id": listing["id"], "body": "Is this available?"}
    )
    assert res.status_code == 401


def test_cannot_message_own_listing(client, auth_headers):
    headers = auth_headers(email="seller@berea.edu")
    listing = _create_listing(client, headers)

    res = client.post(
        "/api/v1/conversations",
        json={"listing_id": listing["id"], "body": "Hello myself"},
        headers=headers,
    )
    assert res.status_code == 400


def test_start_conversation_not_found(client, auth_headers):
    headers = auth_headers(email="buyer@berea.edu")
    res = client.post(
        "/api/v1/conversations", json={"listing_id": 999, "body": "Is this available?"}, headers=headers
    )
    assert res.status_code == 404


def test_start_conversation_success(client, auth_headers):
    seller_headers = auth_headers(email="seller@berea.edu", full_name="Seller Sam")
    buyer_headers = auth_headers(email="buyer@berea.edu", full_name="Buyer Bob")
    listing = _create_listing(client, seller_headers, title="Desk lamp")

    res = client.post(
        "/api/v1/conversations",
        json={"listing_id": listing["id"], "body": "Is this available?"},
        headers=buyer_headers,
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["listing_id"] == listing["id"]
    assert body["listing_title"] == "Desk lamp"
    assert body["buyer_name"] == "Buyer Bob"
    assert body["seller_name"] == "Seller Sam"
    assert len(body["messages"]) == 1
    assert body["messages"][0]["body"] == "Is this available?"


def test_start_conversation_reuses_existing_thread(client, auth_headers):
    seller_headers = auth_headers(email="seller@berea.edu")
    buyer_headers = auth_headers(email="buyer@berea.edu")
    listing = _create_listing(client, seller_headers)

    first = client.post(
        "/api/v1/conversations",
        json={"listing_id": listing["id"], "body": "Is this available?"},
        headers=buyer_headers,
    )
    second = client.post(
        "/api/v1/conversations",
        json={"listing_id": listing["id"], "body": "Still there?"},
        headers=buyer_headers,
    )

    assert first.json()["id"] == second.json()["id"]
    assert len(second.json()["messages"]) == 2


def test_list_conversations_visible_to_both_participants_only(client, auth_headers):
    seller_headers = auth_headers(email="seller@berea.edu", full_name="Seller Sam")
    buyer_headers = auth_headers(email="buyer@berea.edu", full_name="Buyer Bob")
    stranger_headers = auth_headers(email="stranger@berea.edu", full_name="Stranger Steve")
    listing = _create_listing(client, seller_headers)
    client.post(
        "/api/v1/conversations",
        json={"listing_id": listing["id"], "body": "Is this available?"},
        headers=buyer_headers,
    )

    buyer_view = client.get("/api/v1/conversations", headers=buyer_headers)
    seller_view = client.get("/api/v1/conversations", headers=seller_headers)
    stranger_view = client.get("/api/v1/conversations", headers=stranger_headers)

    assert len(buyer_view.json()) == 1
    assert buyer_view.json()[0]["other_user_name"] == "Seller Sam"
    assert len(seller_view.json()) == 1
    assert seller_view.json()[0]["other_user_name"] == "Buyer Bob"
    assert seller_view.json()[0]["last_message"] == "Is this available?"
    assert stranger_view.json() == []


def test_get_conversation_requires_participant(client, auth_headers):
    seller_headers = auth_headers(email="seller@berea.edu")
    buyer_headers = auth_headers(email="buyer@berea.edu")
    stranger_headers = auth_headers(email="stranger@berea.edu")
    listing = _create_listing(client, seller_headers)
    created = client.post(
        "/api/v1/conversations",
        json={"listing_id": listing["id"], "body": "Is this available?"},
        headers=buyer_headers,
    ).json()

    res = client.get(f"/api/v1/conversations/{created['id']}", headers=stranger_headers)
    assert res.status_code == 403


def test_get_conversation_not_found(client, auth_headers):
    headers = auth_headers()
    res = client.get("/api/v1/conversations/999", headers=headers)
    assert res.status_code == 404


def test_send_message_requires_participant(client, auth_headers):
    seller_headers = auth_headers(email="seller@berea.edu")
    buyer_headers = auth_headers(email="buyer@berea.edu")
    stranger_headers = auth_headers(email="stranger@berea.edu")
    listing = _create_listing(client, seller_headers)
    created = client.post(
        "/api/v1/conversations",
        json={"listing_id": listing["id"], "body": "Is this available?"},
        headers=buyer_headers,
    ).json()

    res = client.post(
        f"/api/v1/conversations/{created['id']}/messages",
        json={"body": "butting in"},
        headers=stranger_headers,
    )
    assert res.status_code == 403


def test_send_message_success_seller_reply(client, auth_headers):
    seller_headers = auth_headers(email="seller@berea.edu")
    buyer_headers = auth_headers(email="buyer@berea.edu")
    listing = _create_listing(client, seller_headers)
    created = client.post(
        "/api/v1/conversations",
        json={"listing_id": listing["id"], "body": "Is this available?"},
        headers=buyer_headers,
    ).json()

    res = client.post(
        f"/api/v1/conversations/{created['id']}/messages",
        json={"body": "Yes, still available!"},
        headers=seller_headers,
    )
    assert res.status_code == 201
    assert res.json()["body"] == "Yes, still available!"

    thread = client.get(f"/api/v1/conversations/{created['id']}", headers=buyer_headers)
    assert len(thread.json()["messages"]) == 2
