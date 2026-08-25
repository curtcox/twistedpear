------------------------------ MODULE replica ------------------------------
EXTENDS Naturals, Sequences, TLC

LegalEdges == {
  <<"idle", "open", "open">>,
  <<"open", "append", "open">>,
  <<"open", "ingest", "open">>,
  <<"open", "tombstone", "open">>,
  <<"open", "evict", "open">>,
  <<"open", "cap", "capped">>,
  <<"open", "close", "closed">>,
  <<"capped", "ingest", "capped">>,
  <<"capped", "tombstone", "capped">>,
  <<"capped", "evict", "open">>,
  <<"capped", "close", "closed">>
}

States == {"idle", "open", "capped", "closed"}
Events == {"init", "open", "append", "ingest", "tombstone", "evict", "cap", "close"}

VARIABLES phase, lastEvent

Init == /\ phase = "idle"
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
