## Usage
Note that all commands below are also slash commands (except !bh), so you do not have to type them into chat as below. You can pull each of them up as a slash command and use them that way.

### Moderator Commands
* `!timeout @userAt <severity> Reason for strike.` - Issue a strike to a user. Must include the user's @, and a number 1-5 for the severity. The reason for the strike goes after that.
* `!timeoutns @userAt <hours>h Reason for strike.` - Timeout a user without issuing a strike. Must include the user's @, and the number of hours. The reason for the strike goes after that.
* `!release @userAt <optional:amend>` - Release a user from the pit early by including their @. You can also include the word `amend` after their @ to remove their most recent strike entirely.
* `!removestrike <strikeID>` - Remove a strike by its ID from the database. Use the `!strikes` command below to find the strike ID.
* `!editcomment <strikeID> New reason for strike.` - Edit the comment/reason for a strike using its ID.
* `!editseverity <strikeID> <severity>` - Edit the severity for a strike using its ID.

### All User Commands
* `!strikes @userAt` - List a user's strikes. Only moderators can fetch another user's strikes by including their @, as well as see the issuer of each strike.
* `!selfpit <hours>h` - Send yourself to the pit. Number of hours is optional, and the default is 24 hours if you do not specify a number yourself.
* `!bh` - Play a little game of roulette where you might be timed out for a while. See the probabilities of each timeout duration below.

### Command Details
In the above commands, this is what the keywords mean:
* `@userAt` is the user's mention, or it can be their user ID number.
* `<severity>` is the severity to set for the strike, which must be a number from 1 to 5.
* `<optional:TEXT>` means you can optionally include whatever TEXT is to change how the command works.
* `<strikeID>` is the ID of the strike, an integer that you can see when the strike is issued, or when you list the user's strikes.
* `<hours>h` The number of hours for the timeout. Must be an integer followed by the letter 'h', with no space, e.g. `48h`

### Strike Duration Calculation
The base amount of time for a timeout when you issue a strike, based on its severity:
* Severity level 1: 4 hours
* Severity level 2: 8 hours
* Severity level 3: 12 hours
* Severity level 4: 24 hours
* Severity level 5: 48 hours

Additionally, for each other *active* strike the user has, the timeout duration will be increased based on the severity of the prior strike:
* Each prior severity level 1 adds 1 hour
* Each prior severity level 2 adds 4 hours
* Each prior severity level 3 adds 9 hours
* Each prior severity level 4 adds 24 hours
* Each prior severity level 5 adds 48 hours

Finally, the timeout duration will increase further based on the total number of active strikes the user currently has:
* 2 active strikes: Duration increases by 5%
* 3 active strikes: Duration increases by 10%
* 4 active strikes: Duration increases by 30%
* When you reach 5 active strikes, moderators will discuss how long you should be suspended for, which could be anything up to a permanent ban from the server.

### Bullet Hell Probabilites
* No timeout: 50%
* 12 hour timeout: 24.5%
* 16 hour timeout: 15%
* 24 hour timeout: 7.5%
* 36 hour timeout: 2.5%
* 48 hour timeout: 0.5%
