# 0002: Cloudflare Durable Objects as the only store

Status: accepted

Each lobby's state lives in one Cloudflare Durable Object, and no other database is used. A lobby is a single-writer unit, so one object per lobby gives consistent live auction and match state without a separate database. Upstash Redis was listed as an alternative in the README and has been removed.
