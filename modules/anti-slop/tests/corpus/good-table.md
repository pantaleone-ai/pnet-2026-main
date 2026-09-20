## Sync status codes

| state | meaning | retries |
| ----- | ------- | ------- |
| pending | Waiting for worker | 0 |
| retrying | Backoff in progress | 3x |
| failed | Dead-lettered | 3x |

The worker replays the outbox in order. ERC-721A batch minting cut gas costs in our load test (see `tests/load-2026-08.md` for method and sample size).
