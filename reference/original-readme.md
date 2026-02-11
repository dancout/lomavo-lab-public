# lomavo-lab
Documentation and references for changes made to the couturier home lab.


## Quick Summary
- I am maintaining a homelab and would like assistance in setting things up and documenting everything along the way so that future work or migrations can be easy.
- I'll need guidance from the AI Assistant when making decisions, and I expect the assistant to research things on the web when necessary.
- The `next-steps.md` file is where the next actionable items are.
- All other files are raw document dumps of notes I've taken along the way, plans for the future, and other miscellaneous info.
    - The AI Assistant should read through all of these documents at least once (potentially summarizing and reorganizing for efficiency later) to get an understanding of expectations and current state.


## Basic instructions and overview:
- This is meant to be version control for changes made to the home lab within my house running some personal services
- My intention is both to learn about homelabbing but to also move quickly with the help of an AI Assistant. I want to be given concise explanations as to why we are setting things up and how they work, but would also like to have the mental workload of writing code and researching decisions offloaded to an AI Assistant.
- The expectation is for the AI Assitant to work with me so I can learn and help make decisions that might drive further architectural or hardware decisions, but also work diligently when asked
- I have many goals that we'd like to achieve, and this should take a phased approach where we are continually improving our setup and replacing old services or strategies with new ones as the system matures.
- Ask me for clarifications when you need it. I'd prefer you ask for clarity on something before going down rabbit hole on something that didn't matter or that was misconceived.
- These services will be running across multiple hardware devices
- Changes to this repo and existing files could happen across multiple hardware devices, as well (for example, the gaming PC, my personal macbook that isn't otherwise tied to the homelab setup, the raspberry pi, etc)
- There will be many documentation files to read through depending on the specific task required
- I already have some documents and conversations that should be referenced (at least at first when generating initial documentation) around my setup and future plans
- Decisions should be documented in a manner that can be accessed later on so that we remember where we landed, don't repeat mistakes, and so that new ai assistants can pick up the work exactly where we left off
- We should also have a chart (something like an "ADR-APPENDIX") that lists out each documented decision with a simple high level sentence summary and some key words so that we can easily look through previous decisions without diving super deep in. See `adr_appendix.md` as a reference, which is a file from another project I've done. The ADR files were much more fleshed out with decisions that were made for a feature. The "round" represented a "round" of work I was doing with the github web coding assistant, which effectively was a feature. I'm not asking you to copy this exactly, but I am asking you to look at this good starting point and think about how to document our decisions at a level of detail where we can quickly skim things high level but also see more nitty gritty details when we need to.
- Branches should be made for features
- Commits should be made early and often when tangible changes are made to make it easy to roll back in the case that anything breaks
- We will need to back-fill any documenation on files that already exist for my setup, like many docker-compose files and information around cloudflare or tailscale setups
- We will need to move any sensitive information, like passwords or direct IP addresses or port numbers into .env files that aren't tracked in version control. We will need to work together on getting the proper .env files into each machine as needed, too (unless it can be done through the CLI by moving stuff around here locally and then not committing the final values)
- We will need to also back-fill the documentation of the current IP addresses of each of my current hardware devices, and then update those IP addresses once I switch things over to using an ethernet router switch instead of WiFi.
- Whenever making software decisions, we should favor strongly typed languages whenever possible so that we can lean on linters and compilers to tell us when there are issues (instead of javascript or python where we'd find issues at runtime)
- Should my Claude code have multiple agents to each work on their own area of expertise? Like a networking agent, a docker agent, a raspberry pi agent, a Mac agent? I’m genuinely not sure.
- I signed up for claude code using a personal email