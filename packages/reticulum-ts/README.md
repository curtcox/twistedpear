# reticulum-ts

TypeScript implementation of the Reticulum Network Stack for TwistedPear.

Phase 1 is conformance-first: every protocol feature is added with golden vectors or a
live interop scenario against the pinned Python RNS reference. The current M0 scaffold
contains the package shell, runtime adapter contracts, Node crypto primitives, and the
first committed vector-consuming test.

Reference pins and harness commands live in `../../conformance`.
