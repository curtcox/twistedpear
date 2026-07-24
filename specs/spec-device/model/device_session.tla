--------------------------- MODULE device_session ---------------------------
EXTENDS Naturals, Sequences, TLC

VARIABLES phase, lastEvent

States == {"requested", "active", "degraded", "closed", "expired", "revoked"}

Edges == {
  <<"requested", "open", "active">>,
  <<"active", "degrade", "degraded">>,
  <<"degraded", "restore", "active">>,
  <<"degraded", "degrade", "degraded">>,
  <<"active", "close", "closed">>,
  <<"degraded", "close", "closed">>,
  <<"active", "ttl/expired", "expired">>,
  <<"degraded", "ttl/expired", "expired">>,
  <<"active", "revoke", "revoked">>,
  <<"degraded", "revoke", "revoked">>
}

Init == /\ phase = "requested"
        /\ lastEvent = "init"

Step(edge) == /\ edge \in Edges
              /\ phase = edge[1]
              /\ phase' = edge[3]
              /\ lastEvent' = edge[2]

Next == \E edge \in Edges : Step(edge)

vars == <<phase, lastEvent>>
Open == \E edge \in Edges : /\ edge[1] = "requested"
                             /\ Step(edge)
Spec == Init /\ [][Next]_vars /\ WF_vars(Open)

TypeOK == /\ phase \in States
          /\ lastEvent \in {"init", "open", "degrade", "restore", "close", "ttl/expired", "revoke"}

RequestedEventuallyOpens == (phase = "requested") ~> (phase # "requested")

=============================================================================
