def _setup(client, auth_headers):
    seller = auth_headers(email="seller@berea.edu", full_name="Seller Sam")
    buyer = auth_headers(email="buyer@berea.edu", full_name="Buyer Bo")
    res = client.post(
        "/api/v1/listings",
        json={"title": "Desk lamp", "description": "Works great", "price": "12.50"},
        headers=seller,
    )
    listing_id = res.json()["id"]
    res = client.post(
        "/api/v1/conversations",
        json={"listing_id": listing_id, "body": "Is this available?"},
        headers=buyer,
    )
    assert res.status_code == 201, res.text
    return seller, buyer, res.json()


def _thread(client, headers, conversation_id):
    res = client.get(f"/api/v1/conversations/{conversation_id}", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def test_new_message_is_sent_until_recipient_checks_in(client, auth_headers):
    _, _, conversation = _setup(client, auth_headers)
    # The seller hasn't opened the app since the buyer sent it.
    assert conversation["messages"][0]["status"] == "sent"


def test_recipient_polling_marks_delivered(client, auth_headers):
    seller, buyer, conversation = _setup(client, auth_headers)
    # The seller's nav badge polls unread-count, but they haven't opened the thread.
    client.get("/api/v1/conversations/unread-count", headers=seller)
    msg = _thread(client, buyer, conversation["id"])["messages"][0]
    assert msg["status"] == "delivered"


def test_recipient_opening_thread_marks_read(client, auth_headers):
    seller, buyer, conversation = _setup(client, auth_headers)
    _thread(client, seller, conversation["id"])
    msg = _thread(client, buyer, conversation["id"])["messages"][0]
    assert msg["status"] == "read"


def test_status_only_on_viewers_own_messages(client, auth_headers):
    seller, _, conversation = _setup(client, auth_headers)
    # The seller received this message, so it carries no receipt for them.
    msg = _thread(client, seller, conversation["id"])["messages"][0]
    assert msg["status"] is None


def test_reply_returns_sent_then_becomes_read(client, auth_headers):
    seller, buyer, conversation = _setup(client, auth_headers)
    res = client.post(
        f"/api/v1/conversations/{conversation['id']}/messages",
        json={"body": "Yes, still available"},
        headers=seller,
    )
    assert res.status_code == 201
    assert res.json()["status"] == "sent"

    _thread(client, buyer, conversation["id"])  # buyer opens it
    reply = _thread(client, seller, conversation["id"])["messages"][-1]
    assert reply["status"] == "read"


def test_older_messages_read_newer_still_sent(client, auth_headers):
    seller, buyer, conversation = _setup(client, auth_headers)
    _thread(client, seller, conversation["id"])  # seller reads the first message
    client.post(
        f"/api/v1/conversations/{conversation['id']}/messages",
        json={"body": "Can you do $10?"},
        headers=buyer,
    )
    statuses = [m["status"] for m in _thread(client, buyer, conversation["id"])["messages"]]
    assert statuses == ["read", "sent"]
