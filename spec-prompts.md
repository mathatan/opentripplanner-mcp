# Spec-Kit Prompts for OpenTripPlanner MCP Server

This document contains simplified prompts for the OpenTripPlanner MCP Server development workflow. These prompts work alongside the existing `.cursor/commands/` infrastructure.

## 1. `/specify` Prompt

```text
/specify Create a comprehensive specification for an OpenTripPlanner MCP Server that enables AI assistants to provide intelligent public transportation assistance to users.

**Business Context:**
AI assistants need access to real-time public transportation data to help users navigate cities efficiently. Current AI assistants lack direct integration with transit systems, limiting their ability to provide accurate, up-to-date travel information and multimodal journey planning.

**MCP (Model Context Protocol) Integration:**
The server will implement the Model Context Protocol to provide AI assistants with structured access to public transportation data. MCP enables AI assistants to:
- Access real-time transit information through standardized tool interfaces
- Maintain user context and preferences across conversations
- Provide consistent, reliable data access with proper error handling
- Support both synchronous and asynchronous operations for better user experience

**Core MCP Tools to Implement:**
- plan_trip: Multi-modal journey planning with real-time updates
- find_stops: Search and discover nearby transit stops
- get_departures: Real-time departure information and delays
- geocode_address: Address and place search functionality
- reverse_geocode: Convert coordinates to human-readable addresses
- save_user_variable: Store user preferences and favorite locations
- get_user_variables: Retrieve saved user data for personalized assistance

**User Stories:**
- As a commuter, I want to ask my AI assistant "How do I get from home to work?" and receive real-time transit options with walking directions
- As a tourist, I want to find nearby transit stops and get departure times for popular destinations
- As a frequent traveler, I want to save my favorite stops and routes for quick access
- As a multimodal traveler, I want to plan trips that combine walking, cycling, public transit, and shared mobility options
- As a user with accessibility needs, I want to receive information about accessible routes and real-time service disruptions

**Core Value Proposition:**
Bridge the gap between AI assistants and public transportation data, enabling intelligent, context-aware travel assistance that adapts to real-time conditions and user preferences through standardized MCP interfaces.

**Success Criteria:**
- AI assistants can provide accurate, real-time transit information through MCP tools
- Users can plan multimodal journeys through natural language interactions
- System handles Finnish transit systems (HSL, Tampere, Southwest Finland, Waltti) with extensibility for other regions
- Integration supports both scheduled and real-time data with graceful fallbacks
- MCP server provides reliable, rate-limited access to external APIs

**Documentation References:**
Use API documentation in `/docs` folder and Context7 MCP tool to understand technical capabilities and constraints for implementation planning.
```

## 2. `/plan` Prompt

```text
/plan Generate a comprehensive implementation plan for the OpenTripPlanner MCP Server, including technical architecture, research requirements, and constitution validation.

**Technical Context:**
- **Runtime**: Node.js with ES modules support
- **Language**: TypeScript with strict type checking
- **Package Manager**: pnpm (version 10.15.1)
- **MCP Framework**: @modelcontextprotocol/sdk (^1.17.5)
- **Validation**: Zod (^3.25.76) for input validation and schema definition
- **Testing**: Vitest for comprehensive test coverage
- **Linting**: ESLint with TypeScript rules

**Research Requirements:**
Research and document the following technical decisions:
- Digitransit API integration patterns and rate limiting strategies
- MCP SDK best practices for tool implementation
- Real-time data handling approaches for transit systems
- Error handling patterns for external API failures
- Performance optimization techniques for GraphQL queries

**Implementation Phases:**
1. **Infrastructure Setup**: API integration layer, rate limiting, error handling
2. **Core MCP Tools**: Trip planning, stop search, departure information, geocoding
3. **Advanced Features**: User variables, multimodal planning, service disruptions
4. **Integration & Testing**: End-to-end testing, performance optimization

**API Integration Strategy:**
- Primary data source: Digitransit.fi GraphQL APIs
- Authentication: digitransit-subscription-key header management
- Rate limiting: 10 requests/second with exponential backoff
- Real-time data: <30 second freshness with scheduled fallback
- Focus areas: Routing API and Geocoding API (skip Map and Realtime APIs)

**Quality Assurance:**
- TDD mandatory: Red-Green-Refactor cycle for all features
- Constitution compliance verification for all implementations
- Integration tests for API changes and MCP tool contracts
- Performance benchmarks and error handling validation

**Documentation Integration:**
Use existing API documentation in `/docs` folder and Context7 MCP tool to validate technical decisions and identify potential implementation challenges.
```

