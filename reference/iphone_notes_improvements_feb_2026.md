# Improvements

#### MCP servers

##### Documents
SourceType on the documents MCP Server call might be a limiting factor, since we’re all documents right now. Also, it uses potentially too specific queries and then when it doesn’t find an exact match it gives up:{
  "query": "failing a college course cover letter",
  "source_type": "message"
}
- Would using just “college course” be better? Drop the cover letter, too, since that’s the title of the document
- Would be nice if it was smart enough to search for the correct document first and then the content, but I know that's maybe more than just an MCP server update
- For now, I'd also like the source_type to always be documents, since we don't ingest messages yet. Saying to search on source_type of message is basically setting us up for failure right now.
- For the documents MCP server, it might be better to have the name/date of the file returned as well for supplemental info (like my taxes in box 2a from 2020)
- Also, look through the available MCP server tools and ensure that these are the best and most dynamic to set us up for success when searching for things.

##### mcp-homelab
- Consider implementing vector search for ADR searching on  mcp-homelab. —> the idea being if we want to save on Claude credits then we can have our internally hosted LLM search for relevant ADRs and then return the value to Claude so it just makes 1 tool call and gets data 
- The read_file tool is not working super well because we only know the ADR but not the exact file name (because in the homelab_list_decisions the response gives the ADR but not the full file name). —> It was finally able to search ADR-018 to find the file name and then read the file given the full name, but only after I held its hand on the way through
    - This could be the result of the 14B model not being nearly as intelligent as, say, a Claude model. However, I'd like to work with what we've got.


#### Claude Memory
- Should you be committing your claude memory to version control so that the beneficial decisions there can be useful for others?
- Export/refactor files that have my “pillars” to focus on for claude.md to read and go by - observability, retaining previous conversations, retaining resolutions and decisions, phased work, scalability, transparency with how things work, version control to be able to fall back, etc
- We ran out of lines for Claude’s internal memory. It suggested it should add a line to check a separate file instead and then bolster that separate file. Take that strategy and apply to both Claude’s internal memory and the claude.md file. We should clean up what’s listed there, put the granular details in separate files, and ensure we’re using tokens effectively.
    - ^^ Should we have a file about updating the internal memory and claude.md files? Instructions on how to write instructions, since the updates have been inconsistent as we’ve gone along?
    - ^ On that note, should we add that you should update the project’s README file after features are completed, so maybe in the contributing.md file? (And back populate missing features as a one-time thing)
    - ^^ Consider adding something to when you’re writing a plan to be very verbose in the *why* and *setup explanations* for the instructions you’re writing, because often we clear context and then you re-read all the necessary files and it’s token expensive. It might be necessary or still better to do that, I’m not sure.
    - ^ Another good memory thing is to remember that we are self-hosting, so when researching for functionality be sure to look at that service’s self-hosting options. For Qdrant, you conflated the Qdrant cloud and self-hosted services and had some confusion. Just remember to think about what service we’re working on and which angle we need to research (cloud or local)

#### Claude Agents
- IS IT TIME TO DEFINE CLAUDE AGENTS FOR TASKS? LIKE RESEARCHING, COMMITTING, DOCUMENTING, IMPLEMENTING, MCP SERVER WRITING, HOMEPAGE WIDGET UPDATES, MONITORING UPDATES, ETC?
    - Alternatively, or in tandem, are there "skills" that could be defined so that we can have predefined tracks on how to handle committing after work is done, writing up documentation, breaking off new branches for features (which you haven't really been doing, we're mostly committing to main), and other things like that?
        - A really nice skill that I saw demoed was a "next task" skill where he just told claude to do the next task, so it went to find the next "todo" or next task from his own backlog (or "next-steps.md" and it would then write up a plan to implement the task, and then execute the plan).
    - Basically, the homelab is now mature enough that we don't need to try and fit the entire context of everything available for us to do into every conversation. We could be more efficient with our context windows and have more focused tracks.

#### Repo Setup
- Refactor a “new user” section(s) so someone pulling the repo down have clear files to place their hardware, their experience level or personal, their goals, and *actual* completed and next steps (since those are tied to my project right now)

#### Monitoring & Homepage
- NEST alert fires often. Should we up the outage time to 10 min instead of 5?
- Can/should we match all the stuff in uptime kuma with an up/down on grafana?
- Show how much storage we are using for our files (like how many GB). This can replace the existing and empty "INBOX" section under the paperless-ngx widget on homepage (for now, since ingesting messages is a future task, we'll handle monitoring on message ingestion then).
    - Also show how many active processing jobs (if easily available) like we do with immich jobs. Don't bend over backwards to get this running, though.
- Show storage values over time (immich photos, videos, GB storage over time - paperless documents count over time, Loki/prometheus/grafana chart values over time)
    - Have charts made in grafana. TBD on if those belong on homepage or not. Maybe in the monitoring section could have charts that have storage over time, but I'm not sure if that makes sense.
- Create a grafana chart or notify me or something whenever watchtower makes an update on a node. It'd be nice to know that Immich was just upgraded to the most recent version as it happens.
- Can we have a list of firing alerts on the homepage?
- Can we have a dashboard that shows length of time of each fired outage, or like cumulative over time to see which outages are most common and prevalent?
- Should discord link be on homepage?
- Can I track how much power the machines are using over time?


#### Security
- I have a port open on my xfinity router (check our initial reference documents for info) - does that still need to be open or should it be closed?
- Need to update MCP tool calls grafana charts to have a breakdown for all calls and authorized vs unauthorized calls. I’d like to know if people are calling the tools but aren’t authorized. Or even get a discord alert if that happens because security!
- If the pi goes down so I can’t get into vaultwarden, can I still get into the NAS to get to the backups:
- With the DNS pointing to <VIP> on my iPhone, will the internet still work even when I’m away from my home network and off VPN?

#### env tracking
- I am using "{NEST_USER_HERE}" for the nest account. I'm not sure if this should be added somehwere in an .env here (Ask me for the user when you're ready, and that user shouldn't be committed to version control)
    - So, if you see this and decide that we should store this value somewhere, maybe put it right into an .env file and in the .env.example have the empty entry to show we are storing *something* there.
