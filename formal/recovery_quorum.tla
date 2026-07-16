--------------------------- MODULE recovery_quorum ---------------------------
EXTENDS Naturals, FiniteSets, TLC

CONSTANT Guardians, Threshold
VARIABLES phase, lastEvent, shares, recoveredWith

States == {"idle", "collecting", "recovered", "rejected", "expired"}
Edges == {
  <<"idle", "start", "collecting">>,
  <<"collecting", "share", "collecting">>,
  <<"collecting", "threshold-authorize", "recovered">>,
  <<"collecting", "reject", "rejected">>,
  <<"collecting", "ttl", "expired">>
}

Init == /\ phase = "idle" /\ lastEvent = "init" /\ shares = {} /\ recoveredWith = {}
Share(g) == /\ phase = "collecting" /\ g \in Guardians
            /\ phase' = phase /\ lastEvent' = "share" /\ shares' = shares \cup {g} /\ UNCHANGED recoveredWith
Authorize == /\ phase = "collecting" /\ Cardinality(shares) >= Threshold
             /\ phase' = "recovered" /\ lastEvent' = "threshold-authorize"
             /\ recoveredWith' = shares /\ UNCHANGED shares
Reject == /\ phase = "collecting" /\ phase' = "rejected" /\ lastEvent' = "reject" /\ UNCHANGED <<shares, recoveredWith>>
Expire == /\ phase = "collecting" /\ phase' = "expired" /\ lastEvent' = "ttl" /\ UNCHANGED <<shares, recoveredWith>>
Start == /\ phase = "idle" /\ phase' = "collecting" /\ lastEvent' = "start" /\ UNCHANGED <<shares, recoveredWith>>
Next == Start \/ (\E g \in Guardians : Share(g)) \/ Authorize \/ Reject \/ Expire
Resolve == Authorize \/ Reject \/ Expire

vars == <<phase, lastEvent, shares, recoveredWith>>
Spec == Init /\ [][Next]_vars /\ WF_vars(Resolve)
TypeOK == /\ phase \in States /\ shares \subseteq Guardians /\ recoveredWith \subseteq Guardians
NoBelowThresholdRecovery == phase = "recovered" => Cardinality(recoveredWith) >= Threshold
CollectingEventuallyResolves == (phase = "collecting") ~> (phase \in {"recovered", "rejected", "expired"})

===================================================================
