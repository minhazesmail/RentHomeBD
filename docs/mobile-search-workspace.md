# Task 3 — mobile /homes search workspace

The applied search summary and quick filters lead into a map and one results sheet. Map/List controls now belong to that sheet, with peek, mid-height and expanded positions. Dragging the handle and labeled expand/collapse buttons provide equivalent movement. The separate floating mode bar and competing mobile property preview are removed; selecting a pin reveals its synchronized result card.

Mobile filters use a native full-height dialog with a scrollable body, Clear and Show homes footer, Escape/Close handling, browser focus containment and focus return. Opening starts from applied criteria. Clear changes optional draft fields and preserves renter identity. Cancel discards edits; only a successful explicit search closes the dialog and updates the applied summary. A failed request stays open and retains previous results. The server's result ordering survives client hydration.

Applied criteria remain in the detail return URL and the current browser history entry. Tab-local versioned session state stores view, sheet, selected property, scroll, viewport and the applied polygon for 30 minutes. The session key ignores selection/scroll but distinguishes query criteria; malformed or blocked storage falls back to URL state. Restored polygons still pass through the existing server validation. Geographic search predicates, permissions, radius bounds, clustering, media signing and listing eligibility are unchanged.

Validation includes the existing static search/navigation/layout contracts, a storage boundary test, and a dedicated hosted browser matrix at 320/360/390/768 widths in English/Bangla and light/dark. Mocked inventory deliberately arrives in a non-distance order and basemap requests fail, checking that list access and server order remain usable. Browser tests exercise cancel, Clear, Apply, request failure, sheet controls, selection and a full navigation/Back remount.

Run `npm run mobileworkspaceqa` for session tests and `npm run mobileworkspacebrowser` against a production server. The dedicated mobile GitHub workflow runs the browser tests and uploads screenshots alongside the existing mobile concept suite.
