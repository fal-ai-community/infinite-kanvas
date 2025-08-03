import { S3Client } from "@aws-sdk/client-s3";
import { Database } from "@cloudflare/d1";

// R2 configuration for S3-compatible API
export const getR2Client = () => {
  if (
    !process.env.CLOUDFLARE_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY
  ) {
    throw new Error("Missing R2 configuration environment variables");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
};

// D1 configuration using REST API
export const getD1Client = async () => {
  if (
    !process.env.CLOUDFLARE_ACCOUNT_ID ||
    !process.env.CLOUDFLARE_API_TOKEN ||
    !process.env.D1_DATABASE_ID
  ) {
    throw new Error("Missing D1 configuration environment variables");
  }

  // We'll use the REST API for D1 operations
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}`;

  return {
    query: async (sql: string, params?: any[]) => {
      const response = await fetch(`${baseUrl}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sql,
          params: params || [],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`D1 query failed: ${error}`);
      }

      const data = await response.json();
      return data.result[0];
    },
  };
};

// KV configuration using REST API
export const getKVClient = () => {
  if (
    !process.env.CLOUDFLARE_ACCOUNT_ID ||
    !process.env.CLOUDFLARE_API_TOKEN ||
    !process.env.KV_NAMESPACE_ID
  ) {
    throw new Error("Missing KV configuration environment variables");
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}`;

  return {
    get: async (key: string) => {
      const response = await fetch(`${baseUrl}/values/${key}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`KV get failed: ${response.statusText}`);
      }

      return response.text();
    },

    put: async (
      key: string,
      value: string,
      options?: { expirationTtl?: number },
    ) => {
      const url = new URL(`${baseUrl}/values/${key}`);
      if (options?.expirationTtl) {
        url.searchParams.set(
          "expiration_ttl",
          options.expirationTtl.toString(),
        );
      }

      const response = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "text/plain",
        },
        body: value,
      });

      if (!response.ok) {
        throw new Error(`KV put failed: ${response.statusText}`);
      }
    },

    delete: async (key: string) => {
      const response = await fetch(`${baseUrl}/values/${key}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`KV delete failed: ${response.statusText}`);
      }
    },
  };
};

// Constants
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "kanvas-images";
export const D1_DATABASE_ID = process.env.D1_DATABASE_ID!;
export const KV_NAMESPACE_ID = process.env.KV_NAMESPACE_ID!;
