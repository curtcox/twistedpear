------------------------------ MODULE stream ------------------------------
EXTENDS Naturals, Sequences, TLC

LegalEdges == {
  <<"requested", "admit", "active">>,
  <<"requested", "degrade", "degraded">>,
  <<"requested", "defer", "deferred">>,
  <<"requested", "reject", "rejected">>,
  <<"deferred", "admit", "active">>,
  <<"deferred", "degrade", "degraded">>,
  <<"deferred", "reject", "rejected">>,
  <<"active", "degrade", "degraded">>,
  <<"active", "close", "closed">>,
  <<"degraded", "degrade", "degraded">>,
  <<"degraded", "restore", "active">>,
  <<"degraded", "close", "closed">>
}

States == {"requested", "active", "degraded", "deferred", "rejected", "closed"}
Events == {"init", "admit", "degrade", "defer", "reject", "restore", "close"}

VARIABLES phase, lastEvent

Init == /\ phase = "requested"
        /\ lastEvent = "init"

Step(edge) == /\ edge \in LegalEdges
              /\ phase = edge[1]
              /\ phase' = edge[3]
              /\ lastEvent' = edge[2]

Next == \E edge \in LegalEdges : Step(edge)
vars == <<phase, lastEvent>>
Spec == Init /\ [][Next]_vars

TypeOK == /\ phase \in States
          /\ lastEvent \in Events
=============================================================================
