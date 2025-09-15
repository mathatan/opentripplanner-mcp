# Quickstart: OpenTripPlanner MCP Server

Status: Final

## 1. Prerequisites

- Node.js >= 18 (ESM support)
- pnpm (v10.15.1)
- Digitransit API Key (export `DIGITRANSIT_API_KEY`)

## 2. Install Dependencies

```bash
pnpm install
```

## 3. Environment Variables

```env
DIGITRANSIT_API_KEY=your_key_here
LOG_LEVEL=info (optional)
REQUEST_TIMEOUT_MS=8000 (optional)
```

## 4. Run Dev Server

```bash
pnpm dev
```

## 5. Tools Overview

| Tool | Description |
|------|-------------|
| plan_trip | Plan a multimodal journey |
| find_stops | Discover nearby stops |
| get_departures | Get upcoming stop departures |
| geocode_address | Forward geocode place text |
| reverse_geocode | Reverse geocode coordinates |
| save_user_variable | Save a user variable |
| get_user_variables | List stored user variables |

## 6. Example: Plan Trip

Request (MCP tool invocation JSON conceptual):

```json
{
  "tool": "plan_trip",
  "arguments": {
    "origin": { "type": "coords", "value": { "lat": 60.1699, "lon": 24.9384 } },
    "destination": { "type": "coords", "value": { "lat": 60.2055, "lon": 24.6559 } },
    "when": { "type": "depart", "time": "now" },
    "constraints": { "optimize": "balanced", "maxWalkingDistance": 1500 }
  }
}
```

## 7. Example: Forward Geocode

```json
{
  "tool": "geocode_address",
  "arguments": { "text": "kamppi", "size": 5 }
}
```

## 8. Example: Get Departures

```json
{
  "tool": "get_departures",
  "arguments": { "stop": { "type": "id", "value": "HSL:1234" }, "limit": 5 }
}
```

## 9. Error Structure

```json
{
  "error": {
    "code": "validation-error",
    "message": "Invalid origin coordinate",
    "hint": "Ensure lat between -90 and 90",
    "correlationId": "uuid"
  }
}
```

## 10. Testing

```bash
pnpm test
```

Add `DIGITRANSIT_API_KEY` for integration tests or they will be skipped.

## 11. Next Steps

- Implement schemas in `src/schema`.
- Build HTTP client & rate limiter.
- Create failing tests then implement tools iteratively.
