# Hostile Mini-app Fixtures

Phase 4 hostile fixtures target the sandbox and broker chokepoint:

- busy loop: watchdog kill
- allocation bomb: memory ceiling kill
- escape attempts: no `require`, `process`, `Bare`, ambient imports, or constructor-chain
  access
- message flood: broker throttle then kill policy
- UI abuse: depth bomb, node bomb, oversized tree, unknown component, unknown prop/style,
  and forged events

The current checked-in tests cover broker throttling and widget rejection. Device Bare
and emulator fixtures are added as the selected backend is wired into the mobile
surface.
