import "dotenv/config";
import http from "node:http";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in .env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.file"],
});

console.log("\nOpen this URL in your browser and approve access to your Google account:\n");
console.log(authUrl);
console.log("\nWaiting for you to complete the consent...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("No authorization code found in the request.");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<html><body>Authorization complete — you can close this tab and return to the terminal.</body></html>");
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      console.error(
        "\nNo refresh token was returned. Revoke this app's access at https://myaccount.google.com/permissions and run this script again.",
      );
      process.exit(1);
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const folder = await drive.files.create({
      requestBody: { name: "Fieldlenz Photos", mimeType: "application/vnd.google-apps.folder" },
      fields: "id, webViewLink",
    });

    console.log("\n=== Add these to your .env ===\n");
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN="${tokens.refresh_token}"`);
    console.log(`DRIVE_ROOT_FOLDER_ID="${folder.data.id}"`);
    console.log(`\nDrive folder created: ${folder.data.webViewLink}`);
  } catch (error) {
    console.error("\nSomething went wrong exchanging the code or creating the folder:");
    console.error(error);
    process.exit(1);
  }
});

server.listen(PORT);
