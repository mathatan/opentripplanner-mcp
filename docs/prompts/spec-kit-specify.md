-- initial --
/specify Build an MCP server for fetching timetables, routes and addresses. You can utilize #file:routing-api.md and #file:geocoding-api.md but do not implement map-api or realtime-api, focus only on for fetching timetables, routes and addresses.

The LLM using the MCP server should be able to find a valid address/stop by address. Find a route between two addresses within specified timeframe, and check the current timetable for a predefined stop.

Also note that an existing implementation for the MCP server is in #file:src but the resulting implementation should utilize more robust project structuring
--
