# OpenTripPlanner MCP Server

A Model Context Protocol (MCP) server that provides comprehensive public transit trip planning and stop timetable services. This project serves as a bridge between AI assistants and public transportation data, enabling intelligent routing, real-time updates, and multimodal journey planning.

## 🚀 Features

- **Multi-modal Trip Planning**: Plan journeys using buses, trams, trains, metros, and more
- **Real-time Updates**: Live transit updates, delays, and cancellations
- **Geocoding Services**: Address and place search functionality
- **User Variables**: Save predefined stops, routes, and locations with names
- **Geographic Coverage**: Primary support for Finland (HSL, Tampere, Southwest Finland, Waltti) with extensibility for other regions
- **Shared Mobility Integration**: Bike/scooter rentals, car sharing, and park & ride options

## 🛠️ Technology Stack

- **Runtime**: Node.js (ES modules)
- **Language**: TypeScript
- **Package Manager**: pnpm (version 10.15.1)
- **MCP Framework**: @modelcontextprotocol/sdk (^1.17.5)
- **Validation**: Zod (^3.25.76)
- **Testing**: Vitest
- **Linting**: ESLint with TypeScript rules

## 📋 Prerequisites

- Node.js (ES modules support)
- pnpm 10.15.1

## 🚀 Installation

1. Clone the repository:

```bash
git clone https://github.com/mathatan/opentripplanner-mcp.git
cd opentripplanner-mcp
```

2. Install dependencies:

```bash
pnpm install
```

## 🏃‍♂️ Development

### Available Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build the project for production
- `pnpm test` - Run test suite
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm run` - Build and run the server

### Development Workflow

This project follows **Test-Driven Development (TDD)** principles:

1. **Red**: Write tests first
2. **Green**: Implement functionality to pass tests
3. **Refactor**: Improve code while maintaining test coverage

Every MCP tool MUST have comprehensive test coverage using Vitest before implementation begins.

## 🏗️ Project Structure

```
opentripplanner-mcp/
├── src/                    # Source code
├── build/                 # Built artifacts
├── tests/                 # Test files
├── docs/                  # API documentation
├── tasks/                 # Development tasks
└── package.json
```

## 🔧 Configuration

### API Authentication

The server requires a Digitransit API subscription key:

```bash
export DIGITRANSIT_SUBSCRIPTION_KEY="your-api-key"
```

The API key can also be passed as a parameter when running the MCP server through `--apikey` parameter.

### Rate Limiting

- **Maximum**: 10 requests per second
- **Quota Management**: Respects daily/monthly limits
- **Error Handling**: Proper HTTP status codes and retry logic

## 📚 API Documentation

Detailed API documentation is available in the `/docs` directory:

- [Routing API](docs/routing-api.md) - Multi-modal trip planning with GraphQL
- [Geocoding API](docs/geocoding-api.md) - Address and place search functionality
- [Map API](docs/map-api.md) - Map visualization and tile services
- [Realtime APIs](docs/realtime-apis.md) - Live transit updates and cancellations
- [Routing Data API](docs/routing-data-api.md) - Static transit data access

## 🧪 Testing

Run the test suite:

```bash
pnpm test
```

The project uses Vitest for testing with comprehensive coverage requirements for all MCP tools.

## 📦 Building

Build the project for production:

```bash
pnpm build
```

The built artifacts will be available in the `/build` directory.

## 🚀 Usage

### As an MCP Server

The server runs on stdio and can be integrated with MCP-compatible clients:

```bash
pnpm run --apikey=your-api-key
```

### Example Tool Usage

```typescript
// Example: Hello tool (current implementation)
{
  "name": "hello",
  "arguments": {
    "name": "World"
  }
}
```

## 🌍 Geographic Coverage

### Primary Regions

- **Finland**: HSL (Helsinki), Tampere, Southwest Finland, Waltti

### Secondary Regions

- Estonia and other supported regions

### Extensibility

The architecture supports additional regions through configuration.

## 🔒 Security & Privacy

- **No Personal Data Collection**: Anonymous usage patterns only
- **API Key Protection**: Secure key management and rotation
- **Input Validation**: Comprehensive sanitization and validation
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **GDPR Compliance**: Where applicable

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow TDD principles (write tests first)
4. Ensure all tests pass
5. Submit a pull request

### Development Guidelines

- All PRs must verify constitution compliance
- TDD cycle must be demonstrated in code reviews
- Integration tests required for API changes
- Performance benchmarks for new features

## 🐛 Bug Reports

Please report bugs and issues on the [GitHub Issues](https://github.com/mathatan/opentripplanner-mcp/issues) page.
