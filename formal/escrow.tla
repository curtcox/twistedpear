--------------------------- MODULE escrow ---------------------------
EXTENDS Naturals, FiniteSets, TLC

CONSTANTS Authorizers, Quorum
VARIABLES phase, lastEvent, authorizedWith

States == {"pending", "funded", "release-requested", "released", "refunded", "expired"}

Edges == {
  <<"pending", "deposit", "funded">>,
  <<"funded", "request-release", "release-requested">>,
  <<"release-requested", "quorum-authorize", "released">>,
  <<"funded", "refund", "refunded">>,
  <<"funded", "ttl", "expired">>,
  <<"release-requested", "ttl", "expired">>
}

Init == /\ phase = "pending" /\ lastEvent = "init" /\ authorizedWith = {}

Step(edge) == /\ edge \in Edges /\ phase = edge[1]
              /\ edge[2] # "quorum-authorize"
              /\ phase' = edge[3] /\ lastEvent' = edge[2]
              /\ UNCHANGED authorizedWith

Authorize == /\ phase = "release-requested"
             /\ \E submitted \in SUBSET Authorizers:
                  /\ Cardinality(submitted) >= Quorum
                  /\ phase' = "released" /\ lastEvent' = "quorum-authorize"
                  /\ authorizedWith' = submitted

Next == (\E edge \in Edges : Step(edge)) \/ Authorize
Resolve == Authorize \/ (\E edge \in Edges :
  /\ edge[1] \in {"funded", "release-requested"}
  /\ edge[3] \in {"refunded", "expired"}
  /\ Step(edge))

vars == <<phase, lastEvent, authorizedWith>>
Spec == Init /\ [][Next]_vars /\ WF_vars(Resolve)
TypeOK == /\ phase \in States
          /\ lastEvent \in {"init"} \cup {edge[2] : edge \in Edges}
          /\ authorizedWith \subseteq Authorizers
NoReleaseWithoutQuorum == phase = "released" => Cardinality(authorizedWith) >= Quorum
FundedEventuallyResolves == (phase \in {"funded", "release-requested"}) ~> (phase \in {"released", "refunded", "expired"})

===================================================================
