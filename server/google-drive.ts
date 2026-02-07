// Google Drive integration for Replit connection
// See: conn_google-drive_01KDS9SBE8C7APFAVC6ZTE17PX

import { google } from "googleapis";

let connectionSettings: any;

async function getAccessToken() {
  if (
    connectionSettings?.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  let xReplitToken: string | null = null;
  if (process.env.REPL_IDENTITY) {
    xReplitToken = "repl " + process.env.REPL_IDENTITY;
  } else if (process.env.WEB_REPL_RENEWAL) {
    xReplitToken = "depl " + process.env.WEB_REPL_RENEWAL;
  }

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=google-drive",
    {
      headers: {
        Accept: "application/json",
        X_REPLIT_TOKEN: xReplitToken,
      },
    }
  )
    .then(res => res.json())
    .then(data => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("Google Drive not connected");
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

// List files in a folder
export async function listFilesInFolder(folderId: string) {
  const drive = await getUncachableGoogleDriveClient();
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType)",
    pageSize: 100,
  });
  return response.data.files || [];
}

// List all folders
export async function listFolders(parentId?: string) {
  const drive = await getUncachableGoogleDriveClient();
  let query = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  if (parentId) {
    query = `'${parentId}' in parents and ${query}`;
  }
  const response = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    pageSize: 100,
  });
  return response.data.files || [];
}

// Search for a folder by name
export async function findFolderByName(name: string) {
  const drive = await getUncachableGoogleDriveClient();
  const response = await drive.files.list({
    q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 10,
  });
  return response.data.files || [];
}

// Download a file by ID
export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = await getUncachableGoogleDriveClient();
  const response = await drive.files.get(
    {
      fileId,
      alt: "media",
    },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(response.data as ArrayBuffer);
}

// Get file metadata
export async function getFileMetadata(fileId: string) {
  const drive = await getUncachableGoogleDriveClient();
  const response = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, description",
  });
  return response.data;
}
