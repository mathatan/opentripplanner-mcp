# OpenTripPlanner MCP Server Constitution

## Project Identity & Core Mission

**OpenTripPlanner MCP Server** is a Model Context Protocol (MCP) server that provides comprehensive public transit trip planning and stop timetable services. This project serves as a bridge between AI assistants and public transportation data, enabling intelligent routing, real-time updates, and multimodal journey planning.

## Core Principles

### I. Test-First (NON-NEGOTIABLE)

TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced. Every MCP tool MUST have comprehensive test coverage using Vitest before implementation begins.

### II. Integration Testing

Focus areas requiring integration tests: New MCP tool contract tests, API integration changes, Inter-service communication with Digitransit APIs, Shared schemas validation.

### III. Core Technology Stack

- **Runtime**: Node.js (ES modules)
- **Language**: TypeScript
- **Package Manager**: pnpm (version 10.15.1)
- **MCP Framework**: @modelcontextprotocol/sdk (^1.17.5)
- **Validation**: Zod (^3.25.76)

### IV. Observability

Structured logging required for all MCP tools; Text I/O ensures debuggability; Multi-tier log streaming for API interactions; Performance monitoring for rate limits and response times.

### V. Versioning & Breaking Changes

MAJOR.MINOR.BUILD format; Breaking changes require migration plan; API versioning for Digitransit integration compatibility.

### VI. Simplicity

Start simple, YAGNI principles; Avoid over-engineering; Focus on core transit planning functionality; Limit complexity in MCP tool interfaces.

### VII. MCP Tool Architecture

Each MCP tool must implement:

- **Input Validation**: Zod schemas for all parameters
- **Error Handling**: Graceful error responses with meaningful messages
- **Rate Limiting**: Respect API quotas and implement backoff strategies
- **Real-time Data**: Support for live transit updates and cancellations

### VIII. Public Transit Data Integration

The server MUST support:

- **Routing API**: Multi-modal trip planning with GraphQL
- **Geocoding API**: Address and place search functionality
- **User Variables**: Save predefined stops, routes and locations with names

## Additional Constraints

### API Authentication & Rate Limiting

- **Authentication**: API key management via `digitransit-subscription-key`
- **Rate Limits**: 10 requests per second maximum
- **Quota Management**: Respect daily/monthly limits
- **Error Handling**: Proper HTTP status codes and retry logic

### Data Sources & Attribution

- **Primary Source**: Digitransit.fi APIs
- **OpenTripPlanner**: Core routing engine integration
- **Attribution**: Proper credit for GTFS, OSM, and other data sources
- **Licensing**: Compliance with CC 4.0 BY, ODbL, and other licenses

### Real-time Data Handling

- **Freshness**: Acceptable data age < 30 seconds
- **Fallback**: Graceful degradation to scheduled data
- **Cancellations**: Proper handling of canceled trips
- **Delays**: Real-time delay information integration

### Geographic Coverage

- **Primary**: Finland (HSL, Tampere, Southwest Finland, Waltti)
- **Secondary**: Estonia and other supported regions
- **Extensibility**: Architecture supports additional regions

### Multimodal Support

- **Public Transit**: Buses, trams, trains, metros
- **Shared Mobility**: Bike/scooter rentals, car sharing
- **Active Transport**: Walking, cycling integration
- **Park & Ride**: Vehicle parking integration

## Development Workflow

### Code Organization

- Source code in `/src/` directory
- Built artifacts in `/build/` directory
- Tests in `/tests/` directory
- Documentation in `/docs/` directory

### Development Process

- **Version Control**: Git with semantic versioning
- **Build Process**: `pnpm build` for production builds
- **Development**: `pnpm dev` with nodemon and tsx
- **Publishing**: `pnpm prepublishOnly` ensures build before publish

### Quality Gates

- **Linting**: ESLint with TypeScript rules (enforced via `pnpm lint`)
- **Formatting**: Prettier for consistent code style
- **Type Safety**: Strict TypeScript compilation
- **Test Execution**: `pnpm test` must pass before any deployment

### Review Process

- All PRs must verify constitution compliance
- TDD cycle must be demonstrated in code reviews
- Integration tests required for API changes
- Performance benchmarks for new features

## Compliance & Standards

### Open Source Compliance

- ISC License
- Proper attribution for all dependencies
- Clear contribution guidelines
- Transparent development process

### API Standards

- RESTful design principles
- GraphQL best practices
- OpenAPI/Swagger documentation
- Consistent error response formats

### Data Privacy

- No personal data collection
- Anonymous usage patterns only
- GDPR compliance where applicable
- Clear privacy policy

### Security Considerations

- API key protection and rotation
- Input sanitization and validation
- Rate limiting to prevent abuse
- Secure MQTT connections (TLS)

### Performance Requirements

- Sub-second response times for simple queries
- Efficient pagination for large result sets
- Client-side caching support via HTTP headers
- Optimized GraphQL queries to avoid complexity limits

## Governance

Constitution supersedes all other practices; Amendments require documentation, approval, migration plan. All PRs/reviews must verify compliance; Complexity must be justified; Use development guidelines for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
