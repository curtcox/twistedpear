# Grant formal twin

`grant.tla` is the Layer-2 twin of the executable grant lifecycle table. Its
`Edges` relation is mechanically compared with the TypeScript table, the
checked trace fixture, and `conformance/vectors/grant.json` by:

```sh
npm run formal:grant
```

To model-check safety and liveness locally, install the TLA+ tools and run from
this directory:

```sh
java -cp tla2tools.jar tlc2.TLC -config grant.cfg grant.tla
```

TLC checks `TypeOK` and `RequestedEventuallyResolves`. The repository check is
deliberately separate so contributors can verify executable/model drift without
a Java toolchain; CI runs that check on every change.
