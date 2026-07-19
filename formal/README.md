# Authority-machine formal twins

`grant.tla` (now at [specs/spec-cap/model/](../specs/spec-cap/model/), owned by
[SPEC-CAP](../specs/spec-cap/spec.md)), `escrow.tla`, and `recovery_quorum.tla` are
Layer-2 twins of the three executable authority tables. Their `Edges` relations are
mechanically compared with the TypeScript tables, checked trace fixtures, and Layer-3
vectors by:

```sh
npm run formal:all
```

To model-check safety and liveness locally, install Java 17 or newer and run
from this directory:

```sh
java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC -deadlock -config ../specs/spec-cap/model/grant.cfg ../specs/spec-cap/model/grant.tla
java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC -deadlock -config escrow.cfg escrow.tla
java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC -deadlock -config recovery-quorum.cfg recovery_quorum.tla
```

`-deadlock` disables deadlock reporting because denied, expired, and revoked are
intentional terminal phases. TLC still checks each model's type, safety, and
liveness properties. The repository conformance check is deliberately
separate so contributors can verify executable/model drift without a Java
toolchain; CI runs both checks on every change. `formal-conformance.test.ts`
also adds and removes an edge from a copy of every table and proves that the
checker fails, guarding the checker itself against silent drift.

To twin another machine, add its TLA+ `Edges` relation, config, trace fixture,
and generated vector, then register the four paths in `check-machine-conformance.mjs`.
