--------------------------- MODULE egress_offer ---------------------------
EXTENDS Naturals, Sequences, TLC

VARIABLES phase, lastEvent

States == {"absent", "active", "expired", "revoked"}

Edges == {
  <<"absent", "grant", "active">>,
  <<"active", "grant", "active">>,
  <<"expired", "grant", "active">>,
  <<"revoked", "grant", "active">>,
  <<"active", "ttl/expired", "expired">>,
  <<"active", "revoke", "revoked">>
}

Init == /\ phase = "absent"
        /\ lastEvent = "init"

Step(edge) == /\ edge \in Edges
              /\ phase = edge[1]
              /\ phase' = edge[3]
              /\ lastEvent' = edge[2]

Next == \E edge \in Edges : Step(edge)

vars == <<phase, lastEvent>>
Terminate == \E edge \in Edges : /\ edge[1] = "active"
                                 /\ edge[2] \in {"ttl/expired", "revoke"}
                                 /\ Step(edge)
Spec == Init /\ [][Next]_vars /\ WF_vars(Terminate)

TypeOK == /\ phase \in States
          /\ lastEvent \in {"init", "grant", "ttl/expired", "revoke"}

ActiveEventuallyTerminates == (phase = "active") ~> (phase # "active")

=============================================================================
