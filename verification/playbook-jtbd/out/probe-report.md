# JtbdPlaybook

TLC reached 57 states and 78 steps. The chart draws 15 states and 21 arrows.
The view hides 29 steps, so the chart does not draw them.

## EveryRouteReal breaks
The shortest path has 1 step:
0. Start
1. you name a profile path the router does not have: Named a route the router does not have

## ReadsAreProvided breaks
The shortest path has 3 steps:
0. Start
1. you read the problem record [when the venture has one]: Problem record is open
2. you read the customer profiles [when the venture has them]: Each profile is open
3. you read a product card [when the venture has none]: Read a product card the venture does not have

## CheckMatchesJobs breaks
The shortest path has 5 steps:
0. Start
1. you read the problem record [when the venture has one]: Problem record is open
2. you read the customer profiles [when the venture has them]: Each profile is open
3. you find no product card: Ready to write, no product card
4. you write a copy of who they are, or of the product's job: Draft: job copies who or the product
5. the check says pass [on a blank or a copy]: Check passed, waiting for you

## NotLiveUntilYouAccept breaks
The shortest path has 6 steps:
0. Start
1. you read the problem record [when the venture has one]: Problem record is open
2. you read the customer profiles [when the venture has them]: Each profile is open
3. you find no product card: Ready to write, no product card
4. you write a copy of who they are, or of the product's job: Draft: job copies who or the product
5. you run the checks: Check failed
6. you accept a draft the check failed: You accepted the jobs

## Rules that hold
TypeOK, NoDeadlock
