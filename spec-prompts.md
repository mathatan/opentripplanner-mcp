# Spec-Kit Prompts for OpenTripPlanner MCP Server

This document contains the comprehensive prompts for different spec-kit commands to guide the development of the OpenTripPlanner MCP Server following Spec-Driven Development (SDD) principles.

## 1. `/specify` Prompt

```text
/specify Build a comprehensive Model Context Protocol (MCP) server that provides public transit trip planning and stop timetable services. The server should enable AI assistants to access public transportation data for intelligent geolocation, routing, and multimodal journey planning.

Key functional requirements:
- Multi-modal trip planning using buses, trams, trains, metros, and other public transit
- Real-time transit updates including delays, cancellations, and live departures
- Geocoding services for address and place search functionality
- User variables system to save predefined stops, routes, and locations with custom names
- Geographic coverage primarily for Finland (HSL, Tampere, Southwest Finland, Waltti) with extensibility for other regions
- Shared mobility integration including bike/scooter rentals, car sharing, and park & ride options
- Comprehensive API documentation covering routing, geocoding, map services, real-time data, and routing data APIs

Documentation:

Use API documentation specified in `/docs`-folder to gain better understanding. Also use Context7 MCP tool and web-tools to find additional details related to the specification.

The server must integrate with Digitransit APIs and OpenTripPlanner routing engine, providing a bridge between AI assistants and public transportation data. It should handle rate limiting, API authentication, error handling, and provide structured responses for AI consumption.

User stories should cover scenarios like planning a journey from home to work, finding nearby transit stops, checking real-time departures, saving favorite locations, and planning multimodal trips that include walking, cycling, and public transit segments.
```

## 2. `/plan` Prompt

```text
/plan The OpenTripPlanner MCP Server builds upon an existing Node.js TypeScript foundation and follows strict Test-Driven Development (TDD) principles. The technical implementation uses:

**Core Technology Stack:**
- Runtime: Node.js with ES modules support
- Language: TypeScript with strict type checking
- Package Manager: pnpm (version 10.15.1)
- MCP Framework: @modelcontextprotocol/sdk (^1.17.5)
- Validation: Zod (^3.25.76) for input validation and schema definition
- Testing: Vitest for comprehensive test coverage
- Linting: ESLint with TypeScript rules

**Implementation Focus:**
- Build OpenTripPlanner-specific MCP tools on existing MCP server foundation
- Implement Digitransit API integration layer for route-planning
- Create rate limiting and API key management
- Develop error handling framework for transit-specific errors
- Add user variables system for saving addresses, specific stops and routes for easier retrieval

**Architecture Constraints:**
- TDD mandatory: Tests written → User approved → Tests fail → Then implement (Red-Green-Refactor cycle)
- Every MCP tool MUST have comprehensive test coverage before implementation
- Source code in `/src/` directory, built artifacts in `/build/` directory
- Tests in `/tests/` directory, documentation in `/docs/` directory
- Integration tests required for API changes and new MCP tool contracts

**Documentation:**

The project includes comprehensive API documentation in the `/docs` folder covering:
- **Routing API** (`docs/routing-api.md`): GraphQL endpoints for trip planning, stop queries, real-time data, and shared mobility
- **Geocoding API** (`docs/geocoding-api.md`): Address search, reverse geocoding, and autocomplete services
- **Routing Data API** (`docs/routing-data-api.md`): Dataset endpoints and configuration files

**Note**: Skip implementation of Map API and Realtime APIs as they are not relevant for the MCP server implementation. Focus only on Routing API and Geocoding API for core MCP functionality.

Use this documentation to understand API parameters, authentication requirements, rate limits, and integration patterns. Also use Context7 MCP tool and web-tools to find additional details related to the specification.

**API Integration:**
- Primary data source: Digitransit.fi APIs with GraphQL endpoints (see `docs/routing-api.md`)
- Authentication via API key management (digitransit-subscription-key header)
- Rate limiting: 10 requests per second maximum with proper backoff strategies
- Real-time data handling with <30 second freshness requirements (from routing API)
- Graceful fallback to scheduled data when real-time unavailable
- Geocoding services for address/place search (see `docs/geocoding-api.md`)

**MCP Tool Architecture:**
Each MCP tool must implement input validation with Zod schemas, error handling with meaningful messages, rate limiting respecting API quotas, and support for real-time data updates. The server runs on stdio for MCP-compatible client integration.

**Quality Gates:**
- All code must pass ESLint with TypeScript rules
- Prettier for consistent code formatting
- Strict TypeScript compilation
- All tests must pass before deployment
- Constitution compliance verification for all PRs
```

## 3. `/tasks` Prompt

