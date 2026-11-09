def _create_listing(client, headers):
    res = client.post(
        "/api/v1/listings",
        json={"title": "Desk lamp", "description": "Works great", "price": "12.50"},
        headers=headers,
    )
    assert res.status_code == 201, res.text
    return res.json()


def _unread(client, headers) -> int:
    res = client.get("/api/v1/conversations/unread-count", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()["conversations"]


def _summary(client, headers, conversation_id):
    res = client.get("/api/v1/conversations", headers=headers)
    assert res.status_code == 200, res.text
    return next(c for c in res.json() if c["id"] == conversation_id)


def _setup(client, auth_headers):
    seller = auth_headers(email="seller@berea.edu", full_name="Seller Sam")
    buyer = auth_headers(email="buyer@berea.edu", full_name="Buyer Bo")
    listing = _create_listing(client, seller)
    res = client.post(
        "/api/v1/conversations",
        json={"listing_id": listing["id"], "body": "Is this available?"},
        headers=buyer,
    )
    assert res.status_code == 201, res.text
    return seller, buyer, res.json()["id"]


def _send(client, headers, conversation_id, body):
    res = client.post(
        f"/api/v1/conversations/{conversation_id}/messages", json={"body": body}, headers=headers
    )
    assert res.status_code == 201, res.text


def test_unread_count_requires_auth(client):
    assert client.get("/api/v1/conversations/unread-count").status_code == 401


def test_new_message_is_unread_for_recipient_only(client, auth_headers):
    seller, buyer, conv_id = _setup(client, auth_headers)
    assert _unread(client, seller) == 1
    assert _summary(client, seller, conv_id)["unread_count"] == 1
    # The sender never sees their own message as unread.
    assert _unread(client, buyer) == 0
    assert _summary(client, buyer, conv_id)["unread_count"] == 0


def test_opening_conversation_marks_it_read(client, auth_headers):
    seller, _, conv_id = _setup(client, auth_headers)
    assert client.get(f"/api/v1/conversations/{conv_id}", headers=seller).status_code == 200
    assert _unread(client, seller) == 0
    assert _summary(client, seller, conv_id)["unread_count"] == 0


def test_reply_is_unread_for_the_other_side(client, auth_headers):
    seller, buyer, conv_id = _setup(client, auth_headers)
    client.get(f"/api/v1/conversations/{conv_id}", headers=seller)
    _send(client, seller, conv_id, "Yes, still available")
    assert _unread(client, buyer) == 1
    assert _unread(client, seller) == 0


def test_unread_counts_messages_but_badge_counts_conversations(client, auth_headers):
    seller, buyer, conv_id = _setup(client, auth_headers)
    _send(client, buyer, conv_id, "Can you do $10?")
    _send(client, buyer, conv_id, "I can pick up today")
    assert _summary(client, seller, conv_id)["unread_count"] == 3
    assert _unread(client, seller) == 1


def test_non_participant_has_no_unread(client, auth_headers):
    _setup(client, auth_headers)
    outsider = auth_headers(email="outsider@berea.edu")
    assert _unread(client, outsider) == 0
