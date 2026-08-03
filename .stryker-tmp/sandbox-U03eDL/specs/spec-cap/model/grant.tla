--------------------------- MODULE grant ---------------------------
EXTENDS Naturals, Sequences, TLC

VARIABLES phase, lastEvent

States == {"requested", "granted", "active", "denied", "expired", "revoked"}

Edges == {
  <<"requested", "approve", "granted">>,
  <<"requested", "deny", "denied">>,
  <<"granted", "first-use/live", "active">>,
  <<"granted", "ttl/expired", "expired">>,
  <<"active", "ttl/expired", "expired">>,
  <<"granted", "revoke", "revoked">>,
  <<"active", "revoke", "revoked">>
}

Init == /\ phase = "requested"
        /\ lastEvent = "init"

Step(edge) == /\ edge \in Edges
              /\ phase = edge[1]
              /\ phase' = edge[3]
              /\ lastEvent' = edge[2]

Next == \E edge \in Edges : Step(edge)

vars == <<phase, lastEvent>>
Resolve == \E edge \in Edges : /\ edge[1] = "requested"
                                /\ Step(edge)
Spec == Init /\ [][Next]_vars /\ WF_vars(Resolve)

TypeOK == /\ phase \in States
          /\ lastEvent \in {"init", "approve", "deny", "first-use/live", "ttl/expired", "revoke"}

RequestedEventuallyResolves == (phase = "requested") ~> (phase # "requested")

===================================================================
