# Turning on the live leaderboard (optional, free, about 5 minutes)

The app works without this. With no server, the **Crew** tab runs on *score cards*: everyone taps
**Copy my score card**, sends it to the group chat, and pastes the others' cards in. Setting this up
gives everyone who opens the GitHub link a real shared leaderboard with usernames that updates live.

1. Go to **https://supabase.com**, sign up (free), and click **New project**. Any name and password, any region.
2. When the project is ready, open **SQL Editor → New query**. Paste everything from
   [`supabase/leaderboard.sql`](supabase/leaderboard.sql) and click **Run**. You should see "Success".
3. Open **Project Settings → API** (or **Data API** / **API Keys**). Copy the **Project URL** and the
   **anon public** key (or the **publishable** key).
4. On GitHub, open [`leaderboard-config.js`](leaderboard-config.js), click the pencil (Edit), paste them in:
   ```js
   window.FBF_LEADERBOARD = {
     url: "https://YOUR-PROJECT.supabase.co",
     key: "YOUR-ANON-OR-PUBLISHABLE-KEY"
   };
   ```
   and click **Commit changes**. The site rebuilds itself in about a minute.
5. Open the app link, go to **Crew**, and pick a username. You're on the board.

The public key only allows two things: reading the leaderboard, and creating or updating your own row
(each device holds a private key for its row). Nobody can change someone else's score. To remove a
player, run `delete from public.players where lower(username) = lower('their name');` in the SQL Editor.
