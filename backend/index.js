const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");

const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require("@azure/storage-blob");

const { CosmosClient } = require("@azure/cosmos");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// ✅ ENV Variables
const AZURE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || "media";

const COSMOS_CONNECTION_STRING = process.env.COSMOS_CONNECTION_STRING;
const COSMOS_DB_NAME = process.env.COSMOS_DB_NAME || "instagramdb";
const COSMOS_CONTAINER_NAME = process.env.COSMOS_CONTAINER_NAME || "posts";

// ✅ Blob Client
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONNECTION_STRING);

// ✅ Cosmos Client
const cosmosClient = new CosmosClient(COSMOS_CONNECTION_STRING);
const database = cosmosClient.database(COSMOS_DB_NAME);
const container = database.container(COSMOS_CONTAINER_NAME);

// ✅ Upload file to Azure Blob
async function uploadToBlob(file) {
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  await containerClient.createIfNotExists();

  const blobName = `${Date.now()}-${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype },
  });

  return { blobName, url: blockBlobClient.url };
}

// ✅ Generate SAS URL
function generateSASUrl(blobName) {
  const accountNameMatch = AZURE_CONNECTION_STRING.match(/AccountName=([^;]+)/);
  const accountKeyMatch = AZURE_CONNECTION_STRING.match(/AccountKey=([^;]+)/);

  const accountName = accountNameMatch?.[1];
  const accountKey = accountKeyMatch?.[1];

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(new Date().valueOf() + 60 * 60 * 1000),
    },
    sharedKeyCredential
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sasToken}`;
}

// ✅ Home route
app.get("/", (req, res) => {
  res.send("Instagram API Running ✅ (Blob + Cosmos Enabled)");
});

// ✅ Upload route
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const caption = req.body.caption || "";

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded ❌" });
    }

    const { blobName, url } = await uploadToBlob(req.file);
    const secureUrl = generateSASUrl(blobName);

    const post = {
      id: Date.now().toString(),
      caption,
      imageUrl: secureUrl,
      blobUrl: url,
      createdAt: new Date().toISOString(),
    };

    await container.items.create(post);

    res.json({
      message: "✅ Image uploaded & saved to Cosmos DB",
      post,
    });
  } catch (err) {
    console.log("❌ Upload Error:", err);
    res.status(500).json({ message: "Upload failed ❌", error: err.message });
  }
});

// ✅ GET posts route
app.get("/posts", async (req, res) => {
  try {
    const query = {
      query: "SELECT * FROM c ORDER BY c.createdAt DESC",
    };

    const { resources } = await container.items.query(query).fetchAll();
    res.json(resources);
  } catch (err) {
    console.log("❌ Fetch Posts Error:", err);
    res.status(500).json({ message: "Failed to fetch posts ❌", error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000 ✅");
});
