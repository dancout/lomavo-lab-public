# Next Steps

See `plans/README.md` for long-term roadmap, `completed.md` for history.

## Current sprint / immediate tasks.


## Next up
- [ ] Have a repeatable process to copy all files in this directory to the lomavo-lab-public directory so that I can commit updates there to the public directory
    - It would be nice to be able to just run a script that copies everything over maybe, then even maybe runs git add and git commit in the other directory.
        - I can be responsible for pushing the changes, though, for ultra safety and so we can fallback before making remote changes
        - We don't want to be committing any sensitive information, so anything in the .envs shouldn't be committed, but this *should* already be taken care of with the .gitignore file already existing.
            - Just clarify if any changes to the gitignore wouldn't fix exposing any sensitive information.
    - This could be a skill or a script, but a skill feels like it might be overkill. However, the skill could just call the script and that's easy, too!


## Backlog
- [ ] Look through all the available upcoming work in the plans readme, future tasks, and any other various collection of work to do.
    - pull forward and create a priority list here within this next-steps.md file
    - balance between low hanging fruit and high payoff features. prioritize difficult / impossible or difficult (without human intervention) tasks for later
    - Really, I'd like to have a single pane of glass to look at and see all the work that needs to get done at a high level. I'm not looking for ultra granular tasks in one place, because that's overwhelming. I'm looking for high level. That way, I can start to kick off "/next-task" workflows and knock these things out.
    - Might be worth taking a look through "/reference/iphone_notes_improvements_feb_2026.md" as that was an original ask sheet that many future tasks were based upon, and it's been proven before that not everything gets translated over properly.

### Repo Setup
- [ ] Refactor repo for "new user" onboarding — clear sections for hardware inventory, experience level, personal goals, and decoupled completed/next-steps (currently tied to one user's project). This is from the lens of this having a public repo counterpart that is meant to be used by others who want to start their own homelab for learning - they should be able to put their own details in for claude to be able to read in and make decisions based off of.

### Medium Priority
- [x] Prometheus secret management — Mac-side `envsubst` deploy script resolves `${VAR}` placeholders before SCP (ADR-036)
- [ ] Add NAS snapshot pool metrics to Homepage (requires SSH or SNMP on NAS - ADR-014)
- [ ] Native Glances on Windows for richer host metrics (intermediate step - ADR-012)
- [ ] Investigate pc_storage mount on Pi (unclear if actively used, may need cleanup)
- [ ] Consider security hardening for previously exposed values in git history (ADR-018)

### At some point

- [ ] We are using multiple immich tokens and I think we are re-using the one that has more permissions because our old one was read only
    - Go through the tokens that are used and have more explicit descriptions on which permissions should be assigned to this token so that a new person who is starting their own project will know what permissions to grant it
    - On the same subject, consider doing any token consolidations or more intelligent splits of responsibility where it makes sense. Things may or may not be set up in a manner where the tokens used are split up well, or we might have just used what we had and done it sloppy.