```text
/tasks Generate an actionable task breakdown for implementing the OpenTripPlanner MCP Server following TDD principles. The task list should cover:

**Phase 1: API Integration & Infrastructure**
- Create Zod validation schemas based on API parameters from `/docs` folder
- Implement Digitransit API integration layer with GraphQL client (reference `docs/routing-api.md`)
- Implement rate limiting and API key management (10 rps limit, see `docs/routing-api.md`)
- Create error handling framework with meaningful error messages (reference error cases in docs)
- Set up geocoding integration (reference `docs/geocoding-api.md`)
- Configure real-time data handling from routing API (skip separate realtime APIs)

**Phase 2: Core MCP Tools (TDD Approach)**
- plan_trip: Multi-modal journey planning using `planConnection` GraphQL query (see `docs/routing-api.md`)
- find_stops: Search stops using `stopsByRadius` and `nearest` queries (see `docs/routing-api.md`)
- get_departures: Real-time departure information using stop queries with `realtimeState` (see `docs/routing-api.md`)
- geocode_address: Address search using `/geocoding/v1/search` endpoint (see `docs/geocoding-api.md`)
- reverse_geocode: Coordinate to address using `/geocoding/v1/reverse` endpoint (see `docs/geocoding-api.md`)
- save_user_variable: Store predefined stops, routes, and locations
- get_user_variables: Retrieve saved user variables

**Phase 3: Advanced Features**
- get_route_info: Detailed route information using `routes` and `pattern` queries (see `docs/routing-api.md`)
- find_nearby_places: Location-based search using `nearest` with place type filters (see `docs/routing-api.md`)
- get_disruptions: Service disruptions using `canceledTrips` and service alerts (see `docs/routing-api.md`)
- plan_multimodal: Complex trips including shared mobility using vehicle rental queries (see `docs/routing-api.md`)

**Note**: Skip implementation of vehicle position tracking and map tile services as they are not relevant for MCP functionality.

**Phase 4: Integration & Documentation**
- Integration tests for all MCP tools
- Performance optimization and caching implementation
- Error handling and edge case coverage
- Constitution compliance verification

Each task should include test specifications, implementation requirements, and acceptance criteria. All tasks must follow the Red-Green-Refactor TDD cycle with tests written first, user approval, test failure verification, then implementation.
```

## 4. `/implement` Prompt

```text
/implement Begin implementation of the OpenTripPlanner MCP Server following the established TDD workflow and constitution requirements.

**Implementation Guidelines:**
- Build upon the existing MCP server foundation and test framework
- Start with Phase 1 infrastructure tasks (API integration layer, rate limiting)
- For each MCP tool, follow the strict TDD cycle:
  1. Write comprehensive Vitest tests first
  2. Get user approval for test specifications
  3. Verify tests fail (Red phase)
  4. Implement minimal code to pass tests (Green phase)
  5. Refactor while maintaining test coverage (Refactor phase)

**Implementation Priority:**
1. Study existing API documentation in `/docs` folder to understand endpoints and parameters for geolocation and route-planning
2. Implement Digitransit API integration layer with proper authentication (digitransit-subscription-key)
3. Create Zod schemas based on API parameters documented in `/docs` folder
4. Implement rate limiting and API key management (10 rps limit)
5. Begin implementing core MCP tools using documented GraphQL queries and REST endpoints

**Code Quality Requirements:**
- All code must pass ESLint with TypeScript rules
- Use Zod schemas for all input validation
- Implement proper error handling with meaningful messages
- Follow the established project structure in `/src/`, `/tests/`, `/docs/`
- Ensure all MCP tools have comprehensive test coverage before implementation

**API Integration Standards:**
- Use Digitransit.fi GraphQL APIs as primary data source (see `docs/routing-api.md`)
- Implement proper rate limiting (10 requests/second maximum, see performance sections in docs)
- Handle API authentication via digitransit-subscription-key header
- Support real-time data with <30 second freshness requirements (from routing API)
- Implement graceful fallback to scheduled data when real-time unavailable
- Use documented error handling patterns from `/docs` folder
- Follow parameter validation rules specified in API documentation
- **Skip Map API and Realtime APIs**: Focus only on Routing API and Geocoding API

**Constitution Compliance:**
- Verify all implementations follow the established constitution
- Ensure TDD cycle is demonstrated in code reviews
- Include integration tests for API changes
- Maintain performance benchmarks for new features

Begin by studying the existing API documentation in `/docs` folder to understand the available endpoints, parameters, and integration patterns, then proceed with implementing the Digitransit API integration layer before moving to MCP tool implementation.
```

## Usage Instructions

These prompts are designed to be used with spec-kit to guide the development of the OpenTripPlanner MCP Server. Each prompt corresponds to a different phase of the Spec-Driven Development process:

1. **`/specify`** - Use this to define the high-level requirements and user stories
2. **`/plan`** - Use this to establish the technical implementation approach
3. **`/tasks`** - Use this to break down the work into actionable tasks
4. **`/implement`** - Use this to begin the actual implementation following TDD principles

Each prompt is tailored specifically to the OpenTripPlanner MCP Server project and incorporates the requirements from the project's README.md, constitution, and existing structure.

## Project Context

These prompts are based on the OpenTripPlanner MCP Server project which:

- Provides public transit trip planning and stop timetable services
- Integrates with Digitransit APIs and OpenTripPlanner routing engine
- Follows strict Test-Driven Development (TDD) principles
- Uses Node.js, TypeScript, pnpm, and the MCP SDK
- Supports multi-modal transportation planning with real-time updates
- Covers primarily Finnish transit systems with extensibility for other regions

**Available Resources:**

- **Complete API Documentation** in `/docs/` folder:
  - `routing-api.md`: GraphQL endpoints, parameters, examples, and error handling
  - `geocoding-api.md`: Address search, reverse geocoding, and autocomplete services
  - `routing-data-api.md`: Dataset endpoints and configuration files
  - `realtime-apis.md`: GTFS-RT feeds, MQTT subscriptions (skip for MCP implementation)
  - `map-api.md`: Raster and vector tiles (skip for MCP implementation)
- **Generated Task Specifications** in `/tasks/generated/` for reference
- **Existing MCP server foundation** with basic "hello" tool and test framework
- **Authentication Details**: digitransit-subscription-key header format
- **Rate Limiting**: 10 requests per second maximum with backoff strategies
- **Error Handling Patterns**: Documented error cases and expected responses
