# Reader personas: who to research and simulate

A redesign is for the people who arrive, not for the builder. Which people depends on what the site is for: a design portfolio is read by recruiters and hiring managers, a SaaS site by buyers and evaluators, a shop by people deciding whether to pay. This file tells the `persona-researcher` agent how to pick five personas that fit the site, research each one, and turn each into its own simulated-reader agent.

## 1. Work out what the site is for

Read the site (`scripts/reader.mjs text`, `heads`, `links` on the home page and the main pages) and the owner's answers (`answers.md`, questions 1 and 2). Name:

- **The site type**, from the table below. A site can be two types (a studio that also sells templates); take the one the owner's goal ranks first and borrow one persona from the second.
- **The one action** the site exists to cause: hire, book a call, buy, sign up, donate, visit, subscribe.
- **Who takes that action, and who influences it.** The person who pays is often not the person who reads first.

## 2. Starting points by site type

These are starting points, not answers. Replace any row the research or the owner contradicts, and always prefer the owner's named readers.

| Site type | Five starting personas |
|---|---|
| Design or creative portfolio | In-house recruiter or sourcer screening many candidates; hiring manager or design lead judging craft and thinking; creative director at an agency; a client hiring a freelancer (small business owner or marketing lead); a peer who might refer the owner |
| Developer or engineering portfolio | Technical recruiter; engineering manager; senior engineer who will read the code; startup founder looking for a contractor; open-source peer |
| SaaS, sold to businesses | Economic buyer (department head with the budget); hands-on practitioner trying the product; technical evaluator (security, IT, integration); internal champion building the case; existing customer looking for docs or support |
| SaaS or app, sold to consumers | First-time visitor from an ad or search; price-sensitive comparer; power user checking depth; returning user who needs help; skeptic checking trust and privacy |
| Online shop | First-time buyer from search or social; repeat customer; gift buyer; shopper on a phone in a hurry; comparer checking shipping, returns and reviews |
| Local service business | Person with an urgent need, phone in hand; planner comparing quotes; existing customer checking hours or booking; older resident less used to the web; person sent by a referral or review |
| Agency or studio | Marketing lead with a project; procurement or operations reviewer; founder of a young company; prospective hire; partner agency |
| Nonprofit | Donor; volunteer; person seeking the help the nonprofit offers; grant officer or partner organization; journalist |
| Publication, blog or creator | Reader arriving from search with one question; subscriber; sponsor or advertiser; journalist or peer; skimmer from a social post |
| Church or community group | First-time visitor; member checking events; parent looking at children's programs; online attendee; giver |
| Restaurant or venue | Group planning a night out; tourist on a phone; event or party booker; regular checking hours or the menu; person with a dietary need or access question |
| Developer tool or docs | Evaluating developer; integrator stuck mid-task; team lead deciding; troubleshooter arriving from an error message; contributor |
| Event or conference | Attendee deciding to buy a ticket; speaker applying; sponsor; press; past attendee |

## 3. Cover access on purpose

Of the five personas, give one a screen reader and another browser zoom at 200 to 400 percent (or a real low-vision setup), as traits of a real persona, not as extra people. Research how common those setups are for that audience and how such readers move through a page. Also give at least one persona a phone as the only device, unless the research shows the audience rarely uses one.

## 4. Research each persona

For each persona, search the web and read the sources. Prefer, in order: studies and surveys with a method (academic, industry research firms, government statistics), first-person accounts from people in that role (hiring managers writing about how they review, buyers describing their process), then practitioner guides. Record for each finding the source, the date and whether it is measured, stated, or inferred. Mark a widely quoted figure with no study behind it as folklore.

Answer, with sources:

1. **The decision.** What this person is deciding on this visit, and what happens next if the answer is yes.
2. **How they arrive.** Search, a link in an application, an ad, a referral, a social post; on which device.
3. **Time and layers.** What they decide in the first few seconds, in about 30 seconds, in about five minutes.
4. **What they look for first**, in their own words where possible.
5. **What makes them leave.**
6. **How they read.** Skim or read, mouse or keyboard or screen reader, zoom, what they click.
7. **Their words.** The terms they search with and the job titles or product words they use. These feed the SEO and AEO audits.
8. **Tasks.** Four tasks a test can run: first look, find, judge, act. Each with a pass mark.

Then write the profile (`templates/reader-profile.md`) and the agent (`templates/reader-agent.md`), as the next section says.

## 5. From profile to agent

Each persona becomes its own Claude agent, saved in the project at `.claude/agents/reader-<slug>.md`, so it can run again after every round. The agent:

- reads only its own profile and the site,
- reads the site only through `scripts/reader.mjs`, in the modes its reader would use,
- starts at the home page and follows only links it can see,
- keeps the time budget the research found,
- marks each task Pass, Slow or Fail with the page text that decided it,
- never invents a fact and never edits the site.

The plugin also ships a generic `simulated-reader` agent that takes a profile path in its prompt, for runs where writing project agents is not wanted.

## 6. Check the choice with the owner

Write `personas/_index.md`: the site type, the one action, the five personas, and one line each on why they were chosen and what was dropped. Send it with the round's report; the owner can swap a persona before the agents run. This is not a mid-run question: the run continues with the five chosen.
