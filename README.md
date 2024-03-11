# Pickir Bot

## Usage

| Command | Description | Example |
| --- | --- | --- |
| `pick <message>` | Pick a non-excluded user from the channel.<br>Pickir will never pick the picker. | `@Pickir pick TFGM-123: This is a test` |
| `[exclude \| rm] @User` | Exclude the user from **all** picks.<br>Note that by default all users are included. | `@Pickir exclude @Alex Yip` |
| `[include \| i] @User` | Re-include the user from picks. | `@Pickir include @Alex Yip` |
| `[list-excluded \| lse]` | List and manage excluded users. | `@Pickir lse` |
| `create <team name>` | Create team with the given team name and manage members.<br>Team names are case-insensitive. | `@Pickir create a-team` |
| `show <team name>` | Show team and manage members. | `@Pickir show a-team` |
| `stats` | This is a WIP feature.<br>Show statistics for the current channel.  | `@Pickir stats` |

## Error handling

| Pickir's reaction | Description |
| --- | --- |
| `:user_error:` | User error |
| `:confusedparrot:` | Unexpected error|

## What's next

- Avoid picking recently picked users
- Improved stats
- Exclude until date
- Delete team
