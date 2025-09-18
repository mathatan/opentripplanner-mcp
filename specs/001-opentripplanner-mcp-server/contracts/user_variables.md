# Tool Contract: user variables (save_user_variable / get_user_variables)

Status: Final

## Purpose

Store and retrieve user-scoped ephemeral variables (locations, preferences) referenced by other tools.

## save_user_variable Input Parameters

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| key | string | Yes | 1..50 chars | kebab-case or snake recommended |
| type | enum | Yes | location \| preference \| other | Determines validation of value |
| value | any | Yes | depends on type | location => { lat,lon,label?,name?,address? } preference => object |

## save_user_variable Output

```text
variable: UserVariable
previous?: { key: string, type: 'location' | 'preference' | 'other' }
correlationId: string (UUID)

UserVariable {
  key: string
  type: 'location' | 'preference' | 'other'
  value: any
  createdAt: string (ISO 8601)
  updatedAt: string (ISO 8601)
}
```

## get_user_variables Output

```text
variables: UserVariable[] (length >=0)
correlationId: string (UUID)
```

## Business Rules

1. Overwrite deterministic; summary of previous returned when replaced.
2. TTL refresh on write & read. Expiration after 24h inactivity (swept lazily on access); writes/read reset TTL.
3. Flat namespace per session; keys are case-sensitive.
4. Location type value validated like Coordinate schema; optional name/address carried through to LocationRef if present.
5. Preference type value must be JSON-serializable (reject functions / undefined leaves).

## Error Codes

| Code | Condition | Retry? |
|------|-----------|--------|
| validation-error | Key/type/value invalid | No |

## Examples

### Save Variable Request

```json
{
  "tool": "save_user_variable",
  "arguments": {
    "key": "home",
    "type": "location",
    "value": {
      "lat": 60.1700,
      "lon": 24.9400,
      "name": "Home",
      "address": "Mannerheimintie 1, 00100 Helsinki"
    }
  }
}
```

### Save Variable Response

```json
{
  "variable": {
    "key": "home",
    "type": "location",
    "value": {
      "lat": 60.1700,
      "lon": 24.9400,
      "name": "Home",
      "address": "Mannerheimintie 1, 00100 Helsinki"
    }
  },
  "correlationId": "uuid"
}
```

### List Variables Request

```json
{ "tool": "get_user_variables", "arguments": {} }
```

### List Variables Response

```json
{
  "variables": [
    {
      "key": "home",
      "type": "location",
      "value": {
        "lat": 60.1700,
        "lon": 24.9400,
        "name": "Home",
        "address": "Mannerheimintie 1, 00100 Helsinki"
      }
    }
  ],
  "correlationId": "uuid"
}
```

## Tests

* Save new variable
* Overwrite variable returns previous
* TTL expiry simulation
* List after multiple saves
* Invalid coordinate validation error

## Constitution Alignment

* Test-first: tests enumerated before implementation (TOOL-007/008)
* Privacy: in-memory ephemeral storage only.
* Transparency: previous summary returned on overwrite.
