# NearBasha map workspace redesign — phases 3–4

This document extends the phases 1–2 redesign system with the desktop and mobile map experience contracts.

## Phase 3 — desktop map workspace

The desktop search page is a map-first workspace beneath the product navigation.

### Layout

- A compact search toolbar stays outside the independently scrolling result list.
- Primary toolbar controls are Area, Tenant type, Max budget, Bedrooms, More filters, and Apply.
- More filters contains minimum rent and radius instead of crowding the primary row.
- Tenant type remains visible and explicit at all times; clearing other filters must not erase it.
- The main workspace uses a 420–480px result pane beside a map that consumes the remaining width.
- Result cards scroll independently while the toolbar, result header, and map remain stable.

### Result header

The result header communicates the applied area, accurate result count, sort mode, update state, and Save search action. A new search keeps the old homes visible until the replacement result set has completed loading.

### Map controls

The map provides Search this area, location, draw-area, and the native zoom controls. Moving the map does not immediately discard results; it marks the viewport as changed and makes Search this area the next explicit action.

### Map/list synchronization

- Hovering or keyboard-focusing a result highlights its marker without panning.
- Selecting a map marker selects the corresponding result and opens one property preview.
- Show on map selects the property and deliberately brings its marker into view.
- Clusters zoom normally; listings sharing one exact coordinate expose a chooser instead of repeatedly zooming a zero-area bounds box.
- Tenant policy remains visible on cards, previews, and accessible marker labels.
- Search return URLs restore filters, map center, sort, selected property, and result-list scroll position.

## Phase 4 — mobile map experience

Mobile defaults to the map while keeping results immediately available as a bottom sheet.

### Mobile composition

- A compact search summary is pinned over the top of the map.
- The map remains the default view.
- A bottom result sheet supports collapsed, partial, and expanded states.
- Explicit buttons provide alternatives to dragging the sheet.
- List switches to a full result list without creating a second search state.
- Marker selection opens the existing compact property preview with image, rent, tenant policy, save action, and View details.

### Filters

- Filters open as a full-height accessible panel.
- Apply and Reset remain persistently reachable at the bottom.
- Reset clears optional criteria while preserving the explicit tenant type.
- Map, list, filter panel, property preview, and detail navigation all consume the same search state.

### Responsive mechanics

- Safe-area insets are included around bottom controls.
- Sheet-size and view changes trigger Leaflet size recalculation.
- Keyboard focus moves to the active map/list surface.
- Touch targets are at least 44px.
- Motion is short and nonessential; reduced-motion disables sheet/control transitions.

## Visual contract

Phases 3–4 reuse the phases 1–2 palette and hierarchy: deep emerald `#0B4F3C`, warm ivory `#F7F5EF`, sand `#E8DFCF`, dark green-black `#172D25`, white/elevated cards, fine borders, restrained shadows, and 12–16px default corners. Selected map/result state uses emerald emphasis rather than decorative gradients. Tenant categories always pair color with text/icon semantics.
