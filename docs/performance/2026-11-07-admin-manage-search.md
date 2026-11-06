# Admin Manage Search Measurement

Controlled local fixture: 2,500 prepared assignment rows, 200 runs, query `rancel`.

- Previous request behavior: one request per keystroke, 6 requests for `rancel`.
- New request behavior: 200 ms debounce, 1 settled request; Enter submits immediately.
- Boyer-Moore local result latency: 0.202 ms average.
- Native `String.includes` reference latency: 0.112 ms average.

Boyer-Moore is not faster for this small JavaScript fixture. Its purpose here is requirement compliance and immediate local matching. Debouncing, cancellation, stable reference caches, and query guards provide network improvement.
