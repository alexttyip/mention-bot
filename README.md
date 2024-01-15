# Pickir Bot

## Usage

### Pick

Pick a non-excluded user from the channel.
Pickir will never pick the picker.

`@Pickir pick <message>`

#### Example

`@Pickir pick [PR] TFGM-123: This is a test ticket`

#### Re-roll

Pick messages come with a re-roll button, where you can ask Pickir to pick again.
Re-rolls respect any pick rules, so it will never pick the user who send the `@Pickir pick ...` command.


### Exclude

Exclude the user from *any* picks.
Note that by default all users are included.

`@Pickir [exclude | rm] @user`

#### Example

`@Pickir exclude @Jonathan Price`


### Include

Re-include the user from pick messages.

`@Pickir [include | i] @user`

#### Example

`@Pickir include @Jonathan Price`

### List excluded users

List all excluded users.

`@Pickir [list-excluded | lse]`

#### Example

`@Pickir list-excluded`

## Error handling

### User errors

Pickir will react to user errors with the `:user_error:` emoji.

### Unexpected errors

Pickir will react to unexpected errors with the `:confusedparrot:` emoji.

## What's next

- Sub-teams
- Exclude until date
- Stats

