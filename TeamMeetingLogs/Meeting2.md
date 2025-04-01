Team Meeting 2: 4/1/2025

Notes:

Commit regularly, set up viable (if not good-looking) product by Sunday,
April 6th Individual Assignments:

> \- Cal - Calendar - TBD - Stats
>
> \- Sudarshan - Login/Registration - Lyric - Friends
>
> \- Julian - Dashboard - Aaditya - Settings

Dashboard:

> \- Card list of each habit the user has
>
> \- Each card has the name of a given habit, with a checkbox for
> whether you confirmed it each day
>
> \- When a checkbox is incremented, the data is immediately saved to
> the counter for that habit. Saving data has no time constraints- a
> given habit may be fulfilled any number of times in one day.
>
> \- Each card expands into a short description when clicked

Database:

> \- Create:
>
> \- One DB table with every habit and all related information (name,
> description, counter, notification day(s), notification time), each
> habit is also has a foreign key that links to a user ID
>
> \- One DB table with all user information (ID/password)
>
> \- One DB table that links user to user (connection must be mutual to
> be considered friends)
>
> \- Sending an outgoing friend request establishes a one-way
> connection - Accepting an incoming request establishes the same
> connection the
>
> other way around (and now the mutual connection is considered a
> friendship)
>
> \- Rejecting an incoming request severs the initial connection
>
> \- One time table with every habit entry set for a given day, marked
> for how many times it’s been completed in that day (this information
> would be referenced in the calendar)
>
> \- Insert:
>
> \- Used strictly for testing purposes, no initial data is needed
> otherwise
