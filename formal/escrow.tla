--------------------------- MODULE escrow ---------------------------
EXTENDS Naturals, Sequences, TLC

VARIABLES phase, lastEvent, quorumMet

States == {"pending", "funded", "release-requested", "released", "refunded", "expired"}

Edges == {
  <<"pending", "deposit", "funded">>,
  <<"funded", "request-release", "release-requested">>,
  <<"release-requested", "quorum-authorize", "released">>,
  <<"funded", "refund", "refunded">>,
  <<"funded", "ttl", "expired">>,
  <<"release-requested", "ttl", "expired">>
}

Init == /\ phase = "pending" /\ lastEvent = "init" /\ quorumMet = FALSE

Step(edge) == /\ edge \in Edges /\ phase = edge[1]
              /\ phase' = edge[3] /\ lastEvent' = edge[2]
              /\ quorumMet' = IF edge[2] = "quorum-authorize" THEN TRUE ELSE quorumMet

Next == \E edge \in Edges : Step(edge)
Resolve == \E edge \in Edges : /\ edge[1] \in {"funded", "release-requested"}
                                /\ edge[3] \in {"released", "refunded", "expired"}
                                /\ Step(edge)

vars == <<phase, lastEvent, quorumMet>>
Spec == Init /\ [][Next]_vars /\ WF_vars(Resolve)
TypeOK == /\ phase \in States /\ lastEvent \in {"init"} \cup {edge[2] : edge \in Edges} /\ quorumMet \in BOOLEAN
NoReleaseWithoutQuorum == phase = "released" => quorumMet
FundedEventuallyResolves == (phase \in {"funded", "release-requested"}) ~> (phase \in {"released", "refunded", "expired"})

===================================================================
