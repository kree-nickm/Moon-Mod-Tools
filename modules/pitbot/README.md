## Usage
Note that all commands below are also slash commands, so you do not have to type them into chat as below. You can pull each of them up as a slash command and use them that way.

### Moderator Commands
* `!timeout @ # Reason for strike.` - Issue a strike to a user. Must include the user's @, and a number 1-5 for the severity. The reason for the strike goes after that.
* `!release @` - Release a user from the pit early by including their @. You can also include the word `amend` after their @ to remove their most recent strike entirely.
* `!removestrike #` - Remove a strike by its ID from the database. Use the `!strikes` command below to find the strike ID.
* `!editcomment # New reason for strike.` - Edit the comment/reason for a strike using its ID.

### All User Commands
* `!strikes @` - List a user's strikes. Only moderators can fetch another user's strikes by including their @, as well as see the issuer of each strike.
* `!bh` - Play a little game of roulette where you might be timed out for a while. See the probabilities of each timeout duration below.

### Bullet Hell Probabilites
* No timeout: 50%
* 12 hour timeout: 24.5%
* 16 hour timeout: 15%
* 24 hour timeout: 7.5%
* 36 hour timeout: 2.5%
* 48 hour timeout: 0.5%