## 3. `/tasks` Prompt

```text
/tasks

**Available Additional Resources:**
- API documentation in `/docs/` folder for technical reference
- Existing MCP server foundation in `/src/` directory
- Existing Unit and End-to-end tests in `/tests/` directory
- Constitution requirements for TDD compliance
- Use MCP tools like Context7 and Websearch if additional context is needed
```

## 4. `/implement` Prompt

```text
/implement Execute the implementation of [specific task ID or task name] from the generated tasks.md file.

**Task to Implement:**
Task: [T001, T002, etc. or specific task name from tasks.md]

**Implementation Context:**
- Use the existing MCP server foundation in `/src/` directory
- Follow the established project structure and coding standards
- Reference API documentation in `/docs/` folder for specific endpoints or functionality
- Build upon existing test framework and patterns

**TDD Implementation Cycle:**
1. Write comprehensive Vitest tests first (Red phase)
2. Get user approval for test specifications
3. Verify tests fail as expected
4. Implement minimal code to pass tests (Green phase)
5. Refactor while maintaining test coverage (Refactor phase)

**Code Implementation:**
- Follow TypeScript strict mode and ESLint rules
- Use Zod schemas for input validation
- Implement proper error handling with meaningful messages
- Ensure comprehensive test coverage
- Follow established patterns from existing codebase

**API Integration:**
- Use Digitransit.fi GraphQL APIs as primary data source
- Implement proper rate limiting and authentication
- Handle real-time data with graceful fallback to scheduled data
- Follow documented error handling patterns from `/docs/` folder

**Task Completion:**
- Verify implementation meets all task acceptance criteria
- Ensure all tests pass
- Update documentation if required
- Report completion and any issues encountered

**Next Task:**
After completing this task, proceed to: [next task ID or name from tasks.md]
```

Simpler implementation prompt.

```text

Execute the implementation of tasks Txxx to Txxx from @/specs/001-opentripplanner-mcp-server/tasks-phase-N.md

Focus on executing the tasks, do not stray from the specified task items.

**Implementation Context:**
- Use the existing MCP server foundation in `/src/` directory
- Follow the established project structure and coding standards
- Reference API documentation in `/docs/` folder for specific endpoints or functionality and `/specs/001-opentripplanner-mcp-server/` and `/specs/001-opentripplanner-mcp-server/contracts/` folders for more detailed specifications.
- Build upon existing test framework and patterns
- Do not try to guess, always verify and ground your plans and considerations

**API Integration:**
- Use Digitransit.fi GraphQL APIs as primary data source
- Where needed use #context7 and #websearch for additional information
- Follow documented error handling patterns from `/docs/` folder

**Task Completion:**
- Verify implementation meets all task acceptance criteria
- Update documentation if required
- Report completion and any issues encountered
- Always update the completed tasks in the relevant tasks-phase-N.md document

Always implement the specified tasks only, do not try to adjust the tasks, but focus on the specified tasks.

```

## Usage Instructions

These prompts work alongside the existing `.cursor/commands/` infrastructure:

1. **`/specify`** - Define business requirements and user stories (focus on "what" and "why")
2. **`/plan`** - Establish technical architecture and implementation phases
3. **`/tasks`** - Generate actionable, dependency-ordered tasks
4. **`/implement`** - Execute specific tasks following TDD principles

**Customization:**

- Replace bracketed fields `[like this]` with your specific requirements
- Each prompt is designed to be pasted directly to the agent with minimal modification

## Project Context

**OpenTripPlanner MCP Server:**

- Provides public transit trip planning and stop timetable services
- Integrates with Digitransit APIs and OpenTripPlanner routing engine
- Follows strict Test-Driven Development (TDD) principles
- Uses Node.js, TypeScript, pnpm, and the MCP SDK
- Supports multi-modal transportation planning with real-time updates
- Covers primarily Finnish transit systems with extensibility for other regions

**Available Resources:**

- **API Documentation** in `/docs/` folder (routing-api.md, geocoding-api.md, routing-data-api.md)
- **Existing MCP server foundation** in `/src/` directory
- **Authentication**: digitransit-subscription-key header format
- **Rate Limiting**: 10 requests per second maximum with backoff strategies
