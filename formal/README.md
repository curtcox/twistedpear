# Grant formal twin

`grant.tla` is the Layer-2 twin of the executable grant lifecycle table. Its
`Edges` relation is mechanically compared with the TypeScript table, the
checked trace fixture, and `conformance/vectors/grant.json` by:

```sh
npm run formal:grant
```

To model-check safety and liveness locally, install Java 17 or newer and run
from this directory:

```sh
java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC -deadlock -config grant.cfg grant.tla
```

`-deadlock` disables deadlock reporting because denied, expired, and revoked are
intentional terminal phases. TLC still checks `TypeOK` and
`RequestedEventuallyResolves`. The repository conformance check is deliberately
separate so contributors can verify executable/model drift without a Java
toolchain; CI runs both checks on every change.
