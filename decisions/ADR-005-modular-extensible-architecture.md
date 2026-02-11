# ADR-005: Modular and Extensible Architecture

**Status:** Accepted
**Date:** 2026-01-28

## Context

The homelab will evolve over time. Services will be added, removed, or replaced (e.g., switching VPN providers, changing reverse proxy, migrating to different photo backup solution). As the system matures and gains an LLM wrapper with MCP integrations, tight coupling between services would make changes painful and error-prone.

## Decision

Design all integrations with modularity and extensibility in mind:

1. **Service Abstraction**: When integrating services, define clear interfaces/contracts rather than hardcoding specific implementations
2. **Loose Coupling**: Services should communicate through well-defined APIs or protocols, not internal implementation details
3. **Configuration over Code**: Prefer configuration-driven behavior that can be changed without code modifications
4. **Swappable Components**: Structure integrations so replacing one service (e.g., Pi-hole → AdGuard) requires minimal changes elsewhere

## When This Applies

- **Now (Infrastructure)**: Less critical - docker-compose files are naturally modular
- **Future (LLM Wrapper)**: Critical - MCP servers and service integrations should use abstraction layers
- **Future (Custom Software)**: Critical - any automation or tooling should abstract service-specific details

## Examples

**Good (Modular):**
```dart
abstract class PhotoService {
  Future<List<Photo>> getPhotos();
  Future<void> updateMetadata(String id, Map<String, dynamic> data);
}

class ImmichPhotoService implements PhotoService { ... }
class GooglePhotosService implements PhotoService { ... }  // Easy to swap
```

**Bad (Tightly Coupled):**
```dart
class PhotoManager {
  final immichClient = ImmichClient(baseUrl: '...');  // Hardcoded to Immich

  Future<void> doThing() {
    immichClient.immichSpecificMethod();  // Can't swap without rewriting
  }
}
```

## Consequences

**Positive:**
- Easier to replace services as needs change
- Cleaner testing (can mock interfaces)
- Future-proofs the LLM wrapper architecture
- Reduces risk of major rewrites

**Negative:**
- Slightly more upfront design work
- May feel like over-engineering for simple cases
- Need to identify the right abstraction boundaries

## Notes

- This is a guiding principle, not a strict rule - pragmatism over purity
- Document service interfaces as they're created
- Revisit this ADR when building the Flutter wrapper app and MCP servers
