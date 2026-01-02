# Changelog

## [2.2.0] - 2025-12-26

### Added
- **Real-Time Vacancy Checker**: New `/vacancy` endpoint for checking live course availability
  - Real-time data fetched directly from NTU Vacancy Service (no database storage)
  - Service hours validation (8:00 AM - 10:00 PM Singapore Time)
  - Supports filtering by course code and specific index number
  - Returns vacancy count, waitlist count, and class schedule details
  - Comprehensive error handling for service availability, invalid courses, and network issues
  
- **New Components**:
  - `src/parsers/vacancyParser.js`: Parse NTU Vacancy Service HTML responses
  - `src/scrappers/fetchVacancy.js`: HTTP client for NTU Vacancy Service API
  - `src/routes/vacancy.js`: Express route handler with validation
  - `tests/vacancy.test.js`: Complete test suite (12 tests)
  
- **Validation Schemas**: Added Zod schemas for vacancy data
  - `vacancyClassSchema`: Individual class session structure
  - `vacancyIndexSchema`: Index with vacancy and class details
  - `vacancyResponseSchema`: Complete API response validation
  
- **Comprehensive Documentation**:
  - `DOCUMENTATION.md`: Technical architecture and implementation details
  
- **Test Coverage**: 13 new tests added (53 → 66 total)
  - `parseNumber()`: 3 tests for number parsing and edge cases
  - `parseVacancyHtml()`: 5 tests for HTML parsing scenarios
  - `formatIndexDisplay()`: 2 tests for display formatting
  - `formatCourseDisplay()`: 3 tests for course formatting

### Changed
- **README.md**: 
  - Updated test count badge (53 → 66 passing)
  - Added Real-Time Vacancy section with complete documentation
  - Added vacancy checker to feature list
  - Updated Table of Contents with new sections
  - Added comprehensive error handling examples
  - Added integration code examples (JavaScript, Python)
  
- **src/index.js**: 
  - Registered new `/vacancy` route
  - Added vacancy routes import

### Technical Details
- **Architecture**: Proxy pattern - no database storage for ephemeral data
- **Service Hours**: Automatic Singapore Time calculation (UTC+8)
- **Timeout**: 10-second HTTP timeout for NTU API calls
- **Error Codes**: 7 distinct error types with appropriate HTTP status codes
- **Performance**: Typical response time 600-1700ms (includes network latency)

### Documentation
- Added Section 5 "Real-Time Vacancy Check" to README.md
- Created DOCUMENTATION.md with architecture diagrams and technical details
- Added Swagger/OpenAPI annotations for `/vacancy` endpoint
- Updated API reference in README with vacancy examples and use cases

### Testing
- All 66 tests passing
- New test suite: `tests/vacancy.test.js`
- Test coverage includes edge cases, error handling, and data validation

---

## [2.1.0] - 2025-12-07

### Added
- **Pagination Support**: All list endpoints now support offset-based pagination
  - Added `limit` parameter (default: 100, max: 500) to control page size
  - Added `offset` parameter (default: 0) for pagination navigation
  - Endpoints affected: `/courses`, `/course-content`, `/course-schedule`
  
- **Enhanced Response Format**: List endpoints now return:
  - `total`: Total number of records matching filters
  - `count`: Number of records in current response
  - `rows`: Array of data records
  
- **Comprehensive Test Suite**: Added 27 new endpoint tests covering:
  - Pagination functionality with various limit and offset combinations
  - Query parameter filtering
  - Response structure validation
  - Error handling scenarios
  - Parameter validation edge cases
  
- **Jest Configuration**: Added `jest.config.js` for better test organization

### Changed
- **Repository Functions**: Updated database query functions to support pagination
  - `getAllCourses()` → `getAllCourses({ limit, offset })`
  - `getCourseContent()` → `getCourseContent({ course_code, acadsem, limit, offset })`
  - `getCourseSchedule()` → `getCourseSchedule({ course_code, acadsem, limit, offset })`
  
- **API Routes**: Updated all route handlers to parse and pass pagination parameters
  - `/courses` now accepts `limit` and `offset` query parameters
  - `/course-content` now accepts `limit` and `offset` query parameters
  - `/course-schedule` now accepts `limit` and `offset` query parameters

### Documentation Updates
- Updated `DOCUMENTATION.md`:
  - Added Section 6: Pagination with usage examples and best practices
  - Updated all endpoint documentation with pagination parameters
  - Fixed section numbering (renumbered sections 3-7)
  - Updated response examples to show new format with `total` field
  
- Updated `README.md`:
  - Added pagination examples in Key Endpoints section
  - Added detailed Pagination section with response format documentation
  - Enhanced Testing section with test coverage details

- Updated Swagger/OpenAPI documentation:
  - Added `limit` and `offset` parameter definitions
  - Updated response schemas to include `total` and `count` fields
  - Added parameter constraints (min, max, default values)

### Technical Details
- All pagination queries execute a separate COUNT query for accurate totals
- Maximum limit enforced at 500 records to prevent memory issues
- Offset validation handled at database layer
- Backward compatible: endpoints work without pagination parameters (use defaults)

### Test Results
```
Test Suites: 2 passed, 2 total
Tests:       30 passed, 30 total
  - 3 parser tests (existing)
  - 27 endpoint tests (new)
```

### Breaking Changes
None. All changes are backward compatible. Existing API consumers will receive paginated responses with default values (limit=100, offset=0).

---

## Previous Versions
See git history for earlier changes.
