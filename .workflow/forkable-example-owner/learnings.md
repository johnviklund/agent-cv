Command: workflow review forkable-example-owner
Created: 2026-10-20
Base:    8971fcf
Inputs:  none
Status:  done

- [durable→memory] test-on-example-owner-bundle — second occurrence: T4's first push (4fcdb59) went out with CI red because ignored local engine `data/` files hid a wrong path that CI's clean checkout exposed. Running touched tests on the example owner is not enough; run them in a clean clone (no ignored files) before pushing. [routed → memory/test-on-example-owner-bundle.md]
- [durable→eval] code-review — moving a source of truth (engine `data/` → owner `data/`) left a writer (`sync-github-repositories.mjs:32`) on the old path; its fetch is silently discarded by the next sync. Must name: the writer still targeting the old location. [routed → j-skills-evals 825438c]
- [durable→memory] a CLI whose test always passes explicit arguments leaves its default arguments (the path CI runs) untested; assert the defaults or run the no-arg path. [routed → memory/test-cli-default-arguments.md]
