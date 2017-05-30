**Floatplane-Downloader**
===================

Floatplane-Downloader is a NodeJS script that allows you to download latest *Linus Media Group*'s *Floatplane Club* videos from *LinusTechTips* forums and make them available through a Plex server.

###IMPORTANT NOTES
This is an **early alpha** script delivered as it is. At this state, I only recommend it to **advanced users** that knows a bit of NodeJS and command-line tools. I am **not responsible** of any damages or issues that this program could do.

Also, I and this program are **not affiliated in anyway** with *Linus Media Group* and this program have **not yet received** any kind of **endorsement or validation** from *Linus Media Group* team.

You should also note that **this program** is the product of a **long retro-engineering** process of the *LinusTechTips* forums and the *Floatplane Club* subforum. Because of that, **some part** or **the whole program** could **stop working** or **having unexpected behavior** in case of **forum updates/modifications**. **I insist** that I am **not responsible** if anything goes wrong.

By using this software, you **confirm** that you **have read** and **agree** with those lines.

Requirements
------------
 - NodeJS 6 LTS
 - NPM (should be bundled with NodeJS)
 - Git (optional, for easier program updates)
 - Plex (currently, the only officially supported media server, more to come)

Installing
-------

See [Install](documentation/install) page for instructions.

Officially supported use cases
------------------------------
To be sure that most users will have a bugfree and painless experience, I do my best to test this app on common use cases and track any issues that can occurs.
Here is a subjective list of tested use cases, always updated to the latest versions available:

 - Debian 8 (x64), NodeJS 6 LTS and Plex
 - Windows 10 (Pro x64 & Home x86), NodeJS 6 LTS and Plex

Contributing
------------
As a novice, self-trained french developer, this program could have some typos, bottleneck or errors.
You can help me to fix and improve it through issues and pull requests, also a forum post is available here: [Forum Post (not created at this time)](https://linustechtips.com)
Just keep in mind some points:

 - Major rewrites/port to another language issues/pull requests will be deleted without warning.
 - There will be per-case exceptions at the first point in cases like: at the end of the LTS of NodeJS 6, to switch to the new LTS version or if a dependency have an issue/security breach.
 - Modifications to grant unauthorized access to some part or the full forum will be deleted too
 - Try to avoid breaking changes as much as possible. If there is no others choice, you'll have to add a easy fix for this breaking change (for example: mass file renaming in case of filename pattern modifications)
 - Make sure that your modifications works on supported use cases.
 - Try to comment your code as much as you can in English. (I'll not blame you for typos, I make typos too)

License
-------
This software is distributed under GPL-3.0 license, check the LICENSE file for more infos.
